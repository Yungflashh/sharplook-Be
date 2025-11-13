"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Offer_1 = __importDefault(require("../models/Offer"));
const Booking_1 = __importDefault(require("../models/Booking"));
const Service_1 = __importDefault(require("../models/Service"));
const User_1 = __importDefault(require("../models/User"));
const Category_1 = __importDefault(require("../models/Category"));
const errors_1 = require("../utils/errors");
const types_1 = require("../types");
const helpers_1 = require("../utils/helpers");
const logger_1 = __importDefault(require("../utils/logger"));
class OfferService {
    /**
     * Create offer request
     */
    async createOffer(clientId, data) {
        // Verify category exists
        const category = await Category_1.default.findById(data.category);
        if (!category) {
            throw new errors_1.NotFoundError('Category not found');
        }
        // Verify service if provided
        if (data.service) {
            const service = await Service_1.default.findById(data.service);
            if (!service) {
                throw new errors_1.NotFoundError('Service not found');
            }
        }
        // Calculate expiration
        const expiresInDays = data.expiresInDays || 7;
        const expiresAt = (0, helpers_1.addDays)(new Date(), expiresInDays);
        // Create offer
        const offer = await Offer_1.default.create({
            client: clientId,
            category: data.category,
            service: data.service,
            title: data.title,
            description: data.description,
            proposedPrice: data.proposedPrice,
            location: {
                type: 'Point',
                coordinates: data.location.coordinates,
                address: data.location.address,
                city: data.location.city,
                state: data.location.state,
            },
            preferredDate: data.preferredDate,
            preferredTime: data.preferredTime,
            flexibility: data.flexibility || 'flexible',
            images: data.images,
            expiresAt,
            status: 'open',
            responses: [],
        });
        logger_1.default.info(`Offer created: ${offer._id} by client ${clientId}`);
        return offer;
    }
    /**
     * Get available offers for vendors
     */
    async getAvailableOffers(vendorId, filters, page = 1, limit = 10) {
        const { skip } = (0, helpers_1.parsePaginationParams)(page, limit);
        // Build query
        const query = {
            status: 'open',
            expiresAt: { $gt: new Date() },
        };
        // Exclude offers vendor already responded to
        query['responses.vendor'] = { $ne: vendorId };
        if (filters?.category) {
            query.category = filters.category;
        }
        if (filters?.priceMin !== undefined || filters?.priceMax !== undefined) {
            query.proposedPrice = {};
            if (filters.priceMin !== undefined) {
                query.proposedPrice.$gte = filters.priceMin;
            }
            if (filters.priceMax !== undefined) {
                query.proposedPrice.$lte = filters.priceMax;
            }
        }
        // Location-based filter
        if (filters?.location) {
            const maxDistance = (filters.location.maxDistance || 20) * 1000; // Convert km to meters
            query['location.coordinates'] = {
                $near: {
                    $geometry: {
                        type: 'Point',
                        coordinates: [filters.location.longitude, filters.location.latitude],
                    },
                    $maxDistance: maxDistance,
                },
            };
        }
        const [offers, total] = await Promise.all([
            Offer_1.default.find(query)
                .populate('client', 'firstName lastName avatar')
                .populate('category', 'name icon')
                .populate('service', 'name')
                .skip(skip)
                .limit(limit)
                .sort({ createdAt: -1 }),
            Offer_1.default.countDocuments(query),
        ]);
        return {
            offers,
            total,
            page,
            totalPages: Math.ceil(total / limit),
        };
    }
    /**
     * Vendor responds to offer
     */
    async respondToOffer(offerId, vendorId, data) {
        const offer = await Offer_1.default.findById(offerId);
        if (!offer) {
            throw new errors_1.NotFoundError('Offer not found');
        }
        // Check if offer is still open
        if (offer.status !== 'open') {
            throw new errors_1.BadRequestError('Offer is no longer open');
        }
        // Check expiration
        if (new Date() > offer.expiresAt) {
            offer.status = 'expired';
            await offer.save();
            throw new errors_1.BadRequestError('Offer has expired');
        }
        // Check if vendor already responded
        const existingResponse = offer.responses.find((r) => r.vendor.toString() === vendorId);
        if (existingResponse) {
            throw new errors_1.BadRequestError('You have already responded to this offer');
        }
        // Verify vendor
        const vendor = await User_1.default.findById(vendorId);
        if (!vendor || !vendor.isVendor || !vendor.vendorProfile?.isVerified) {
            throw new errors_1.BadRequestError('Only verified vendors can respond to offers');
        }
        // Add response
        offer.responses.push({
            vendor: vendorId,
            proposedPrice: data.proposedPrice,
            message: data.message,
            estimatedDuration: data.estimatedDuration,
            respondedAt: new Date(),
            isAccepted: false,
        });
        await offer.save();
        logger_1.default.info(`Vendor ${vendorId} responded to offer ${offerId}`);
        return offer;
    }
    /**
     * Client submits counter offer to vendor response
     */
    async counterOffer(offerId, clientId, responseId, counterPrice) {
        const offer = await Offer_1.default.findById(offerId);
        if (!offer) {
            throw new errors_1.NotFoundError('Offer not found');
        }
        // Verify ownership
        if (offer.client.toString() !== clientId) {
            throw new errors_1.ForbiddenError('Only the offer creator can submit counter offers');
        }
        // Check status
        if (offer.status !== 'open') {
            throw new errors_1.BadRequestError('Offer is no longer open');
        }
        // Find response
        const response = offer.responses.find((r) => r._id?.toString() === responseId);
        if (!response) {
            throw new errors_1.NotFoundError('Response not found');
        }
        // Add counter offer
        response.counterOffer = counterPrice;
        await offer.save();
        logger_1.default.info(`Counter offer submitted for offer ${offerId}`);
        return offer;
    }
    /**
     * Client accepts vendor response and creates booking
     */
    async acceptResponse(offerId, clientId, responseId) {
        const offer = await Offer_1.default.findById(offerId).populate('service');
        if (!offer) {
            throw new errors_1.NotFoundError('Offer not found');
        }
        // Verify ownership
        if (offer.client.toString() !== clientId) {
            throw new errors_1.ForbiddenError('Only the offer creator can accept responses');
        }
        // Check status
        if (offer.status !== 'open') {
            throw new errors_1.BadRequestError('Offer is no longer open');
        }
        // Find response
        const response = offer.responses.find((r) => r._id?.toString() === responseId);
        if (!response) {
            throw new errors_1.NotFoundError('Response not found');
        }
        // Mark response as accepted
        response.isAccepted = true;
        offer.selectedVendor = response.vendor;
        offer.selectedResponse = responseId;
        offer.status = 'accepted';
        offer.acceptedAt = new Date();
        // Create booking
        const finalPrice = response.counterOffer || response.proposedPrice;
        const booking = await Booking_1.default.create({
            bookingType: types_1.BookingType.OFFER_BASED,
            client: clientId,
            vendor: response.vendor,
            service: offer.service,
            offer: offer._id,
            scheduledDate: offer.preferredDate || new Date(),
            scheduledTime: offer.preferredTime,
            duration: response.estimatedDuration,
            location: offer.location,
            servicePrice: finalPrice,
            distanceCharge: 0, // Already negotiated in offer price
            totalAmount: finalPrice,
            status: types_1.BookingStatus.PENDING,
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
        offer.bookingId = booking._id;
        await offer.save();
        logger_1.default.info(`Offer accepted: ${offerId}, booking created: ${booking._id}`);
        return { offer, booking };
    }
    /**
     * Get offer by ID
     */
    async getOfferById(offerId, userId) {
        const offer = await Offer_1.default.findById(offerId)
            .populate('client', 'firstName lastName avatar')
            .populate('category', 'name icon')
            .populate('service', 'name images')
            .populate('responses.vendor', 'firstName lastName vendorProfile');
        if (!offer) {
            throw new errors_1.NotFoundError('Offer not found');
        }
        // Verify access
        const isClient = offer.client._id.toString() === userId;
        const hasResponded = offer.responses.some((r) => r.vendor._id.toString() === userId);
        if (!isClient && !hasResponded) {
            throw new errors_1.ForbiddenError('Not authorized to view this offer');
        }
        return offer;
    }
    /**
     * Get client offers
     */
    async getClientOffers(clientId, page = 1, limit = 10) {
        const { skip } = (0, helpers_1.parsePaginationParams)(page, limit);
        const [offers, total] = await Promise.all([
            Offer_1.default.find({ client: clientId })
                .populate('category', 'name icon')
                .populate('service', 'name')
                .populate('responses.vendor', 'firstName lastName vendorProfile')
                .skip(skip)
                .limit(limit)
                .sort({ createdAt: -1 }),
            Offer_1.default.countDocuments({ client: clientId }),
        ]);
        return {
            offers,
            total,
            page,
            totalPages: Math.ceil(total / limit),
        };
    }
    /**
     * Get vendor offer responses
     */
    async getVendorResponses(vendorId, page = 1, limit = 10) {
        const { skip } = (0, helpers_1.parsePaginationParams)(page, limit);
        const [offers, total] = await Promise.all([
            Offer_1.default.find({ 'responses.vendor': vendorId })
                .populate('client', 'firstName lastName avatar')
                .populate('category', 'name icon')
                .skip(skip)
                .limit(limit)
                .sort({ createdAt: -1 }),
            Offer_1.default.countDocuments({ 'responses.vendor': vendorId }),
        ]);
        return {
            offers,
            total,
            page,
            totalPages: Math.ceil(total / limit),
        };
    }
    /**
     * Close offer (client)
     */
    async closeOffer(offerId, clientId) {
        const offer = await Offer_1.default.findById(offerId);
        if (!offer) {
            throw new errors_1.NotFoundError('Offer not found');
        }
        // Verify ownership
        if (offer.client.toString() !== clientId) {
            throw new errors_1.ForbiddenError('Only the offer creator can close offers');
        }
        if (offer.status !== 'open') {
            throw new errors_1.BadRequestError('Only open offers can be closed');
        }
        offer.status = 'closed';
        await offer.save();
        logger_1.default.info(`Offer closed: ${offerId}`);
        return offer;
    }
}
exports.default = new OfferService();
//# sourceMappingURL=offer.service.js.map