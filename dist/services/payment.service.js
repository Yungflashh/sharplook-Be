"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Payment_1 = __importDefault(require("../models/Payment"));
const Booking_1 = __importDefault(require("../models/Booking"));
const User_1 = __importDefault(require("../models/User"));
const Transaction_1 = __importDefault(require("../models/Transaction"));
const subscription_service_1 = __importDefault(require("./subscription.service"));
const errors_1 = require("../utils/errors");
const types_1 = require("../types");
const config_1 = __importDefault(require("../config"));
const helpers_1 = require("../utils/helpers");
const axios_1 = __importDefault(require("axios"));
const crypto_1 = __importDefault(require("crypto"));
const logger_1 = __importDefault(require("../utils/logger"));
class PaymentService {
    constructor() {
        this.paystackSecretKey = config_1.default.paystack.secretKey;
        this.paystackBaseUrl = 'https://api.paystack.co';
    }
    /**
     * Initialize payment for booking
     */
    async initializePayment(userId, bookingId, metadata) {
        // Get booking
        const booking = await Booking_1.default.findById(bookingId).populate('service');
        if (!booking) {
            throw new errors_1.NotFoundError('Booking not found');
        }
        // Verify ownership
        if (booking.client.toString() !== userId) {
            throw new errors_1.BadRequestError('You can only pay for your own bookings');
        }
        // Check if already paid
        if (booking.paymentStatus === 'escrowed') {
            throw new errors_1.BadRequestError('This booking has already been paid');
        }
        // Get user
        const user = await User_1.default.findById(userId);
        if (!user) {
            throw new errors_1.NotFoundError('User not found');
        }
        // Get vendor's commission rate from subscription
        const commissionRate = await subscription_service_1.default.getCommissionRate(booking.vendor.toString());
        // Calculate fees
        const platformFee = Math.round((booking.totalAmount * commissionRate) / 100);
        const vendorAmount = booking.totalAmount - platformFee;
        // Generate payment reference
        const reference = `PAY-${Date.now()}-${(0, helpers_1.generateRandomString)(8)}`;
        // Initialize Paystack payment
        const paystackResponse = await axios_1.default.post(`${this.paystackBaseUrl}/transaction/initialize`, {
            email: user.email,
            amount: booking.totalAmount * 100, // Convert to kobo
            reference,
            currency: 'NGN',
            callback_url: `${config_1.default.urls.frontend}/bookings/${bookingId}/payment/verify`,
            metadata: {
                bookingId: booking._id.toString(),
                userId: user._id.toString(),
                ...metadata,
            },
        }, {
            headers: {
                Authorization: `Bearer ${this.paystackSecretKey}`,
                'Content-Type': 'application/json',
            },
        });
        const { authorization_url, access_code } = paystackResponse.data.data;
        // Create payment record
        const payment = await Payment_1.default.create({
            user: userId,
            booking: bookingId,
            amount: booking.totalAmount,
            currency: 'NGN',
            status: types_1.PaymentStatus.PENDING,
            paymentMethod: 'card',
            reference,
            initiatedAt: new Date(),
            escrowStatus: 'pending',
            commissionRate,
            platformFee,
            vendorAmount,
        });
        // Update booking
        booking.paymentId = payment._id;
        booking.paymentReference = reference;
        await booking.save();
        logger_1.default.info(`Payment initialized: ${reference} for booking ${bookingId}`);
        return {
            payment,
            authorizationUrl: authorization_url,
            accessCode: access_code,
        };
    }
    /**
     * Verify Paystack payment webhook
     */
    verifyWebhookSignature(payload, signature) {
        const hash = crypto_1.default
            .createHmac('sha512', this.paystackSecretKey)
            .update(payload)
            .digest('hex');
        return hash === signature;
    }
    /**
     * Handle Paystack webhook
     */
    async handlePaystackWebhook(event) {
        const { event: eventType, data } = event;
        if (eventType === 'charge.success') {
            await this.handleSuccessfulPayment(data);
        }
        else if (eventType === 'transfer.success') {
            await this.handleSuccessfulTransfer(data);
        }
        else if (eventType === 'transfer.failed') {
            await this.handleFailedTransfer(data);
        }
    }
    /**
     * Handle successful payment
     */
    async handleSuccessfulPayment(data) {
        const { reference, authorization } = data;
        // Find payment
        const payment = await Payment_1.default.findOne({ reference });
        if (!payment) {
            logger_1.default.error(`Payment not found for reference: ${reference}`);
            return;
        }
        // Update payment
        payment.status = types_1.PaymentStatus.COMPLETED;
        payment.escrowStatus = 'held';
        payment.paidAt = new Date();
        payment.escrowedAt = new Date();
        payment.paystackReference = reference;
        payment.authorizationCode = authorization?.authorization_code;
        await payment.save();
        // Update booking
        const booking = await Booking_1.default.findById(payment.booking);
        if (booking) {
            booking.paymentStatus = 'escrowed';
            await booking.save();
        }
        logger_1.default.info(`Payment successful: ${reference}`);
    }
    /**
     * Verify payment manually
     */
    async verifyPayment(reference) {
        // Verify with Paystack
        const paystackResponse = await axios_1.default.get(`${this.paystackBaseUrl}/transaction/verify/${reference}`, {
            headers: {
                Authorization: `Bearer ${this.paystackSecretKey}`,
            },
        });
        const { status, authorization } = paystackResponse.data.data;
        // Find payment
        const payment = await Payment_1.default.findOne({ reference });
        if (!payment) {
            throw new errors_1.NotFoundError('Payment not found');
        }
        // Update payment based on status
        if (status === 'success') {
            payment.status = types_1.PaymentStatus.COMPLETED;
            payment.escrowStatus = 'held';
            payment.paidAt = new Date();
            payment.escrowedAt = new Date();
            payment.paystackReference = reference;
            payment.authorizationCode = authorization?.authorization_code;
            await payment.save();
            // Update booking
            const booking = await Booking_1.default.findById(payment.booking);
            if (booking) {
                booking.paymentStatus = 'escrowed';
                await booking.save();
            }
        }
        else {
            payment.status = types_1.PaymentStatus.FAILED;
            await payment.save();
        }
        logger_1.default.info(`Payment verified: ${reference} - ${status}`);
        return payment;
    }
    /**
     * Release payment to vendor
     */
    async releasePayment(bookingId) {
        const booking = await Booking_1.default.findById(bookingId).populate('vendor');
        if (!booking) {
            throw new errors_1.NotFoundError('Booking not found');
        }
        // Get payment
        const payment = await Payment_1.default.findOne({ booking: bookingId });
        if (!payment) {
            throw new errors_1.NotFoundError('Payment not found');
        }
        // Check if already released
        if (payment.escrowStatus === 'released') {
            throw new errors_1.BadRequestError('Payment already released');
        }
        // Check booking status
        if (booking.status !== types_1.BookingStatus.COMPLETED) {
            throw new errors_1.BadRequestError('Booking must be completed before releasing payment');
        }
        // Update payment
        payment.status = types_1.PaymentStatus.RELEASED;
        payment.escrowStatus = 'released';
        payment.releasedAt = new Date();
        payment.vendorPaidAt = new Date();
        await payment.save();
        // Credit vendor wallet
        const vendor = await User_1.default.findById(booking.vendor);
        if (vendor) {
            const previousBalance = vendor.walletBalance || 0;
            vendor.walletBalance = previousBalance + (payment.vendorAmount || 0);
            await vendor.save();
            // Create transaction record
            await Transaction_1.default.create({
                user: vendor._id,
                type: types_1.TransactionType.BOOKING_PAYMENT,
                amount: payment.vendorAmount || 0,
                balanceBefore: previousBalance,
                balanceAfter: vendor.walletBalance,
                status: types_1.PaymentStatus.COMPLETED,
                reference: `TXN-${Date.now()}-${(0, helpers_1.generateRandomString)(8)}`,
                description: `Payment received for booking #${booking._id.toString().slice(-8)}`,
                booking: booking._id,
                payment: payment._id,
            });
        }
        // Update booking
        booking.paymentStatus = 'released';
        await booking.save();
        logger_1.default.info(`Payment released to vendor: ${payment.reference}`);
        return payment;
    }
    /**
     * Refund payment
     */
    async refundPayment(bookingId, refundedBy, reason) {
        const booking = await Booking_1.default.findById(bookingId);
        if (!booking) {
            throw new errors_1.NotFoundError('Booking not found');
        }
        // Get payment
        const payment = await Payment_1.default.findOne({ booking: bookingId });
        if (!payment) {
            throw new errors_1.NotFoundError('Payment not found');
        }
        // Check if already refunded
        if (payment.escrowStatus === 'refunded') {
            throw new errors_1.BadRequestError('Payment already refunded');
        }
        // Update payment
        payment.status = types_1.PaymentStatus.REFUNDED;
        payment.escrowStatus = 'refunded';
        payment.refundedAt = new Date();
        payment.refundAmount = payment.amount;
        payment.refundReason = reason;
        payment.refundedBy = refundedBy;
        await payment.save();
        // Credit client wallet
        const client = await User_1.default.findById(booking.client);
        if (client) {
            const previousBalance = client.walletBalance || 0;
            client.walletBalance = previousBalance + payment.amount;
            await client.save();
            // Create transaction record
            await Transaction_1.default.create({
                user: client._id,
                type: types_1.TransactionType.REFUND,
                amount: payment.amount,
                balanceBefore: previousBalance,
                balanceAfter: client.walletBalance,
                status: types_1.PaymentStatus.COMPLETED,
                reference: `TXN-${Date.now()}-${(0, helpers_1.generateRandomString)(8)}`,
                description: `Refund for cancelled booking #${booking._id.toString().slice(-8)}`,
                booking: booking._id,
                payment: payment._id,
            });
        }
        // Update booking
        booking.paymentStatus = 'refunded';
        await booking.save();
        logger_1.default.info(`Payment refunded: ${payment.reference}`);
        return payment;
    }
    /**
     * Get payment by ID
     */
    async getPaymentById(paymentId) {
        const payment = await Payment_1.default.findById(paymentId)
            .populate('user', 'firstName lastName email')
            .populate('booking');
        if (!payment) {
            throw new errors_1.NotFoundError('Payment not found');
        }
        return payment;
    }
    /**
     * Get user payments
     */
    async getUserPayments(userId, page = 1, limit = 10) {
        const skip = (page - 1) * limit;
        const [payments, total] = await Promise.all([
            Payment_1.default.find({ user: userId })
                .populate('booking', 'service scheduledDate status')
                .skip(skip)
                .limit(limit)
                .sort({ createdAt: -1 }),
            Payment_1.default.countDocuments({ user: userId }),
        ]);
        return {
            payments,
            total,
            page,
            totalPages: Math.ceil(total / limit),
        };
    }
    /**
     * Handle successful transfer (withdrawal)
     */
    async handleSuccessfulTransfer(data) {
        const { reference, transfer_code } = data;
        const Withdrawal = require('../models/Withdrawal').default;
        const withdrawal = await Withdrawal.findOne({ reference });
        if (withdrawal) {
            withdrawal.status = 'completed';
            withdrawal.completedAt = new Date();
            withdrawal.paystackTransferCode = transfer_code;
            await withdrawal.save();
            logger_1.default.info(`Transfer successful: ${reference}`);
        }
    }
    /**
     * Handle failed transfer
     */
    async handleFailedTransfer(data) {
        const { reference, transfer_code } = data;
        const Withdrawal = require('../models/Withdrawal').default;
        const withdrawal = await Withdrawal.findOne({ reference });
        if (withdrawal) {
            withdrawal.status = 'failed';
            withdrawal.failedAt = new Date();
            withdrawal.failureReason = 'Transfer failed';
            withdrawal.paystackTransferCode = transfer_code;
            await withdrawal.save();
            // Refund to wallet
            const user = await User_1.default.findById(withdrawal.user);
            if (user) {
                user.walletBalance = (user.walletBalance || 0) + withdrawal.amount;
                await user.save();
            }
            logger_1.default.error(`Transfer failed: ${reference}`);
        }
    }
}
exports.default = new PaymentService();
//# sourceMappingURL=payment.service.js.map