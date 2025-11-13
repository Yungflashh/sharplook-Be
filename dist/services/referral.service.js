"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Referral_1 = __importDefault(require("../models/Referral"));
const User_1 = __importDefault(require("../models/User"));
const Transaction_1 = __importDefault(require("../models/Transaction"));
const Booking_1 = __importDefault(require("../models/Booking"));
const errors_1 = require("../utils/errors");
const helpers_1 = require("../utils/helpers");
const types_1 = require("../types");
const logger_1 = __importDefault(require("../utils/logger"));
class ReferralService {
    /**
     * Apply referral code during registration
     */
    async applyReferralCode(userId, referralCode) {
        // Find user with this referral code
        const referrer = await User_1.default.findOne({ referralCode });
        if (!referrer) {
            throw new errors_1.NotFoundError('Invalid referral code');
        }
        // Check if user is trying to refer themselves
        if (referrer._id.toString() === userId) {
            throw new errors_1.BadRequestError('You cannot refer yourself');
        }
        // Check if user already used a referral code
        const existingReferral = await Referral_1.default.findOne({ referee: userId });
        if (existingReferral) {
            throw new errors_1.BadRequestError('You have already used a referral code');
        }
        // Create referral record
        const referral = await Referral_1.default.create({
            referrer: referrer._id,
            referee: userId,
            referralCode,
            status: 'pending',
            requiresFirstBooking: true,
            firstBookingCompleted: false,
        });
        // Update user's referredBy field
        await User_1.default.findByIdAndUpdate(userId, { referredBy: referrer._id });
        logger_1.default.info(`Referral applied: ${userId} referred by ${referrer._id}`);
        return referral;
    }
    /**
     * Process referral when first booking is completed
     */
    async processReferralBooking(bookingId) {
        const booking = await Booking_1.default.findById(bookingId);
        if (!booking) {
            return;
        }
        // Find pending referral for this user
        const referral = await Referral_1.default.findOne({
            referee: booking.client,
            status: 'pending',
            requiresFirstBooking: true,
            firstBookingCompleted: false,
        });
        if (!referral) {
            return;
        }
        // Update referral
        referral.firstBookingCompleted = true;
        referral.firstBookingId = booking._id;
        referral.status = 'completed';
        referral.completedAt = new Date();
        await referral.save();
        // Pay rewards
        await this.payReferralRewards(referral._id.toString());
        logger_1.default.info(`Referral completed: ${referral._id} from booking ${bookingId}`);
    }
    /**
     * Pay referral rewards
     */
    async payReferralRewards(referralId) {
        const referral = await Referral_1.default.findById(referralId);
        if (!referral) {
            return;
        }
        // Pay referrer
        if (!referral.referrerPaid) {
            const referrer = await User_1.default.findById(referral.referrer);
            if (referrer) {
                const previousBalance = referrer.walletBalance || 0;
                referrer.walletBalance = previousBalance + referral.referrerReward;
                await referrer.save();
                // Create transaction
                const transaction = await Transaction_1.default.create({
                    user: referrer._id,
                    type: types_1.TransactionType.REFERRAL_BONUS,
                    amount: referral.referrerReward,
                    balanceBefore: previousBalance,
                    balanceAfter: referrer.walletBalance,
                    status: types_1.PaymentStatus.COMPLETED,
                    reference: `REF-${Date.now()}-${(0, helpers_1.generateRandomString)(8)}`,
                    description: `Referral bonus for inviting a friend`,
                });
                referral.referrerPaid = true;
                referral.referrerPaidAt = new Date();
                referral.referrerPaymentId = transaction._id;
            }
        }
        // Pay referee
        if (!referral.refereePaid) {
            const referee = await User_1.default.findById(referral.referee);
            if (referee) {
                const previousBalance = referee.walletBalance || 0;
                referee.walletBalance = previousBalance + referral.refereeReward;
                await referee.save();
                // Create transaction
                const transaction = await Transaction_1.default.create({
                    user: referee._id,
                    type: types_1.TransactionType.REFERRAL_BONUS,
                    amount: referral.refereeReward,
                    balanceBefore: previousBalance,
                    balanceAfter: referee.walletBalance,
                    status: types_1.PaymentStatus.COMPLETED,
                    reference: `REF-${Date.now()}-${(0, helpers_1.generateRandomString)(8)}`,
                    description: `Welcome bonus for joining with referral code`,
                });
                referral.refereePaid = true;
                referral.refereePaidAt = new Date();
                referral.refereePaymentId = transaction._id;
            }
        }
        await referral.save();
        logger_1.default.info(`Referral rewards paid: ${referralId}`);
    }
    /**
     * Get user's referral stats
     */
    async getReferralStats(userId) {
        const [totalReferrals, completedReferrals, pendingReferrals, totalEarnings] = await Promise.all([
            Referral_1.default.countDocuments({ referrer: userId }),
            Referral_1.default.countDocuments({ referrer: userId, status: 'completed' }),
            Referral_1.default.countDocuments({ referrer: userId, status: 'pending' }),
            Referral_1.default.aggregate([
                { $match: { referrer: userId, referrerPaid: true } },
                { $group: { _id: null, total: { $sum: '$referrerReward' } } },
            ]),
        ]);
        return {
            totalReferrals,
            completedReferrals,
            pendingReferrals,
            totalEarnings: totalEarnings[0]?.total || 0,
        };
    }
    /**
     * Get user's referrals
     */
    async getUserReferrals(userId, filters, page = 1, limit = 20) {
        const { skip } = (0, helpers_1.parsePaginationParams)(page, limit);
        const query = { referrer: userId };
        if (filters?.status) {
            query.status = filters.status;
        }
        const [referrals, total] = await Promise.all([
            Referral_1.default.find(query)
                .populate('referee', 'firstName lastName email avatar createdAt')
                .populate('firstBookingId', 'service scheduledDate totalAmount')
                .skip(skip)
                .limit(limit)
                .sort({ createdAt: -1 }),
            Referral_1.default.countDocuments(query),
        ]);
        return {
            referrals,
            total,
            page,
            totalPages: Math.ceil(total / limit),
        };
    }
    /**
     * Get referral by ID
     */
    async getReferralById(referralId, userId) {
        const referral = await Referral_1.default.findById(referralId)
            .populate('referrer', 'firstName lastName email avatar')
            .populate('referee', 'firstName lastName email avatar')
            .populate('firstBookingId', 'service scheduledDate totalAmount status');
        if (!referral) {
            throw new errors_1.NotFoundError('Referral not found');
        }
        // Verify ownership
        if (referral.referrer._id.toString() !== userId &&
            referral.referee._id.toString() !== userId) {
            throw new errors_1.BadRequestError('Not authorized to view this referral');
        }
        return referral;
    }
    /**
     * Get referral leaderboard
     */
    async getLeaderboard(limit = 10) {
        const leaderboard = await Referral_1.default.aggregate([
            {
                $match: {
                    status: 'completed',
                    referrerPaid: true,
                },
            },
            {
                $group: {
                    _id: '$referrer',
                    referralCount: { $sum: 1 },
                    totalEarnings: { $sum: '$referrerReward' },
                },
            },
            { $sort: { referralCount: -1 } },
            { $limit: limit },
            {
                $lookup: {
                    from: 'users',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'user',
                },
            },
            { $unwind: '$user' },
            {
                $project: {
                    user: {
                        _id: 1,
                        firstName: 1,
                        lastName: 1,
                        avatar: 1,
                    },
                    referralCount: 1,
                    totalEarnings: 1,
                },
            },
        ]);
        return leaderboard;
    }
    /**
     * Expire old pending referrals
     */
    async expireOldReferrals() {
        const result = await Referral_1.default.updateMany({
            status: 'pending',
            expiresAt: { $lt: new Date() },
        }, {
            status: 'expired',
        });
        if (result.modifiedCount > 0) {
            logger_1.default.info(`Expired ${result.modifiedCount} old referrals`);
        }
    }
    /**
     * Admin: Get all referrals
     */
    async getAllReferrals(filters, page = 1, limit = 20) {
        const { skip } = (0, helpers_1.parsePaginationParams)(page, limit);
        const query = {};
        if (filters?.status) {
            query.status = filters.status;
        }
        if (filters?.startDate || filters?.endDate) {
            query.createdAt = {};
            if (filters.startDate) {
                query.createdAt.$gte = filters.startDate;
            }
            if (filters.endDate) {
                query.createdAt.$lte = filters.endDate;
            }
        }
        const [referrals, total] = await Promise.all([
            Referral_1.default.find(query)
                .populate('referrer', 'firstName lastName email')
                .populate('referee', 'firstName lastName email')
                .skip(skip)
                .limit(limit)
                .sort({ createdAt: -1 }),
            Referral_1.default.countDocuments(query),
        ]);
        return {
            referrals,
            total,
            page,
            totalPages: Math.ceil(total / limit),
        };
    }
    /**
     * Admin: Get referral statistics
     */
    async getAdminStats() {
        const [totalReferrals, completedReferrals, pendingReferrals, totalRewardsPaid, avgRewardPerReferral,] = await Promise.all([
            Referral_1.default.countDocuments(),
            Referral_1.default.countDocuments({ status: 'completed' }),
            Referral_1.default.countDocuments({ status: 'pending' }),
            Referral_1.default.aggregate([
                { $match: { status: 'completed' } },
                {
                    $group: {
                        _id: null,
                        total: { $sum: { $add: ['$referrerReward', '$refereeReward'] } },
                    },
                },
            ]),
            Referral_1.default.aggregate([
                { $match: { status: 'completed' } },
                {
                    $group: {
                        _id: null,
                        avg: { $avg: { $add: ['$referrerReward', '$refereeReward'] } },
                    },
                },
            ]),
        ]);
        return {
            totalReferrals,
            completedReferrals,
            pendingReferrals,
            conversionRate: totalReferrals > 0 ? ((completedReferrals / totalReferrals) * 100).toFixed(2) : 0,
            totalRewardsPaid: totalRewardsPaid[0]?.total || 0,
            avgRewardPerReferral: avgRewardPerReferral[0]?.avg || 0,
        };
    }
}
exports.default = new ReferralService();
//# sourceMappingURL=referral.service.js.map