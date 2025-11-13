import { Response, NextFunction } from 'express';
declare class BookingController {
    createBooking: (req: import("express").Request, res: Response, next: NextFunction) => void;
    getBookingById: (req: import("express").Request, res: Response, next: NextFunction) => void;
    getMyBookings: (req: import("express").Request, res: Response, next: NextFunction) => void;
    acceptBooking: (req: import("express").Request, res: Response, next: NextFunction) => void;
    rejectBooking: (req: import("express").Request, res: Response, next: NextFunction) => void;
    startBooking: (req: import("express").Request, res: Response, next: NextFunction) => void;
    markComplete: (req: import("express").Request, res: Response, next: NextFunction) => void;
    cancelBooking: (req: import("express").Request, res: Response, next: NextFunction) => void;
    updateBooking: (req: import("express").Request, res: Response, next: NextFunction) => void;
    getBookingStats: (req: import("express").Request, res: Response, next: NextFunction) => void;
    createOffer: (req: import("express").Request, res: Response, next: NextFunction) => void;
    getAvailableOffers: (req: import("express").Request, res: Response, next: NextFunction) => void;
    respondToOffer: (req: import("express").Request, res: Response, next: NextFunction) => void;
    counterOffer: (req: import("express").Request, res: Response, next: NextFunction) => void;
    acceptResponse: (req: import("express").Request, res: Response, next: NextFunction) => void;
    getOfferById: (req: import("express").Request, res: Response, next: NextFunction) => void;
    getMyOffers: (req: import("express").Request, res: Response, next: NextFunction) => void;
    getMyResponses: (req: import("express").Request, res: Response, next: NextFunction) => void;
    closeOffer: (req: import("express").Request, res: Response, next: NextFunction) => void;
}
declare const _default: BookingController;
export default _default;
//# sourceMappingURL=booking.controller.d.ts.map