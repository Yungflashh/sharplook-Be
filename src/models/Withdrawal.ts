import mongoose, { Document, Schema, Model } from 'mongoose';

export interface IWithdrawal extends Document {
  _id: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  amount: number;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'rejected';
  
  // Bank details
  bankName: string;
  accountNumber: string;
  accountName: string;
  
  // Processing
  reference: string;
  paystackRecipientCode?: string;
  paystackTransferCode?: string;
  
  // Fees
  withdrawalFee: number;
  netAmount: number;
  
  // Status tracking
  requestedAt: Date;
  processedAt?: Date;
  completedAt?: Date;
  failedAt?: Date;
  rejectedAt?: Date;
  
  // Admin
  processedBy?: mongoose.Types.ObjectId;
  rejectionReason?: string;
  failureReason?: string;
  
  // Metadata
  metadata?: any;
  
  isDeleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const withdrawalSchema = new Schema<IWithdrawal>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User is required'],
      index: true,
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [1000, 'Minimum withdrawal is ₦1,000'],
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed', 'rejected'],
      default: 'pending',
      index: true,
    },
    bankName: {
      type: String,
      required: [true, 'Bank name is required'],
    },
    accountNumber: {
      type: String,
      required: [true, 'Account number is required'],
      match: [/^\d{10}$/, 'Account number must be 10 digits'],
    },
    accountName: {
      type: String,
      required: [true, 'Account name is required'],
    },
    reference: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    paystackRecipientCode: String,
    paystackTransferCode: String,
    withdrawalFee: {
      type: Number,
      default: 100, // ₦100 withdrawal fee
    },
    netAmount: {
      type: Number,
      required: true,
    },
    requestedAt: {
      type: Date,
      default: Date.now,
    },
    processedAt: Date,
    completedAt: Date,
    failedAt: Date,
    rejectedAt: Date,
    processedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    rejectionReason: String,
    failureReason: String,
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
withdrawalSchema.index({ user: 1, status: 1 });
withdrawalSchema.index({ reference: 1 }, { unique: true });
withdrawalSchema.index({ createdAt: -1 });
withdrawalSchema.index({ status: 1, createdAt: -1 });

// Don't return deleted withdrawals in queries by default
withdrawalSchema.pre(/^find/, function (next) {
  // @ts-ignore
  this.find({ isDeleted: { $ne: true } });
  next();
});

// Calculate net amount before save
withdrawalSchema.pre('save', function (next) {
  if (this.isModified('amount') || this.isNew) {
    this.netAmount = this.amount - (this.withdrawalFee || 100);
  }
  next();
});

const Withdrawal: Model<IWithdrawal> = mongoose.model<IWithdrawal>(
  'Withdrawal',
  withdrawalSchema
);

export default Withdrawal;
