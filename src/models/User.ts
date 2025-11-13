import mongoose, { Document, Schema, Model } from 'mongoose';
import bcrypt from 'bcryptjs';
import { UserRole, UserStatus, VendorType } from '../types';

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  role: UserRole;
  status: UserStatus;
  avatar?: string;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  emailVerificationToken?: string;
  emailVerificationExpires?: Date;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  refreshToken?: string;
  lastLogin?: Date;
  loginAttempts: number;
  lockUntil?: Date;
  
  // Online status
  isOnline: boolean;
  lastSeen?: Date;
  
  preferences: {
    darkMode: boolean;
    fingerprintEnabled: boolean;
    notificationsEnabled: boolean;
    emailNotifications: boolean;
    pushNotifications: boolean;
  };
  withdrawalPin?: string;
  referralCode: string;
  referredBy?: mongoose.Types.ObjectId;
  
  // Wallet
  walletBalance: number;
  
  // Vendor fields
  isVendor: boolean;
  vendorProfile?: {
    businessName: string;
    businessDescription?: string;
    vendorType: VendorType;
    categories?: mongoose.Types.ObjectId[];
    location?: {
      type: string;
      coordinates: [number, number];
      address: string;
      city: string;
      state: string;
      country: string;
    };
    serviceRadius?: number;
    rating?: number;
    totalRatings?: number;
    completedBookings?: number;
    availabilitySchedule?: {
      monday: { isAvailable: boolean; from?: string; to?: string };
      tuesday: { isAvailable: boolean; from?: string; to?: string };
      wednesday: { isAvailable: boolean; from?: string; to?: string };
      thursday: { isAvailable: boolean; from?: string; to?: string };
      friday: { isAvailable: boolean; from?: string; to?: string };
      saturday: { isAvailable: boolean; from?: string; to?: string };
      sunday: { isAvailable: boolean; from?: string; to?: string };
    };
    documents?: {
      idCard?: string;
      businessLicense?: string;
      certification?: string[];
    };
    isVerified?: boolean;
    verificationDate?: Date;
  };
  
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  
  // Methods
  comparePassword(candidatePassword: string): Promise<boolean>;
  isAccountLocked(): boolean;
  incrementLoginAttempts(): Promise<void>;
  resetLoginAttempts(): Promise<void>;
}

