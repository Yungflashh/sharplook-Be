import { body, param, query } from 'express-validator';

export const registerDeviceTokenValidation = [
  body('token').notEmpty().trim().withMessage('Token is required'),
  body('deviceType').isIn(['ios', 'android', 'web']).withMessage('Invalid device type'),
  body('deviceName').optional().trim().isLength({ max: 100 }),
];

export const unregisterDeviceTokenValidation = [
  body('token').notEmpty().trim().withMessage('Token is required'),
];

export const notificationIdValidation = [
  param('notificationId').isMongoId().withMessage('Invalid notification ID'),
];

export const getNotificationsValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be positive'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be 1-100'),
  query('type')
    .optional()
    .isIn(['booking', 'payment', 'message', 'system', 'promotion'])
    .withMessage('Invalid type'),
  query('isRead').optional().isBoolean().withMessage('isRead must be boolean'),
];

export const updateSettingsValidation = [
  body('notificationsEnabled').optional().isBoolean(),
  body('emailNotifications').optional().isBoolean(),
  body('pushNotifications').optional().isBoolean(),
];
