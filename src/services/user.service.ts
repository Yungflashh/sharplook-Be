import User, { IUser } from '../models/User';
import { NotFoundError, BadRequestError, ConflictError } from '../utils/errors';
import { parsePaginationParams } from '../utils/helpers';
import logger from '../utils/logger';
import { VendorType, UserStatus, TopVendorResponse } from '../types';
import mongoose from 'mongoose';




class UserService {
  /**
   * Get user by ID
   */
  public async getUserById(userId: string): Promise<IUser> {
    const user = await User.findById(userId).populate('referredBy', 'firstName lastName email');

    if (!user) {
      throw new NotFoundError('User not found');
    }

    return user;
  }

  /**
   * Get user profile
   */
  public async getProfile(userId: string): Promise<IUser> {
    return this.getUserById(userId);
  }

  /**
   * Update user profile
   */
  public async updateProfile(
    userId: string,
    updates: {
      firstName?: string;
      lastName?: string;
      phone?: string;
      avatar?: string;
    }
  ): Promise<IUser> {
    const user = await User.findById(userId);

    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Check if phone is being updated and is unique
    if (updates.phone && updates.phone !== user.phone) {
      const existingPhone = await User.findOne({ phone: updates.phone });
      if (existingPhone) {
        throw new ConflictError('Phone number already in use');
      }
      user.isPhoneVerified = false; // Reset phone verification
    }

    // Update fields
    Object.assign(user, updates);

    await user.save();

    logger.info(`User profile updated: ${user.email}`);

    return user;
  }

  /**
   * Update user preferences
   */
  public async updatePreferences(
    userId: string,
    preferences: {
      darkMode?: boolean;
      fingerprintEnabled?: boolean;
      notificationsEnabled?: boolean;
      emailNotifications?: boolean;
      pushNotifications?: boolean;
    }
  ): Promise<IUser> {
    const user = await User.findById(userId);

    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Update preferences
    Object.assign(user.preferences, preferences);

    await user.save();

    logger.info(`User preferences updated: ${user.email}`);

    return user;
  }

  /**
   * Set withdrawal PIN
   */
  public async setWithdrawalPin(userId: string, pin: string): Promise<void> {
    if (!/^\d{4,6}$/.test(pin)) {
      throw new BadRequestError('PIN must be 4-6 digits');
    }

    const user = await User.findById(userId);

    if (!user) {
      throw new NotFoundError('User not found');
    }

    user.withdrawalPin = pin; // Will be hashed by pre-save hook
    await user.save();

    logger.info(`Withdrawal PIN set: ${user.email}`);
  }

  /**
   * Verify withdrawal PIN
   */
  public async verifyWithdrawalPin(userId: string, pin: string): Promise<boolean> {
    const user = await User.findById(userId).select('+withdrawalPin');

    if (!user) {
      throw new NotFoundError('User not found');
    }

    if (!user.withdrawalPin) {
      throw new BadRequestError('Withdrawal PIN not set');
    }

    const bcrypt = require('bcryptjs');
    return await bcrypt.compare(pin, user.withdrawalPin);
  }

  /**
   * Register as vendor or update vendor profile
   */
  public async becomeVendor(
    userId: string,
    vendorData: {
      businessName: string;
      businessDescription?: string;
      vendorType: VendorType;
      categories?: string[];
      location?: {
        address: string;
        city: string;
        state: string;
        country: string;
        coordinates: [number, number];
      };
      serviceRadius?: number;
      documents?: {
        idCard?: string;
        businessLicense?: string;
        certification?: string[];
      };
    }
  ): Promise<IUser> {
    const user = await User.findById(userId);

    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Convert category strings to ObjectIds
    const categoryIds = vendorData.categories
      ? vendorData.categories.map((id) => mongoose.Types.ObjectId.createFromHexString(id))
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

    logger.info(`User became vendor: ${user.email}`);

    return user;
  }

