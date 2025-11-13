import { Response, NextFunction } from 'express';
declare class ServiceController {
    /**
     * Create service (Vendor)
     * POST /api/v1/services
     */
    createService: (req: import("express").Request, res: Response, next: NextFunction) => void;
    /**
     * Get all services
     * GET /api/v1/services
     */
    getAllServices: (req: import("express").Request, res: Response, next: NextFunction) => void;
    /**
     * Get service by ID
     * GET /api/v1/services/:serviceId
     */
    getServiceById: (req: import("express").Request, res: Response, next: NextFunction) => void;
    /**
     * Get service by slug
     * GET /api/v1/services/slug/:slug
     */
    getServiceBySlug: (req: import("express").Request, res: Response, next: NextFunction) => void;
    /**
     * Update service (Vendor)
     * PUT /api/v1/services/:serviceId
     */
    updateService: (req: import("express").Request, res: Response, next: NextFunction) => void;
    /**
     * Delete service (Vendor)
     * DELETE /api/v1/services/:serviceId
     */
    deleteService: (req: import("express").Request, res: Response, next: NextFunction) => void;
    /**
     * Toggle service status (Vendor)
     * PATCH /api/v1/services/:serviceId/toggle
     */
    toggleServiceStatus: (req: import("express").Request, res: Response, next: NextFunction) => void;
    /**
     * Get vendor services
     * GET /api/v1/services/vendor/my-services
     */
    getMyServices: (req: import("express").Request, res: Response, next: NextFunction) => void;
    /**
     * Get service reviews
     * GET /api/v1/services/:serviceId/reviews
     */
    getServiceReviews: (req: import("express").Request, res: Response, next: NextFunction) => void;
    /**
     * Add review (Client - will be called after booking completion)
     * POST /api/v1/services/:serviceId/reviews
     */
    addReview: (req: import("express").Request, res: Response, next: NextFunction) => void;
    /**
     * Respond to review (Vendor)
     * POST /api/v1/services/reviews/:reviewId/respond
     */
    respondToReview: (req: import("express").Request, res: Response, next: NextFunction) => void;
    /**
     * Get trending services
     * GET /api/v1/services/trending
     */
    getTrendingServices: (req: import("express").Request, res: Response, next: NextFunction) => void;
    /**
     * Get popular services by category
     * GET /api/v1/services/popular/:categoryId
     */
    getPopularByCategory: (req: import("express").Request, res: Response, next: NextFunction) => void;
}
declare const _default: ServiceController;
export default _default;
//# sourceMappingURL=service.controller.d.ts.map