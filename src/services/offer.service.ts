import Offer, { IOffer } from '../models/Offer';
import Booking from '../models/Booking';
import Service from '../models/Service';
import User from '../models/User';
import Category from '../models/Category';
import {
  NotFoundError,
  BadRequestError,
  ForbiddenError,
} from '../utils/errors';
import { BookingType, BookingStatus } from '../types';
import { parsePaginationParams, addDays } from '../utils/helpers';
import logger from '../utils/logger';

class OfferService {
  /**
   * Create offer request
   */
  public async createOffer(
    clientId: string,
    data: {
      title: string;
      description: string;
      category: string;
      service?: string;
      proposedPrice: number;
      location: {
        address: string;
        city: string;
        state: string;
        coordinates: [number, number];
      };
      preferredDate?: Date;
      preferredTime?: string;
      flexibility?: 'flexible' | 'specific' | 'urgent';
      images?: string[];
      expiresInDays?: number;
    }
  ): Promise<IOffer> {
    // Verify category exists
    const category = await Category.findById(data.category);
    if (!category) {
      throw new NotFoundError('Category not found');
    }

    // Verify service if provided
    if (data.service) {
      const service = await Service.findById(data.service);
      if (!service) {
        throw new NotFoundError('Service not found');
      }
    }

    // Calculate expiration
    const expiresInDays = data.expiresInDays || 7;
    const expiresAt = addDays(new Date(), expiresInDays);

    // Create offer
    const offer = await Offer.create({
      client: clientId,
      category: data.category,
      service: data.service,
      title: data.title,
      description: data.description,
      proposedPrice: data.proposedPrice,
      location: {
        type: 'Point',
        coordinates: data.location.coordinates,
        address: data.location.address,
        city: data.location.city,
        state: data.location.state,
      },
      preferredDate: data.preferredDate,
      preferredTime: data.preferredTime,
      flexibility: data.flexibility || 'flexible',
      images: data.images,
      expiresAt,
      status: 'open',
      responses: [],
    });

    logger.info(`Offer created: ${offer._id} by client ${clientId}`);

    return offer;
  }

