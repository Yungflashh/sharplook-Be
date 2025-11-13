import Booking, { IBooking } from '../models/Booking';
import Service from '../models/Service';
import User from '../models/User';
import {
  NotFoundError,
  BadRequestError,
  ForbiddenError,
} from '../utils/errors';
import { BookingStatus, BookingType } from '../types';
import { calculateDistance, calculateServiceCharge, parsePaginationParams } from '../utils/helpers';
import logger from '../utils/logger';

class BookingService {
  /**
   * Create standard booking
   */
  public async createBooking(
    clientId: string,
    data: {
      service: string;
      scheduledDate: Date;
      scheduledTime?: string;
      location?: {
        address: string;
        city: string;
        state: string;
        coordinates: [number, number];
      };
      clientNotes?: string;
    }
  ): Promise<IBooking> {
    // Verify service exists and is active
    const service = await Service.findById(data.service).populate('vendor');
    if (!service || !service.isActive) {
      throw new NotFoundError('Service not found or not available');
    }

    // Verify vendor
    const vendor = await User.findById(service.vendor);
    if (!vendor || !vendor.isVendor || !vendor.vendorProfile?.isVerified) {
      throw new BadRequestError('Vendor is not available');
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
        const distance = calculateDistance(
          vendor.vendorProfile.location.coordinates[1],
          vendor.vendorProfile.location.coordinates[0],
          data.location.coordinates[1],
          data.location.coordinates[0]
        );

        distanceCharge = calculateServiceCharge(distance);
      }
    } else if (isHomeService && !data.location) {
      throw new BadRequestError('Location is required for home service');
    }

    const totalAmount = service.basePrice + distanceCharge;

