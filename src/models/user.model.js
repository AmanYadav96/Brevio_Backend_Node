import mongoose from "mongoose"
import bcrypt from "bcryptjs"

// User role enum
export const UserRole = {
  USER: "user",
  CREATOR: "creator",
  ADMIN: "admin",
}

// Add UserStatus enum
export const UserStatus = {
  ACTIVE: "active",
  SUSPENDED: "suspended",
  INACTIVE: "inactive",
  PENDING: "pending"
}

// Auth provider enum
export const AuthProvider = {
  LOCAL: "local",
  GOOGLE: "google",
  FACEBOOK: "facebook",
  APPLE: "apple"
}

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Please provide a name"],
      trim: true,
    },
    username: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      lowercase: true,
    },
    bio: {
      type: String,
      trim: true,
      maxlength: [500, "Bio cannot be more than 500 characters"]
    },
    email: {
      type: String,
      required: [true, "Please provide an email"],
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      select: false,
    },
    profilePicture: {
      type: String,
      default: "",
    },
    role: {
      type: String,
      enum: Object.values(UserRole),
      default: UserRole.USER,
    },
    firebaseUid: {
      type: String,
      sparse: true,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    authProvider: {
      type: String,
      enum: Object.values(AuthProvider),
      default: AuthProvider.LOCAL
    },
    socialProfiles: {
      google: {
        id: String,
        email: String,
        name: String,
        picture: String
      },
      facebook: {
        id: String,
        email: String,
        name: String,
        picture: String
      },
      apple: {
        id: String,
        email: String,
        name: String
      }
    },
    stripeCustomerId: {
      type: String,
    },
    status: {
      type: String,
      enum: Object.values(UserStatus),
      default: UserStatus.ACTIVE,
    },
    
    subscriptionStatus: {
      type: String,
      enum: ["active", "canceled", "past_due", "unpaid", "trialing", "none"],
      default: "none",
    },
    subscriptionId: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
)

// Username validation removed to allow Google login without username
// Users can set username later if they become creators

// Hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password") || !this.password) return next()

  try {
    const salt = await bcrypt.genSalt(10)
    this.password = await bcrypt.hash(this.password, salt)
    next()
  } catch (error) {
    next(error)
  }
})

// Compare password method
userSchema.methods.comparePassword = async function (password) {
  if (!this.password) return false
  return await bcrypt.compare(password, this.password)
}

const User = mongoose.model("User", userSchema)

export default User