const userSchema = new Schema<IUser>(
  {
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true,
      maxlength: [50, 'First name cannot exceed 50 characters'],
    },
    lastName: {
      type: String,
      required: [true, 'Last name is required'],
      trim: true,
      maxlength: [50, 'Last name cannot exceed 50 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        'Please provide a valid email',
      ],
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      unique: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      select: false,
    },
    role: {
      type: String,
      enum: Object.values(UserRole),
      default: UserRole.CLIENT,
    },
    status: {
      type: String,
      enum: Object.values(UserStatus),
      default: UserStatus.PENDING_VERIFICATION,
    },
    avatar: {
      type: String,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    isPhoneVerified: {
      type: Boolean,
      default: false,
    },
    emailVerificationToken: String,
    emailVerificationExpires: Date,
    passwordResetToken: String,
    passwordResetExpires: Date,
    refreshToken: String,
    lastLogin: Date,
    loginAttempts: {
      type: Number,
      default: 0,
    },
    lockUntil: Date,
    isOnline: {
      type: Boolean,
      default: false,
    },
    lastSeen: Date,
    preferences: {
      darkMode: {
        type: Boolean,
        default: false,
      },
      fingerprintEnabled: {
        type: Boolean,
        default: false,
      },
      notificationsEnabled: {
        type: Boolean,
        default: true,
      },
      emailNotifications: {
        type: Boolean,
        default: true,
      },
      pushNotifications: {
        type: Boolean,
        default: true,
      },
    },
    withdrawalPin: {
      type: String,
      select: false,
    },
    referralCode: {
      type: String,
      unique: true,
      required: true,
    },
    referredBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    walletBalance: {
      type: Number,
      default: 0,
      min: [0, 'Wallet balance cannot be negative'],
    },
    isVendor: {
      type: Boolean,
      default: false,
    },
    vendorProfile: {
      businessName: String,
      businessDescription: String,
      vendorType: {
        type: String,
        enum: Object.values(VendorType),
      },
      categories: [{
        type: Schema.Types.ObjectId,
        ref: 'Category',
      }],
      location: {
        type: {
          type: String,
          enum: ['Point'],
        },
        coordinates: {
          type: [Number],
        },
        address: String,
        city: String,
        state: String,
        country: String,
      },
      serviceRadius: {
        type: Number,
        default: 10,
      },
      rating: {
        type: Number,
        default: 0,
        min: 0,
        max: 5,
      },
      totalRatings: {
        type: Number,
        default: 0,
      },
      completedBookings: {
        type: Number,
        default: 0,
      },
      availabilitySchedule: {
        monday: {
          isAvailable: { type: Boolean, default: true },
          from: String,
          to: String,
        },
        tuesday: {
          isAvailable: { type: Boolean, default: true },
          from: String,
          to: String,
        },
        wednesday: {
          isAvailable: { type: Boolean, default: true },
          from: String,
          to: String,
        },
        thursday: {
          isAvailable: { type: Boolean, default: true },
          from: String,
          to: String,
        },
        friday: {
          isAvailable: { type: Boolean, default: true },
          from: String,
          to: String,
        },
        saturday: {
          isAvailable: { type: Boolean, default: true },
          from: String,
          to: String,
        },
        sunday: {
          isAvailable: { type: Boolean, default: false },
          from: String,
          to: String,
        },
      },
      documents: {
        idCard: String,
        businessLicense: String,
        certification: [String],
      },
      isVerified: {
        type: Boolean,
        default: false,
      },
      verificationDate: Date,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: Date,
    deletedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
userSchema.index({ email: 1, isDeleted: 1 });
userSchema.index({ phone: 1, isDeleted: 1 });
userSchema.index({ referralCode: 1 });
userSchema.index({ role: 1, status: 1 });
userSchema.index({ 'vendorProfile.location': '2dsphere' });

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Hash withdrawal PIN before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('withdrawalPin') || !this.withdrawalPin) return next();
  
  const salt = await bcrypt.genSalt(12);
  this.withdrawalPin = await bcrypt.hash(this.withdrawalPin, salt);
  next();
});

// Method to compare password
userSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Method to check if account is locked
userSchema.methods.isAccountLocked = function (): boolean {
  return !!(this.lockUntil && this.lockUntil > new Date());
};

// Method to increment login attempts
userSchema.methods.incrementLoginAttempts = async function (): Promise<void> {
  // Reset attempts if lock has expired
  if (this.lockUntil && this.lockUntil < new Date()) {
    return await this.updateOne({
      $set: { loginAttempts: 1 },
      $unset: { lockUntil: 1 },
    });
  }

  const updates: any = { $inc: { loginAttempts: 1 } };

  // Lock account after 5 failed attempts for 2 hours
  const maxAttempts = 5;
  const lockTime = 2 * 60 * 60 * 1000; // 2 hours

  if (this.loginAttempts + 1 >= maxAttempts && !this.lockUntil) {
    updates.$set = { lockUntil: new Date(Date.now() + lockTime) };
  }

  await this.updateOne(updates);
};

// Method to reset login attempts
userSchema.methods.resetLoginAttempts = async function (): Promise<void> {
  await this.updateOne({
    $set: { loginAttempts: 0 },
    $unset: { lockUntil: 1 },
  });
};

// Virtual for full name
userSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`;
});

// Don't return deleted users in queries by default
userSchema.pre(/^find/, function (next) {
  // @ts-ignore
  this.find({ isDeleted: { $ne: true } });
  next();
});

const User: Model<IUser> = mongoose.model<IUser>('User', userSchema);

export default User;