import mongoose from "mongoose"
import crypto from "crypto"

// OTP purpose enum
export const OtpPurpose = {
  PASSWORD_RESET: "password_reset",
  EMAIL_VERIFICATION: "email_verification"
}

const otpSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, "Email is required"],
      lowercase: true,
      trim: true
    },
    code: {
      type: String,
      required: [true, "OTP code is required"]
    },
    purpose: {
      type: String,
      enum: Object.values(OtpPurpose),
      required: [true, "OTP purpose is required"]
    },
    expiresAt: {
      type: Date,
      required: true,
      default: function() {
        // OTP expires in 30 minutes (increased from 10 minutes)
        return new Date(Date.now() + 30 * 60 * 1000)
      }
    },
    isUsed: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
)

// Create indexes for better performance
otpSchema.index({ email: 1, purpose: 1 })
// Removed TTL index to avoid casting issues - handle expiration manually

// Static method to generate OTP
// Static method to generate OTP
otpSchema.statics.generateOTP = function(email, purpose) {
  // Generate a 4-digit OTP
  const code = crypto.randomInt(1000, 9999).toString()
  return this.create({
    email,
    code,
    purpose
  })
}

// Method to verify OTP
otpSchema.statics.verifyOTP = async function(email, code, purpose) {
  try {
    const currentDate = new Date();
    
    // Find all matching OTPs without date filter
    const otps = await this.find({
      email: email,
      purpose: purpose,
      isUsed: false
    });
    
    // Filter manually to avoid casting issues
    const validOtps = otps.filter(otp => {
      const expiresAt = new Date(otp.expiresAt);
      return expiresAt > currentDate;
    });
    
    if (validOtps.length === 0) {
      return { valid: false, message: "Invalid or expired OTP" }
    }
    
    // Find the OTP that matches the provided code
    let matchingOtp = null;
    for (const otp of validOtps) {
      if (otp.code === code) {
        matchingOtp = otp;
        break;
      }
    }

    // Check if we found a matching OTP
    if (!matchingOtp) {
      return { valid: false, message: "Invalid OTP code" }
    }
    
    return { valid: true, otp: matchingOtp }
  } catch (error) {
    console.error('OTP verification error:', error);
    return { valid: false, message: "Error verifying OTP" }
  }
}

// Method to mark OTP as used
otpSchema.methods.markAsUsed = async function() {
  this.isUsed = true
  return this.save()
}

const OTP = mongoose.model("OTP", otpSchema)

export default OTP