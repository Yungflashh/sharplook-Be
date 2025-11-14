"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const User_1 = __importDefault(require("../models/User"));
const errors_1 = require("../utils/errors");
const helpers_1 = require("../utils/helpers");
const logger_1 = __importDefault(require("../utils/logger"));
const types_1 = require("../types");
const mongoose_1 = __importDefault(require("mongoose"));
class UserService {
    /**
     * Get user by ID
     */
    async getUserById(userId) {
        const user = await User_1.default.findById(userId).populate('referredBy', 'firstName lastName email');
        if (!user) {
            throw new errors_1.NotFoundError('User not found');
        }
        return user;
    }
    /**
     * Get user profile
     */
    async getProfile(userId) {
        return this.getUserById(userId);
    }
    /**
     * Update user profile
     */
    async updateProfile(userId, updates) {
        const user = await User_1.default.findById(userId);
        if (!user) {
            throw new errors_1.NotFoundError('User not found');
        }
        // Check if phone is being updated and is unique
        if (updates.phone && updates.phone !== user.phone) {
            const existingPhone = await User_1.default.findOne({ phone: updates.phone });
            if (existingPhone) {
                throw new errors_1.ConflictError('Phone number already in use');
            }
            user.isPhoneVerified = false; // Reset phone verification
        }
        // Update fields
        Object.assign(user, updates);
        await user.save();
        logger_1.default.info(`User profile updated: ${user.email}`);
        return user;
    }
    /**
     * Update user preferences
     */
    async updatePreferences(userId, preferences) {
        const user = await User_1.default.findById(userId);
        if (!user) {
            throw new errors_1.NotFoundError('User not found');
        }
        // Update preferences
        Object.assign(user.preferences, preferences);
        await user.save();
        logger_1.default.info(`User preferences updated: ${user.email}`);
        return user;
    }
    /**
     * Set withdrawal PIN
     */
    async setWithdrawalPin(userId, pin) {
        if (!/^\d{4,6}$/.test(pin)) {
            throw new errors_1.BadRequestError('PIN must be 4-6 digits');
        }
        const user = await User_1.default.findById(userId);
        if (!user) {
            throw new errors_1.NotFoundError('User not found');
        }
        user.withdrawalPin = pin; // Will be hashed by pre-save hook
        await user.save();
        logger_1.default.info(`Withdrawal PIN set: ${user.email}`);
    }
    /**
     * Verify withdrawal PIN
     */
    async verifyWithdrawalPin(userId, pin) {
        const user = await User_1.default.findById(userId).select('+withdrawalPin');
        if (!user) {
            throw new errors_1.NotFoundError('User not found');
        }
        if (!user.withdrawalPin) {
            throw new errors_1.BadRequestError('Withdrawal PIN not set');
        }
        const bcrypt = require('bcryptjs');
        return await bcrypt.compare(pin, user.withdrawalPin);
    }
    /**
     * Register as vendor or update vendor profile
     */
    async becomeVendor(userId, vendorData) {
        const user = await User_1.default.findById(userId);
        if (!user) {
            throw new errors_1.NotFoundError('User not found');
        }
        // Convert category strings to ObjectIds
        const categoryIds = vendorData.categories
            ? vendorData.categories.map((id) => mongoose_1.default.Types.ObjectId.createFromHexString(id))
            : [];
        // Initialize vendor profile
        user.isVendor = true;
        user.vendorProfile = {
            businessName: vendorData.businessName,
            vendorType: vendorData.vendorType,
            categories: categoryIds,
            rating: 0,
            totalRatings: 0,
            completedBookings: 0,
            isVerified: false,
            availabilitySchedule: {
                monday: { isAvailable: true, from: '09:00', to: '17:00' },
                tuesday: { isAvailable: true, from: '09:00', to: '17:00' },
                wednesday: { isAvailable: true, from: '09:00', to: '17:00' },
                thursday: { isAvailable: true, from: '09:00', to: '17:00' },
                friday: { isAvailable: true, from: '09:00', to: '17:00' },
                saturday: { isAvailable: true, from: '09:00', to: '17:00' },
                sunday: { isAvailable: false },
            },
        };
        // Add optional fields if provided
        if (vendorData.businessDescription) {
            user.vendorProfile.businessDescription = vendorData.businessDescription;
        }
        if (vendorData.location) {
            user.vendorProfile.location = {
                type: 'Point',
                coordinates: vendorData.location.coordinates,
                address: vendorData.location.address,
                city: vendorData.location.city,
                state: vendorData.location.state,
                country: vendorData.location.country,
            };
        }
        if (vendorData.serviceRadius !== undefined) {
            user.vendorProfile.serviceRadius = vendorData.serviceRadius;
        }
        if (vendorData.documents) {
            user.vendorProfile.documents = vendorData.documents;
        }
        await user.save();
        logger_1.default.info(`User became vendor: ${user.email}`);
        return user;
    }
    /**
     * Update vendor profile
     */
    async updateVendorProfile(userId, updates) {
        const user = await User_1.default.findById(userId);
        if (!user) {
            throw new errors_1.NotFoundError('User not found');
        }
        if (!user.isVendor || !user.vendorProfile) {
            throw new errors_1.BadRequestError('User is not a vendor');
        }
        // Update vendor profile
        Object.assign(user.vendorProfile, updates);
        await user.save();
        logger_1.default.info(`Vendor profile updated: ${user.email}`);
        return user;
    }
    /**
     * Get all users (admin)
     */
    async getAllUsers(page = 1, limit = 10, filters) {
        const { skip } = (0, helpers_1.parsePaginationParams)(page, limit);
        // Build query
        const query = {};
        if (filters?.role) {
            query.role = filters.role;
        }
        if (filters?.status) {
            query.status = filters.status;
        }
        if (filters?.isVendor !== undefined) {
            query.isVendor = filters.isVendor;
        }
        if (filters?.search) {
            query.$or = [
                { firstName: { $regex: filters.search, $options: 'i' } },
                { lastName: { $regex: filters.search, $options: 'i' } },
                { email: { $regex: filters.search, $options: 'i' } },
                { phone: { $regex: filters.search, $options: 'i' } },
            ];
        }
        const [users, total] = await Promise.all([
            User_1.default.find(query).skip(skip).limit(limit).sort({ createdAt: -1 }),
            User_1.default.countDocuments(query),
        ]);
        return {
            users,
            total,
            page,
            totalPages: Math.ceil(total / limit),
        };
    }
    /**
     * Get vendors with filters and location
     */
    async getVendors(filters, page = 1, limit = 10) {
        const { skip } = (0, helpers_1.parsePaginationParams)(page, limit);
        // Build query
        const query = {
            isVendor: true,
            'vendorProfile.isVerified': true,
        };
        if (filters?.vendorType) {
            query['vendorProfile.vendorType'] = filters.vendorType;
        }
        if (filters?.category) {
            query['vendorProfile.categories'] = mongoose_1.default.Types.ObjectId.createFromHexString(filters.category);
        }
        if (filters?.rating) {
            query['vendorProfile.rating'] = { $gte: filters.rating };
        }
        if (filters?.search) {
            query.$or = [
                { 'vendorProfile.businessName': { $regex: filters.search, $options: 'i' } },
                { 'vendorProfile.businessDescription': { $regex: filters.search, $options: 'i' } },
            ];
        }
        let vendors;
        // Location-based search
        if (filters?.location) {
            const maxDistance = (filters.location.maxDistance || 10) * 1000; // Convert km to meters
            vendors = await User_1.default.find({
                ...query,
                'vendorProfile.location': {
                    $near: {
                        $geometry: {
                            type: 'Point',
                            coordinates: [filters.location.longitude, filters.location.latitude],
                        },
                        $maxDistance: maxDistance,
                    },
                },
            })
                .skip(skip)
                .limit(limit)
                .populate('vendorProfile.categories', 'name icon');
        }
        else {
            vendors = await User_1.default.find(query)
                .skip(skip)
                .limit(limit)
                .sort({ 'vendorProfile.rating': -1, 'vendorProfile.completedBookings': -1 })
                .populate('vendorProfile.categories', 'name icon');
        }
        const total = await User_1.default.countDocuments(query);
        return {
            vendors,
            total,
            page,
            totalPages: Math.ceil(total / limit),
        };
    }
    async getTopVendors(limit = 10, filters) {
        // Build query
        const query = {
            isVendor: true,
            'vendorProfile.isVerified': true,
            'vendorProfile.rating': { $gt: 0 },
        };
        if (filters?.vendorType) {
            query['vendorProfile.vendorType'] = filters.vendorType;
        }
        if (filters?.category) {
            query['vendorProfile.categories'] = mongoose_1.default.Types.ObjectId.createFromHexString(filters.category);
        }
        if (filters?.minRating) {
            query['vendorProfile.rating'] = { $gte: filters.minRating };
        }
        const vendors = await User_1.default.find(query)
            .select('firstName lastName avatar isOnline vendorProfile.businessName vendorProfile.businessDescription vendorProfile.rating vendorProfile.totalRatings vendorProfile.completedBookings vendorProfile.vendorType vendorProfile.location vendorProfile.categories vendorProfile.serviceRadius')
            .populate('vendorProfile.categories', 'name icon slug')
            .sort({
            'vendorProfile.rating': -1,
            'vendorProfile.totalRatings': -1,
            'vendorProfile.completedBookings': -1,
        })
            .limit(limit)
            .lean(); // Explicitly type the lean result
        logger_1.default.info(`Retrieved ${vendors.length} top vendors`);
        return vendors;
    }
    /**
     * Update user status (admin)
     */
    async updateUserStatus(userId, status) {
        const user = await User_1.default.findById(userId);
        if (!user) {
            throw new errors_1.NotFoundError('User not found');
        }
        user.status = status;
        await user.save();
        logger_1.default.info(`User status updated: ${user.email} - ${status}`);
        return user;
    }
    /**
     * Verify vendor (admin)
     */
    async verifyVendor(userId) {
        const user = await User_1.default.findById(userId);
        if (!user) {
            throw new errors_1.NotFoundError('User not found');
        }
        if (!user.isVendor || !user.vendorProfile) {
            throw new errors_1.BadRequestError('User is not a vendor');
        }
        user.vendorProfile.isVerified = true;
        user.vendorProfile.verificationDate = new Date();
        await user.save();
        logger_1.default.info(`Vendor verified: ${user.email}`);
        return user;
    }
    /**
     * Soft delete user
     */
    async softDeleteUser(userId, deletedBy) {
        const user = await User_1.default.findById(userId);
        if (!user) {
            throw new errors_1.NotFoundError('User not found');
        }
        user.isDeleted = true;
        user.deletedAt = new Date();
        user.deletedBy = mongoose_1.default.Types.ObjectId.createFromHexString(deletedBy);
        user.status = types_1.UserStatus.INACTIVE;
        user.refreshToken = undefined;
        await user.save();
        logger_1.default.info(`User soft deleted: ${user.email}`);
    }
    /**
     * Restore deleted user
     */
    async restoreUser(userId) {
        // Find including deleted users
        const user = await User_1.default.findOne({ _id: userId, isDeleted: true });
        if (!user) {
            throw new errors_1.NotFoundError('Deleted user not found');
        }
        user.isDeleted = false;
        user.deletedAt = undefined;
        user.deletedBy = undefined;
        user.status = types_1.UserStatus.ACTIVE;
        await user.save();
        logger_1.default.info(`User restored: ${user.email}`);
        return user;
    }
    /**
     * Get user statistics
     */
    async getUserStats(userId) {
        const user = await User_1.default.findById(userId);
        if (!user) {
            throw new errors_1.NotFoundError('User not found');
        }
        // Base stats
        const stats = {
            joinedDate: user.createdAt,
            lastLogin: user.lastLogin,
            emailVerified: user.isEmailVerified,
            phoneVerified: user.isPhoneVerified,
        };
        // Vendor stats
        if (user.isVendor && user.vendorProfile) {
            stats.vendorStats = {
                rating: user.vendorProfile.rating,
                totalRatings: user.vendorProfile.totalRatings,
                completedBookings: user.vendorProfile.completedBookings,
                isVerified: user.vendorProfile.isVerified,
            };
        }
        return stats;
    }
}
exports.default = new UserService();
//# sourceMappingURL=user.service.js.map