    // Create booking
    const booking = await Booking.create({
      bookingType: BookingType.STANDARD,
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
      status: BookingStatus.PENDING,
      clientNotes: data.clientNotes,
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

    // Update service booking count
    if (service.metadata) {
      service.metadata.bookings = (service.metadata.bookings || 0) + 1;
      await service.save();
    }

    logger.info(`Booking created: ${booking._id} by client ${clientId}`);

    return booking;
  }

  /**
   * Accept booking (Vendor)
   */
  public async acceptBooking(bookingId: string, vendorId: string): Promise<IBooking> {
    const booking = await Booking.findById(bookingId);

    if (!booking) {
      throw new NotFoundError('Booking not found');
    }

    // Verify ownership
    if (booking.vendor.toString() !== vendorId) {
      throw new ForbiddenError('You can only accept your own bookings');
    }

    // Check status
    if (booking.status !== BookingStatus.PENDING) {
      throw new BadRequestError('Only pending bookings can be accepted');
    }

    // Check payment
    if (booking.paymentStatus !== 'escrowed') {
      throw new BadRequestError('Payment must be completed before accepting');
    }

    booking.status = BookingStatus.ACCEPTED;
    booking.acceptedAt = new Date();
    await booking.save();

    logger.info(`Booking accepted: ${bookingId} by vendor ${vendorId}`);

    return booking;
  }

  /**
   * Reject booking (Vendor)
   */
  public async rejectBooking(
    bookingId: string,
    vendorId: string,
    reason?: string
  ): Promise<IBooking> {
    const booking = await Booking.findById(bookingId);

    if (!booking) {
      throw new NotFoundError('Booking not found');
    }

    // Verify ownership
    if (booking.vendor.toString() !== vendorId) {
      throw new ForbiddenError('You can only reject your own bookings');
    }

    // Check status
    if (booking.status !== BookingStatus.PENDING) {
      throw new BadRequestError('Only pending bookings can be rejected');
    }

    booking.status = BookingStatus.CANCELLED;
    booking.rejectedAt = new Date();
    booking.cancelledBy = vendorId as any;
    booking.cancellationReason = reason || 'Rejected by vendor';
    
    // Refund payment if escrowed
    if (booking.paymentStatus === 'escrowed') {
      booking.paymentStatus = 'refunded';
      // Payment refund will be handled by payment service
    }

    await booking.save();

    logger.info(`Booking rejected: ${bookingId} by vendor ${vendorId}`);

    return booking;
  }

  /**
   * Start booking (move to in progress)
   */
  public async startBooking(bookingId: string, vendorId: string): Promise<IBooking> {
    const booking = await Booking.findById(bookingId);

    if (!booking) {
      throw new NotFoundError('Booking not found');
    }

    // Verify ownership
    if (booking.vendor.toString() !== vendorId) {
      throw new ForbiddenError('Only the vendor can start this booking');
    }

    // Check status
    if (booking.status !== BookingStatus.ACCEPTED) {
      throw new BadRequestError('Only accepted bookings can be started');
    }

    booking.status = BookingStatus.IN_PROGRESS;
    await booking.save();

    logger.info(`Booking started: ${bookingId}`);

    return booking;
  }

  /**
   * Mark booking as complete (by client or vendor)
   */
  public async markComplete(
    bookingId: string,
    userId: string,
    role: 'client' | 'vendor'
  ): Promise<IBooking> {
    const booking = await Booking.findById(bookingId);

    if (!booking) {
      throw new NotFoundError('Booking not found');
    }

    // Verify ownership
    if (role === 'client' && booking.client.toString() !== userId) {
      throw new ForbiddenError('Not authorized');
    }
    if (role === 'vendor' && booking.vendor.toString() !== userId) {
      throw new ForbiddenError('Not authorized');
    }

    // Check status
    if (![BookingStatus.ACCEPTED, BookingStatus.IN_PROGRESS].includes(booking.status)) {
      throw new BadRequestError('Only accepted or in-progress bookings can be completed');
    }

    // Mark as complete
    if (role === 'client') {
      booking.clientMarkedComplete = true;
    } else {
      booking.vendorMarkedComplete = true;
    }

    // Check if both marked complete
    if (booking.clientMarkedComplete && booking.vendorMarkedComplete) {
      booking.status = BookingStatus.COMPLETED;
      booking.completedAt = new Date();
      booking.completedBy = 'both';

      // Release payment to vendor
      if (booking.paymentStatus === 'escrowed') {
        booking.paymentStatus = 'released';
        // Payment release will be handled by payment service
      }

      // Update service completed bookings count
      const service = await Service.findById(booking.service);
      if (service && service.metadata) {
        service.metadata.completedBookings = (service.metadata.completedBookings || 0) + 1;
        await service.save();
      }

      // Update vendor completed bookings
      const vendor = await User.findById(booking.vendor);
      if (vendor && vendor.vendorProfile) {
        vendor.vendorProfile.completedBookings = (vendor.vendorProfile.completedBookings || 0) + 1;
        await vendor.save();
      }
    }

    await booking.save();

    logger.info(`Booking marked complete by ${role}: ${bookingId}`);

    return booking;
  }

  /**
   * Cancel booking
   */
  public async cancelBooking(
    bookingId: string,
    userId: string,
    reason?: string
  ): Promise<IBooking> {
    const booking = await Booking.findById(bookingId);

    if (!booking) {
      throw new NotFoundError('Booking not found');
    }

    // Verify ownership
    const isClient = booking.client.toString() === userId;
    const isVendor = booking.vendor.toString() === userId;

    if (!isClient && !isVendor) {
      throw new ForbiddenError('Not authorized to cancel this booking');
    }

    // Check status
    if ([BookingStatus.COMPLETED, BookingStatus.CANCELLED].includes(booking.status)) {
      throw new BadRequestError('Cannot cancel completed or already cancelled bookings');
    }

    booking.status = BookingStatus.CANCELLED;
    booking.cancelledAt = new Date();
    booking.cancelledBy = userId as any;
    booking.cancellationReason = reason;

    // Handle payment refund
    if (booking.paymentStatus === 'escrowed') {
      booking.paymentStatus = 'refunded';
      // Payment refund will be handled by payment service
    }

    await booking.save();

    logger.info(`Booking cancelled: ${bookingId} by user ${userId}`);

    return booking;
  }

  /**
   * Get booking by ID
   */
  public async getBookingById(bookingId: string, userId: string): Promise<IBooking> {
    const booking = await Booking.findById(bookingId)
      .populate('client', 'firstName lastName email phone avatar')
      .populate('vendor', 'firstName lastName email phone vendorProfile')
      .populate('service', 'name description basePrice images');

    if (!booking) {
      throw new NotFoundError('Booking not found');
    }

    // Verify access
    const isClient = booking.client._id.toString() === userId;
    const isVendor = booking.vendor._id.toString() === userId;

    if (!isClient && !isVendor) {
      throw new ForbiddenError('Not authorized to view this booking');
    }

    return booking;
  }

  /**
   * Get user bookings
   */
  public async getUserBookings(
    userId: string,
    role: 'client' | 'vendor',
    filters?: {
      status?: BookingStatus;
      startDate?: Date;
      endDate?: Date;
    },
    page: number = 1,
    limit: number = 10
  ): Promise<{ bookings: IBooking[]; total: number; page: number; totalPages: number }> {
    const { skip } = parsePaginationParams(page, limit);

    const query: any = role === 'client' ? { client: userId } : { vendor: userId };

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
      Booking.find(query)
        .populate('client', 'firstName lastName avatar')
        .populate('vendor', 'firstName lastName vendorProfile.businessName avatar')
        .populate('service', 'name images basePrice')
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 }),
      Booking.countDocuments(query),
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
  public async getBookingStats(userId: string, role: 'client' | 'vendor'): Promise<any> {
    const query = role === 'client' ? { client: userId } : { vendor: userId };

    const [
      total,
      pending,
      accepted,
      inProgress,
      completed,
      cancelled,
    ] = await Promise.all([
      Booking.countDocuments(query),
      Booking.countDocuments({ ...query, status: BookingStatus.PENDING }),
      Booking.countDocuments({ ...query, status: BookingStatus.ACCEPTED }),
      Booking.countDocuments({ ...query, status: BookingStatus.IN_PROGRESS }),
      Booking.countDocuments({ ...query, status: BookingStatus.COMPLETED }),
      Booking.countDocuments({ ...query, status: BookingStatus.CANCELLED }),
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
  public async updateBooking(
    bookingId: string,
    userId: string,
    updates: {
      clientNotes?: string;
      vendorNotes?: string;
    }
  ): Promise<IBooking> {
    const booking = await Booking.findById(bookingId);

    if (!booking) {
      throw new NotFoundError('Booking not found');
    }

    // Verify ownership
    const isClient = booking.client.toString() === userId;
    const isVendor = booking.vendor.toString() === userId;

    if (!isClient && !isVendor) {
      throw new ForbiddenError('Not authorized');
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

export default new BookingService();
