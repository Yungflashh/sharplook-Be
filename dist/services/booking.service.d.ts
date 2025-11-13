import { IBooking } from '../models/Booking';
import { BookingStatus } from '../types';
declare class BookingService {
    /**
     * Create standard booking
     */
    createBooking(clientId: string, data: {
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
    }): Promise<IBooking>;
    /**
     * Accept booking (Vendor)
     */
    acceptBooking(bookingId: string, vendorId: string): Promise<IBooking>;
    /**
     * Reject booking (Vendor)
     */
    rejectBooking(bookingId: string, vendorId: string, reason?: string): Promise<IBooking>;
    /**
     * Start booking (move to in progress)
     */
    startBooking(bookingId: string, vendorId: string): Promise<IBooking>;
    /**
     * Mark booking as complete (by client or vendor)
     */
    markComplete(bookingId: string, userId: string, role: 'client' | 'vendor'): Promise<IBooking>;
    /**
     * Cancel booking
     */
    cancelBooking(bookingId: string, userId: string, reason?: string): Promise<IBooking>;
    /**
     * Get booking by ID
     */
    getBookingById(bookingId: string, userId: string): Promise<IBooking>;
    /**
     * Get user bookings
     */
    getUserBookings(userId: string, role: 'client' | 'vendor', filters?: {
        status?: BookingStatus;
        startDate?: Date;
        endDate?: Date;
    }, page?: number, limit?: number): Promise<{
        bookings: IBooking[];
        total: number;
        page: number;
        totalPages: number;
    }>;
    /**
     * Get booking statistics
     */
    getBookingStats(userId: string, role: 'client' | 'vendor'): Promise<any>;
    /**
     * Update booking (add notes, etc.)
     */
    updateBooking(bookingId: string, userId: string, updates: {
        clientNotes?: string;
        vendorNotes?: string;
    }): Promise<IBooking>;
}
declare const _default: BookingService;
export default _default;
//# sourceMappingURL=booking.service.d.ts.map