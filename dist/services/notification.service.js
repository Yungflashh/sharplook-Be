"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Notification_1 = __importDefault(require("../models/Notification"));
const DeviceToken_1 = __importDefault(require("../models/DeviceToken"));
const User_1 = __importDefault(require("../models/User"));
const errors_1 = require("../utils/errors");
const helpers_1 = require("../utils/helpers");
const logger_1 = __importDefault(require("../utils/logger"));
// Firebase Admin would be initialized here
// import * as admin from 'firebase-admin';
class NotificationService {
    /**
     * Create notification
     */
    async createNotification(data) {
        // Get user preferences
        const user = await User_1.default.findById(data.userId);
        if (!user) {
            throw new errors_1.NotFoundError('User not found');
        }
        // Check if notifications are enabled
        if (!user.preferences?.notificationsEnabled) {
            logger_1.default.info(`Notifications disabled for user ${data.userId}`);
            return null;
        }
        // Create notification
        const notification = await Notification_1.default.create({
            user: data.userId,
            type: data.type,
            title: data.title,
            message: data.message,
            relatedBooking: data.relatedBooking,
            relatedPayment: data.relatedPayment,
            relatedDispute: data.relatedDispute,
            relatedReview: data.relatedReview,
            relatedMessage: data.relatedMessage,
            actionUrl: data.actionUrl,
            channels: {
                push: data.channels?.push !== false,
                email: data.channels?.email || false,
                sms: data.channels?.sms || false,
                inApp: data.channels?.inApp !== false,
            },
            data: data.data,
            isRead: false,
            isSent: false,
        });
        // Send notification
        await this.sendNotification(notification);
        logger_1.default.info(`Notification created: ${notification._id} for user ${data.userId}`);
        return notification;
    }
    /**
     * Send notification via channels
     */
    async sendNotification(notification) {
        const promises = [];
        // Send push notification
        if (notification.channels.push) {
            promises.push(this.sendPushNotification(notification));
        }
        // Send email notification
        if (notification.channels.email) {
            promises.push(this.sendEmailNotification(notification));
        }
        // Send SMS notification
        if (notification.channels.sms) {
            promises.push(this.sendSMSNotification(notification));
        }
        try {
            await Promise.allSettled(promises);
            notification.isSent = true;
            notification.sentAt = new Date();
            await notification.save();
        }
        catch (error) {
            notification.failedAt = new Date();
            notification.failureReason = error.message;
            await notification.save();
            logger_1.default.error(`Failed to send notification ${notification._id}:`, error);
        }
    }
    /**
     * Send push notification via FCM
     */
    async sendPushNotification(notification) {
        try {
            // Get user's device tokens
            const tokens = await DeviceToken_1.default.find({
                user: notification.user,
                isActive: true,
            });
            if (tokens.length === 0) {
                logger_1.default.info(`No active device tokens for user ${notification.user}`);
                return;
            }
            const fcmTokens = tokens.map((t) => t.token);
            // In production, use Firebase Admin SDK:
            // const message = {
            //   notification: {
            //     title: notification.title,
            //     body: notification.message,
            //   },
            //   data: {
            //     notificationId: notification._id.toString(),
            //     type: notification.type,
            //     actionUrl: notification.actionUrl || '',
            //     ...notification.data,
            //   },
            //   tokens: fcmTokens,
            // };
            //
            // const response = await admin.messaging().sendMulticast(message);
            //
            // // Handle failed tokens
            // if (response.failureCount > 0) {
            //   const failedTokens: string[] = [];
            //   response.responses.forEach((resp, idx) => {
            //     if (!resp.success) {
            //       failedTokens.push(fcmTokens[idx]);
            //     }
            //   });
            //   
            //   // Deactivate failed tokens
            //   await DeviceToken.updateMany(
            //     { token: { $in: failedTokens } },
            //     { isActive: false }
            //   );
            // }
            logger_1.default.info(`Push notification sent to ${fcmTokens.length} devices`);
        }
        catch (error) {
            logger_1.default.error('Failed to send push notification:', error);
            throw error;
        }
    }
    /**
     * Send email notification
     */
    async sendEmailNotification(notification) {
        try {
            const user = await User_1.default.findById(notification.user);
            if (!user || !user.preferences?.emailNotifications) {
                return;
            }
            // Use email service
            // await emailService.send({
            //   to: user.email,
            //   subject: notification.title,
            //   template: 'notification',
            //   data: {
            //     title: notification.title,
            //     message: notification.message,
            //     actionUrl: notification.actionUrl,
            //   },
            // });
            logger_1.default.info(`Email notification sent to ${user.email}`);
        }
        catch (error) {
            logger_1.default.error('Failed to send email notification:', error);
            throw error;
        }
    }
    /**
     * Send SMS notification
     */
    async sendSMSNotification(notification) {
        try {
            const user = await User_1.default.findById(notification.user);
            if (!user) {
                return;
            }
            // Use SMS service (e.g., Twilio)
            // await smsService.send({
            //   to: user.phone,
            //   message: `${notification.title}: ${notification.message}`,
            // });
            logger_1.default.info(`SMS notification sent to ${user.phone}`);
        }
        catch (error) {
            logger_1.default.error('Failed to send SMS notification:', error);
            throw error;
        }
    }
    /**
     * Register device token
     */
    async registerDeviceToken(userId, token, deviceType, deviceName) {
        // Check if token already exists
        const existingToken = await DeviceToken_1.default.findOne({ token });
        if (existingToken) {
            // Update user if different
            if (existingToken.user.toString() !== userId) {
                existingToken.user = userId;
            }
            existingToken.isActive = true;
            existingToken.lastUsedAt = new Date();
            existingToken.deviceName = deviceName || existingToken.deviceName;
            await existingToken.save();
        }
        else {
            // Create new token
            await DeviceToken_1.default.create({
                user: userId,
                token,
                deviceType,
                deviceName,
                isActive: true,
                lastUsedAt: new Date(),
            });
        }
        logger_1.default.info(`Device token registered for user ${userId}`);
    }
    /**
     * Unregister device token
     */
    async unregisterDeviceToken(token) {
        await DeviceToken_1.default.findOneAndUpdate({ token }, { isActive: false });
        logger_1.default.info(`Device token unregistered: ${token}`);
    }
    /**
     * Mark notification as read
     */
    async markAsRead(notificationId, userId) {
        const notification = await Notification_1.default.findOne({
            _id: notificationId,
            user: userId,
        });
        if (!notification) {
            throw new errors_1.NotFoundError('Notification not found');
        }
        notification.isRead = true;
        notification.readAt = new Date();
        await notification.save();
    }
    /**
     * Mark all notifications as read
     */
    async markAllAsRead(userId) {
        await Notification_1.default.updateMany({ user: userId, isRead: false }, { isRead: true, readAt: new Date() });
    }
    /**
     * Get user notifications
     */
    async getUserNotifications(userId, filters, page = 1, limit = 20) {
        const { skip } = (0, helpers_1.parsePaginationParams)(page, limit);
        const query = { user: userId };
        if (filters?.type) {
            query.type = filters.type;
        }
        if (filters?.isRead !== undefined) {
            query.isRead = filters.isRead;
        }
        const [notifications, total, unreadCount] = await Promise.all([
            Notification_1.default.find(query)
                .populate('relatedBooking', 'service scheduledDate status')
                .skip(skip)
                .limit(limit)
                .sort({ createdAt: -1 }),
            Notification_1.default.countDocuments(query),
            Notification_1.default.countDocuments({ user: userId, isRead: false }),
        ]);
        return {
            notifications,
            total,
            unreadCount,
            page,
            totalPages: Math.ceil(total / limit),
        };
    }
    /**
     * Get unread count
     */
    async getUnreadCount(userId) {
        return await Notification_1.default.countDocuments({ user: userId, isRead: false });
    }
    /**
     * Delete notification
     */
    async deleteNotification(notificationId, userId) {
        const notification = await Notification_1.default.findOne({
            _id: notificationId,
            user: userId,
        });
        if (!notification) {
            throw new errors_1.NotFoundError('Notification not found');
        }
        notification.isDeleted = true;
        notification.deletedAt = new Date();
        await notification.save();
    }
    /**
     * Clear all notifications
     */
    async clearAllNotifications(userId) {
        await Notification_1.default.updateMany({ user: userId }, { isDeleted: true, deletedAt: new Date() });
    }
    /**
     * Get notification settings
     */
    async getNotificationSettings(userId) {
        const user = await User_1.default.findById(userId);
        if (!user) {
            throw new errors_1.NotFoundError('User not found');
        }
        return {
            notificationsEnabled: user.preferences?.notificationsEnabled || true,
            emailNotifications: user.preferences?.emailNotifications || false,
            pushNotifications: user.preferences?.pushNotifications || true,
        };
    }
    /**
     * Update notification settings
     */
    async updateNotificationSettings(userId, settings) {
        const user = await User_1.default.findById(userId);
        if (!user) {
            throw new errors_1.NotFoundError('User not found');
        }
        if (!user.preferences) {
            user.preferences = {
                darkMode: false,
                fingerprintEnabled: false,
                notificationsEnabled: true,
                emailNotifications: false,
                pushNotifications: true,
            };
        }
        if (settings.notificationsEnabled !== undefined) {
            user.preferences.notificationsEnabled = settings.notificationsEnabled;
        }
        if (settings.emailNotifications !== undefined) {
            user.preferences.emailNotifications = settings.emailNotifications;
        }
        if (settings.pushNotifications !== undefined) {
            user.preferences.pushNotifications = settings.pushNotifications;
        }
        await user.save();
    }
    /**
     * Send bulk notifications
     */
    async sendBulkNotifications(userIds, data) {
        const notifications = userIds.map((userId) => ({
            user: userId,
            type: data.type,
            title: data.title,
            message: data.message,
            actionUrl: data.actionUrl,
            channels: data.channels || { push: true, inApp: true },
            isRead: false,
            isSent: false,
        }));
        await Notification_1.default.insertMany(notifications);
        // Send notifications in background
        notifications.forEach(async (notif) => {
            const notification = await Notification_1.default.findOne({
                user: notif.user,
                createdAt: { $gte: new Date(Date.now() - 1000) },
            });
            if (notification) {
                await this.sendNotification(notification);
            }
        });
        logger_1.default.info(`Bulk notifications sent to ${userIds.length} users`);
    }
}
exports.default = new NotificationService();
//# sourceMappingURL=notification.service.js.map