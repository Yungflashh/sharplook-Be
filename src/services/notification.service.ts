import Notification, { INotification } from '../models/Notification';
import DeviceToken from '../models/DeviceToken';
import User from '../models/User';
import { NotFoundError } from '../utils/errors';
import { parsePaginationParams } from '../utils/helpers';
import { NotificationType } from '../types';
import logger from '../utils/logger';

// Firebase Admin would be initialized here
// import * as admin from 'firebase-admin';

class NotificationService {
  /**
   * Create notification
   */
  public async createNotification(data: {
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
    relatedBooking?: string;
    relatedPayment?: string;
    relatedDispute?: string;
    relatedReview?: string;
    relatedMessage?: string;
    actionUrl?: string;
    channels?: {
      push?: boolean;
      email?: boolean;
      sms?: boolean;
      inApp?: boolean;
    };
    data?: any;
  }): Promise<INotification> {
    // Get user preferences
    const user = await User.findById(data.userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Check if notifications are enabled
    if (!user.preferences?.notificationsEnabled) {
      logger.info(`Notifications disabled for user ${data.userId}`);
      return null as any;
    }

    // Create notification
    const notification = await Notification.create({
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

    logger.info(`Notification created: ${notification._id} for user ${data.userId}`);

    return notification;
  }

  /**
   * Send notification via channels
   */
  private async sendNotification(notification: INotification): Promise<void> {
    const promises: Promise<void>[] = [];

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
    } catch (error: any) {
      notification.failedAt = new Date();
      notification.failureReason = error.message;
      await notification.save();
      logger.error(`Failed to send notification ${notification._id}:`, error);
    }
  }

  /**
   * Send push notification via FCM
   */
  private async sendPushNotification(notification: INotification): Promise<void> {
    try {
      // Get user's device tokens
      const tokens = await DeviceToken.find({
        user: notification.user,
        isActive: true,
      });

      if (tokens.length === 0) {
        logger.info(`No active device tokens for user ${notification.user}`);
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

      logger.info(`Push notification sent to ${fcmTokens.length} devices`);
    } catch (error) {
      logger.error('Failed to send push notification:', error);
      throw error;
    }
  }

  /**
   * Send email notification
   */
  private async sendEmailNotification(notification: INotification): Promise<void> {
    try {
      const user = await User.findById(notification.user);
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

      logger.info(`Email notification sent to ${user.email}`);
    } catch (error) {
      logger.error('Failed to send email notification:', error);
      throw error;
    }
  }

  /**
   * Send SMS notification
   */
  private async sendSMSNotification(notification: INotification): Promise<void> {
    try {
      const user = await User.findById(notification.user);
      if (!user) {
        return;
      }

      // Use SMS service (e.g., Twilio)
      // await smsService.send({
      //   to: user.phone,
      //   message: `${notification.title}: ${notification.message}`,
      // });

      logger.info(`SMS notification sent to ${user.phone}`);
    } catch (error) {
      logger.error('Failed to send SMS notification:', error);
      throw error;
    }
  }

  /**
   * Register device token
   */
  public async registerDeviceToken(
    userId: string,
    token: string,
    deviceType: 'ios' | 'android' | 'web',
    deviceName?: string
  ): Promise<void> {
    // Check if token already exists
    const existingToken = await DeviceToken.findOne({ token });

    if (existingToken) {
      // Update user if different
      if (existingToken.user.toString() !== userId) {
        existingToken.user = userId as any;
      }
      existingToken.isActive = true;
      existingToken.lastUsedAt = new Date();
      existingToken.deviceName = deviceName || existingToken.deviceName;
      await existingToken.save();
    } else {
      // Create new token
      await DeviceToken.create({
        user: userId,
        token,
        deviceType,
        deviceName,
        isActive: true,
        lastUsedAt: new Date(),
      });
    }

    logger.info(`Device token registered for user ${userId}`);
  }

  /**
   * Unregister device token
   */
  public async unregisterDeviceToken(token: string): Promise<void> {
    await DeviceToken.findOneAndUpdate({ token }, { isActive: false });
    logger.info(`Device token unregistered: ${token}`);
  }

  /**
   * Mark notification as read
   */
  public async markAsRead(notificationId: string, userId: string): Promise<void> {
    const notification = await Notification.findOne({
      _id: notificationId,
      user: userId,
    });

    if (!notification) {
      throw new NotFoundError('Notification not found');
    }

    notification.isRead = true;
    notification.readAt = new Date();
    await notification.save();
  }

  /**
   * Mark all notifications as read
   */
  public async markAllAsRead(userId: string): Promise<void> {
    await Notification.updateMany(
      { user: userId, isRead: false },
      { isRead: true, readAt: new Date() }
    );
  }

  /**
   * Get user notifications
   */
  public async getUserNotifications(
    userId: string,
    filters?: {
      type?: NotificationType;
      isRead?: boolean;
    },
    page: number = 1,
    limit: number = 20
  ): Promise<{
    notifications: INotification[];
    total: number;
    unreadCount: number;
    page: number;
    totalPages: number;
  }> {
    const { skip } = parsePaginationParams(page, limit);

    const query: any = { user: userId };

    if (filters?.type) {
      query.type = filters.type;
    }

    if (filters?.isRead !== undefined) {
      query.isRead = filters.isRead;
    }

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(query)
        .populate('relatedBooking', 'service scheduledDate status')
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 }),
      Notification.countDocuments(query),
      Notification.countDocuments({ user: userId, isRead: false }),
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
  public async getUnreadCount(userId: string): Promise<number> {
    return await Notification.countDocuments({ user: userId, isRead: false });
  }

  /**
   * Delete notification
   */
  public async deleteNotification(notificationId: string, userId: string): Promise<void> {
    const notification = await Notification.findOne({
      _id: notificationId,
      user: userId,
    });

    if (!notification) {
      throw new NotFoundError('Notification not found');
    }

    notification.isDeleted = true;
    notification.deletedAt = new Date();
    await notification.save();
  }

  /**
   * Clear all notifications
   */
  public async clearAllNotifications(userId: string): Promise<void> {
    await Notification.updateMany(
      { user: userId },
      { isDeleted: true, deletedAt: new Date() }
    );
  }

  /**
   * Get notification settings
   */
  public async getNotificationSettings(userId: string): Promise<any> {
    const user = await User.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
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
  public async updateNotificationSettings(
    userId: string,
    settings: {
      notificationsEnabled?: boolean;
      emailNotifications?: boolean;
      pushNotifications?: boolean;
    }
  ): Promise<void> {
    const user = await User.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
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
  public async sendBulkNotifications(
    userIds: string[],
    data: {
      type: NotificationType;
      title: string;
      message: string;
      actionUrl?: string;
      channels?: any;
    }
  ): Promise<void> {
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

    await Notification.insertMany(notifications);

    // Send notifications in background
    notifications.forEach(async (notif) => {
      const notification = await Notification.findOne({
        user: notif.user,
        createdAt: { $gte: new Date(Date.now() - 1000) },
      });
      if (notification) {
        await this.sendNotification(notification);
      }
    });

    logger.info(`Bulk notifications sent to ${userIds.length} users`);
  }
}

export default new NotificationService();