  /**
   * Update vendor profile
   */
  public async updateVendorProfile(
    userId: string,
    updates: {
      businessName?: string;
      businessDescription?: string;
      vendorType?: VendorType;
      categories?: string[];
      location?: any;
      serviceRadius?: number;
      availabilitySchedule?: any;
      documents?: any;
    }
  ): Promise<IUser> {
    const user = await User.findById(userId);

    if (!user) {
      throw new NotFoundError('User not found');
    }

    if (!user.isVendor || !user.vendorProfile) {
      throw new BadRequestError('User is not a vendor');
    }

    // Update vendor profile
    Object.assign(user.vendorProfile, updates);

    await user.save();

    logger.info(`Vendor profile updated: ${user.email}`);

    return user;
  }

  /**
   * Get all users (admin)
   */
  public async getAllUsers(
    page: number = 1,
    limit: number = 10,
    filters?: {
      role?: string;
      status?: string;
      isVendor?: boolean;
      search?: string;
    }
  ): Promise<{ users: IUser[]; total: number; page: number; totalPages: number }> {
    const { skip } = parsePaginationParams(page, limit);

    // Build query
    const query: any = {};

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
      User.find(query).skip(skip).limit(limit).sort({ createdAt: -1 }),
      User.countDocuments(query),
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
  public async getVendors(
    filters?: {
      vendorType?: VendorType;
      category?: string;
      rating?: number;
      location?: {
        latitude: number;
        longitude: number;
        maxDistance?: number; // in kilometers
      };
      search?: string;
    },
    page: number = 1,
    limit: number = 10
  ): Promise<{ vendors: IUser[]; total: number; page: number; totalPages: number }> {
    const { skip } = parsePaginationParams(page, limit);

    // Build query
    const query: any = {
      isVendor: true,
      'vendorProfile.isVerified': true,
    };

    if (filters?.vendorType) {
      query['vendorProfile.vendorType'] = filters.vendorType;
    }

    if (filters?.category) {
      query['vendorProfile.categories'] = mongoose.Types.ObjectId.createFromHexString(
        filters.category
      );
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

    let vendors: IUser[];

    // Location-based search
    if (filters?.location) {
      const maxDistance = (filters.location.maxDistance || 10) * 1000; // Convert km to meters

      vendors = await User.find({
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
    } else {
      vendors = await User.find(query)
        .skip(skip)
        .limit(limit)
        .sort({ 'vendorProfile.rating': -1, 'vendorProfile.completedBookings': -1 })
        .populate('vendorProfile.categories', 'name icon');
    }

    const total = await User.countDocuments(query);

    return {
      vendors,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }


 public async getTopVendors(
  limit: number = 10,
  filters?: {
    vendorType?: VendorType;
    category?: string;
    minRating?: number;
  }
): Promise<TopVendorResponse[]> {  // Use the proper interface
  // Build query
  const query: any = {
    isVendor: true,
    'vendorProfile.isVerified': true,
    'vendorProfile.rating': { $gt: 0 },
  };

  if (filters?.vendorType) {
    query['vendorProfile.vendorType'] = filters.vendorType;
  }

  if (filters?.category) {
    query['vendorProfile.categories'] = mongoose.Types.ObjectId.createFromHexString(
      filters.category
    );
  }

  if (filters?.minRating) {
    query['vendorProfile.rating'] = { $gte: filters.minRating };
  }

  const vendors = await User.find(query)
    .select(
      'firstName lastName avatar isOnline vendorProfile.businessName vendorProfile.businessDescription vendorProfile.rating vendorProfile.totalRatings vendorProfile.completedBookings vendorProfile.vendorType vendorProfile.location vendorProfile.categories vendorProfile.serviceRadius'
    )
    .populate('vendorProfile.categories', 'name icon slug')
    .sort({
      'vendorProfile.rating': -1,
      'vendorProfile.totalRatings': -1,
      'vendorProfile.completedBookings': -1,
    })
    .limit(limit)
    .lean<TopVendorResponse[]>();  // Explicitly type the lean result

  logger.info(`Retrieved ${vendors.length} top vendors`);

  return vendors;
}


public async getVendorFullDetails(
  vendorId: string,
  options?: {
    includeServices?: boolean;
    includeReviews?: boolean;
    reviewsLimit?: number;
  }
): Promise<{
  vendor: IUser;
  services?: any[];
  reviews?: any[];
  stats: {
    totalServices: number;
    activeServices: number;
    totalReviews: number;
    averageRating: number;
    completedBookings: number;
    responseRate: number;
  };
}> {
  // Default options
  const {
    includeServices = true,
    includeReviews = true,
    reviewsLimit = 10,
  } = options || {};

  // Get vendor
  const vendor = await User.findById(vendorId)
    .populate('vendorProfile.categories', 'name icon slug description')
    .lean();

  if (!vendor) {
    throw new NotFoundError('Vendor not found');
  }

  if (!vendor.isVendor || !vendor.vendorProfile) {
    throw new BadRequestError('User is not a vendor');
  }

  // Initialize response
  const response: any = {
    vendor,
    stats: {
      totalServices: 0,
      activeServices: 0,
      totalReviews: vendor.vendorProfile.totalRatings || 0,
      averageRating: vendor.vendorProfile.rating || 0,
      completedBookings: vendor.vendorProfile.completedBookings || 0,
      responseRate: 95, // You can calculate this based on your logic
    },
  };

  // Fetch services if requested
  if (includeServices) {
    const Service = require('../models/Service').default;
    
    const services = await Service.find({ vendor: vendorId })
      .populate('category', 'name icon')
      .sort({ createdAt: -1 })
      .lean();

    response.services = services;
    response.stats.totalServices = services.length;
    response.stats.activeServices = services.filter(
      (s: any) => s.isActive !== false
    ).length;
  }

  // Fetch reviews if requested
  if (includeReviews) {
    const Review = require('../models/Review').default;
    
    const reviews = await Review.find({ vendor: vendorId })
      .populate('user', 'firstName lastName avatar')
      .populate('booking', 'bookingNumber')
      .sort({ createdAt: -1 })
      .limit(reviewsLimit)
      .lean();

    response.reviews = reviews;
  }

  logger.info(`Retrieved full details for vendor: ${vendorId}`);

  return response;
}


  /**
   * Update user status (admin)
   */
  public async updateUserStatus(userId: string, status: UserStatus): Promise<IUser> {
    const user = await User.findById(userId);

    if (!user) {
      throw new NotFoundError('User not found');
    }

    user.status = status;
    await user.save();

    logger.info(`User status updated: ${user.email} - ${status}`);

    return user;
  }

  /**
   * Verify vendor (admin)
   */
  public async verifyVendor(userId: string): Promise<IUser> {
    const user = await User.findById(userId);

    if (!user) {
      throw new NotFoundError('User not found');
    }

    if (!user.isVendor || !user.vendorProfile) {
      throw new BadRequestError('User is not a vendor');
    }

    user.vendorProfile.isVerified = true;
    user.vendorProfile.verificationDate = new Date();

    await user.save();

    logger.info(`Vendor verified: ${user.email}`);

    return user;
  }

  /**
   * Soft delete user
   */
  public async softDeleteUser(userId: string, deletedBy: string): Promise<void> {
    const user = await User.findById(userId);

    if (!user) {
      throw new NotFoundError('User not found');
    }

    user.isDeleted = true;
    user.deletedAt = new Date();
    user.deletedBy = mongoose.Types.ObjectId.createFromHexString(deletedBy);
    user.status = UserStatus.INACTIVE;
    user.refreshToken = undefined;

    await user.save();

    logger.info(`User soft deleted: ${user.email}`);
  }

  /**
   * Restore deleted user
   */
  public async restoreUser(userId: string): Promise<IUser> {
    // Find including deleted users
    const user = await User.findOne({ _id: userId, isDeleted: true });

    if (!user) {
      throw new NotFoundError('Deleted user not found');
    }

    user.isDeleted = false;
    user.deletedAt = undefined;
    user.deletedBy = undefined;
    user.status = UserStatus.ACTIVE;

    await user.save();

    logger.info(`User restored: ${user.email}`);

    return user;
  }

  /**
   * Get user statistics
   */
  public async getUserStats(userId: string): Promise<any> {
    const user = await User.findById(userId);

    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Base stats
    const stats: any = {
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

export default new UserService();