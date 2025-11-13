import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import bookingService from '../services/booking.service';
import offerService from '../services/offer.service';
import ResponseHandler from '../utils/response';
import { asyncHandler } from '../middlewares/error';

class BookingController {
  // Standard Booking Endpoints
  
  public createBooking = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const clientId = req.user!.id;
      const booking = await bookingService.createBooking(clientId, req.body);
      return ResponseHandler.created(res, 'Booking created successfully. Please complete payment.', { booking });
    }
  );

  public getBookingById = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const { bookingId } = req.params;
      const userId = req.user!.id;
      const booking = await bookingService.getBookingById(bookingId, userId);
      return ResponseHandler.success(res, 'Booking retrieved successfully', { booking });
    }
  );

  public getMyBookings = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const userId = req.user!.id;
      const role = req.query.role as 'client' | 'vendor' || 'client';
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const filters = {
        status: req.query.status as any,
        startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
        endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
      };
      
      const result = await bookingService.getUserBookings(userId, role, filters, page, limit);
      return ResponseHandler.paginated(res, 'Bookings retrieved successfully', result.bookings, page, limit, result.total);
    }
  );

  public acceptBooking = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const { bookingId } = req.params;
      const vendorId = req.user!.id;
      const booking = await bookingService.acceptBooking(bookingId, vendorId);
      return ResponseHandler.success(res, 'Booking accepted successfully', { booking });
    }
  );

  public rejectBooking = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const { bookingId } = req.params;
      const vendorId = req.user!.id;
      const { reason } = req.body;
      const booking = await bookingService.rejectBooking(bookingId, vendorId, reason);
      return ResponseHandler.success(res, 'Booking rejected', { booking });
    }
  );

  public startBooking = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const { bookingId } = req.params;
      const vendorId = req.user!.id;
      const booking = await bookingService.startBooking(bookingId, vendorId);
      return ResponseHandler.success(res, 'Booking started', { booking });
    }
  );

  public markComplete = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const { bookingId } = req.params;
      const userId = req.user!.id;
      const role = req.user!.isVendor ? 'vendor' : 'client';
      const booking = await bookingService.markComplete(bookingId, userId, role);
      return ResponseHandler.success(res, 'Booking marked as complete', { booking });
    }
  );

  public cancelBooking = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const { bookingId } = req.params;
      const userId = req.user!.id;
      const { reason } = req.body;
      const booking = await bookingService.cancelBooking(bookingId, userId, reason);
      return ResponseHandler.success(res, 'Booking cancelled', { booking });
    }
  );

  public updateBooking = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const { bookingId } = req.params;
      const userId = req.user!.id;
      const booking = await bookingService.updateBooking(bookingId, userId, req.body);
      return ResponseHandler.success(res, 'Booking updated', { booking });
    }
  );

  public getBookingStats = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const userId = req.user!.id;
      const role = req.query.role as 'client' | 'vendor' || 'client';
      const stats = await bookingService.getBookingStats(userId, role);
      return ResponseHandler.success(res, 'Booking statistics retrieved', { stats });
    }
  );

  // Offer-Based Booking Endpoints

  public createOffer = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const clientId = req.user!.id;
      const offer = await offerService.createOffer(clientId, req.body);
      return ResponseHandler.created(res, 'Offer created successfully', { offer });
    }
  );

  public getAvailableOffers = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const vendorId = req.user!.id;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const filters: any = {
        category: req.query.category as string,
        priceMin: req.query.priceMin ? parseFloat(req.query.priceMin as string) : undefined,
        priceMax: req.query.priceMax ? parseFloat(req.query.priceMax as string) : undefined,
      };

      if (req.query.latitude && req.query.longitude) {
        filters.location = {
          latitude: parseFloat(req.query.latitude as string),
          longitude: parseFloat(req.query.longitude as string),
          maxDistance: req.query.maxDistance ? parseInt(req.query.maxDistance as string) : 20,
        };
      }

      const result = await offerService.getAvailableOffers(vendorId, filters, page, limit);
      return ResponseHandler.paginated(res, 'Available offers retrieved', result.offers, page, limit, result.total);
    }
  );

  public respondToOffer = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const { offerId } = req.params;
      const vendorId = req.user!.id;
      const offer = await offerService.respondToOffer(offerId, vendorId, req.body);
      return ResponseHandler.success(res, 'Response submitted successfully', { offer });
    }
  );

  public counterOffer = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const { offerId, responseId } = req.params;
      const clientId = req.user!.id;
      const { counterPrice } = req.body;
      const offer = await offerService.counterOffer(offerId, clientId, responseId, counterPrice);
      return ResponseHandler.success(res, 'Counter offer submitted', { offer });
    }
  );

  public acceptResponse = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const { offerId, responseId } = req.params;
      const clientId = req.user!.id;
      const result = await offerService.acceptResponse(offerId, clientId, responseId);
      return ResponseHandler.success(res, 'Vendor selected and booking created', result);
    }
  );

  public getOfferById = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const { offerId } = req.params;
      const userId = req.user!.id;
      const offer = await offerService.getOfferById(offerId, userId);
      return ResponseHandler.success(res, 'Offer retrieved successfully', { offer });
    }
  );

  public getMyOffers = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const clientId = req.user!.id;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const result = await offerService.getClientOffers(clientId, page, limit);
      return ResponseHandler.paginated(res, 'Your offers retrieved', result.offers, page, limit, result.total);
    }
  );

  public getMyResponses = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const vendorId = req.user!.id;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const result = await offerService.getVendorResponses(vendorId, page, limit);
      return ResponseHandler.paginated(res, 'Your responses retrieved', result.offers, page, limit, result.total);
    }
  );

  public closeOffer = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const { offerId } = req.params;
      const clientId = req.user!.id;
      const offer = await offerService.closeOffer(offerId, clientId);
      return ResponseHandler.success(res, 'Offer closed', { offer });
    }
  );
}

export default new BookingController();
