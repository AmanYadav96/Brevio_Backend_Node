import mongoose from "mongoose"

const subscriptionPlanSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Plan name is required"],
      unique: true,
      trim: true
    },
    monthlyPrice: {
      type: Number,
      required: [true, "Monthly price is required"],
      min: [0, "Price cannot be negative"]
    },
    annualPrice: {
      type: Number,
      required: [true, "Annual price is required"],
      min: [0, "Price cannot be negative"]
    },
    deviceLimit: {
      type: Number,
      required: [true, "Device limit is required"],
      min: [1, "Must allow at least 1 device"]
    },
    features: {
      ads: {
        type: Boolean,
        default: false
      },
      unblockedContentAccess: {
        type: Boolean,
        default: false
      },
      blockedContentAccess: {
        type: Boolean,
        default: false
      },
      channelsAccess: {
        type: Boolean,
        default: false
      },
      educationalSubscription: {
        type: Boolean,
        default: false
      }
    },
    includedFeatures: [{
      type: String,
      required: true
    }],
    status: {
      type: Boolean,
      default: true
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
)

export default mongoose.model("SubscriptionPlan", subscriptionPlanSchema)