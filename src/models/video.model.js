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
    contentType: {
      type: String,
      enum: ["TV Series", "Movie", "Documentary", "Short Film", "Web Series", "Music Video", "Other"],
      required: [true, "Content type is required"]
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
    ageRating: {
      type: String,
      enum: ["All Ages", "13+", "16+", "18+"],
      required: [true, "Age rating is required"]
    },
    genre: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Genre',
      required: [true, "Genre is required"]
    },
    cast: [{
      photo: {
        type: String,
        default: null
      },
      name: {
        type: String,
        required: [true, "Cast member name is required"],
        trim: true
      },
      roleType: {
        type: String,
        enum: ["Actor", "Actress", "Voice", "Narrator", "Host", "Other"],
        required: [true, "Role type is required"]
      }
    }],
    crew: [{
      photo: {
        type: String,
        default: null
      },
      name: {
        type: String,
        required: [true, "Crew member name is required"],
        trim: true
      },
      roleType: {
        type: String,
        enum: ["Director", "Producer", "Writer", "Cinematographer", "Editor", "Music Director", "Sound Designer", "Other"],
        required: [true, "Role type is required"]
      }
    }],
    mediaAssets: {
      verticalBanner: {
        type: String,
        default: null
      },
      horizontalBanner: {
        type: String,
        default: null
      },
      trailer: {
        type: String,
        default: null
      }
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
