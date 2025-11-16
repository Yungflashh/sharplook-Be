import { Router } from 'express';
import userController from '../controllers/user.controller';
import {
  authenticate,
  requireAdmin,
  requireSuperAdmin,
  optionalAuth,
} from '../middlewares/auth';
import { validate, validatePagination } from '../middlewares/validate';
import {
  updateProfileValidation,
  updatePreferencesValidation,
  setWithdrawalPinValidation,
  verifyWithdrawalPinValidation,
  becomeVendorValidation,
  updateVendorProfileValidation,
  getUsersValidation,
  getVendorsValidation,
  getTopVendorsValidation,
  updateUserStatusValidation,
  userIdValidation,
  getVendorDetailsValidation
} from '../validations/user.validation';

const router = Router();

/**
 * @route   GET /api/v1/users/profile
 * @desc    Get user profile
 * @access  Private
 */
router.get('/profile', authenticate, userController.getProfile);

/**
 * @route   PUT /api/v1/users/profile
 * @desc    Update user profile
 * @access  Private
 */
router.put(
  '/profile',
  authenticate,
  validate(updateProfileValidation),
  userController.updateProfile
);

/**
 * @route   PUT /api/v1/users/preferences
 * @desc    Update user preferences
 * @access  Private
 */
router.put(
  '/preferences',
  authenticate,
  validate(updatePreferencesValidation),
  userController.updatePreferences
);

/**
 * @route   POST /api/v1/users/withdrawal-pin
 * @desc    Set withdrawal PIN
 * @access  Private
 */
router.post(
  '/withdrawal-pin',
  authenticate,
  validate(setWithdrawalPinValidation),
  userController.setWithdrawalPin
);

/**
 * @route   POST /api/v1/users/verify-withdrawal-pin
 * @desc    Verify withdrawal PIN
 * @access  Private
 */
router.post(
  '/verify-withdrawal-pin',
  authenticate,
  validate(verifyWithdrawalPinValidation),
  userController.verifyWithdrawalPin
);

/**
 * @route   POST /api/v1/users/become-vendor
 * @desc    Register as vendor
 * @access  Private
 */
router.post(
  '/become-vendor',
  authenticate,
  validate(becomeVendorValidation),
  userController.becomeVendor
);

/**
 * @route   PUT /api/v1/users/vendor-profile
 * @desc    Update vendor profile
 * @access  Private (Vendor only)
 */
router.put(
  '/vendor-profile',
  authenticate,
  validate(updateVendorProfileValidation),
  userController.updateVendorProfile
);

/**
 * @route   GET /api/v1/users/stats
 * @desc    Get user statistics
 * @access  Private
 */
router.get('/stats', authenticate, userController.getUserStats);

/**
 * @route   GET /api/v1/users/top-vendors
 * @desc    Get top-rated vendors
 * @access  Public (with optional auth)
 */
router.get(
  '/top-vendors',
  optionalAuth,
  validate(getTopVendorsValidation),
  userController.getTopVendors
);

/**
 * @route   GET /api/v1/users/vendors
 * @desc    Get vendors with filters
 * @access  Public (with optional auth)
 */
router.get(
  '/vendors',
  optionalAuth,
  validatePagination,
  validate(getVendorsValidation),
  userController.getVendors
);

// ==================== ADMIN ROUTES ====================

/**
 * @route   GET /api/v1/users
 * @desc    Get all users (admin)
 * @access  Private (Admin)
 */
router.get(
  '/',
  authenticate,
  requireAdmin,
  validatePagination,
  validate(getUsersValidation),
  userController.getAllUsers
);

/**
 * @route   GET /api/v1/users/:userId
 * @desc    Get user by ID (admin)
 * @access  Private (Admin)
 */
router.get(
  '/:userId',
  authenticate,
  requireAdmin,
  validate(userIdValidation),
  userController.getUserById
);

/**
 * @route   PUT /api/v1/users/:userId/status
 * @desc    Update user status (admin)
 * @access  Private (Admin)
 */
router.put(
  '/:userId/status',
  authenticate,
  requireAdmin,
  validate(updateUserStatusValidation),
  userController.updateUserStatus
);

/**
 * @route   POST /api/v1/users/:userId/verify-vendor
 * @desc    Verify vendor (admin)
 * @access  Private (Admin)
 */
router.post(
  '/:userId/verify-vendor',
  authenticate,
  requireAdmin,
  validate(userIdValidation),
  userController.verifyVendor
);

/**
 * @route   GET /api/v1/users/vendors/:vendorId
 * @desc    Get full vendor details (profile, services, reviews)
 * @access  Public (with optional auth)
 */
router.get(
  '/vendors/:vendorId',
  optionalAuth,
  validate(getVendorDetailsValidation),
  userController.getVendorFullDetails
);

/**
 * @route   DELETE /api/v1/users/:userId
 * @desc    Soft delete user (admin)
 * @access  Private (Super Admin)
 */
router.delete(
  '/:userId',
  authenticate,
  requireSuperAdmin,
  validate(userIdValidation),
  userController.softDeleteUser
);

/**
 * @route   POST /api/v1/users/:userId/restore
 * @desc    Restore deleted user (admin)
 * @access  Private (Super Admin)
 */
router.post(
  '/:userId/restore',
  authenticate,
  requireSuperAdmin,
  validate(userIdValidation),
  userController.restoreUser
);

export default router;