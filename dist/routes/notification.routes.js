"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const notification_controller_1 = __importDefault(require("../controllers/notification.controller"));
const auth_1 = require("../middlewares/auth");
const validate_1 = require("../middlewares/validate");
const notification_validation_1 = require("../validations/notification.validation");
const router = (0, express_1.Router)();
/**
 * @route   POST /api/v1/notifications/register-device
 * @desc    Register device token for push notifications
 * @access  Private
 */
router.post('/register-device', auth_1.authenticate, (0, validate_1.validate)(notification_validation_1.registerDeviceTokenValidation), notification_controller_1.default.registerDeviceToken);
/**
 * @route   POST /api/v1/notifications/unregister-device
 * @desc    Unregister device token
 * @access  Private
 */
router.post('/unregister-device', auth_1.authenticate, (0, validate_1.validate)(notification_validation_1.unregisterDeviceTokenValidation), notification_controller_1.default.unregisterDeviceToken);
/**
 * @route   GET /api/v1/notifications
 * @desc    Get user notifications
 * @access  Private
 */
router.get('/', auth_1.authenticate, validate_1.validatePagination, (0, validate_1.validate)(notification_validation_1.getNotificationsValidation), notification_controller_1.default.getUserNotifications);
/**
 * @route   GET /api/v1/notifications/unread-count
 * @desc    Get unread notification count
 * @access  Private
 */
router.get('/unread-count', auth_1.authenticate, notification_controller_1.default.getUnreadCount);
/**
 * @route   PUT /api/v1/notifications/:notificationId/read
 * @desc    Mark notification as read
 * @access  Private
 */
router.put('/:notificationId/read', auth_1.authenticate, (0, validate_1.validate)(notification_validation_1.notificationIdValidation), notification_controller_1.default.markAsRead);
/**
 * @route   PUT /api/v1/notifications/read-all
 * @desc    Mark all notifications as read
 * @access  Private
 */
router.put('/read-all', auth_1.authenticate, notification_controller_1.default.markAllAsRead);
/**
 * @route   DELETE /api/v1/notifications/:notificationId
 * @desc    Delete notification
 * @access  Private
 */
router.delete('/:notificationId', auth_1.authenticate, (0, validate_1.validate)(notification_validation_1.notificationIdValidation), notification_controller_1.default.deleteNotification);
/**
 * @route   DELETE /api/v1/notifications
 * @desc    Clear all notifications
 * @access  Private
 */
router.delete('/', auth_1.authenticate, notification_controller_1.default.clearAllNotifications);
/**
 * @route   GET /api/v1/notifications/settings
 * @desc    Get notification settings
 * @access  Private
 */
router.get('/settings', auth_1.authenticate, notification_controller_1.default.getNotificationSettings);
/**
 * @route   PUT /api/v1/notifications/settings
 * @desc    Update notification settings
 * @access  Private
 */
router.put('/settings', auth_1.authenticate, (0, validate_1.validate)(notification_validation_1.updateSettingsValidation), notification_controller_1.default.updateNotificationSettings);
exports.default = router;
//# sourceMappingURL=notification.routes.js.map