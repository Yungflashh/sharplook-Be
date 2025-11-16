import { IUser } from '../models/User';
import { VendorType, UserStatus, TopVendorResponse } from '../types';
declare class UserService {
    /**
     * Get user by ID
     */
    getUserById(userId: string): Promise<IUser>;
    /**
     * Get user profile
     */
    getProfile(userId: string): Promise<IUser>;
    /**
     * Update user profile
     */
    updateProfile(userId: string, updates: {
        firstName?: string;
        lastName?: string;
        phone?: string;
        avatar?: string;
    }): Promise<IUser>;
    /**
     * Update user preferences
     */
    updatePreferences(userId: string, preferences: {
        darkMode?: boolean;
        fingerprintEnabled?: boolean;
        notificationsEnabled?: boolean;
        emailNotifications?: boolean;
        pushNotifications?: boolean;
    }): Promise<IUser>;
    /**
     * Set withdrawal PIN
     */
    setWithdrawalPin(userId: string, pin: string): Promise<void>;
    /**
     * Verify withdrawal PIN
     */
    verifyWithdrawalPin(userId: string, pin: string): Promise<boolean>;
    /**
     * Register as vendor or update vendor profile
     */
    becomeVendor(userId: string, vendorData: {
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
    }): Promise<IUser>;
    /**
     * Update vendor profile
     */
    updateVendorProfile(userId: string, updates: {
        businessName?: string;
        businessDescription?: string;
        vendorType?: VendorType;
        categories?: string[];
        location?: any;
        serviceRadius?: number;
        availabilitySchedule?: any;
        documents?: any;
    }): Promise<IUser>;
    /**
     * Get all users (admin)
     */
    getAllUsers(page?: number, limit?: number, filters?: {
        role?: string;
        status?: string;
        isVendor?: boolean;
        search?: string;
    }): Promise<{
        users: IUser[];
        total: number;
        page: number;
        totalPages: number;
    }>;
    /**
     * Get vendors with filters and location
     */
    getVendors(filters?: {
        vendorType?: VendorType;
        category?: string;
        rating?: number;
        location?: {
            latitude: number;
            longitude: number;
            maxDistance?: number;
        };
        search?: string;
    }, page?: number, limit?: number): Promise<{
        vendors: IUser[];
        total: number;
        page: number;
        totalPages: number;
    }>;
    getTopVendors(limit?: number, filters?: {
        vendorType?: VendorType;
        category?: string;
        minRating?: number;
    }): Promise<TopVendorResponse[]>;
    getVendorFullDetails(vendorId: string, options?: {
        includeServices?: boolean;
        includeReviews?: boolean;
        reviewsLimit?: number;
    }): Promise<{
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
    }>;
    /**
     * Update user status (admin)
     */
    updateUserStatus(userId: string, status: UserStatus): Promise<IUser>;
    /**
     * Verify vendor (admin)
     */
    verifyVendor(userId: string): Promise<IUser>;
    /**
     * Soft delete user
     */
    softDeleteUser(userId: string, deletedBy: string): Promise<void>;
    /**
     * Restore deleted user
     */
    restoreUser(userId: string): Promise<IUser>;
    /**
     * Get user statistics
     */
    getUserStats(userId: string): Promise<any>;
}
declare const _default: UserService;
export default _default;
//# sourceMappingURL=user.service.d.ts.map