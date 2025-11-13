"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const notification_service_1 = __importDefault(require("../services/notification.service"));
const response_1 = __importDefault(require("../utils/response"));
const error_1 = require("../middlewares/error");
class NotificationController {
    constructor() {
        this.registerDeviceToken = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const userId = req.user.id;
            const { token, deviceType, deviceName } = req.body;
            await notification_service_1.default.registerDeviceToken(userId, token, deviceType, deviceName);
            return response_1.default.success(res, 'Device token registered');
        });
        this.unregisterDeviceToken = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const { token } = req.body;
            await notification_service_1.default.unregisterDeviceToken(token);
            return response_1.default.success(res, 'Device token unregistered');
        });
        this.getUserNotifications = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const userId = req.user.id;
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 20;
            const filters = {
                type: req.query.type,
                isRead: req.query.isRead === 'true' ? true : req.query.isRead === 'false' ? false : undefined,
            };
            const result = await notification_service_1.default.getUserNotifications(userId, filters, page, limit);
            return response_1.default.success(res, 'Notifications retrieved', result.notifications, 200, {
                pagination: {
                    currentPage: page,
                    totalPages: result.totalPages,
                    pageSize: limit,
                    totalItems: result.total,
                    hasNextPage: page < result.totalPages,
                    hasPrevPage: page > 1,
                },
                unreadCount: result.unreadCount,
            });
        });
        this.markAsRead = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const { notificationId } = req.params;
            const userId = req.user.id;
            await notification_service_1.default.markAsRead(notificationId, userId);
            return response_1.default.success(res, 'Notification marked as read');
        });
        this.markAllAsRead = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const userId = req.user.id;
            await notification_service_1.default.markAllAsRead(userId);
            return response_1.default.success(res, 'All notifications marked as read');
        });
        this.getUnreadCount = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const userId = req.user.id;
            const count = await notification_service_1.default.getUnreadCount(userId);
            return response_1.default.success(res, 'Unread count retrieved', { count });
        });
        this.deleteNotification = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const { notificationId } = req.params;
            const userId = req.user.id;
            await notification_service_1.default.deleteNotification(notificationId, userId);
            return response_1.default.success(res, 'Notification deleted');
        });
        this.clearAllNotifications = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const userId = req.user.id;
            await notification_service_1.default.clearAllNotifications(userId);
            return response_1.default.success(res, 'All notifications cleared');
        });
        this.getNotificationSettings = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const userId = req.user.id;
            const settings = await notification_service_1.default.getNotificationSettings(userId);
            return response_1.default.success(res, 'Settings retrieved', { settings });
        });
        this.updateNotificationSettings = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const userId = req.user.id;
            await notification_service_1.default.updateNotificationSettings(userId, req.body);
            return response_1.default.success(res, 'Settings updated');
        });
    }
}
exports.default = new NotificationController();
//# sourceMappingURL=notification.controller.js.map