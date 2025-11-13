import { IOffer } from '../models/Offer';
declare class OfferService {
    /**
     * Create offer request
     */
    createOffer(clientId: string, data: {
        title: string;
        description: string;
        category: string;
        service?: string;
        proposedPrice: number;
        location: {
            address: string;
            city: string;
            state: string;
            coordinates: [number, number];
        };
        preferredDate?: Date;
        preferredTime?: string;
        flexibility?: 'flexible' | 'specific' | 'urgent';
        images?: string[];
        expiresInDays?: number;
    }): Promise<IOffer>;
    /**
     * Get available offers for vendors
     */
    getAvailableOffers(vendorId: string, filters?: {
        category?: string;
        priceMin?: number;
        priceMax?: number;
        location?: {
            latitude: number;
            longitude: number;
            maxDistance?: number;
        };
    }, page?: number, limit?: number): Promise<{
        offers: IOffer[];
        total: number;
        page: number;
        totalPages: number;
    }>;
    /**
     * Vendor responds to offer
     */
    respondToOffer(offerId: string, vendorId: string, data: {
        proposedPrice: number;
        message?: string;
        estimatedDuration?: number;
    }): Promise<IOffer>;
    /**
     * Client submits counter offer to vendor response
     */
    counterOffer(offerId: string, clientId: string, responseId: string, counterPrice: number): Promise<IOffer>;
    /**
     * Client accepts vendor response and creates booking
     */
    acceptResponse(offerId: string, clientId: string, responseId: string): Promise<{
        offer: IOffer;
        booking: any;
    }>;
    /**
     * Get offer by ID
     */
    getOfferById(offerId: string, userId: string): Promise<IOffer>;
    /**
     * Get client offers
     */
    getClientOffers(clientId: string, page?: number, limit?: number): Promise<{
        offers: IOffer[];
        total: number;
        page: number;
        totalPages: number;
    }>;
    /**
     * Get vendor offer responses
     */
    getVendorResponses(vendorId: string, page?: number, limit?: number): Promise<{
        offers: IOffer[];
        total: number;
        page: number;
        totalPages: number;
    }>;
    /**
     * Close offer (client)
     */
    closeOffer(offerId: string, clientId: string): Promise<IOffer>;
}
declare const _default: OfferService;
export default _default;
//# sourceMappingURL=offer.service.d.ts.map