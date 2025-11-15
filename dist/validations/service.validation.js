"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rejectServiceValidation = exports.approveServiceValidation = exports.reviewIdValidation = exports.respondToReviewValidation = exports.addReviewValidation = exports.getServicesValidation = exports.serviceSlugValidation = exports.serviceIdValidation = exports.updateServiceValidation = exports.createServiceValidation = void 0;
const express_validator_1 = require("express-validator");
/**
 * Create service validation
 */
exports.createServiceValidation = [
    (0, express_validator_1.body)('name')
        .trim()
        .notEmpty()
        .withMessage('Service name is required')
        .isLength({ min: 3, max: 100 })
        .withMessage('Service name must be between 3 and 100 characters'),
    (0, express_validator_1.body)('description')
        .trim()
        .notEmpty()
        .withMessage('Description is required')
        .isLength({ min: 20, max: 2000 })
        .withMessage('Description must be between 20 and 2000 characters'),
    (0, express_validator_1.body)('category').notEmpty().withMessage('Category is required').isMongoId().withMessage('Invalid category ID'),
    (0, express_validator_1.body)('subCategory').optional().isMongoId().withMessage('Invalid subcategory ID'),
    (0, express_validator_1.body)('basePrice')
        .notEmpty()
        .withMessage('Base price is required')
        .isFloat({ min: 0 })
        .withMessage('Price must be a positive number'),
    (0, express_validator_1.body)('priceType')
        .optional()
        .isIn(['fixed', 'hourly', 'negotiable'])
        .withMessage('Price type must be fixed, hourly, or negotiable'),
    (0, express_validator_1.body)('duration')
        .optional()
        .isInt({ min: 0 })
        .withMessage('Duration must be a positive integer (in minutes)'),
    (0, express_validator_1.body)('images').optional().isArray().withMessage('Images must be an array'),
    (0, express_validator_1.body)('images.*').optional().isURL().withMessage('Each image must be a valid URL'),
    (0, express_validator_1.body)('tags').optional().isArray({ max: 20 }).withMessage('Tags must be an array (max 20)'),
    (0, express_validator_1.body)('tags.*').optional().isString().withMessage('Each tag must be a string'),
    (0, express_validator_1.body)('requirements').optional().isArray().withMessage('Requirements must be an array'),
    (0, express_validator_1.body)('whatIsIncluded').optional().isArray().withMessage('What is included must be an array'),
    (0, express_validator_1.body)('faqs').optional().isArray().withMessage('FAQs must be an array'),
    (0, express_validator_1.body)('faqs.*.question').optional().notEmpty().withMessage('FAQ question is required'),
    (0, express_validator_1.body)('faqs.*.answer').optional().notEmpty().withMessage('FAQ answer is required'),
];
/**
 * Update service validation
 */
