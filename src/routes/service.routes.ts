import { Router } from 'express';
import serviceController from '../controllers/service.controller';
import { authenticate, requireVendor, optionalAuth } from '../middlewares/auth';
import { validate, validatePagination } from '../middlewares/validate';
import {
  createServiceValidation,
  updateServiceValidation,
  serviceIdValidation,
  serviceSlugValidation,
  getServicesValidation,
  addReviewValidation,
  respondToReviewValidation,
  reviewIdValidation,
} from '../validations/service.validation';

const router = Router();

/**
 * @route   GET /api/v1/services/trending
 * @desc    Get trending services
 * @access  Public
 */
router.get('/trending', optionalAuth, serviceController.getTrendingServices);

/**
 * @route   GET /api/v1/services/popular/:categoryId
 * @desc    Get popular services by category
 * @access  Public
 */
router.get('/popular/:categoryId', optionalAuth, serviceController.getPopularByCategory);

/**
 * @route   GET /api/v1/services/vendor/my-services
 * @desc    Get vendor's own services
 * @access  Private (Vendor)
 */
router.get(
  '/vendor/my-services',
  authenticate,
  requireVendor,
  validatePagination,
  serviceController.getMyServices
);

/**
 * @route   GET /api/v1/services/slug/:slug
 * @desc    Get service by slug
 * @access  Public
 */
router.get(
  '/slug/:slug',
  optionalAuth,
  validate(serviceSlugValidation),
  serviceController.getServiceBySlug
);

/**
 * @route   GET /api/v1/services/:serviceId/reviews
 * @desc    Get service reviews
 * @access  Public
 */
router.get(
  '/:serviceId/reviews',
  optionalAuth,
  validatePagination,
  validate(serviceIdValidation),
  serviceController.getServiceReviews
);

/**
 * @route   GET /api/v1/services/:serviceId
 * @desc    Get service by ID
 * @access  Public
 */
router.get(
  '/:serviceId',
  optionalAuth,
  validate(serviceIdValidation),
  serviceController.getServiceById
);

/**
 * @route   GET /api/v1/services
 * @desc    Get all services with filters
 * @access  Public
 */
router.get(
  '/',
  optionalAuth,
  validatePagination,
  validate(getServicesValidation),
  serviceController.getAllServices
);

/**
 * @route   POST /api/v1/services
 * @desc    Create service
 * @access  Private (Vendor)
 */
router.post(
  '/',
  authenticate,
  requireVendor,
  validate(createServiceValidation),
  serviceController.createService
);

/**
 * @route   POST /api/v1/services/:serviceId/reviews
 * @desc    Add review to service
 * @access  Private (Client - after booking completion)
 */
router.post(
  '/:serviceId/reviews',
  authenticate,
  validate([...serviceIdValidation, ...addReviewValidation]),
  serviceController.addReview
);

/**
 * @route   POST /api/v1/services/reviews/:reviewId/respond
 * @desc    Respond to review
 * @access  Private (Vendor)
 */
router.post(
  '/reviews/:reviewId/respond',
  authenticate,
  requireVendor,
  validate([...reviewIdValidation, ...respondToReviewValidation]),
  serviceController.respondToReview
);

/**
 * @route   PUT /api/v1/services/:serviceId
 * @desc    Update service
 * @access  Private (Vendor)
 */
router.put(
  '/:serviceId',
  authenticate,
  requireVendor,
  validate([...serviceIdValidation, ...updateServiceValidation]),
  serviceController.updateService
);

/**
 * @route   PATCH /api/v1/services/:serviceId/toggle
 * @desc    Toggle service active status
 * @access  Private (Vendor)
 */
router.patch(
  '/:serviceId/toggle',
  authenticate,
  requireVendor,
  validate(serviceIdValidation),
  serviceController.toggleServiceStatus
);

/**
 * @route   DELETE /api/v1/services/:serviceId
 * @desc    Delete service
 * @access  Private (Vendor)
 */
router.delete(
  '/:serviceId',
  authenticate,
  requireVendor,
  validate(serviceIdValidation),
  serviceController.deleteService
);

export default router;
