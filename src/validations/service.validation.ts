import { body, param, query } from 'express-validator';

/**
 * Create service validation
 */
export const createServiceValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Service name is required')
    .isLength({ min: 3, max: 100 })
    .withMessage('Service name must be between 3 and 100 characters'),

  body('description')
    .trim()
    .notEmpty()
    .withMessage('Description is required')
    .isLength({ min: 20, max: 2000 })
    .withMessage('Description must be between 20 and 2000 characters'),

  body('category').notEmpty().withMessage('Category is required').isMongoId().withMessage('Invalid category ID'),

  body('subCategory').optional().isMongoId().withMessage('Invalid subcategory ID'),

  body('basePrice')
    .notEmpty()
    .withMessage('Base price is required')
    .isFloat({ min: 0 })
    .withMessage('Price must be a positive number'),

  body('priceType')
    .optional()
    .isIn(['fixed', 'hourly', 'negotiable'])
    .withMessage('Price type must be fixed, hourly, or negotiable'),

  body('duration')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Duration must be a positive integer (in minutes)'),

  body('images').optional().isArray().withMessage('Images must be an array'),

  body('images.*').optional().isURL().withMessage('Each image must be a valid URL'),

  body('tags').optional().isArray({ max: 20 }).withMessage('Tags must be an array (max 20)'),

  body('tags.*').optional().isString().withMessage('Each tag must be a string'),

  body('requirements').optional().isArray().withMessage('Requirements must be an array'),

  body('whatIsIncluded').optional().isArray().withMessage('What is included must be an array'),

  body('faqs').optional().isArray().withMessage('FAQs must be an array'),

  body('faqs.*.question').optional().notEmpty().withMessage('FAQ question is required'),

  body('faqs.*.answer').optional().notEmpty().withMessage('FAQ answer is required'),
];

/**
 * Update service validation
 */
export const updateServiceValidation = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('Service name must be between 3 and 100 characters'),

  body('description')
    .optional()
    .trim()
    .isLength({ min: 20, max: 2000 })
    .withMessage('Description must be between 20 and 2000 characters'),

  body('category').optional().isMongoId().withMessage('Invalid category ID'),

  body('subCategory').optional().isMongoId().withMessage('Invalid subcategory ID'),

  body('basePrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Price must be a positive number'),

  body('priceType')
    .optional()
    .isIn(['fixed', 'hourly', 'negotiable'])
    .withMessage('Price type must be fixed, hourly, or negotiable'),

  body('duration')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Duration must be a positive integer'),

  body('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
];

/**
 * Service ID param validation
 */
export const serviceIdValidation = [
  param('serviceId').isMongoId().withMessage('Invalid service ID'),
];

/**
 * Service slug param validation
 */
export const serviceSlugValidation = [
  param('slug').trim().notEmpty().withMessage('Slug is required'),
];

/**
 * Get services validation
 */
export const getServicesValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),

  query('vendor').optional().isMongoId().withMessage('Invalid vendor ID'),

  query('category').optional().isMongoId().withMessage('Invalid category ID'),

  query('subCategory').optional().isMongoId().withMessage('Invalid subcategory ID'),

  query('priceMin')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Minimum price must be a positive number'),

  query('priceMax')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Maximum price must be a positive number'),

  query('rating')
    .optional()
    .isFloat({ min: 0, max: 5 })
    .withMessage('Rating must be between 0 and 5'),

  query('latitude')
    .optional()
    .isFloat({ min: -90, max: 90 })
    .withMessage('Invalid latitude'),

  query('longitude')
    .optional()
    .isFloat({ min: -180, max: 180 })
    .withMessage('Invalid longitude'),

  query('maxDistance')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Max distance must be between 1 and 100 km'),

  query('sortBy')
    .optional()
    .isIn(['createdAt', 'basePrice', 'metadata.averageRating', 'metadata.bookings'])
    .withMessage('Invalid sort field'),

  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Sort order must be asc or desc'),

  query('search').optional().trim().isLength({ min: 1 }),
];

/**
 * Add review validation
 */
export const addReviewValidation = [
  body('bookingId')
    .notEmpty()
    .withMessage('Booking ID is required')
    .isMongoId()
    .withMessage('Invalid booking ID'),

  body('rating')
    .notEmpty()
    .withMessage('Rating is required')
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating must be between 1 and 5'),

  body('comment')
    .optional()
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage('Comment must be between 10 and 1000 characters'),

  body('images').optional().isArray({ max: 5 }).withMessage('Maximum 5 images allowed'),

  body('images.*').optional().isURL().withMessage('Each image must be a valid URL'),
];

/**
 * Respond to review validation
 */
export const respondToReviewValidation = [
  body('response')
    .trim()
    .notEmpty()
    .withMessage('Response is required')
    .isLength({ min: 10, max: 500 })
    .withMessage('Response must be between 10 and 500 characters'),
];

/**
 * Review ID param validation
 */
export const reviewIdValidation = [
  param('reviewId').isMongoId().withMessage('Invalid review ID'),
];
