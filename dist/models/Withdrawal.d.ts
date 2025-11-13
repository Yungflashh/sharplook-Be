import mongoose, { Document, Model } from 'mongoose';
export interface IWithdrawal extends Document {
    _id: mongoose.Types.ObjectId;
    user: mongoose.Types.ObjectId;
    amount: number;
    status: 'pending' | 'processing' | 'completed' | 'failed' | 'rejected';
    bankName: string;
    accountNumber: string;
    accountName: string;
    reference: string;
    paystackRecipientCode?: string;
    paystackTransferCode?: string;
    withdrawalFee: number;
    netAmount: number;
    requestedAt: Date;
    processedAt?: Date;
    completedAt?: Date;
    failedAt?: Date;
    rejectedAt?: Date;
    processedBy?: mongoose.Types.ObjectId;
    rejectionReason?: string;
    failureReason?: string;
    metadata?: any;
    isDeleted: boolean;
    deletedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}
declare const Withdrawal: Model<IWithdrawal>;
export default Withdrawal;
//# sourceMappingURL=Withdrawal.d.ts.map