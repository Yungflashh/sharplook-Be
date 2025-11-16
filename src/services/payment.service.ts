import Payment, { IPayment } from '../models/Payment';
import Booking from '../models/Booking';
import User from '../models/User';
import Transaction from '../models/Transaction';
import subscriptionService from './subscription.service';
import { NotFoundError, BadRequestError } from '../utils/errors';
import { PaymentStatus, BookingStatus, TransactionType } from '../types';
import config from '../config';
import { generateRandomString } from '../utils/helpers';
import axios from 'axios';
import crypto from 'crypto';
import logger from '../utils/logger';

class PaymentService {

  private paystackSecretKey: string;
  private paystackBaseUrl: string;

  constructor() {
    this.paystackSecretKey = config.paystack.secretKey;
    this.paystackBaseUrl = 'https://api.paystack.co';
  }

  /**
   * Initialize payment for booking
   */
  public async initializePayment(
    userId: string,
    bookingId: string,
    metadata?: any
  ): Promise<{ payment: IPayment; authorizationUrl: string; accessCode: string }> {
    // Get booking
    const booking = await Booking.findById(bookingId).populate('service');
    if (!booking) {
      throw new NotFoundError('Booking not found');
    }

    // Verify ownership
    if (booking.client.toString() !== userId) {
      throw new BadRequestError('You can only pay for your own bookings');
    }

    // Check if already paid
    if (booking.paymentStatus === 'escrowed') {
      throw new BadRequestError('This booking has already been paid');
    }

    // Get user
    const user = await User.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Get vendor's commission rate from subscription
    const commissionRate = await subscriptionService.getCommissionRate(
      booking.vendor.toString()
    );

    // Calculate fees
    const platformFee = Math.round((booking.totalAmount * commissionRate) / 100);
    const vendorAmount = booking.totalAmount - platformFee;

    // Generate payment reference
    const reference = `PAY-${Date.now()}-${generateRandomString(8)}`;

    // Initialize Paystack payment
    const paystackResponse = await axios.post(
      `${this.paystackBaseUrl}/transaction/initialize`,
      {
        email: user.email,
        amount: booking.totalAmount * 100, // Convert to kobo
        reference,
        currency: 'NGN',
        callback_url: `sharpLook://bookings/${bookingId}/payment/verify`,
        metadata: {
          bookingId: booking._id.toString(),
          userId: user._id.toString(),
          ...metadata,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${this.paystackSecretKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const { authorization_url, access_code } = paystackResponse.data.data;

    // Create payment record
    const payment = await Payment.create({
      user: userId,
      booking: bookingId,
      amount: booking.totalAmount,
      currency: 'NGN',
      status: PaymentStatus.PENDING,
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

    logger.info(`Payment initialized: ${reference} for booking ${bookingId}`);

    return {
      payment,
      authorizationUrl: authorization_url,
      accessCode: access_code,
    };
  }

  /**
   * Verify Paystack payment webhook
   */
  public verifyWebhookSignature(payload: string, signature: string): boolean {
    const hash = crypto
      .createHmac('sha512', this.paystackSecretKey)
      .update(payload)
      .digest('hex');
    return hash === signature;
  }

  /**
   * Handle Paystack webhook
   */
  public async handlePaystackWebhook(event: any): Promise<void> {
    const { event: eventType, data } = event;

    if (eventType === 'charge.success') {
      await this.handleSuccessfulPayment(data);
    } else if (eventType === 'transfer.success') {
      await this.handleSuccessfulTransfer(data);
    } else if (eventType === 'transfer.failed') {
      await this.handleFailedTransfer(data);
    }
  }

  /**
   * Handle successful payment
   */
  private async handleSuccessfulPayment(data: any): Promise<void> {
    const { reference, authorization } = data;

    // Find payment
    const payment = await Payment.findOne({ reference });
    if (!payment) {
      logger.error(`Payment not found for reference: ${reference}`);
      return;
    }

    // Update payment
    payment.status = PaymentStatus.COMPLETED;
    payment.escrowStatus = 'held';
    payment.paidAt = new Date();
    payment.escrowedAt = new Date();
    payment.paystackReference = reference;
    payment.authorizationCode = authorization?.authorization_code;
    await payment.save();

    // Update booking
    const booking = await Booking.findById(payment.booking);
    if (booking) {
      booking.paymentStatus = 'escrowed';
      await booking.save();
    }

    logger.info(`Payment successful: ${reference}`);
  }

  /**
   * Verify payment manually
   */
  public async verifyPayment(reference: string): Promise<IPayment> {
    // Verify with Paystack
    const paystackResponse = await axios.get(
      `${this.paystackBaseUrl}/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${this.paystackSecretKey}`,
        },
      }
    );

    const { status, authorization } = paystackResponse.data.data;

    // Find payment
    const payment = await Payment.findOne({ reference });
    if (!payment) {
      throw new NotFoundError('Payment not found');
    }

    // Update payment based on status
    if (status === 'success') {
      payment.status = PaymentStatus.COMPLETED;
      payment.escrowStatus = 'held';
      payment.paidAt = new Date();
      payment.escrowedAt = new Date();
      payment.paystackReference = reference;
      payment.authorizationCode = authorization?.authorization_code;
      await payment.save();

      // Update booking
      const booking = await Booking.findById(payment.booking);
      if (booking) {
        booking.paymentStatus = 'escrowed';
        await booking.save();
      }
    } else {
      payment.status = PaymentStatus.FAILED;
      await payment.save();
    }

    logger.info(`Payment verified: ${reference} - ${status}`);

    return payment;
  }

  /**
   * Release payment to vendor
   */
  public async releasePayment(bookingId: string): Promise<IPayment> {
    const booking = await Booking.findById(bookingId).populate('vendor');
    if (!booking) {
      throw new NotFoundError('Booking not found');
    }

    // Get payment
    const payment = await Payment.findOne({ booking: bookingId });
    if (!payment) {
      throw new NotFoundError('Payment not found');
    }

    // Check if already released
    if (payment.escrowStatus === 'released') {
      throw new BadRequestError('Payment already released');
    }

    // Check booking status
    if (booking.status !== BookingStatus.COMPLETED) {
      throw new BadRequestError('Booking must be completed before releasing payment');
    }

    // Update payment
    payment.status = PaymentStatus.RELEASED;
    payment.escrowStatus = 'released';
    payment.releasedAt = new Date();
    payment.vendorPaidAt = new Date();
    await payment.save();

    // Credit vendor wallet
    const vendor = await User.findById(booking.vendor);
    if (vendor) {
      const previousBalance = vendor.walletBalance || 0;
      vendor.walletBalance = previousBalance + (payment.vendorAmount || 0);
      await vendor.save();

      // Create transaction record
      await Transaction.create({
        user: vendor._id,
        type: TransactionType.BOOKING_PAYMENT,
        amount: payment.vendorAmount || 0,
        balanceBefore: previousBalance,
        balanceAfter: vendor.walletBalance,
        status: PaymentStatus.COMPLETED,
        reference: `TXN-${Date.now()}-${generateRandomString(8)}`,
        description: `Payment received for booking #${booking._id.toString().slice(-8)}`,
        booking: booking._id,
        payment: payment._id,
      });
    }

    // Update booking
    booking.paymentStatus = 'released';
    await booking.save();

    logger.info(`Payment released to vendor: ${payment.reference}`);

    return payment;
  }

  /**
   * Refund payment
   */
  public async refundPayment(
    bookingId: string,
    refundedBy: string,
    reason?: string
  ): Promise<IPayment> {
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      throw new NotFoundError('Booking not found');
    }

    // Get payment
    const payment = await Payment.findOne({ booking: bookingId });
    if (!payment) {
      throw new NotFoundError('Payment not found');
    }

    // Check if already refunded
    if (payment.escrowStatus === 'refunded') {
      throw new BadRequestError('Payment already refunded');
    }

    // Update payment
    payment.status = PaymentStatus.REFUNDED;
    payment.escrowStatus = 'refunded';
    payment.refundedAt = new Date();
    payment.refundAmount = payment.amount;
    payment.refundReason = reason;
    payment.refundedBy = refundedBy as any;
    await payment.save();

    // Credit client wallet
    const client = await User.findById(booking.client);
    if (client) {
      const previousBalance = client.walletBalance || 0;
      client.walletBalance = previousBalance + payment.amount;
      await client.save();

      // Create transaction record
      await Transaction.create({
        user: client._id,
        type: TransactionType.REFUND,
        amount: payment.amount,
        balanceBefore: previousBalance,
        balanceAfter: client.walletBalance,
        status: PaymentStatus.COMPLETED,
        reference: `TXN-${Date.now()}-${generateRandomString(8)}`,
        description: `Refund for cancelled booking #${booking._id.toString().slice(-8)}`,
        booking: booking._id,
        payment: payment._id,
      });
    }

    // Update booking
    booking.paymentStatus = 'refunded';
    await booking.save();

    logger.info(`Payment refunded: ${payment.reference}`);

    return payment;
  }

  /**
   * Get payment by ID
   */
  public async getPaymentById(paymentId: string): Promise<IPayment> {
    const payment = await Payment.findById(paymentId)
      .populate('user', 'firstName lastName email')
      .populate('booking');

    if (!payment) {
      throw new NotFoundError('Payment not found');
    }

    return payment;
  }

  /**
   * Get user payments
   */
  public async getUserPayments(
    userId: string,
    page: number = 1,
    limit: number = 10
  ): Promise<{ payments: IPayment[]; total: number; page: number; totalPages: number }> {
    const skip = (page - 1) * limit;

    const [payments, total] = await Promise.all([
      Payment.find({ user: userId })
        .populate('booking', 'service scheduledDate status')
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 }),
      Payment.countDocuments({ user: userId }),
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
  private async handleSuccessfulTransfer(data: any): Promise<void> {
    const { reference, transfer_code } = data;
    
    const Withdrawal = require('../models/Withdrawal').default;
    const withdrawal = await Withdrawal.findOne({ reference });
    
    if (withdrawal) {
      withdrawal.status = 'completed';
      withdrawal.completedAt = new Date();
      withdrawal.paystackTransferCode = transfer_code;
      await withdrawal.save();
      
      logger.info(`Transfer successful: ${reference}`);
    }
  }

  /**
   * Handle failed transfer
   */
  private async handleFailedTransfer(data: any): Promise<void> {
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
      const user = await User.findById(withdrawal.user);
      if (user) {
        user.walletBalance = (user.walletBalance || 0) + withdrawal.amount;
        await user.save();
      }
      
      logger.error(`Transfer failed: ${reference}`);
    }
  }
}

export default new PaymentService();