import mongoose from "mongoose"

const videoSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Video title is required"],
      trim: true
    },
    description: {
      type: String,
      required: [true, "Video description is required"],
      trim: true
    },
    thumbnail: {
      type: String,
      required: [true, "Video thumbnail is required"]
    },
    videoUrl: {
      type: String,
      required: [true, "Video URL is required"]
    },
    duration: {
      type: Number,
      default: 0
    },
    views: {
      type: Number,
      default: 0
    },
    channel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Channel',
      required: true
    },
    status: {
      type: String,
      enum: ["processing", "published", "failed"],
      default: "processing"
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
)

export default mongoose.model("Video", videoSchema)
