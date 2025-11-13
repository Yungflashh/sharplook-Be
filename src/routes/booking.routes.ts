import { Router } from 'express';
import bookingController from '../controllers/booking.controller';
import { authenticate, requireVendor } from '../middlewares/auth';
import { validate, validatePagination } from '../middlewares/validate';
import {
  createBookingValidation,
  updateBookingValidation,
  reasonValidation,
  bookingIdValidation,
  getBookingsValidation,
  createOfferValidation,
  respondToOfferValidation,
  counterOfferValidation,
  offerIdValidation,
  responseIdValidation,
  getOffersValidation,
} from '../validations/booking.validation';

const router = Router();

// ==================== STANDARD BOOKING ROUTES ====================

/**
 * @route   POST /api/v1/bookings
 * @desc    Create a standard booking
 * @access  Private (Client)
 */
router.post(
  '/',
  authenticate,
  validate(createBookingValidation),
  bookingController.createBooking
);

/**
 * @route   GET /api/v1/bookings/my-bookings
 * @desc    Get user bookings (client or vendor)
 * @access  Private
 */
router.get(
  '/my-bookings',
  authenticate,
  validatePagination,
  validate(getBookingsValidation),
  bookingController.getMyBookings
);

/**
 * @route   GET /api/v1/bookings/stats
 * @desc    Get booking statistics
 * @access  Private
 */
router.get('/stats', authenticate, bookingController.getBookingStats);

/**
 * @route   GET /api/v1/bookings/:bookingId
 * @desc    Get booking by ID
 * @access  Private (Client or Vendor)
 */
router.get(
  '/:bookingId',
  authenticate,
  validate(bookingIdValidation),
  bookingController.getBookingById
);

/**
 * @route   PUT /api/v1/bookings/:bookingId
 * @desc    Update booking notes
 * @access  Private (Client or Vendor)
 */
router.put(
  '/:bookingId',
  authenticate,
  validate([...bookingIdValidation, ...updateBookingValidation]),
  bookingController.updateBooking
);

/**
 * @route   POST /api/v1/bookings/:bookingId/accept
 * @desc    Accept booking (Vendor)
 * @access  Private (Vendor)
 */
router.post(
  '/:bookingId/accept',
  authenticate,
  requireVendor,
  validate(bookingIdValidation),
  bookingController.acceptBooking
);

/**
 * @route   POST /api/v1/bookings/:bookingId/reject
 * @desc    Reject booking (Vendor)
 * @access  Private (Vendor)
 */
router.post(
  '/:bookingId/reject',
  authenticate,
  requireVendor,
  validate([...bookingIdValidation, ...reasonValidation]),
  bookingController.rejectBooking
);

/**
 * @route   POST /api/v1/bookings/:bookingId/start
 * @desc    Start booking (Vendor)
 * @access  Private (Vendor)
 */
router.post(
  '/:bookingId/start',
  authenticate,
  requireVendor,
  validate(bookingIdValidation),
  bookingController.startBooking
);

/**
 * @route   POST /api/v1/bookings/:bookingId/complete
 * @desc    Mark booking as complete
 * @access  Private (Client or Vendor)
 */
router.post(
  '/:bookingId/complete',
  authenticate,
  validate(bookingIdValidation),
  bookingController.markComplete
);

/**
 * @route   POST /api/v1/bookings/:bookingId/cancel
 * @desc    Cancel booking
 * @access  Private (Client or Vendor)
 */
router.post(
  '/:bookingId/cancel',
  authenticate,
  validate([...bookingIdValidation, ...reasonValidation]),
  bookingController.cancelBooking
);

// ==================== OFFER-BASED BOOKING ROUTES ====================

/**
 * @route   POST /api/v1/bookings/offers
 * @desc    Create offer request
 * @access  Private (Client)
 */
router.post(
  '/offers',
  authenticate,
  validate(createOfferValidation),
  bookingController.createOffer
);

/**
 * @route   GET /api/v1/bookings/offers/available
 * @desc    Get available offers (for vendors)
 * @access  Private (Vendor)
 */
router.get(
  '/offers/available',
  authenticate,
  requireVendor,
  validatePagination,
  validate(getOffersValidation),
  bookingController.getAvailableOffers
);

/**
 * @route   GET /api/v1/bookings/offers/my-offers
 * @desc    Get client's offers
 * @access  Private (Client)
 */
router.get(
  '/offers/my-offers',
  authenticate,
  validatePagination,
  bookingController.getMyOffers
);

/**
 * @route   GET /api/v1/bookings/offers/my-responses
 * @desc    Get vendor's responses to offers
 * @access  Private (Vendor)
 */
router.get(
  '/offers/my-responses',
  authenticate,
  requireVendor,
  validatePagination,
  bookingController.getMyResponses
);

/**
 * @route   GET /api/v1/bookings/offers/:offerId
 * @desc    Get offer by ID
 * @access  Private (Client or responding Vendor)
 */
router.get(
  '/offers/:offerId',
  authenticate,
  validate(offerIdValidation),
  bookingController.getOfferById
);

/**
 * @route   POST /api/v1/bookings/offers/:offerId/respond
 * @desc    Vendor responds to offer
 * @access  Private (Vendor)
 */
router.post(
  '/offers/:offerId/respond',
  authenticate,
  requireVendor,
  validate([...offerIdValidation, ...respondToOfferValidation]),
  bookingController.respondToOffer
);

/**
 * @route   POST /api/v1/bookings/offers/:offerId/responses/:responseId/counter
 * @desc    Client submits counter offer
 * @access  Private (Client)
 */
router.post(
  '/offers/:offerId/responses/:responseId/counter',
  authenticate,
  validate([...offerIdValidation, ...responseIdValidation, ...counterOfferValidation]),
  bookingController.counterOffer
);

/**
 * @route   POST /api/v1/bookings/offers/:offerId/responses/:responseId/accept
 * @desc    Client accepts vendor response
 * @access  Private (Client)
 */
router.post(
  '/offers/:offerId/responses/:responseId/accept',
  authenticate,
  validate([...offerIdValidation, ...responseIdValidation]),
  bookingController.acceptResponse
);

/**
 * @route   POST /api/v1/bookings/offers/:offerId/close
 * @desc    Close offer
 * @access  Private (Client)
 */
router.post(
  '/offers/:offerId/close',
  authenticate,
  validate(offerIdValidation),
  bookingController.closeOffer
);

export default router;
