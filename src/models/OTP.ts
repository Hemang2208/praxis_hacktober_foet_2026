import mongoose, { Document, Schema, Model } from "mongoose";

export interface IOTP extends Document {
  email: string;
  otp: string;
  created_at: Date;
  expiresAt: Date;
  isExpired(): boolean;
  getTimeRemaining(): number;
}

export interface IOTPModel extends Model<IOTP> {
  findValidOTP(email: string, otp: string): Promise<IOTP | null>;
  cleanupExpired(): Promise<{ deletedCount?: number }>;
}

const OTPSchema: Schema = new Schema(
  {
    email: {
      type: String,
      required: [true, "Email is required"],
      lowercase: true,
      trim: true,
      index: true,
    },
    otp: {
      type: String,
      required: [true, "OTP is required"],
      length: 6,
    },
    created_at: {
      type: Date,
      default: Date.now,
    },
    expiresAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: false,
  },
);

// Create TTL index to automatically delete expired OTPs after 1 hour
OTPSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Pre-save middleware to set expiration time to 1 hour from creation
OTPSchema.pre("save", function (next) {
  if (this.isNew) {
    // Set expiration to 1 hour from now
    this.expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour in milliseconds
  }
  next();
});

// Static method to find valid (non-expired) OTP
OTPSchema.statics.findValidOTP = function (email: string, otp: string) {
  return this.findOne({
    email: email.toLowerCase().trim(),
    otp,
    expiresAt: { $gt: new Date() }, // Only find non-expired OTPs
  });
};

// Static method to clean up expired OTPs manually (optional, since TTL does this automatically)
OTPSchema.statics.cleanupExpired = function () {
  return this.deleteMany({
    expiresAt: { $lte: new Date() },
  });
};

// Instance method to check if OTP is expired
OTPSchema.methods.isExpired = function (): boolean {
  return this.expiresAt <= new Date();
};

// Instance method to get time remaining until expiration
OTPSchema.methods.getTimeRemaining = function (): number {
  const now = new Date();
  const expiry = new Date(this.expiresAt);
  return Math.max(0, expiry.getTime() - now.getTime());
};

const OTP: IOTPModel = (mongoose.models.OTP ||
  mongoose.model<IOTP, IOTPModel>("OTP", OTPSchema)) as IOTPModel;

export default OTP;
