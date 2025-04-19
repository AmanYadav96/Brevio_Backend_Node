import mongoose from "mongoose"

const advertisementSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Advertisement name is required"],
      trim: true
    },
    status: {
      type: String,
      enum: ["active", "inactive", "scheduled"],
      default: "active"
    },
    startDate: {
      type: Date,
      required: [true, "Start date is required"]
    },
    endDate: {
      type: Date,
      required: [true, "End date is required"]
    },
    thumbnail: {
      type: String,
      required: [true, "Thumbnail is required"]
    },
    videoUrl: {
      type: String,
      required: [true, "Video URL is required"]
    },
    duration: {
      type: Number,
      default: 0,
      description: "Video duration in seconds"
    },
    targetUrl: {
      type: String,
      required: [true, "Target URL is required"]
    },
    deviceType: [{
      type: String,
      enum: ["web", "app", "both"]
    }],
    impressions: {
      type: Number,
      default: 0
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
)

export default mongoose.model("Advertisement", advertisementSchema)