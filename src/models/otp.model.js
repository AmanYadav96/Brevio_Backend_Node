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
        // OTP expires in 10 minutes by default
        return new Date(Date.now() + 10 * 60 * 1000)
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

// Index for faster lookups and automatic expiry
otpSchema.index({ email: 1, purpose: 1 })
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

// Static method to generate OTP
otpSchema.statics.generateOTP = function(email, purpose) {
  // Generate a 6-digit OTP
  const code = crypto.randomInt(100000, 999999).toString()
  return this.create({
    email,
    code,
    purpose
  })
}

// Method to verify OTP
otpSchema.statics.verifyOTP = async function(email, code, purpose) {
  const otp = await this.findOne({
    email,
    purpose,
    isUsed: false,
    expiresAt: { $gt: new Date() }
  })

  if (!otp) {
    return { valid: false, message: "Invalid or expired OTP" }
  }

  // Check if the provided code matches
  if (otp.code !== code) {
    return { valid: false, message: "Invalid OTP code" }
  }

  return { valid: true, otp }
}

// Method to mark OTP as used
otpSchema.methods.markAsUsed = async function() {
  this.isUsed = true
  return this.save()
}

const OTP = mongoose.model("OTP", otpSchema)

export default OTP