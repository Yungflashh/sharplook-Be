import { INotification } from '../models/Notification';
import { NotificationType } from '../types';
declare class NotificationService {
    /**
     * Create notification
     */
    createNotification(data: {
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
    }): Promise<INotification>;
    /**
     * Send notification via channels
     */
    private sendNotification;
    /**
     * Send push notification via FCM
     */
    private sendPushNotification;
    /**
     * Send email notification
     */
    private sendEmailNotification;
    /**
     * Send SMS notification
     */
    private sendSMSNotification;
    /**
     * Register device token
     */
    registerDeviceToken(userId: string, token: string, deviceType: 'ios' | 'android' | 'web', deviceName?: string): Promise<void>;
    /**
     * Unregister device token
     */
    unregisterDeviceToken(token: string): Promise<void>;
    /**
     * Mark notification as read
     */
    markAsRead(notificationId: string, userId: string): Promise<void>;
    /**
     * Mark all notifications as read
     */
    markAllAsRead(userId: string): Promise<void>;
    /**
     * Get user notifications
     */
    getUserNotifications(userId: string, filters?: {
        type?: NotificationType;
        isRead?: boolean;
    }, page?: number, limit?: number): Promise<{
        notifications: INotification[];
        total: number;
        unreadCount: number;
        page: number;
        totalPages: number;
    }>;
    /**
     * Get unread count
     */
    getUnreadCount(userId: string): Promise<number>;
    /**
     * Delete notification
     */
    deleteNotification(notificationId: string, userId: string): Promise<void>;
    /**
     * Clear all notifications
     */
    clearAllNotifications(userId: string): Promise<void>;
    /**
     * Get notification settings
     */
    getNotificationSettings(userId: string): Promise<any>;
    /**
     * Update notification settings
     */
    updateNotificationSettings(userId: string, settings: {
        notificationsEnabled?: boolean;
        emailNotifications?: boolean;
        pushNotifications?: boolean;
    }): Promise<void>;
    /**
     * Send bulk notifications
     */
    sendBulkNotifications(userIds: string[], data: {
        type: NotificationType;
        title: string;
        message: string;
        actionUrl?: string;
        channels?: any;
    }): Promise<void>;
}
declare const _default: NotificationService;
export default _default;
//# sourceMappingURL=notification.service.d.ts.map