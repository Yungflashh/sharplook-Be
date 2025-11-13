"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importStar(require("mongoose"));
const withdrawalSchema = new mongoose_1.Schema({
    user: {
        type: mongoose_1.Schema.Types.ObjectId,
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
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
    },
    rejectionReason: String,
    failureReason: String,
    metadata: mongoose_1.Schema.Types.Mixed,
    isDeleted: {
        type: Boolean,
        default: false,
    },
    deletedAt: Date,
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
});
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
const Withdrawal = mongoose_1.default.model('Withdrawal', withdrawalSchema);
exports.default = Withdrawal;
//# sourceMappingURL=Withdrawal.js.map