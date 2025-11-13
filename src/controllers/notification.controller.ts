import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import notificationService from '../services/notification.service';
import ResponseHandler from '../utils/response';
import { asyncHandler } from '../middlewares/error';

class NotificationController {
  public registerDeviceToken = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const userId = req.user!.id;
      const { token, deviceType, deviceName } = req.body;
      
      await notificationService.registerDeviceToken(userId, token, deviceType, deviceName);
      
      return ResponseHandler.success(res, 'Device token registered');
    }
  );

  public unregisterDeviceToken = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const { token } = req.body;
      
      await notificationService.unregisterDeviceToken(token);
      
      return ResponseHandler.success(res, 'Device token unregistered');
    }
  );

  public getUserNotifications = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const userId = req.user!.id;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const filters = {
        type: req.query.type as any,
        isRead: req.query.isRead === 'true' ? true : req.query.isRead === 'false' ? false : undefined,
      };
      
      const result = await notificationService.getUserNotifications(userId, filters, page, limit);
      
      return ResponseHandler.success(
        res,
        'Notifications retrieved',
        result.notifications,
        200,
        {
          pagination: {
            currentPage: page,
            totalPages: result.totalPages,
            pageSize: limit,
            totalItems: result.total,
            hasNextPage: page < result.totalPages,
            hasPrevPage: page > 1,
          },
          unreadCount: result.unreadCount,
        }
      );
    }
  );

  public markAsRead = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const { notificationId } = req.params;
      const userId = req.user!.id;
      
      await notificationService.markAsRead(notificationId, userId);
      
      return ResponseHandler.success(res, 'Notification marked as read');
    }
  );

  public markAllAsRead = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const userId = req.user!.id;
      
      await notificationService.markAllAsRead(userId);
      
      return ResponseHandler.success(res, 'All notifications marked as read');
    }
  );

  public getUnreadCount = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const userId = req.user!.id;
      
      const count = await notificationService.getUnreadCount(userId);
      
      return ResponseHandler.success(res, 'Unread count retrieved', { count });
    }
  );

  public deleteNotification = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const { notificationId } = req.params;
      const userId = req.user!.id;
      
      await notificationService.deleteNotification(notificationId, userId);
      
      return ResponseHandler.success(res, 'Notification deleted');
    }
  );

  public clearAllNotifications = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const userId = req.user!.id;
      
      await notificationService.clearAllNotifications(userId);
      
      return ResponseHandler.success(res, 'All notifications cleared');
    }
  );

  public getNotificationSettings = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const userId = req.user!.id;
      
      const settings = await notificationService.getNotificationSettings(userId);
      
      return ResponseHandler.success(res, 'Settings retrieved', { settings });
    }
  );

  public updateNotificationSettings = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const userId = req.user!.id;
      
      await notificationService.updateNotificationSettings(userId, req.body);
      
      return ResponseHandler.success(res, 'Settings updated');
    }
  );
}

export default new NotificationController();
