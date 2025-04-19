import mongoose from "mongoose"

const channelSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Channel name is required"],
      unique: true,
      trim: true,
      index: true
    },
    thumbnail: {
      type: String,
      required: [true, "Channel thumbnail URL is required"],
      trim: true
    },
    status: {
      type: String,
      enum: ["active", "inactive", "suspended"],
      default: "active",
      index: true
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true
    },
    type: {
      type: String,
      enum: ["free", "paid"],
      required: true
    },
    price: {
      type: Number,
      required: function() {
        return this.type === "paid"
      },
      min: [0, "Price cannot be negative"]
    },
    owner: {
      name: {
        type: String,
        required: true
      },
      stripeAccountId: {
        type: String,
        required: true
      },
      email: {
        type: String,
        required: true
      }
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  { 
    timestamps: true,
    autoIndex: true // Enable automatic indexing
  }
)

// Indexes will be created automatically by Mongoose
export default mongoose.model("Channel", channelSchema)