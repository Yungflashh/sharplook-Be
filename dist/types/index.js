"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SocketEvent = exports.EmailTemplate = exports.DisputeResolution = exports.DisputeStatus = exports.NotificationChannel = exports.NotificationType = exports.TransactionType = exports.PaymentStatus = exports.BookingType = exports.BookingStatus = exports.VendorType = exports.UserStatus = exports.UserRole = void 0;
// User Types
var UserRole;
(function (UserRole) {
    UserRole["CLIENT"] = "client";
    UserRole["VENDOR"] = "vendor";
    UserRole["SUPER_ADMIN"] = "super_admin";
    UserRole["ADMIN"] = "admin";
    UserRole["FINANCIAL_ADMIN"] = "financial_admin";
    UserRole["ANALYTICS_ADMIN"] = "analytics_admin";
    UserRole["SUPPORT"] = "support";
})(UserRole || (exports.UserRole = UserRole = {}));
var UserStatus;
(function (UserStatus) {
    UserStatus["ACTIVE"] = "active";
    UserStatus["INACTIVE"] = "inactive";
    UserStatus["SUSPENDED"] = "suspended";
    UserStatus["PENDING_VERIFICATION"] = "pending_verification";
})(UserStatus || (exports.UserStatus = UserStatus = {}));
var VendorType;
(function (VendorType) {
    VendorType["HOME_SERVICE"] = "home_service";
    VendorType["IN_SHOP"] = "in_shop";
    VendorType["BOTH"] = "both";
})(VendorType || (exports.VendorType = VendorType = {}));
// Booking Types
var BookingStatus;
(function (BookingStatus) {
    BookingStatus["PENDING"] = "pending";
    BookingStatus["ACCEPTED"] = "accepted";
    BookingStatus["IN_PROGRESS"] = "in_progress";
    BookingStatus["COMPLETED"] = "completed";
    BookingStatus["CANCELLED"] = "cancelled";
    BookingStatus["DISPUTED"] = "disputed";
})(BookingStatus || (exports.BookingStatus = BookingStatus = {}));
var BookingType;
(function (BookingType) {
    BookingType["STANDARD"] = "standard";
    BookingType["OFFER_BASED"] = "offer_based";
})(BookingType || (exports.BookingType = BookingType = {}));
// Payment Types
var PaymentStatus;
(function (PaymentStatus) {
    PaymentStatus["PENDING"] = "pending";
    PaymentStatus["COMPLETED"] = "completed";
    PaymentStatus["FAILED"] = "failed";
    PaymentStatus["REFUNDED"] = "refunded";
    PaymentStatus["ESCROWED"] = "escrowed";
    PaymentStatus["RELEASED"] = "released";
})(PaymentStatus || (exports.PaymentStatus = PaymentStatus = {}));
var TransactionType;
(function (TransactionType) {
    TransactionType["DEPOSIT"] = "deposit";
    TransactionType["WITHDRAWAL"] = "withdrawal";
    TransactionType["BOOKING_PAYMENT"] = "booking_payment";
    TransactionType["REFUND"] = "refund";
    TransactionType["COMMISSION"] = "commission";
    TransactionType["REFERRAL_BONUS"] = "referral_bonus";
    TransactionType["SUBSCRIPTION_PAYMENT"] = "subscription_payment";
})(TransactionType || (exports.TransactionType = TransactionType = {}));
// Notification Types
var NotificationType;
(function (NotificationType) {
    NotificationType["BOOKING"] = "booking";
    NotificationType["PAYMENT"] = "payment";
    NotificationType["MESSAGE"] = "message";
    NotificationType["SYSTEM"] = "system";
    NotificationType["PROMOTION"] = "promotion";
})(NotificationType || (exports.NotificationType = NotificationType = {}));
var NotificationChannel;
(function (NotificationChannel) {
    NotificationChannel["PUSH"] = "push";
    NotificationChannel["EMAIL"] = "email";
    NotificationChannel["SMS"] = "sms";
    NotificationChannel["IN_APP"] = "in_app";
})(NotificationChannel || (exports.NotificationChannel = NotificationChannel = {}));
// Dispute Types
var DisputeStatus;
(function (DisputeStatus) {
    DisputeStatus["OPEN"] = "open";
    DisputeStatus["IN_REVIEW"] = "in_review";
    DisputeStatus["RESOLVED"] = "resolved";
    DisputeStatus["CLOSED"] = "closed";
})(DisputeStatus || (exports.DisputeStatus = DisputeStatus = {}));
var DisputeResolution;
(function (DisputeResolution) {
    DisputeResolution["REFUND_CLIENT"] = "refund_client";
    DisputeResolution["PAY_VENDOR"] = "pay_vendor";
    DisputeResolution["PARTIAL_REFUND"] = "partial_refund";
})(DisputeResolution || (exports.DisputeResolution = DisputeResolution = {}));
// Email Template Types
var EmailTemplate;
(function (EmailTemplate) {
    EmailTemplate["WELCOME"] = "welcome";
    EmailTemplate["LOGIN"] = "login";
    EmailTemplate["VERIFICATION"] = "verification";
    EmailTemplate["PASSWORD_RESET"] = "password_reset";
    EmailTemplate["BOOKING_CONFIRMATION"] = "booking_confirmation";
    EmailTemplate["BOOKING_ACCEPTED"] = "booking_accepted";
    EmailTemplate["BOOKING_COMPLETED"] = "booking_completed";
    EmailTemplate["BOOKING_CANCELLED"] = "booking_cancelled";
    EmailTemplate["PAYMENT_RECEIVED"] = "payment_received";
    EmailTemplate["PAYMENT_SENT"] = "payment_sent";
    EmailTemplate["WITHDRAWAL_REQUEST"] = "withdrawal_request";
    EmailTemplate["WITHDRAWAL_COMPLETED"] = "withdrawal_completed";
    EmailTemplate["DISPUTE_OPENED"] = "dispute_opened";
    EmailTemplate["DISPUTE_RESOLVED"] = "dispute_resolved";
    EmailTemplate["OFFER_RECEIVED"] = "offer_received";
    EmailTemplate["COUNTER_OFFER"] = "counter_offer";
})(EmailTemplate || (exports.EmailTemplate = EmailTemplate = {}));
// WebSocket Event Types
var SocketEvent;
(function (SocketEvent) {
    SocketEvent["CONNECTION"] = "connection";
    SocketEvent["DISCONNECT"] = "disconnect";
    SocketEvent["MESSAGE"] = "message";
    SocketEvent["TYPING"] = "typing";
    SocketEvent["BOOKING_UPDATE"] = "booking_update";
    SocketEvent["NOTIFICATION"] = "notification";
    SocketEvent["ONLINE_STATUS"] = "online_status";
    SocketEvent["CALL_INITIATED"] = "call_initiated";
    SocketEvent["CALL_ACCEPTED"] = "call_accepted";
    SocketEvent["CALL_REJECTED"] = "call_rejected";
    SocketEvent["CALL_ENDED"] = "call_ended";
})(SocketEvent || (exports.SocketEvent = SocketEvent = {}));
//# sourceMappingURL=index.js.map