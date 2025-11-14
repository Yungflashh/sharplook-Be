import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import userService from '../services/user.service';
import ResponseHandler from '../utils/response';
import { asyncHandler } from '../middlewares/error';

class UserController {
  /**
   * Get user profile
   * GET /api/v1/users/profile
   */
  public getProfile = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const userId = req.user!.id;

      const user = await userService.getProfile(userId);

      // Remove sensitive data
      const userResponse = user.toObject();
      delete userResponse.password;
      delete userResponse.refreshToken;
      delete userResponse.withdrawalPin;

      return ResponseHandler.success(res, 'Profile retrieved successfully', {
        user: userResponse,
      });
    }
  );

  /**
   * Update user profile
   * PUT /api/v1/users/profile
   */
  public updateProfile = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const userId = req.user!.id;

      const user = await userService.updateProfile(userId, req.body);

      // Remove sensitive data
      const userResponse = user.toObject();
      delete userResponse.password;
      delete userResponse.refreshToken;
      delete userResponse.withdrawalPin;

      return ResponseHandler.success(res, 'Profile updated successfully', {
        user: userResponse,
      });
    }
  );

  /**
   * Update user preferences
   * PUT /api/v1/users/preferences
   */
  public updatePreferences = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const userId = req.user!.id;

      const user = await userService.updatePreferences(userId, req.body);

      return ResponseHandler.success(res, 'Preferences updated successfully', {
        preferences: user.preferences,
      });
    }
  );

  /**
   * Set withdrawal PIN
   * POST /api/v1/users/withdrawal-pin
   */
  public setWithdrawalPin = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const userId = req.user!.id;
      const { pin } = req.body;

      await userService.setWithdrawalPin(userId, pin);

      return ResponseHandler.success(res, 'Withdrawal PIN set successfully');
    }
  );

  /**
   * Verify withdrawal PIN
   * POST /api/v1/users/verify-withdrawal-pin
   */
  public verifyWithdrawalPin = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const userId = req.user!.id;
      const { pin } = req.body;

      const isValid = await userService.verifyWithdrawalPin(userId, pin);

      return ResponseHandler.success(res, 'PIN verification result', {
        isValid,
      });
    }
  );

  /**
   * Become vendor
   * POST /api/v1/users/become-vendor
   */
  public becomeVendor = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const userId = req.user!.id;

      const user = await userService.becomeVendor(userId, req.body);

      // Remove sensitive data
      const userResponse = user.toObject();
      delete userResponse.password;
      delete userResponse.refreshToken;
      delete userResponse.withdrawalPin;

      return ResponseHandler.success(res, 'Vendor registration successful', {
        user: userResponse,
      });
    }
  );

  /**
   * Update vendor profile
   * PUT /api/v1/users/vendor-profile
   */
  public updateVendorProfile = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const userId = req.user!.id;

      const user = await userService.updateVendorProfile(userId, req.body);

      // Remove sensitive data
      const userResponse = user.toObject();
      delete userResponse.password;
      delete userResponse.refreshToken;
      delete userResponse.withdrawalPin;

      return ResponseHandler.success(res, 'Vendor profile updated successfully', {
        user: userResponse,
      });
    }
  );

  /**
   * Get all users (admin)
   * GET /api/v1/users
   */
  public getAllUsers = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const filters = {
        role: req.query.role as string,
        status: req.query.status as string,
        isVendor: req.query.isVendor === 'true' ? true : req.query.isVendor === 'false' ? false : undefined,
        search: req.query.search as string,
      };

      const result = await userService.getAllUsers(page, limit, filters);

      return ResponseHandler.paginated(
        res,
        'Users retrieved successfully',
        result.users,
        page,
        limit,
        result.total
      );
    }
  );

  /**
   * Get vendors
   * GET /api/v1/users/vendors
   */
  public getVendors = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      const filters: any = {
        vendorType: req.query.vendorType as string,
        category: req.query.category as string,
        rating: req.query.rating ? parseFloat(req.query.rating as string) : undefined,
        search: req.query.search as string,
      };

      // Add location filter if coordinates provided
      if (req.query.latitude && req.query.longitude) {
        filters.location = {
          latitude: parseFloat(req.query.latitude as string),
          longitude: parseFloat(req.query.longitude as string),
          maxDistance: req.query.maxDistance ? parseInt(req.query.maxDistance as string) : 10,
        };
      }

      const result = await userService.getVendors(filters, page, limit);

      return ResponseHandler.paginated(
        res,
        'Vendors retrieved successfully',
        result.vendors,
        page,
        limit,
        result.total
      );
    }
  );


  public getTopVendors = asyncHandler(
  async (req: AuthRequest, res: Response, _next: NextFunction) => {
    const limit = parseInt(req.query.limit as string) || 10;
    
    const filters: any = {
      vendorType: req.query.vendorType as string,
      category: req.query.category as string,
      minRating: req.query.minRating ? parseFloat(req.query.minRating as string) : undefined,
    };

    // Remove undefined filters
    Object.keys(filters).forEach(key => {
      if (filters[key] === undefined) {
        delete filters[key];
      }
    });

    const vendors = await userService.getTopVendors(limit, filters);

    return ResponseHandler.success(res, 'Top vendors retrieved successfully', {
      vendors,
      count: vendors.length,
    });
  }
);

  /**
   * Get user by ID (admin)
   * GET /api/v1/users/:userId
   */
  public getUserById = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const { userId } = req.params;

      const user = await userService.getUserById(userId);

      // Remove sensitive data
      const userResponse = user.toObject();
      delete userResponse.password;
      delete userResponse.refreshToken;
      delete userResponse.withdrawalPin;

      return ResponseHandler.success(res, 'User retrieved successfully', {
        user: userResponse,
      });
    }
  );

  /**
   * Update user status (admin)
   * PUT /api/v1/users/:userId/status
   */
  public updateUserStatus = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const { userId } = req.params;
      const { status } = req.body;

      const user = await userService.updateUserStatus(userId, status);

      return ResponseHandler.success(res, 'User status updated successfully', {
        user: {
          id: user._id,
          email: user.email,
          status: user.status,
        },
      });
    }
  );

  /**
   * Verify vendor (admin)
   * POST /api/v1/users/:userId/verify-vendor
   */
  public verifyVendor = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const { userId } = req.params;

      const user = await userService.verifyVendor(userId);

      return ResponseHandler.success(res, 'Vendor verified successfully', {
        user: {
          id: user._id,
          email: user.email,
          isVendor: user.isVendor,
          vendorProfile: user.vendorProfile,
        },
      });
    }
  );

  /**
   * Soft delete user (admin)
   * DELETE /api/v1/users/:userId
   */
  public softDeleteUser = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const { userId } = req.params;
      const deletedBy = req.user!.id;

      await userService.softDeleteUser(userId, deletedBy);

      return ResponseHandler.success(res, 'User deleted successfully');
    }
  );

  /**
   * Restore deleted user (admin)
   * POST /api/v1/users/:userId/restore
   */
  public restoreUser = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const { userId } = req.params;

      const user = await userService.restoreUser(userId);

      return ResponseHandler.success(res, 'User restored successfully', {
        user: {
          id: user._id,
          email: user.email,
          status: user.status,
        },
      });
    }
  );

  /**
   * Get user statistics
   * GET /api/v1/users/stats
   */
  public getUserStats = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const userId = req.user!.id;

      const stats = await userService.getUserStats(userId);

      return ResponseHandler.success(res, 'User statistics retrieved successfully', {
        stats,
      });
    }
  );
}

export default new UserController();