  /**
   * Get available offers for vendors
   */
  public async getAvailableOffers(
    vendorId: string,
    filters?: {
      category?: string;
      priceMin?: number;
      priceMax?: number;
      location?: {
        latitude: number;
        longitude: number;
        maxDistance?: number;
      };
    },
    page: number = 1,
    limit: number = 10
  ): Promise<{ offers: IOffer[]; total: number; page: number; totalPages: number }> {
    const { skip } = parsePaginationParams(page, limit);

    // Build query
    const query: any = {
      status: 'open',
      expiresAt: { $gt: new Date() },
    };

    // Exclude offers vendor already responded to
    query['responses.vendor'] = { $ne: vendorId };

    if (filters?.category) {
      query.category = filters.category;
    }

    if (filters?.priceMin !== undefined || filters?.priceMax !== undefined) {
      query.proposedPrice = {};
      if (filters.priceMin !== undefined) {
        query.proposedPrice.$gte = filters.priceMin;
      }
      if (filters.priceMax !== undefined) {
        query.proposedPrice.$lte = filters.priceMax;
      }
    }

    // Location-based filter
    if (filters?.location) {
      const maxDistance = (filters.location.maxDistance || 20) * 1000; // Convert km to meters

      query['location.coordinates'] = {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [filters.location.longitude, filters.location.latitude],
          },
          $maxDistance: maxDistance,
        },
      };
    }

    const [offers, total] = await Promise.all([
      Offer.find(query)
        .populate('client', 'firstName lastName avatar')
        .populate('category', 'name icon')
        .populate('service', 'name')
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 }),
      Offer.countDocuments(query),
    ]);

    return {
      offers,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Vendor responds to offer
   */
  public async respondToOffer(
    offerId: string,
    vendorId: string,
    data: {
      proposedPrice: number;
      message?: string;
      estimatedDuration?: number;
    }
  ): Promise<IOffer> {
    const offer = await Offer.findById(offerId);

    if (!offer) {
      throw new NotFoundError('Offer not found');
    }

    // Check if offer is still open
    if (offer.status !== 'open') {
      throw new BadRequestError('Offer is no longer open');
    }

    // Check expiration
    if (new Date() > offer.expiresAt) {
      offer.status = 'expired';
      await offer.save();
      throw new BadRequestError('Offer has expired');
    }

    // Check if vendor already responded
    const existingResponse = offer.responses.find(
      (r) => r.vendor.toString() === vendorId
    );

    if (existingResponse) {
      throw new BadRequestError('You have already responded to this offer');
    }

    // Verify vendor
    const vendor = await User.findById(vendorId);
    if (!vendor || !vendor.isVendor || !vendor.vendorProfile?.isVerified) {
      throw new BadRequestError('Only verified vendors can respond to offers');
    }

    // Add response
    offer.responses.push({
      vendor: vendorId as any,
      proposedPrice: data.proposedPrice,
      message: data.message,
      estimatedDuration: data.estimatedDuration,
      respondedAt: new Date(),
      isAccepted: false,
    });

    await offer.save();

    logger.info(`Vendor ${vendorId} responded to offer ${offerId}`);

    return offer;
  }

  /**
   * Client submits counter offer to vendor response
   */
  public async counterOffer(
    offerId: string,
    clientId: string,
    responseId: string,
    counterPrice: number
  ): Promise<IOffer> {
    const offer = await Offer.findById(offerId);

    if (!offer) {
      throw new NotFoundError('Offer not found');
    }

    // Verify ownership
    if (offer.client.toString() !== clientId) {
      throw new ForbiddenError('Only the offer creator can submit counter offers');
    }

    // Check status
    if (offer.status !== 'open') {
      throw new BadRequestError('Offer is no longer open');
    }

    // Find response
    const response = offer.responses.find((r: any) => r._id?.toString() === responseId);
    if (!response) {
      throw new NotFoundError('Response not found');
    }

    // Add counter offer
    response.counterOffer = counterPrice;

    await offer.save();

    logger.info(`Counter offer submitted for offer ${offerId}`);

    return offer;
  }

  /**
   * Client accepts vendor response and creates booking
   */
  public async acceptResponse(
    offerId: string,
    clientId: string,
    responseId: string
  ): Promise<{ offer: IOffer; booking: any }> {
    const offer = await Offer.findById(offerId).populate('service');

    if (!offer) {
      throw new NotFoundError('Offer not found');
    }

    // Verify ownership
    if (offer.client.toString() !== clientId) {
      throw new ForbiddenError('Only the offer creator can accept responses');
    }

    // Check status
    if (offer.status !== 'open') {
      throw new BadRequestError('Offer is no longer open');
    }

    // Find response
    const response = offer.responses.find((r: any) => r._id?.toString() === responseId);
    if (!response) {
      throw new NotFoundError('Response not found');
    }

    // Mark response as accepted
    response.isAccepted = true;
    offer.selectedVendor = response.vendor;
    offer.selectedResponse = responseId as any;
    offer.status = 'accepted';
    offer.acceptedAt = new Date();

    // Create booking
    const finalPrice = response.counterOffer || response.proposedPrice;

    const booking = await Booking.create({
      bookingType: BookingType.OFFER_BASED,
      client: clientId,
      vendor: response.vendor,
      service: offer.service,
      offer: offer._id,
      scheduledDate: offer.preferredDate || new Date(),
      scheduledTime: offer.preferredTime,
      duration: response.estimatedDuration,
      location: offer.location,
      servicePrice: finalPrice,
      distanceCharge: 0, // Already negotiated in offer price
      totalAmount: finalPrice,
      status: BookingStatus.PENDING,
      paymentStatus: 'pending',
      clientMarkedComplete: false,
      vendorMarkedComplete: false,
      hasDispute: false,
      hasReview: false,
      statusHistory: [
        {
          status: BookingStatus.PENDING,
          changedAt: new Date(),
          changedBy: clientId as any,
        },
      ],
    });

    offer.bookingId = booking._id;
    await offer.save();

    logger.info(`Offer accepted: ${offerId}, booking created: ${booking._id}`);

    return { offer, booking };
  }

  /**
   * Get offer by ID
   */
  public async getOfferById(offerId: string, userId: string): Promise<IOffer> {
    const offer = await Offer.findById(offerId)
      .populate('client', 'firstName lastName avatar')
      .populate('category', 'name icon')
      .populate('service', 'name images')
      .populate('responses.vendor', 'firstName lastName vendorProfile');

    if (!offer) {
      throw new NotFoundError('Offer not found');
    }

    // Verify access
    const isClient = offer.client._id.toString() === userId;
    const hasResponded = offer.responses.some((r) => r.vendor._id.toString() === userId);

    if (!isClient && !hasResponded) {
      throw new ForbiddenError('Not authorized to view this offer');
    }

    return offer;
  }

  /**
   * Get client offers
   */
  public async getClientOffers(
    clientId: string,
    page: number = 1,
    limit: number = 10
  ): Promise<{ offers: IOffer[]; total: number; page: number; totalPages: number }> {
    const { skip } = parsePaginationParams(page, limit);

    const [offers, total] = await Promise.all([
      Offer.find({ client: clientId })
        .populate('category', 'name icon')
        .populate('service', 'name')
        .populate('responses.vendor', 'firstName lastName vendorProfile')
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 }),
      Offer.countDocuments({ client: clientId }),
    ]);

    return {
      offers,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get vendor offer responses
   */
  public async getVendorResponses(
    vendorId: string,
    page: number = 1,
    limit: number = 10
  ): Promise<{ offers: IOffer[]; total: number; page: number; totalPages: number }> {
    const { skip } = parsePaginationParams(page, limit);

    const [offers, total] = await Promise.all([
      Offer.find({ 'responses.vendor': vendorId })
        .populate('client', 'firstName lastName avatar')
        .populate('category', 'name icon')
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 }),
      Offer.countDocuments({ 'responses.vendor': vendorId }),
    ]);

    return {
      offers,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Close offer (client)
   */
  public async closeOffer(offerId: string, clientId: string): Promise<IOffer> {
    const offer = await Offer.findById(offerId);

    if (!offer) {
      throw new NotFoundError('Offer not found');
    }

    // Verify ownership
    if (offer.client.toString() !== clientId) {
      throw new ForbiddenError('Only the offer creator can close offers');
    }

    if (offer.status !== 'open') {
      throw new BadRequestError('Only open offers can be closed');
    }

    offer.status = 'closed';
    await offer.save();

    logger.info(`Offer closed: ${offerId}`);

    return offer;
  }
}

export default new OfferService();
