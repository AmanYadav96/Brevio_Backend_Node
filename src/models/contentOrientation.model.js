import mongoose from "mongoose"

export const OrientationType = {
  VERTICAL: "vertical", // For reels/mobile-first content
  HORIZONTAL: "horizontal" // For traditional streaming
}

const contentOrientationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      enum: Object.values(OrientationType),
      required: true
    },
    aspectRatio: {
      type: String,
      required: true
    },
    description: {
      type: String,
      required: true
    }
  },
  { timestamps: true }
)

export default mongoose.model("ContentOrientation", contentOrientationSchema)