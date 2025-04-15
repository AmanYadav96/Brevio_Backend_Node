import mongoose from "mongoose"

const genreSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Genre name is required"],
      unique: true,
      trim: true
    },
    type: {
      type: String,
      enum: ["movie", "series", "both"],
      default: "both"
    },
    description: {
      type: String,
      trim: true
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
)

export default mongoose.model("Genre", genreSchema)