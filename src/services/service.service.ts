import Service, { IService } from '../models/Service';
import Review, { IReview } from '../models/Review';
import User from '../models/User';
import Category from '../models/Category';
import {
  NotFoundError,
  BadRequestError,
  ForbiddenError,
  UnauthorizedError,
} from '../utils/errors';
import { slugify, parsePaginationParams } from '../utils/helpers';
import logger from '../utils/logger';

class ServiceService {
  /**
   * Create a new service
   */
  public async createService(
    vendorId: string,
    data: {
      name: string;
      description: string;
      category: string;
      subCategory?: string;
      basePrice: number;
      priceType?: 'fixed' | 'hourly' | 'negotiable';
      duration?: number;
      images?: string[];
      tags?: string[];
      requirements?: string[];
      whatIsIncluded?: string[];
      faqs?: { question: string; answer: string }[];
      availability?: any;
    }
  ): Promise<IService> {
    // Verify vendor
    const vendor = await User.findById(vendorId);
    if (!vendor || !vendor.isVendor) {
      throw new UnauthorizedError('Only vendors can create services');
    }

    if (!vendor.vendorProfile?.isVerified) {
      throw new ForbiddenError('Vendor account must be verified to create services');
    }

    // Verify category exists
    const category = await Category.findById(data.category);
    if (!category) {
      throw new NotFoundError('Category not found');
    }

    // Verify subcategory if provided
    if (data.subCategory) {
      const subCategory = await Category.findById(data.subCategory);
      if (!subCategory) {
        throw new NotFoundError('Subcategory not found');
      }
    }

    // Generate unique slug
    let slug = slugify(data.name);
    let isUnique = false;
    let counter = 1;

    while (!isUnique) {
      const existingService = await Service.findOne({ slug });
      if (!existingService) {
        isUnique = true;
      } else {
        slug = `${slugify(data.name)}-${counter}`;
        counter++;
      }
    }

    const service = await Service.create({
      vendor: vendorId,
      ...data,
      slug,
    });

    logger.info(`Service created: ${service.name} by vendor ${vendorId}`);

    return service;
  }

  /**
   * Get all services with filters
   */
  public async getAllServices(
    filters?: {
      vendor?: string;
      category?: string;
      subCategory?: string;
      priceMin?: number;
      priceMax?: number;
      rating?: number;
      search?: string;
      isActive?: boolean;
      location?: {
        latitude: number;
        longitude: number;
        maxDistance?: number;
      };
    },
    page: number = 1,
    limit: number = 20,
    sortBy: string = 'createdAt',
    sortOrder: 'asc' | 'desc' = 'desc'
  ): Promise<{ services: IService[]; total: number; page: number; totalPages: number }> {
    const { skip } = parsePaginationParams(page, limit);

    // Build query
    const query: any = { isActive: filters?.isActive !== false };

    if (filters?.vendor) {
      query.vendor = filters.vendor;
    }

    if (filters?.category) {
      query.category = filters.category;
    }

    if (filters?.subCategory) {
      query.subCategory = filters.subCategory;
    }

    if (filters?.priceMin !== undefined || filters?.priceMax !== undefined) {
      query.basePrice = {};
      if (filters.priceMin !== undefined) {
        query.basePrice.$gte = filters.priceMin;
      }
      if (filters.priceMax !== undefined) {
        query.basePrice.$lte = filters.priceMax;
      }
    }

    if (filters?.rating) {
      query['metadata.averageRating'] = { $gte: filters.rating };
    }

    if (filters?.search) {
      query.$text = { $search: filters.search };
    }

    // Location-based filter
    let vendorIds: string[] | undefined;
    if (filters?.location) {
      const maxDistance = (filters.location.maxDistance || 10) * 1000; // Convert km to meters

      const nearbyVendors = await User.find({
        isVendor: true,
        'vendorProfile.isVerified': true,
        'vendorProfile.location': {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: [filters.location.longitude, filters.location.latitude],
            },
            $maxDistance: maxDistance,
          },
        },
      }).select('_id');

      vendorIds = nearbyVendors.map((v) => v._id.toString());
      
