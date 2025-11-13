"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Booking_1 = __importDefault(require("../models/Booking"));
const Service_1 = __importDefault(require("../models/Service"));
const User_1 = __importDefault(require("../models/User"));
const errors_1 = require("../utils/errors");
const types_1 = require("../types");
const helpers_1 = require("../utils/helpers");
const logger_1 = __importDefault(require("../utils/logger"));
class BookingService {
    /**
     * Create standard booking
     */
    async createBooking(clientId, data) {
        // Verify service exists and is active
        const service = await Service_1.default.findById(data.service).populate('vendor');
        if (!service || !service.isActive) {
            throw new errors_1.NotFoundError('Service not found or not available');
        }
        // Verify vendor
        const vendor = await User_1.default.findById(service.vendor);
        if (!vendor || !vendor.isVendor || !vendor.vendorProfile?.isVerified) {
            throw new errors_1.BadRequestError('Vendor is not available');
        }
        // Check if vendor provides home service
        const isHomeService = vendor.vendorProfile.vendorType === 'home_service' ||
            vendor.vendorProfile.vendorType === 'both';
        // Calculate pricing
        let distanceCharge = 0;
        let location;
        if (isHomeService && data.location) {
            location = {
                type: 'Point',
                coordinates: data.location.coordinates,
                address: data.location.address,
                city: data.location.city,
                state: data.location.state,
            };
            // Calculate distance charge
            if (vendor.vendorProfile.location) {
                const distance = (0, helpers_1.calculateDistance)(vendor.vendorProfile.location.coordinates[1], vendor.vendorProfile.location.coordinates[0], data.location.coordinates[1], data.location.coordinates[0]);
                distanceCharge = (0, helpers_1.calculateServiceCharge)(distance);
            }
        }
        else if (isHomeService && !data.location) {
            throw new errors_1.BadRequestError('Location is required for home service');
        }
        const totalAmount = service.basePrice + distanceCharge;
        // Create booking
        const booking = await Booking_1.default.create({
            bookingType: types_1.BookingType.STANDARD,
            client: clientId,
            vendor: service.vendor,
            service: service._id,
            scheduledDate: data.scheduledDate,
            scheduledTime: data.scheduledTime,
            duration: service.duration,
            location,
            servicePrice: service.basePrice,
            distanceCharge,
            totalAmount,
            status: types_1.BookingStatus.PENDING,
            clientNotes: data.clientNotes,
            paymentStatus: 'pending',
            clientMarkedComplete: false,
            vendorMarkedComplete: false,
            hasDispute: false,
            hasReview: false,
            statusHistory: [
                {
                    status: types_1.BookingStatus.PENDING,
                    changedAt: new Date(),
                    changedBy: clientId,
                },
            ],
        });
        // Update service booking count
        if (service.metadata) {
            service.metadata.bookings = (service.metadata.bookings || 0) + 1;
            await service.save();
        }
        logger_1.default.info(`Booking created: ${booking._id} by client ${clientId}`);
        return booking;
    }
    /**
     * Accept booking (Vendor)
     */
    async acceptBooking(bookingId, vendorId) {
        const booking = await Booking_1.default.findById(bookingId);
        if (!booking) {
            throw new errors_1.NotFoundError('Booking not found');
        }
        // Verify ownership
        if (booking.vendor.toString() !== vendorId) {
            throw new errors_1.ForbiddenError('You can only accept your own bookings');
        }
        // Check status
        if (booking.status !== types_1.BookingStatus.PENDING) {
            throw new errors_1.BadRequestError('Only pending bookings can be accepted');
        }
        // Check payment
        if (booking.paymentStatus !== 'escrowed') {
            throw new errors_1.BadRequestError('Payment must be completed before accepting');
        }
        booking.status = types_1.BookingStatus.ACCEPTED;
        booking.acceptedAt = new Date();
        await booking.save();
        logger_1.default.info(`Booking accepted: ${bookingId} by vendor ${vendorId}`);
        return booking;
    }
    /**
     * Reject booking (Vendor)
     */
    async rejectBooking(bookingId, vendorId, reason) {
        const booking = await Booking_1.default.findById(bookingId);
        if (!booking) {
            throw new errors_1.NotFoundError('Booking not found');
        }
        // Verify ownership
        if (booking.vendor.toString() !== vendorId) {
            throw new errors_1.ForbiddenError('You can only reject your own bookings');
        }
        // Check status
        if (booking.status !== types_1.BookingStatus.PENDING) {
            throw new errors_1.BadRequestError('Only pending bookings can be rejected');
        }
        booking.status = types_1.BookingStatus.CANCELLED;
        booking.rejectedAt = new Date();
        booking.cancelledBy = vendorId;
        booking.cancellationReason = reason || 'Rejected by vendor';
        // Refund payment if escrowed
        if (booking.paymentStatus === 'escrowed') {
            booking.paymentStatus = 'refunded';
            // Payment refund will be handled by payment service
        }
        await booking.save();
        logger_1.default.info(`Booking rejected: ${bookingId} by vendor ${vendorId}`);
        return booking;
    }
    /**
     * Start booking (move to in progress)
     */
    async startBooking(bookingId, vendorId) {
        const booking = await Booking_1.default.findById(bookingId);
        if (!booking) {
            throw new errors_1.NotFoundError('Booking not found');
        }
        // Verify ownership
        if (booking.vendor.toString() !== vendorId) {
            throw new errors_1.ForbiddenError('Only the vendor can start this booking');
        }
        // Check status
        if (booking.status !== types_1.BookingStatus.ACCEPTED) {
            throw new errors_1.BadRequestError('Only accepted bookings can be started');
        }
        booking.status = types_1.BookingStatus.IN_PROGRESS;
        await booking.save();
        logger_1.default.info(`Booking started: ${bookingId}`);
        return booking;
    }
    /**
     * Mark booking as complete (by client or vendor)
     */
    async markComplete(bookingId, userId, role) {
        const booking = await Booking_1.default.findById(bookingId);
        if (!booking) {
            throw new errors_1.NotFoundError('Booking not found');
        }
        // Verify ownership
        if (role === 'client' && booking.client.toString() !== userId) {
            throw new errors_1.ForbiddenError('Not authorized');
        }
        if (role === 'vendor' && booking.vendor.toString() !== userId) {
            throw new errors_1.ForbiddenError('Not authorized');
        }
        // Check status
        if (![types_1.BookingStatus.ACCEPTED, types_1.BookingStatus.IN_PROGRESS].includes(booking.status)) {
            throw new errors_1.BadRequestError('Only accepted or in-progress bookings can be completed');
        }
        // Mark as complete
        if (role === 'client') {
            booking.clientMarkedComplete = true;
        }
        else {
            booking.vendorMarkedComplete = true;
        }
        // Check if both marked complete
        if (booking.clientMarkedComplete && booking.vendorMarkedComplete) {
            booking.status = types_1.BookingStatus.COMPLETED;
            booking.completedAt = new Date();
            booking.completedBy = 'both';
            // Release payment to vendor
            if (booking.paymentStatus === 'escrowed') {
                booking.paymentStatus = 'released';
                // Payment release will be handled by payment service
            }
            // Update service completed bookings count
            const service = await Service_1.default.findById(booking.service);
            if (service && service.metadata) {
                service.metadata.completedBookings = (service.metadata.completedBookings || 0) + 1;
                await service.save();
            }
            // Update vendor completed bookings
            const vendor = await User_1.default.findById(booking.vendor);
            if (vendor && vendor.vendorProfile) {
                vendor.vendorProfile.completedBookings = (vendor.vendorProfile.completedBookings || 0) + 1;
                await vendor.save();
            }
        }
        await booking.save();
        logger_1.default.info(`Booking marked complete by ${role}: ${bookingId}`);
        return booking;
    }
    /**
     * Cancel booking
     */
    async cancelBooking(bookingId, userId, reason) {
        const booking = await Booking_1.default.findById(bookingId);
        if (!booking) {
            throw new errors_1.NotFoundError('Booking not found');
        }
        // Verify ownership
        const isClient = booking.client.toString() === userId;
        const isVendor = booking.vendor.toString() === userId;
        if (!isClient && !isVendor) {
            throw new errors_1.ForbiddenError('Not authorized to cancel this booking');
        }
        // Check status
        if ([types_1.BookingStatus.COMPLETED, types_1.BookingStatus.CANCELLED].includes(booking.status)) {
            throw new errors_1.BadRequestError('Cannot cancel completed or already cancelled bookings');
        }
        booking.status = types_1.BookingStatus.CANCELLED;
        booking.cancelledAt = new Date();
        booking.cancelledBy = userId;
        booking.cancellationReason = reason;
        // Handle payment refund
        if (booking.paymentStatus === 'escrowed') {
            booking.paymentStatus = 'refunded';
            // Payment refund will be handled by payment service
        }
        await booking.save();
        logger_1.default.info(`Booking cancelled: ${bookingId} by user ${userId}`);
        return booking;
    }
    /**
     * Get booking by ID
     */
    async getBookingById(bookingId, userId) {
        const booking = await Booking_1.default.findById(bookingId)
            .populate('client', 'firstName lastName email phone avatar')
            .populate('vendor', 'firstName lastName email phone vendorProfile')
            .populate('service', 'name description basePrice images');
        if (!booking) {
            throw new errors_1.NotFoundError('Booking not found');
        }
        // Verify access
        const isClient = booking.client._id.toString() === userId;
        const isVendor = booking.vendor._id.toString() === userId;
        if (!isClient && !isVendor) {
            throw new errors_1.ForbiddenError('Not authorized to view this booking');
        }
        return booking;
    }
    /**
     * Get user bookings
     */
    async getUserBookings(userId, role, filters, page = 1, limit = 10) {
        const { skip } = (0, helpers_1.parsePaginationParams)(page, limit);
        const query = role === 'client' ? { client: userId } : { vendor: userId };
        if (filters?.status) {
            query.status = filters.status;
        }
        if (filters?.startDate || filters?.endDate) {
            query.scheduledDate = {};
            if (filters.startDate) {
                query.scheduledDate.$gte = filters.startDate;
            }
            if (filters.endDate) {
                query.scheduledDate.$lte = filters.endDate;
            }
        }
        const [bookings, total] = await Promise.all([
            Booking_1.default.find(query)
                .populate('client', 'firstName lastName avatar')
                .populate('vendor', 'firstName lastName vendorProfile.businessName avatar')
                .populate('service', 'name images basePrice')
                .skip(skip)
                .limit(limit)
                .sort({ createdAt: -1 }),
            Booking_1.default.countDocuments(query),
        ]);
        return {
            bookings,
            total,
            page,
            totalPages: Math.ceil(total / limit),
        };
    }
    /**
     * Get booking statistics
     */
    async getBookingStats(userId, role) {
        const query = role === 'client' ? { client: userId } : { vendor: userId };
        const [total, pending, accepted, inProgress, completed, cancelled,] = await Promise.all([
            Booking_1.default.countDocuments(query),
            Booking_1.default.countDocuments({ ...query, status: types_1.BookingStatus.PENDING }),
            Booking_1.default.countDocuments({ ...query, status: types_1.BookingStatus.ACCEPTED }),
            Booking_1.default.countDocuments({ ...query, status: types_1.BookingStatus.IN_PROGRESS }),
            Booking_1.default.countDocuments({ ...query, status: types_1.BookingStatus.COMPLETED }),
            Booking_1.default.countDocuments({ ...query, status: types_1.BookingStatus.CANCELLED }),
        ]);
        return {
            total,
            pending,
            accepted,
            inProgress,
            completed,
            cancelled,
        };
    }
    /**
     * Update booking (add notes, etc.)
     */
    async updateBooking(bookingId, userId, updates) {
        const booking = await Booking_1.default.findById(bookingId);
        if (!booking) {
            throw new errors_1.NotFoundError('Booking not found');
        }
        // Verify ownership
        const isClient = booking.client.toString() === userId;
        const isVendor = booking.vendor.toString() === userId;
        if (!isClient && !isVendor) {
            throw new errors_1.ForbiddenError('Not authorized');
        }
        // Update appropriate notes
        if (isClient && updates.clientNotes !== undefined) {
            booking.clientNotes = updates.clientNotes;
        }
        if (isVendor && updates.vendorNotes !== undefined) {
            booking.vendorNotes = updates.vendorNotes;
        }
        await booking.save();
        return booking;
    }
}
exports.default = new BookingService();
//# sourceMappingURL=booking.service.js.map