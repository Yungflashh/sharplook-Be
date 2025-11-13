import { Request } from 'express';
import { Types } from 'mongoose';
export declare enum UserRole {
    CLIENT = "client",
    VENDOR = "vendor",
    SUPER_ADMIN = "super_admin",
    ADMIN = "admin",
    FINANCIAL_ADMIN = "financial_admin",
    ANALYTICS_ADMIN = "analytics_admin",
    SUPPORT = "support"
}
export declare enum UserStatus {
    ACTIVE = "active",
    INACTIVE = "inactive",
    SUSPENDED = "suspended",
    PENDING_VERIFICATION = "pending_verification"
}
export declare enum VendorType {
    HOME_SERVICE = "home_service",
    IN_SHOP = "in_shop",
    BOTH = "both"
}
export declare enum BookingStatus {
    PENDING = "pending",
    ACCEPTED = "accepted",
    IN_PROGRESS = "in_progress",
    COMPLETED = "completed",
    CANCELLED = "cancelled",
    DISPUTED = "disputed"
}
export declare enum BookingType {
    STANDARD = "standard",
    OFFER_BASED = "offer_based"
}
export declare enum PaymentStatus {
    PENDING = "pending",
    COMPLETED = "completed",
    FAILED = "failed",
    REFUNDED = "refunded",
    ESCROWED = "escrowed",
    RELEASED = "released"
}
export declare enum TransactionType {
    DEPOSIT = "deposit",
    WITHDRAWAL = "withdrawal",
    BOOKING_PAYMENT = "booking_payment",
    REFUND = "refund",
    COMMISSION = "commission",
    REFERRAL_BONUS = "referral_bonus",
    SUBSCRIPTION_PAYMENT = "subscription_payment"
}
export declare enum NotificationType {
    BOOKING = "booking",
    PAYMENT = "payment",
    MESSAGE = "message",
    SYSTEM = "system",
    PROMOTION = "promotion"
}
export declare enum NotificationChannel {
    PUSH = "push",
    EMAIL = "email",
    SMS = "sms",
    IN_APP = "in_app"
}
export declare enum DisputeStatus {
    OPEN = "open",
    IN_REVIEW = "in_review",
    RESOLVED = "resolved",
    CLOSED = "closed"
}
export declare enum DisputeResolution {
    REFUND_CLIENT = "refund_client",
    PAY_VENDOR = "pay_vendor",
    PARTIAL_REFUND = "partial_refund"
}
export interface FileUpload {
    fieldname: string;
    originalname: string;
    encoding: string;
    mimetype: string;
    size: number;
    destination: string;
    filename: string;
    path: string;
    url?: string;
}
export interface PaginationParams {
    page: number;
    limit: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}
export interface PaginatedResult<T> {
    data: T[];
    pagination: {
        currentPage: number;
        totalPages: number;
        pageSize: number;
        totalItems: number;
        hasNextPage: boolean;
        hasPrevPage: boolean;
    };
}
export interface Location {
    type: 'Point';
    coordinates: [number, number];
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    zipCode?: string;
}
export interface AuthRequest extends Request {
    user?: {
        id: string;
        email: string;
        role: UserRole;
        isVendor?: boolean;
    };
    file?: any;
    files?: any[];
}
export interface DashboardStats {
    totalUsers: number;
    totalVendors: number;
    totalBookings: number;
    totalRevenue: number;
    activeBookings: number;
    completedBookings: number;
    cancelledBookings: number;
    pendingPayments: number;
    recentBookings: any[];
    topVendors: any[];
    revenueByMonth: any[];
}
export declare enum EmailTemplate {
    WELCOME = "welcome",
    LOGIN = "login",
    VERIFICATION = "verification",
    PASSWORD_RESET = "password_reset",
    BOOKING_CONFIRMATION = "booking_confirmation",
    BOOKING_ACCEPTED = "booking_accepted",
    BOOKING_COMPLETED = "booking_completed",
    BOOKING_CANCELLED = "booking_cancelled",
    PAYMENT_RECEIVED = "payment_received",
    PAYMENT_SENT = "payment_sent",
    WITHDRAWAL_REQUEST = "withdrawal_request",
    WITHDRAWAL_COMPLETED = "withdrawal_completed",
    DISPUTE_OPENED = "dispute_opened",
    DISPUTE_RESOLVED = "dispute_resolved",
    OFFER_RECEIVED = "offer_received",
    COUNTER_OFFER = "counter_offer"
}
export declare enum SocketEvent {
    CONNECTION = "connection",
    DISCONNECT = "disconnect",
    MESSAGE = "message",
    TYPING = "typing",
    BOOKING_UPDATE = "booking_update",
    NOTIFICATION = "notification",
    ONLINE_STATUS = "online_status",
    CALL_INITIATED = "call_initiated",
    CALL_ACCEPTED = "call_accepted",
    CALL_REJECTED = "call_rejected",
    CALL_ENDED = "call_ended"
}
export interface ServiceCategory {
    id: string;
    name: string;
    description?: string;
    icon?: string;
    isActive: boolean;
}
export interface Service {
    id: string;
    name: string;
    description: string;
    category: string | Types.ObjectId;
    basePrice: number;
    duration?: number;
    images?: string[];
    isActive: boolean;
}
export interface OfferDetails {
    proposedPrice: number;
    description: string;
    estimatedDuration?: number;
    additionalNotes?: string;
}
export interface CounterOffer {
    vendorId: string | Types.ObjectId;
    originalPrice: number;
    counterPrice: number;
    reason?: string;
    createdAt: Date;
}
export interface WalletTransaction {
    amount: number;
    type: TransactionType;
    status: PaymentStatus;
    reference: string;
    description: string;
    metadata?: any;
}
export interface AnalyticsQuery {
    startDate?: Date;
    endDate?: Date;
    groupBy?: 'day' | 'week' | 'month' | 'year';
    metrics?: string[];
}
export interface AnalyticsResult {
    metric: string;
    value: number;
    change?: number;
    percentageChange?: number;
    data?: any[];
}
//# sourceMappingURL=index.d.ts.map