"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateSettingsValidation = exports.getNotificationsValidation = exports.notificationIdValidation = exports.unregisterDeviceTokenValidation = exports.registerDeviceTokenValidation = void 0;
const express_validator_1 = require("express-validator");
exports.registerDeviceTokenValidation = [
    (0, express_validator_1.body)('token').notEmpty().trim().withMessage('Token is required'),
    (0, express_validator_1.body)('deviceType').isIn(['ios', 'android', 'web']).withMessage('Invalid device type'),
    (0, express_validator_1.body)('deviceName').optional().trim().isLength({ max: 100 }),
];
exports.unregisterDeviceTokenValidation = [
    (0, express_validator_1.body)('token').notEmpty().trim().withMessage('Token is required'),
];
exports.notificationIdValidation = [
    (0, express_validator_1.param)('notificationId').isMongoId().withMessage('Invalid notification ID'),
];
exports.getNotificationsValidation = [
    (0, express_validator_1.query)('page').optional().isInt({ min: 1 }).withMessage('Page must be positive'),
    (0, express_validator_1.query)('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be 1-100'),
    (0, express_validator_1.query)('type')
        .optional()
        .isIn(['booking', 'payment', 'message', 'system', 'promotion'])
        .withMessage('Invalid type'),
    (0, express_validator_1.query)('isRead').optional().isBoolean().withMessage('isRead must be boolean'),
];
exports.updateSettingsValidation = [
    (0, express_validator_1.body)('notificationsEnabled').optional().isBoolean(),
    (0, express_validator_1.body)('emailNotifications').optional().isBoolean(),
    (0, express_validator_1.body)('pushNotifications').optional().isBoolean(),
];
//# sourceMappingURL=notification.validation.js.map