      if (vendorIds.length > 0) {
        query.vendor = { $in: vendorIds };
      } else {
        // No vendors in range, return empty result
        return { services: [], total: 0, page, totalPages: 0 };
      }
    }

    // Build sort
    const sort: any = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const [services, total] = await Promise.all([
      Service.find(query)
        .populate('vendor', 'firstName lastName email vendorProfile.businessName vendorProfile.rating')
        .populate('category', 'name slug icon')
        .populate('subCategory', 'name slug icon')
        .skip(skip)
        .limit(limit)
        .sort(sort),
      Service.countDocuments(query),
    ]);

    return {
      services,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get service by ID
   */
  public async getServiceById(serviceId: string, incrementView: boolean = false): Promise<IService> {
    const service = await Service.findById(serviceId)
      .populate('vendor', 'firstName lastName email vendorProfile')
      .populate('category', 'name slug icon')
      .populate('subCategory', 'name slug icon');

    if (!service) {
      throw new NotFoundError('Service not found');
    }

    // Increment view count if requested
    if (incrementView) {
      if (!service.metadata) {
        service.metadata = {
          views: 0,
          bookings: 0,
          completedBookings: 0,
          averageRating: 0,
          totalReviews: 0,
        };
      }
      service.metadata.views = (service.metadata.views || 0) + 1;
      await service.save();
    }

    return service;
  }

  /**
   * Get service by slug
   */
  public async getServiceBySlug(slug: string, incrementView: boolean = false): Promise<IService> {
    const service = await Service.findOne({ slug })
      .populate('vendor', 'firstName lastName email vendorProfile')
      .populate('category', 'name slug icon')
      .populate('subCategory', 'name slug icon');

    if (!service) {
      throw new NotFoundError('Service not found');
    }

    if (incrementView) {
      if (!service.metadata) {
        service.metadata = {
          views: 0,
          bookings: 0,
          completedBookings: 0,
          averageRating: 0,
          totalReviews: 0,
        };
      }
      service.metadata.views = (service.metadata.views || 0) + 1;
      await service.save();
    }

    return service;
  }

  /**
   * Update service
   */
  public async updateService(
    serviceId: string,
    vendorId: string,
    updates: Partial<IService>
  ): Promise<IService> {
    const service = await Service.findById(serviceId);

    if (!service) {
      throw new NotFoundError('Service not found');
    }

    // Check ownership
    if (service.vendor.toString() !== vendorId) {
      throw new ForbiddenError('You can only update your own services');
    }

    // Update slug if name changes
    if (updates.name && updates.name !== service.name) {
      let slug = slugify(updates.name);
      let isUnique = false;
      let counter = 1;

      while (!isUnique) {
        const existingService = await Service.findOne({ slug, _id: { $ne: serviceId } });
        if (!existingService) {
          isUnique = true;
        } else {
          slug = `${slugify(updates.name)}-${counter}`;
          counter++;
        }
      }
      service.slug = slug;
    }

    // Verify category if being updated
    if (updates.category) {
      const category = await Category.findById(updates.category);
      if (!category) {
        throw new NotFoundError('Category not found');
      }
    }

    // Update fields
    Object.assign(service, updates);
    await service.save();

    logger.info(`Service updated: ${service.name}`);

    return service;
  }

  /**
   * Delete service (soft delete)
   */
  public async deleteService(serviceId: string, vendorId: string): Promise<void> {
    const service = await Service.findById(serviceId);

    if (!service) {
      throw new NotFoundError('Service not found');
    }

    // Check ownership
    if (service.vendor.toString() !== vendorId) {
      throw new ForbiddenError('You can only delete your own services');
    }

    service.isDeleted = true;
    service.deletedAt = new Date();
    service.isActive = false;
    await service.save();

    logger.info(`Service deleted: ${service.name}`);
  }

  /**
   * Toggle service active status
   */
  public async toggleServiceStatus(serviceId: string, vendorId: string): Promise<IService> {
    const service = await Service.findById(serviceId);

    if (!service) {
      throw new NotFoundError('Service not found');
    }

    // Check ownership
    if (service.vendor.toString() !== vendorId) {
      throw new ForbiddenError('You can only update your own services');
    }

    service.isActive = !service.isActive;
    await service.save();

    logger.info(`Service status toggled: ${service.name} - ${service.isActive}`);

    return service;
  }

  /**
   * Get vendor services
   */
  public async getVendorServices(
    vendorId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{ services: IService[]; total: number; page: number; totalPages: number }> {
    return this.getAllServices({ vendor: vendorId }, page, limit);
  }

  /**
   * Add review to service
   */
  public async addReview(
    serviceId: string,
    clientId: string,
    bookingId: string,
    data: {
      rating: number;
      comment?: string;
      images?: string[];
    }
  ): Promise<IReview> {
    const service = await Service.findById(serviceId);

    if (!service) {
      throw new NotFoundError('Service not found');
    }

    // Check if user already reviewed this service
    const existingReview = await Review.findOne({ service: serviceId, client: clientId });
    if (existingReview) {
      throw new BadRequestError('You have already reviewed this service');
    }

    // Create review
    const review = await Review.create({
      service: serviceId,
      vendor: service.vendor,
      client: clientId,
      booking: bookingId,
      ...data,
      isVerified: true,
    });

    logger.info(`Review added for service ${serviceId} by client ${clientId}`);

    return review;
  }

  /**
   * Get service reviews
   */
  public async getServiceReviews(
    serviceId: string,
    page: number = 1,
    limit: number = 10
  ): Promise<{ reviews: IReview[]; total: number; page: number; totalPages: number }> {
    const { skip } = parsePaginationParams(page, limit);

    const [reviews, total] = await Promise.all([
      Review.find({ service: serviceId })
        .populate('client', 'firstName lastName avatar')
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 }),
      Review.countDocuments({ service: serviceId }),
    ]);

    return {
      reviews,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Respond to review (vendor)
   */
  public async respondToReview(
    reviewId: string,
    vendorId: string,
    responseText: string
  ): Promise<IReview> {
    const review = await Review.findById(reviewId);

    if (!review) {
      throw new NotFoundError('Review not found');
    }

    // Check ownership - reviewee should be the vendor
    if (review.reviewee.toString() !== vendorId) {
      throw new ForbiddenError('You can only respond to reviews about you');
    }

    review.response = {
      comment: responseText,
      respondedAt: new Date(),
    };

    await review.save();

    logger.info(`Vendor responded to review ${reviewId}`);

    return review;
  }

  /**
   * Get trending services
   */
  public async getTrendingServices(limit: number = 10): Promise<IService[]> {
    const services = await Service.find({ isActive: true })
      .populate('vendor', 'firstName lastName vendorProfile.businessName vendorProfile.rating')
      .populate('category', 'name slug icon')
      .sort({ 'metadata.bookings': -1, 'metadata.averageRating': -1 })
      .limit(limit);

    return services;
  }

  /**
   * Get popular services by category
   */
  public async getPopularByCategory(categoryId: string, limit: number = 5): Promise<IService[]> {
    const services = await Service.find({ category: categoryId, isActive: true })
      .populate('vendor', 'firstName lastName vendorProfile.businessName')
      .sort({ 'metadata.averageRating': -1, 'metadata.bookings': -1 })
      .limit(limit);

    return services;
  }
}

export default new ServiceService();
