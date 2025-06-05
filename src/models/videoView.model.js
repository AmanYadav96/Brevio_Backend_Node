import mongoose from "mongoose"

const videoViewSchema = new mongoose.Schema(
  {
    content: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CreatorContent",
      required: [true, "Content ID is required"]
    },
    viewer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
      // Not required to allow anonymous views
    },
    ipAddress: {
      type: String,
      required: [true, "IP address is required"]
    },
    userAgent: {
      type: String
    },
    viewDuration: {
      type: Number,
      default: 0,
      comment: "Duration viewed in seconds"
    },
    completionPercentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    viewDate: {
      type: Date,
      default: Date.now
    },
    isUnique: {
      type: Boolean,
      default: true,
      comment: "Whether this is a unique view (first view from this IP/user)"
    }
  },
  { timestamps: true }
)

// Index for efficient queries
videoViewSchema.index({ content: 1, viewDate: -1 })
videoViewSchema.index({ content: 1, viewer: 1 })
videoViewSchema.index({ content: 1, ipAddress: 1 })

export default mongoose.model("VideoView", videoViewSchema)