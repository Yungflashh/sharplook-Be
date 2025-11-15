"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Service_1 = __importDefault(require("../models/Service"));
const Review_1 = __importDefault(require("../models/Review"));
const User_1 = __importDefault(require("../models/User"));
const Category_1 = __importDefault(require("../models/Category"));
const errors_1 = require("../utils/errors");
const helpers_1 = require("../utils/helpers");
const logger_1 = __importDefault(require("../utils/logger"));
class ServiceService {
    /**
     * Create a new service
     */
    async createService(vendorId, data) {
        // Verify vendor
        const vendor = await User_1.default.findById(vendorId);
        if (!vendor || !vendor.isVendor) {
            throw new errors_1.UnauthorizedError('Only vendors can create services');
        }
        if (!vendor.vendorProfile?.isVerified) {
            throw new errors_1.ForbiddenError('Vendor account must be verified to create services');
        }
        // Verify category exists
        const category = await Category_1.default.findById(data.category);
        if (!category) {
            throw new errors_1.NotFoundError('Category not found');
        }
        // Verify subcategory if provided
        if (data.subCategory) {
            const subCategory = await Category_1.default.findById(data.subCategory);
            if (!subCategory) {
                throw new errors_1.NotFoundError('Subcategory not found');
            }
        }
        // Generate unique slug
        let slug = (0, helpers_1.slugify)(data.name);
        let isUnique = false;
        let counter = 1;
        while (!isUnique) {
            const existingService = await Service_1.default.findOne({ slug });
            if (!existingService) {
                isUnique = true;
            }
            else {
                slug = `${(0, helpers_1.slugify)(data.name)}-${counter}`;
                counter++;
            }
        }
        const service = await Service_1.default.create({
            vendor: vendorId,
            ...data,
            slug,
            isActive: false,
            approvalStatus: 'pending',
        });
        logger_1.default.info(`Service created: ${service.name} by vendor ${vendorId} - Pending approval`);
        return service;
    }
    /**
     * Get all services with filters
     */
    async getAllServices(filters, page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc') {
        const { skip } = (0, helpers_1.parsePaginationParams)(page, limit);
        // Build query
        const query = {};
        // For public-facing queries (no vendor or approval status filter), only show approved and active
        if (!filters?.approvalStatus && !filters?.vendor) {
            query.isActive = true;
            query.approvalStatus = 'approved';
        }
        else {
            // For admin or vendor queries, allow filtering
            if (filters?.isActive !== undefined) {
                query.isActive = filters.isActive;
            }
            if (filters?.approvalStatus) {
                query.approvalStatus = filters.approvalStatus;
            }
        }
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
        let vendorIds;
        if (filters?.location) {
            const maxDistance = (filters.location.maxDistance || 10) * 1000; // Convert km to meters
            const nearbyVendors = await User_1.default.find({
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
            }
            else {
                // No vendors in range, return empty result
                return { services: [], total: 0, page, totalPages: 0 };
            }
        }
        // Build sort
        const sort = {};
        sort[sortBy] = sortOrder === 'asc' ? 1 : -1;
        const [services, total] = await Promise.all([
            Service_1.default.find(query)
                .populate('vendor', 'firstName lastName email vendorProfile.businessName vendorProfile.rating')
                .populate('category', 'name slug icon')
                .populate('subCategory', 'name slug icon')
                .skip(skip)
                .limit(limit)
                .sort(sort),
            Service_1.default.countDocuments(query),
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
    async getServiceById(serviceId, incrementView = false) {
        const service = await Service_1.default.findById(serviceId)
            .populate('vendor', 'firstName lastName email vendorProfile')
            .populate('category', 'name slug icon')
            .populate('subCategory', 'name slug icon');
        if (!service) {
            throw new errors_1.NotFoundError('Service not found');
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
    async getServiceBySlug(slug, incrementView = false) {
        const service = await Service_1.default.findOne({ slug })
            .populate('vendor', 'firstName lastName email vendorProfile')
            .populate('category', 'name slug icon')
            .populate('subCategory', 'name slug icon');
        if (!service) {
            throw new errors_1.NotFoundError('Service not found');
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
    async updateService(serviceId, vendorId, updates) {
        const service = await Service_1.default.findById(serviceId);
        if (!service) {
            throw new errors_1.NotFoundError('Service not found');
        }
        // Check ownership
        if (service.vendor.toString() !== vendorId) {
            throw new errors_1.ForbiddenError('You can only update your own services');
        }
        // Update slug if name changes
        if (updates.name && updates.name !== service.name) {
            let slug = (0, helpers_1.slugify)(updates.name);
            let isUnique = false;
            let counter = 1;
            while (!isUnique) {
                const existingService = await Service_1.default.findOne({ slug, _id: { $ne: serviceId } });
                if (!existingService) {
                    isUnique = true;
                }
                else {
                    slug = `${(0, helpers_1.slugify)(updates.name)}-${counter}`;
                    counter++;
                }
            }
            service.slug = slug;
        }
        // Verify category if being updated
        if (updates.category) {
            const category = await Category_1.default.findById(updates.category);
            if (!category) {
                throw new errors_1.NotFoundError('Category not found');
            }
        }
        // If service was previously approved and significant changes are made, reset to pending
        const significantFields = ['name', 'description', 'category', 'basePrice', 'images'];
        const hasSignificantChanges = Object.keys(updates).some(key => significantFields.includes(key));
        if (hasSignificantChanges && service.approvalStatus === 'approved') {
            service.approvalStatus = 'pending';
            service.isActive = false;
            logger_1.default.info(`Service ${service.name} reset to pending approval due to significant changes`);
        }
        // Update fields
        Object.assign(service, updates);
        await service.save();
        logger_1.default.info(`Service updated: ${service.name}`);
        return service;
    }
    /**
     * Delete service (soft delete)
     */
    async deleteService(serviceId, vendorId) {
        const service = await Service_1.default.findById(serviceId);
        if (!service) {
            throw new errors_1.NotFoundError('Service not found');
        }
        // Check ownership
        if (service.vendor.toString() !== vendorId) {
            throw new errors_1.ForbiddenError('You can only delete your own services');
        }
        service.isDeleted = true;
        service.deletedAt = new Date();
        service.isActive = false;
        await service.save();
        logger_1.default.info(`Service deleted: ${service.name}`);
    }
    /**
     * Toggle service active status
     */
    async toggleServiceStatus(serviceId, vendorId) {
        const service = await Service_1.default.findById(serviceId);
        if (!service) {
            throw new errors_1.NotFoundError('Service not found');
        }
        // Check ownership
        if (service.vendor.toString() !== vendorId) {
            throw new errors_1.ForbiddenError('You can only update your own services');
        }
        // Only allow toggling if service is approved
        if (service.approvalStatus !== 'approved') {
            throw new errors_1.BadRequestError('Service must be approved before it can be activated');
        }
        service.isActive = !service.isActive;
        await service.save();
        logger_1.default.info(`Service status toggled: ${service.name} - ${service.isActive}`);
        return service;
    }
    /**
     * Get vendor services
     */
    async getVendorServices(vendorId, page = 1, limit = 20) {
        return this.getAllServices({ vendor: vendorId }, page, limit);
    }
    /**
     * ADMIN: Approve a service
     */
    async approveService(serviceId, adminId, notes) {
        // Verify admin
        const admin = await User_1.default.findById(adminId);
        if (!admin || admin.role !== 'admin') {
            throw new errors_1.UnauthorizedError('Only admins can approve services');
        }
        const service = await Service_1.default.findById(serviceId)
            .populate('vendor', 'firstName lastName email');
        if (!service) {
            throw new errors_1.NotFoundError('Service not found');
        }
        if (service.approvalStatus === 'approved') {
            throw new errors_1.BadRequestError('Service is already approved');
        }
        service.approvalStatus = 'approved';
        service.isActive = true;
        service.approvedBy = admin._id;
        service.approvedAt = new Date();
        if (notes) {
            service.approvalNotes = notes;
        }
        await service.save();
        logger_1.default.info(`Service approved: ${service.name} by admin ${adminId}`);
        // TODO: Send notification to vendor about approval
        // await NotificationService.sendServiceApprovalNotification(service.vendor, service);
        return service;
    }
    /**
     * ADMIN: Reject a service
     */
    async rejectService(serviceId, adminId, reason) {
        // Verify admin
        const admin = await User_1.default.findById(adminId);
        if (!admin || admin.role !== 'admin') {
            throw new errors_1.UnauthorizedError('Only admins can reject services');
        }
        if (!reason || reason.trim().length === 0) {
            throw new errors_1.BadRequestError('Rejection reason is required');
        }
        const service = await Service_1.default.findById(serviceId)
            .populate('vendor', 'firstName lastName email');
        if (!service) {
            throw new errors_1.NotFoundError('Service not found');
        }
        service.approvalStatus = 'rejected';
        service.isActive = false;
        service.rejectedBy = admin._id;
        service.rejectedAt = new Date();
        service.rejectionReason = reason;
        await service.save();
        logger_1.default.info(`Service rejected: ${service.name} by admin ${adminId} - Reason: ${reason}`);
        // TODO: Send notification to vendor about rejection
        // await NotificationService.sendServiceRejectionNotification(service.vendor, service, reason);
        return service;
    }
    /**
     * ADMIN: Get all pending services for approval
     */
    async getPendingServices(page = 1, limit = 20) {
        return this.getAllServices({ approvalStatus: 'pending' }, page, limit, 'createdAt', 'asc');
    }
    /**
     * ADMIN: Get service approval statistics
     */
    async getApprovalStats() {
        const [pending, approved, rejected, total] = await Promise.all([
            Service_1.default.countDocuments({ approvalStatus: 'pending', isDeleted: false }),
            Service_1.default.countDocuments({ approvalStatus: 'approved', isDeleted: false }),
            Service_1.default.countDocuments({ approvalStatus: 'rejected', isDeleted: false }),
            Service_1.default.countDocuments({ isDeleted: false }),
        ]);
        return {
            pending,
            approved,
            rejected,
            total,
        };
    }
    /**
     * Add review to service
     */
    async addReview(serviceId, clientId, bookingId, data) {
        const service = await Service_1.default.findById(serviceId);
        if (!service) {
            throw new errors_1.NotFoundError('Service not found');
        }
        // Check if user already reviewed this service
        const existingReview = await Review_1.default.findOne({ service: serviceId, client: clientId });
        if (existingReview) {
            throw new errors_1.BadRequestError('You have already reviewed this service');
        }
        // Create review
        const review = await Review_1.default.create({
            service: serviceId,
            vendor: service.vendor,
            client: clientId,
            booking: bookingId,
            ...data,
            isVerified: true,
        });
        logger_1.default.info(`Review added for service ${serviceId} by client ${clientId}`);
        return review;
    }
    /**
     * Get service reviews
     */
    async getServiceReviews(serviceId, page = 1, limit = 10) {
        const { skip } = (0, helpers_1.parsePaginationParams)(page, limit);
        const [reviews, total] = await Promise.all([
            Review_1.default.find({ service: serviceId })
                .populate('client', 'firstName lastName avatar')
                .skip(skip)
                .limit(limit)
                .sort({ createdAt: -1 }),
            Review_1.default.countDocuments({ service: serviceId }),
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
    async respondToReview(reviewId, vendorId, responseText) {
        const review = await Review_1.default.findById(reviewId);
        if (!review) {
            throw new errors_1.NotFoundError('Review not found');
        }
        // Check ownership - reviewee should be the vendor
        if (review.reviewee.toString() !== vendorId) {
            throw new errors_1.ForbiddenError('You can only respond to reviews about you');
        }
        review.response = {
            comment: responseText,
            respondedAt: new Date(),
        };
        await review.save();
        logger_1.default.info(`Vendor responded to review ${reviewId}`);
        return review;
    }
    /**
     * Get trending services
     */
    async getTrendingServices(limit = 10) {
        const services = await Service_1.default.find({
            isActive: true,
            approvalStatus: 'approved'
        })
            .populate('vendor', 'firstName lastName vendorProfile.businessName vendorProfile.rating')
            .populate('category', 'name slug icon')
            .sort({ 'metadata.bookings': -1, 'metadata.averageRating': -1 })
            .limit(limit);
        return services;
    }
    /**
     * Get popular services by category
     */
    async getPopularByCategory(categoryId, limit = 5) {
        const services = await Service_1.default.find({
            category: categoryId,
            isActive: true,
            approvalStatus: 'approved'
        })
            .populate('vendor', 'firstName lastName vendorProfile.businessName')
            .sort({ 'metadata.averageRating': -1, 'metadata.bookings': -1 })
            .limit(limit);
        return services;
    }
}
exports.default = new ServiceService();
//# sourceMappingURL=service.service.js.map