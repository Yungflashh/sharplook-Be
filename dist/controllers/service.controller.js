"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const service_service_1 = __importDefault(require("../services/service.service"));
const response_1 = __importDefault(require("../utils/response"));
const error_1 = require("../middlewares/error");
class ServiceController {
    constructor() {
        /**
         * Create service (Vendor)
         * POST /api/v1/services
         */
        this.createService = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const vendorId = req.user.id;
            const service = await service_service_1.default.createService(vendorId, req.body);
            return response_1.default.created(res, 'Service created successfully and pending approval', {
                service,
            });
        });
        /**
         * Get all services
         * GET /api/v1/services
         */
        this.getAllServices = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 20;
            const sortBy = req.query.sortBy || 'createdAt';
            const sortOrder = req.query.sortOrder || 'desc';
            const filters = {
                vendor: req.query.vendor,
                category: req.query.category,
                subCategory: req.query.subCategory,
                priceMin: req.query.priceMin ? parseFloat(req.query.priceMin) : undefined,
                priceMax: req.query.priceMax ? parseFloat(req.query.priceMax) : undefined,
                rating: req.query.rating ? parseFloat(req.query.rating) : undefined,
                search: req.query.search,
                isActive: req.query.isActive === 'false' ? false : undefined,
            };
            // Admin can filter by approval status
            if (req.query.approvalStatus && req.user?.role === 'admin') {
                filters.approvalStatus = req.query.approvalStatus;
            }
            // Add location filter if coordinates provided
            if (req.query.latitude && req.query.longitude) {
                filters.location = {
                    latitude: parseFloat(req.query.latitude),
                    longitude: parseFloat(req.query.longitude),
                    maxDistance: req.query.maxDistance ? parseInt(req.query.maxDistance) : 10,
                };
            }
            const result = await service_service_1.default.getAllServices(filters, page, limit, sortBy, sortOrder);
            return response_1.default.paginated(res, 'Services retrieved successfully', result.services, page, limit, result.total);
        });
        /**
         * Get service by ID
         * GET /api/v1/services/:serviceId
         */
        this.getServiceById = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const { serviceId } = req.params;
            const incrementView = req.query.view === 'true';
            const service = await service_service_1.default.getServiceById(serviceId, incrementView);
            return response_1.default.success(res, 'Service retrieved successfully', {
                service,
            });
        });
        /**
         * Get service by slug
         * GET /api/v1/services/slug/:slug
         */
        this.getServiceBySlug = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const { slug } = req.params;
            const incrementView = req.query.view === 'true';
            const service = await service_service_1.default.getServiceBySlug(slug, incrementView);
            return response_1.default.success(res, 'Service retrieved successfully', {
                service,
            });
        });
        /**
         * Update service (Vendor)
         * PUT /api/v1/services/:serviceId
         */
        this.updateService = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const { serviceId } = req.params;
            const vendorId = req.user.id;
            const service = await service_service_1.default.updateService(serviceId, vendorId, req.body);
            return response_1.default.success(res, 'Service updated successfully', {
                service,
            });
        });
        /**
         * Delete service (Vendor)
         * DELETE /api/v1/services/:serviceId
         */
        this.deleteService = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const { serviceId } = req.params;
            const vendorId = req.user.id;
            await service_service_1.default.deleteService(serviceId, vendorId);
            return response_1.default.success(res, 'Service deleted successfully');
        });
        /**
         * Toggle service status (Vendor)
         * PATCH /api/v1/services/:serviceId/toggle
         */
        this.toggleServiceStatus = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const { serviceId } = req.params;
            const vendorId = req.user.id;
            const service = await service_service_1.default.toggleServiceStatus(serviceId, vendorId);
            return response_1.default.success(res, 'Service status updated successfully', {
                service: {
                    id: service._id,
                    name: service.name,
                    isActive: service.isActive,
                },
            });
        });
        /**
         * Get vendor services
         * GET /api/v1/services/vendor/my-services
         */
        this.getMyServices = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const vendorId = req.user.id;
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 20;
            const result = await service_service_1.default.getVendorServices(vendorId, page, limit);
            return response_1.default.paginated(res, 'Your services retrieved successfully', result.services, page, limit, result.total);
        });
        /**
         * Get service reviews
         * GET /api/v1/services/:serviceId/reviews
         */
        this.getServiceReviews = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const { serviceId } = req.params;
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const result = await service_service_1.default.getServiceReviews(serviceId, page, limit);
            return response_1.default.paginated(res, 'Reviews retrieved successfully', result.reviews, page, limit, result.total);
        });
        /**
         * Add review (Client - will be called after booking completion)
         * POST /api/v1/services/:serviceId/reviews
         */
        this.addReview = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const { serviceId } = req.params;
            const clientId = req.user.id;
            const { bookingId, rating, comment, images } = req.body;
            const review = await service_service_1.default.addReview(serviceId, clientId, bookingId, {
                rating,
                comment,
                images,
            });
            return response_1.default.created(res, 'Review added successfully', {
                review,
            });
        });
        /**
         * Respond to review (Vendor)
         * POST /api/v1/services/reviews/:reviewId/respond
         */
        this.respondToReview = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const { reviewId } = req.params;
            const vendorId = req.user.id;
            const { response } = req.body;
            const review = await service_service_1.default.respondToReview(reviewId, vendorId, response);
            return response_1.default.success(res, 'Response added successfully', {
                review,
            });
        });
        /**
         * Get trending services
         * GET /api/v1/services/trending
         */
        this.getTrendingServices = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const limit = parseInt(req.query.limit) || 10;
            const services = await service_service_1.default.getTrendingServices(limit);
            return response_1.default.success(res, 'Trending services retrieved successfully', {
                services,
            });
        });
        /**
         * Get popular services by category
         * GET /api/v1/services/popular/:categoryId
         */
        this.getPopularByCategory = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const { categoryId } = req.params;
            const limit = parseInt(req.query.limit) || 5;
            const services = await service_service_1.default.getPopularByCategory(categoryId, limit);
            return response_1.default.success(res, 'Popular services retrieved successfully', {
                services,
            });
        });
        // ==================== ADMIN ENDPOINTS ====================
        /**
         * Get pending services (Admin)
         * GET /api/v1/services/admin/pending
         */
        this.getPendingServices = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 20;
            const result = await service_service_1.default.getPendingServices(page, limit);
            return response_1.default.paginated(res, 'Pending services retrieved successfully', result.services, page, limit, result.total);
        });
        /**
         * Get approval statistics (Admin)
         * GET /api/v1/services/admin/stats
         */
        this.getApprovalStats = (0, error_1.asyncHandler)(async (_req, res, _next) => {
            const stats = await service_service_1.default.getApprovalStats();
            return response_1.default.success(res, 'Approval statistics retrieved successfully', stats);
        });
        /**
         * Approve service (Admin)
         * POST /api/v1/services/:serviceId/approve
         */
        this.approveService = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const { serviceId } = req.params;
            const adminId = req.user.id;
            const { notes } = req.body;
            const service = await service_service_1.default.approveService(serviceId, adminId, notes);
            return response_1.default.success(res, 'Service approved successfully', {
                service,
            });
        });
        /**
         * Reject service (Admin)
         * POST /api/v1/services/:serviceId/reject
         */
        this.rejectService = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const { serviceId } = req.params;
            const adminId = req.user.id;
            const { reason } = req.body;
            const service = await service_service_1.default.rejectService(serviceId, adminId, reason);
            return response_1.default.success(res, 'Service rejected successfully', {
                service,
            });
        });
    }
}
exports.default = new ServiceController();
//# sourceMappingURL=service.controller.js.map