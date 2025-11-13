import mongoose, { Document, Schema, Model } from 'mongoose';
import { PaymentStatus } from '../types';

export interface IPayment extends Document {
  _id: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  booking: mongoose.Types.ObjectId;
  amount: number;
  currency: string;
  status: PaymentStatus;
  paymentMethod: 'card' | 'bank_transfer' | 'wallet' | 'ussd';
  
  // Payment gateway details
  reference: string;
  paystackReference?: string;
  authorizationCode?: string;
  
  // Payment flow
  initiatedAt: Date;
  paidAt?: Date;
  escrowedAt?: Date;
  releasedAt?: Date;
  refundedAt?: Date;
  
  // Escrow details
  escrowStatus: 'pending' | 'held' | 'released' | 'refunded';
  releaseDate?: Date;
  
  // Vendor payment
  vendorAmount?: number;
  platformFee?: number;
  commissionRate?: number;
  vendorPaidAt?: Date;
  
  // Refund
  refundAmount?: number;
  refundReason?: string;
  refundedBy?: mongoose.Types.ObjectId;
  
  // Metadata
  ipAddress?: string;
  userAgent?: string;
  metadata?: any;
  
  isDeleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const paymentSchema = new Schema<IPayment>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User is required'],
      index: true,
    },
    booking: {
      type: Schema.Types.ObjectId,
      ref: 'Booking',
      required: [true, 'Booking is required'],
      index: true,
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0, 'Amount cannot be negative'],
    },
    currency: {
      type: String,
      default: 'NGN',
      enum: ['NGN', 'USD'],
    },
    status: {
      type: String,
      enum: Object.values(PaymentStatus),
      default: PaymentStatus.PENDING,
      index: true,
    },
    paymentMethod: {
      type: String,
      enum: ['card', 'bank_transfer', 'wallet', 'ussd'],
      default: 'card',
    },
    reference: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    paystackReference: {
      type: String,
      index: true,
    },
    authorizationCode: String,
    initiatedAt: {
      type: Date,
      default: Date.now,
    },
    paidAt: Date,
    escrowedAt: Date,
    releasedAt: Date,
    refundedAt: Date,
    escrowStatus: {
      type: String,
      enum: ['pending', 'held', 'released', 'refunded'],
      default: 'pending',
      index: true,
    },
    releaseDate: Date,
    vendorAmount: Number,
    platformFee: Number,
    commissionRate: {
      type: Number,
      default: 10, // 10% commission
    },
    vendorPaidAt: Date,
    refundAmount: Number,
    refundReason: String,
    refundedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    ipAddress: String,
    userAgent: String,
    metadata: Schema.Types.Mixed,
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: Date,
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
paymentSchema.index({ user: 1, status: 1 });
paymentSchema.index({ booking: 1 });
paymentSchema.index({ reference: 1 }, { unique: true });
paymentSchema.index({ paystackReference: 1 });
paymentSchema.index({ createdAt: -1 });
paymentSchema.index({ escrowStatus: 1 });

// Don't return deleted payments in queries by default
paymentSchema.pre(/^find/, function (next) {
  // @ts-ignore
  this.find({ isDeleted: { $ne: true } });
  next();
});

// Calculate vendor amount and platform fee before save
paymentSchema.pre('save', function (next) {
  if (this.isModified('amount') || this.isNew) {
    const commissionRate = this.commissionRate || 10;
    this.platformFee = Math.round((this.amount * commissionRate) / 100);
    this.vendorAmount = this.amount - this.platformFee;
  }
  next();
});

const Payment: Model<IPayment> = mongoose.model<IPayment>('Payment', paymentSchema);

export default Payment;
