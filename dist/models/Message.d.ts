import mongoose, { Document, Model } from 'mongoose';
export interface IMessage extends Document {
    _id: mongoose.Types.ObjectId;
    conversation: mongoose.Types.ObjectId;
    sender: mongoose.Types.ObjectId;
    receiver: mongoose.Types.ObjectId;
    messageType: 'text' | 'image' | 'file' | 'audio' | 'video';
    text?: string;
    attachments?: {
        url: string;
        type: 'image' | 'file' | 'audio' | 'video';
        name?: string;
        size?: number;
    }[];
    isRead: boolean;
    readAt?: Date;
    isDelivered: boolean;
    deliveredAt?: Date;
    isDeleted: boolean;
    deletedAt?: Date;
    deletedBy?: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}
declare const Message: Model<IMessage>;
export default Message;
//# sourceMappingURL=Message.d.ts.map