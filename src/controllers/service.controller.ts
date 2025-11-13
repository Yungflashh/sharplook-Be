import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import serviceService from '../services/service.service';
import ResponseHandler from '../utils/response';
import { asyncHandler } from '../middlewares/error';

class ServiceController {
  /**
   * Create service (Vendor)
   * POST /api/v1/services
   */
  public createService = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const vendorId = req.user!.id;

      const service = await serviceService.createService(vendorId, req.body);

      return ResponseHandler.created(res, 'Service created successfully', {
        service,
      });
    }
  );

  /**
   * Get all services
   * GET /api/v1/services
   */
  public getAllServices = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const sortBy = (req.query.sortBy as string) || 'createdAt';
      const sortOrder = (req.query.sortOrder as 'asc' | 'desc') || 'desc';

      const filters: any = {
        vendor: req.query.vendor as string,
        category: req.query.category as string,
        subCategory: req.query.subCategory as string,
        priceMin: req.query.priceMin ? parseFloat(req.query.priceMin as string) : undefined,
        priceMax: req.query.priceMax ? parseFloat(req.query.priceMax as string) : undefined,
        rating: req.query.rating ? parseFloat(req.query.rating as string) : undefined,
        search: req.query.search as string,
        isActive: req.query.isActive === 'false' ? false : undefined,
      };

      // Add location filter if coordinates provided
      if (req.query.latitude && req.query.longitude) {
        filters.location = {
          latitude: parseFloat(req.query.latitude as string),
          longitude: parseFloat(req.query.longitude as string),
          maxDistance: req.query.maxDistance ? parseInt(req.query.maxDistance as string) : 10,
        };
      }

      const result = await serviceService.getAllServices(
        filters,
        page,
        limit,
        sortBy,
        sortOrder
      );

      return ResponseHandler.paginated(
        res,
        'Services retrieved successfully',
        result.services,
        page,
        limit,
        result.total
      );
    }
  );

  /**
   * Get service by ID
   * GET /api/v1/services/:serviceId
   */
  public getServiceById = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const { serviceId } = req.params;
      const incrementView = req.query.view === 'true';

      const service = await serviceService.getServiceById(serviceId, incrementView);

      return ResponseHandler.success(res, 'Service retrieved successfully', {
        service,
      });
    }
  );

  /**
   * Get service by slug
   * GET /api/v1/services/slug/:slug
   */
  public getServiceBySlug = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const { slug } = req.params;
      const incrementView = req.query.view === 'true';

      const service = await serviceService.getServiceBySlug(slug, incrementView);

      return ResponseHandler.success(res, 'Service retrieved successfully', {
        service,
      });
    }
  );

  /**
   * Update service (Vendor)
   * PUT /api/v1/services/:serviceId
   */
  public updateService = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const { serviceId } = req.params;
      const vendorId = req.user!.id;

      const service = await serviceService.updateService(serviceId, vendorId, req.body);

      return ResponseHandler.success(res, 'Service updated successfully', {
        service,
      });
    }
  );

  /**
   * Delete service (Vendor)
   * DELETE /api/v1/services/:serviceId
   */
  public deleteService = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const { serviceId } = req.params;
      const vendorId = req.user!.id;

      await serviceService.deleteService(serviceId, vendorId);

      return ResponseHandler.success(res, 'Service deleted successfully');
    }
  );

  /**
   * Toggle service status (Vendor)
   * PATCH /api/v1/services/:serviceId/toggle
   */
  public toggleServiceStatus = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const { serviceId } = req.params;
      const vendorId = req.user!.id;

      const service = await serviceService.toggleServiceStatus(serviceId, vendorId);

      return ResponseHandler.success(res, 'Service status updated successfully', {
        service: {
          id: service._id,
          name: service.name,
          isActive: service.isActive,
        },
      });
    }
  );

  /**
   * Get vendor services
   * GET /api/v1/services/vendor/my-services
   */
  public getMyServices = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const vendorId = req.user!.id;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const result = await serviceService.getVendorServices(vendorId, page, limit);

      return ResponseHandler.paginated(
        res,
        'Your services retrieved successfully',
        result.services,
        page,
        limit,
        result.total
      );
    }
  );

  /**
   * Get service reviews
   * GET /api/v1/services/:serviceId/reviews
   */
  public getServiceReviews = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const { serviceId } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      const result = await serviceService.getServiceReviews(serviceId, page, limit);

      return ResponseHandler.paginated(
        res,
        'Reviews retrieved successfully',
        result.reviews,
        page,
        limit,
        result.total
      );
    }
  );

  /**
   * Add review (Client - will be called after booking completion)
   * POST /api/v1/services/:serviceId/reviews
   */
  public addReview = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const { serviceId } = req.params;
      const clientId = req.user!.id;
      const { bookingId, rating, comment, images } = req.body;

      const review = await serviceService.addReview(serviceId, clientId, bookingId, {
        rating,
        comment,
        images,
      });

      return ResponseHandler.created(res, 'Review added successfully', {
        review,
      });
    }
  );

  /**
   * Respond to review (Vendor)
   * POST /api/v1/services/reviews/:reviewId/respond
   */
  public respondToReview = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const { reviewId } = req.params;
      const vendorId = req.user!.id;
      const { response } = req.body;

      const review = await serviceService.respondToReview(reviewId, vendorId, response);

      return ResponseHandler.success(res, 'Response added successfully', {
        review,
      });
    }
  );

  /**
   * Get trending services
   * GET /api/v1/services/trending
   */
  public getTrendingServices = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const limit = parseInt(req.query.limit as string) || 10;

      const services = await serviceService.getTrendingServices(limit);

      return ResponseHandler.success(res, 'Trending services retrieved successfully', {
        services,
      });
    }
  );

  /**
   * Get popular services by category
   * GET /api/v1/services/popular/:categoryId
   */
  public getPopularByCategory = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const { categoryId } = req.params;
      const limit = parseInt(req.query.limit as string) || 5;

      const services = await serviceService.getPopularByCategory(categoryId, limit);

      return ResponseHandler.success(res, 'Popular services retrieved successfully', {
        services,
      });
    }
  );
}

export default new ServiceController();
