"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const booking_service_1 = __importDefault(require("../services/booking.service"));
const offer_service_1 = __importDefault(require("../services/offer.service"));
const response_1 = __importDefault(require("../utils/response"));
const error_1 = require("../middlewares/error");
class BookingController {
    constructor() {
        // Standard Booking Endpoints
        this.createBooking = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const clientId = req.user.id;
            const booking = await booking_service_1.default.createBooking(clientId, req.body);
            return response_1.default.created(res, 'Booking created successfully. Please complete payment.', { booking });
        });
        this.getBookingById = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const { bookingId } = req.params;
            const userId = req.user.id;
            const booking = await booking_service_1.default.getBookingById(bookingId, userId);
            return response_1.default.success(res, 'Booking retrieved successfully', { booking });
        });
        this.getMyBookings = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const userId = req.user.id;
            const role = req.query.role || 'client';
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const filters = {
                status: req.query.status,
                startDate: req.query.startDate ? new Date(req.query.startDate) : undefined,
                endDate: req.query.endDate ? new Date(req.query.endDate) : undefined,
            };
            const result = await booking_service_1.default.getUserBookings(userId, role, filters, page, limit);
            return response_1.default.paginated(res, 'Bookings retrieved successfully', result.bookings, page, limit, result.total);
        });
        this.acceptBooking = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const { bookingId } = req.params;
            const vendorId = req.user.id;
            const booking = await booking_service_1.default.acceptBooking(bookingId, vendorId);
            return response_1.default.success(res, 'Booking accepted successfully', { booking });
        });
        this.rejectBooking = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const { bookingId } = req.params;
            const vendorId = req.user.id;
            const { reason } = req.body;
            const booking = await booking_service_1.default.rejectBooking(bookingId, vendorId, reason);
            return response_1.default.success(res, 'Booking rejected', { booking });
        });
        this.startBooking = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const { bookingId } = req.params;
            const vendorId = req.user.id;
            const booking = await booking_service_1.default.startBooking(bookingId, vendorId);
            return response_1.default.success(res, 'Booking started', { booking });
        });
        this.markComplete = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const { bookingId } = req.params;
            const userId = req.user.id;
            const role = req.user.isVendor ? 'vendor' : 'client';
            const booking = await booking_service_1.default.markComplete(bookingId, userId, role);
            return response_1.default.success(res, 'Booking marked as complete', { booking });
        });
        this.cancelBooking = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const { bookingId } = req.params;
            const userId = req.user.id;
            const { reason } = req.body;
            const booking = await booking_service_1.default.cancelBooking(bookingId, userId, reason);
            return response_1.default.success(res, 'Booking cancelled', { booking });
        });
        this.updateBooking = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const { bookingId } = req.params;
            const userId = req.user.id;
            const booking = await booking_service_1.default.updateBooking(bookingId, userId, req.body);
            return response_1.default.success(res, 'Booking updated', { booking });
        });
        this.getBookingStats = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const userId = req.user.id;
            const role = req.query.role || 'client';
            const stats = await booking_service_1.default.getBookingStats(userId, role);
            return response_1.default.success(res, 'Booking statistics retrieved', { stats });
        });
        // Offer-Based Booking Endpoints
        this.createOffer = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const clientId = req.user.id;
            const offer = await offer_service_1.default.createOffer(clientId, req.body);
            return response_1.default.created(res, 'Offer created successfully', { offer });
        });
        this.getAvailableOffers = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const vendorId = req.user.id;
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const filters = {
                category: req.query.category,
                priceMin: req.query.priceMin ? parseFloat(req.query.priceMin) : undefined,
                priceMax: req.query.priceMax ? parseFloat(req.query.priceMax) : undefined,
            };
            if (req.query.latitude && req.query.longitude) {
                filters.location = {
                    latitude: parseFloat(req.query.latitude),
                    longitude: parseFloat(req.query.longitude),
                    maxDistance: req.query.maxDistance ? parseInt(req.query.maxDistance) : 20,
                };
            }
            const result = await offer_service_1.default.getAvailableOffers(vendorId, filters, page, limit);
            return response_1.default.paginated(res, 'Available offers retrieved', result.offers, page, limit, result.total);
        });
        this.respondToOffer = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const { offerId } = req.params;
            const vendorId = req.user.id;
            const offer = await offer_service_1.default.respondToOffer(offerId, vendorId, req.body);
            return response_1.default.success(res, 'Response submitted successfully', { offer });
        });
        this.counterOffer = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const { offerId, responseId } = req.params;
            const clientId = req.user.id;
            const { counterPrice } = req.body;
            const offer = await offer_service_1.default.counterOffer(offerId, clientId, responseId, counterPrice);
            return response_1.default.success(res, 'Counter offer submitted', { offer });
        });
        this.acceptResponse = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const { offerId, responseId } = req.params;
            const clientId = req.user.id;
            const result = await offer_service_1.default.acceptResponse(offerId, clientId, responseId);
            return response_1.default.success(res, 'Vendor selected and booking created', result);
        });
        this.getOfferById = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const { offerId } = req.params;
            const userId = req.user.id;
            const offer = await offer_service_1.default.getOfferById(offerId, userId);
            return response_1.default.success(res, 'Offer retrieved successfully', { offer });
        });
        this.getMyOffers = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const clientId = req.user.id;
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const result = await offer_service_1.default.getClientOffers(clientId, page, limit);
            return response_1.default.paginated(res, 'Your offers retrieved', result.offers, page, limit, result.total);
        });
        this.getMyResponses = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const vendorId = req.user.id;
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const result = await offer_service_1.default.getVendorResponses(vendorId, page, limit);
            return response_1.default.paginated(res, 'Your responses retrieved', result.offers, page, limit, result.total);
        });
        this.closeOffer = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const { offerId } = req.params;
            const clientId = req.user.id;
            const offer = await offer_service_1.default.closeOffer(offerId, clientId);
            return response_1.default.success(res, 'Offer closed', { offer });
        });
    }
}
exports.default = new BookingController();
//# sourceMappingURL=booking.controller.js.map