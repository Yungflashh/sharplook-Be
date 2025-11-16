"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const user_service_1 = __importDefault(require("../services/user.service"));
const response_1 = __importDefault(require("../utils/response"));
const error_1 = require("../middlewares/error");
class UserController {
    constructor() {
        /**
         * Get user profile
         * GET /api/v1/users/profile
         */
        this.getProfile = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const userId = req.user.id;
            const user = await user_service_1.default.getProfile(userId);
            // Remove sensitive data
            const userResponse = user.toObject();
            delete userResponse.password;
            delete userResponse.refreshToken;
            delete userResponse.withdrawalPin;
            return response_1.default.success(res, 'Profile retrieved successfully', {
                user: userResponse,
            });
        });
        /**
         * Update user profile
         * PUT /api/v1/users/profile
         */
        this.updateProfile = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const userId = req.user.id;
            const user = await user_service_1.default.updateProfile(userId, req.body);
            // Remove sensitive data
            const userResponse = user.toObject();
            delete userResponse.password;
            delete userResponse.refreshToken;
            delete userResponse.withdrawalPin;
            return response_1.default.success(res, 'Profile updated successfully', {
                user: userResponse,
            });
        });
        /**
         * Update user preferences
         * PUT /api/v1/users/preferences
         */
        this.updatePreferences = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const userId = req.user.id;
            const user = await user_service_1.default.updatePreferences(userId, req.body);
            return response_1.default.success(res, 'Preferences updated successfully', {
                preferences: user.preferences,
            });
        });
        /**
         * Set withdrawal PIN
         * POST /api/v1/users/withdrawal-pin
         */
        this.setWithdrawalPin = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const userId = req.user.id;
            const { pin } = req.body;
            await user_service_1.default.setWithdrawalPin(userId, pin);
            return response_1.default.success(res, 'Withdrawal PIN set successfully');
        });
        /**
         * Verify withdrawal PIN
         * POST /api/v1/users/verify-withdrawal-pin
         */
        this.verifyWithdrawalPin = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const userId = req.user.id;
            const { pin } = req.body;
            const isValid = await user_service_1.default.verifyWithdrawalPin(userId, pin);
            return response_1.default.success(res, 'PIN verification result', {
                isValid,
            });
        });
        /**
         * Become vendor
         * POST /api/v1/users/become-vendor
         */
        this.becomeVendor = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const userId = req.user.id;
            const user = await user_service_1.default.becomeVendor(userId, req.body);
            // Remove sensitive data
            const userResponse = user.toObject();
            delete userResponse.password;
            delete userResponse.refreshToken;
            delete userResponse.withdrawalPin;
            return response_1.default.success(res, 'Vendor registration successful', {
                user: userResponse,
            });
        });
        /**
         * Update vendor profile
         * PUT /api/v1/users/vendor-profile
         */
        this.updateVendorProfile = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const userId = req.user.id;
            const user = await user_service_1.default.updateVendorProfile(userId, req.body);
            // Remove sensitive data
            const userResponse = user.toObject();
            delete userResponse.password;
            delete userResponse.refreshToken;
            delete userResponse.withdrawalPin;
            return response_1.default.success(res, 'Vendor profile updated successfully', {
                user: userResponse,
            });
        });
        /**
         * Get all users (admin)
         * GET /api/v1/users
         */
        this.getAllUsers = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const filters = {
                role: req.query.role,
                status: req.query.status,
                isVendor: req.query.isVendor === 'true' ? true : req.query.isVendor === 'false' ? false : undefined,
                search: req.query.search,
            };
            const result = await user_service_1.default.getAllUsers(page, limit, filters);
            return response_1.default.paginated(res, 'Users retrieved successfully', result.users, page, limit, result.total);
        });
        /**
         * Get vendors
         * GET /api/v1/users/vendors
         */
        this.getVendors = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const filters = {
                vendorType: req.query.vendorType,
                category: req.query.category,
                rating: req.query.rating ? parseFloat(req.query.rating) : undefined,
                search: req.query.search,
            };
            // Add location filter if coordinates provided
            if (req.query.latitude && req.query.longitude) {
                filters.location = {
                    latitude: parseFloat(req.query.latitude),
                    longitude: parseFloat(req.query.longitude),
                    maxDistance: req.query.maxDistance ? parseInt(req.query.maxDistance) : 10,
                };
            }
            const result = await user_service_1.default.getVendors(filters, page, limit);
            return response_1.default.paginated(res, 'Vendors retrieved successfully', result.vendors, page, limit, result.total);
        });
        this.getTopVendors = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const limit = parseInt(req.query.limit) || 10;
            const filters = {
                vendorType: req.query.vendorType,
                category: req.query.category,
                minRating: req.query.minRating ? parseFloat(req.query.minRating) : undefined,
            };
            // Remove undefined filters
            Object.keys(filters).forEach(key => {
                if (filters[key] === undefined) {
                    delete filters[key];
                }
            });
            const vendors = await user_service_1.default.getTopVendors(limit, filters);
            return response_1.default.success(res, 'Top vendors retrieved successfully', {
                vendors,
                count: vendors.length,
            });
        });
        /**
       * Get full vendor details
       * GET /api/v1/users/vendors/:vendorId
       */
        this.getVendorFullDetails = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const { vendorId } = req.params;
            const includeServices = req.query.includeServices !== 'false';
            const includeReviews = req.query.includeReviews !== 'false';
            const reviewsLimit = parseInt(req.query.reviewsLimit) || 10;
            const vendorDetails = await user_service_1.default.getVendorFullDetails(vendorId, {
                includeServices,
                includeReviews,
                reviewsLimit,
            });
            // Remove sensitive data from vendor object
            // if (vendorDetails.vendor.password?) {
            //   delete vendorDetails.vendor.password;
            // }
            if (vendorDetails.vendor.refreshToken) {
                delete vendorDetails.vendor.refreshToken;
            }
            if (vendorDetails.vendor.withdrawalPin) {
                delete vendorDetails.vendor.withdrawalPin;
            }
            return response_1.default.success(res, 'Vendor details retrieved successfully', vendorDetails);
        });
        /**
         * Get user by ID (admin)
         * GET /api/v1/users/:userId
         */
        this.getUserById = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const { userId } = req.params;
            const user = await user_service_1.default.getUserById(userId);
            // Remove sensitive data
            const userResponse = user.toObject();
            delete userResponse.password;
            delete userResponse.refreshToken;
            delete userResponse.withdrawalPin;
            return response_1.default.success(res, 'User retrieved successfully', {
                user: userResponse,
            });
        });
        /**
         * Update user status (admin)
         * PUT /api/v1/users/:userId/status
         */
        this.updateUserStatus = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const { userId } = req.params;
            const { status } = req.body;
            const user = await user_service_1.default.updateUserStatus(userId, status);
            return response_1.default.success(res, 'User status updated successfully', {
                user: {
                    id: user._id,
                    email: user.email,
                    status: user.status,
                },
            });
        });
        /**
         * Verify vendor (admin)
         * POST /api/v1/users/:userId/verify-vendor
         */
        this.verifyVendor = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const { userId } = req.params;
            const user = await user_service_1.default.verifyVendor(userId);
            return response_1.default.success(res, 'Vendor verified successfully', {
                user: {
                    id: user._id,
                    email: user.email,
                    isVendor: user.isVendor,
                    vendorProfile: user.vendorProfile,
                },
            });
        });
        /**
         * Soft delete user (admin)
         * DELETE /api/v1/users/:userId
         */
        this.softDeleteUser = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const { userId } = req.params;
            const deletedBy = req.user.id;
            await user_service_1.default.softDeleteUser(userId, deletedBy);
            return response_1.default.success(res, 'User deleted successfully');
        });
        /**
         * Restore deleted user (admin)
         * POST /api/v1/users/:userId/restore
         */
        this.restoreUser = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const { userId } = req.params;
            const user = await user_service_1.default.restoreUser(userId);
            return response_1.default.success(res, 'User restored successfully', {
                user: {
                    id: user._id,
                    email: user.email,
                    status: user.status,
                },
            });
        });
        /**
         * Get user statistics
         * GET /api/v1/users/stats
         */
        this.getUserStats = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const userId = req.user.id;
            const stats = await user_service_1.default.getUserStats(userId);
            return response_1.default.success(res, 'User statistics retrieved successfully', {
                stats,
            });
        });
    }
}
exports.default = new UserController();
//# sourceMappingURL=user.controller.js.map