exports.updateServiceValidation = [
    (0, express_validator_1.body)('name')
        .optional()
        .trim()
        .isLength({ min: 3, max: 100 })
        .withMessage('Service name must be between 3 and 100 characters'),
    (0, express_validator_1.body)('description')
        .optional()
        .trim()
        .isLength({ min: 20, max: 2000 })
        .withMessage('Description must be between 20 and 2000 characters'),
    (0, express_validator_1.body)('category').optional().isMongoId().withMessage('Invalid category ID'),
    (0, express_validator_1.body)('subCategory').optional().isMongoId().withMessage('Invalid subcategory ID'),
    (0, express_validator_1.body)('basePrice')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('Price must be a positive number'),
    (0, express_validator_1.body)('priceType')
        .optional()
        .isIn(['fixed', 'hourly', 'negotiable'])
        .withMessage('Price type must be fixed, hourly, or negotiable'),
    (0, express_validator_1.body)('duration')
        .optional()
        .isInt({ min: 0 })
        .withMessage('Duration must be a positive integer'),
    (0, express_validator_1.body)('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
];
/**
 * Service ID param validation
 */
exports.serviceIdValidation = [
    (0, express_validator_1.param)('serviceId').isMongoId().withMessage('Invalid service ID'),
];
/**
 * Service slug param validation
 */
exports.serviceSlugValidation = [
    (0, express_validator_1.param)('slug').trim().notEmpty().withMessage('Slug is required'),
];
/**
 * Get services validation
 */
exports.getServicesValidation = [
    (0, express_validator_1.query)('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    (0, express_validator_1.query)('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Limit must be between 1 and 100'),
    (0, express_validator_1.query)('vendor').optional().isMongoId().withMessage('Invalid vendor ID'),
    (0, express_validator_1.query)('category').optional().isMongoId().withMessage('Invalid category ID'),
    (0, express_validator_1.query)('subCategory').optional().isMongoId().withMessage('Invalid subcategory ID'),
    (0, express_validator_1.query)('priceMin')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('Minimum price must be a positive number'),
    (0, express_validator_1.query)('priceMax')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('Maximum price must be a positive number'),
    (0, express_validator_1.query)('rating')
        .optional()
        .isFloat({ min: 0, max: 5 })
        .withMessage('Rating must be between 0 and 5'),
    (0, express_validator_1.query)('latitude')
        .optional()
        .isFloat({ min: -90, max: 90 })
        .withMessage('Invalid latitude'),
    (0, express_validator_1.query)('longitude')
        .optional()
        .isFloat({ min: -180, max: 180 })
        .withMessage('Invalid longitude'),
    (0, express_validator_1.query)('maxDistance')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Max distance must be between 1 and 100 km'),
    (0, express_validator_1.query)('sortBy')
        .optional()
        .isIn(['createdAt', 'basePrice', 'metadata.averageRating', 'metadata.bookings'])
        .withMessage('Invalid sort field'),
    (0, express_validator_1.query)('sortOrder')
        .optional()
        .isIn(['asc', 'desc'])
        .withMessage('Sort order must be asc or desc'),
    (0, express_validator_1.query)('search').optional().trim().isLength({ min: 1 }),
    // Admin-only filter
    (0, express_validator_1.query)('approvalStatus')
        .optional()
        .isIn(['pending', 'approved', 'rejected'])
        .withMessage('Approval status must be pending, approved, or rejected'),
];
/**
 * Add review validation
 */
exports.addReviewValidation = [
    (0, express_validator_1.body)('bookingId')
        .notEmpty()
        .withMessage('Booking ID is required')
        .isMongoId()
        .withMessage('Invalid booking ID'),
    (0, express_validator_1.body)('rating')
        .notEmpty()
        .withMessage('Rating is required')
        .isInt({ min: 1, max: 5 })
        .withMessage('Rating must be between 1 and 5'),
    (0, express_validator_1.body)('comment')
        .optional()
        .trim()
        .isLength({ min: 10, max: 1000 })
        .withMessage('Comment must be between 10 and 1000 characters'),
    (0, express_validator_1.body)('images').optional().isArray({ max: 5 }).withMessage('Maximum 5 images allowed'),
    (0, express_validator_1.body)('images.*').optional().isURL().withMessage('Each image must be a valid URL'),
];
/**
 * Respond to review validation
 */
exports.respondToReviewValidation = [
    (0, express_validator_1.body)('response')
        .trim()
        .notEmpty()
        .withMessage('Response is required')
        .isLength({ min: 10, max: 500 })
        .withMessage('Response must be between 10 and 500 characters'),
];
/**
 * Review ID param validation
 */
exports.reviewIdValidation = [
    (0, express_validator_1.param)('reviewId').isMongoId().withMessage('Invalid review ID'),
];
// ==================== ADMIN APPROVAL VALIDATIONS ====================
/**
 * Approve service validation
 */
exports.approveServiceValidation = [
    (0, express_validator_1.body)('notes')
        .optional()
        .trim()
        .isLength({ max: 500 })
        .withMessage('Approval notes cannot exceed 500 characters'),
];
/**
 * Reject service validation
 */
exports.rejectServiceValidation = [
    (0, express_validator_1.body)('reason')
        .trim()
        .notEmpty()
        .withMessage('Rejection reason is required')
        .isLength({ min: 10, max: 500 })
        .withMessage('Rejection reason must be between 10 and 500 characters'),
];
//# sourceMappingURL=service.validation.js.map