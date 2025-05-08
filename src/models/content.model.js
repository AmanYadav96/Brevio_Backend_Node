import mongoose from "mongoose"

// Cast schema for actors/performers
const castSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Cast member name is required"],
    trim: true
  },
  photo: {
    type: String
  },
  roleType: {
    type: String,
    required: [true, "Role type is required"],
    trim: true
  }
}, { _id: true })

// Crew schema for directors, producers, etc.
const crewSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Crew member name is required"],
    trim: true
  },
  photo: {
    type: String
  },
  roleType: {
    type: String,
    required: [true, "Role type is required"],
    enum: ["Director", "Producer", "Writer", "Cinematographer", "Editor", "Other"],
    trim: true
  }
}, { _id: true })

// Media assets schema
const mediaAssetsSchema = new mongoose.Schema({
  verticalBanner: {
    type: String
  },
  horizontalBanner: {
    type: String
  },
  trailer: {
    type: String
  },
  trailerDuration: {
    type: Number,
    default: 0
  }
})

const contentSchema = new mongoose.Schema(
  {
    contentType: {
      type: String,
      required: [true, "Content type is required"],
      enum: ["Movie", "Series", "Documentary", "Short Film"],
      trim: true
    },
    filmTitle: {
      type: String,
      required: [true, "Film title is required"],
      trim: true
    },
    ageRating: {
      type: String,
      required: [true, "Age rating is required"],
      enum: ["G", "PG", "PG-13", "R", "NC-17", "TV-Y", "TV-Y7", "TV-G", "TV-PG", "TV-14", "TV-MA"],
      trim: true
    },
    description: {
      type: String,
      required: [true, "Description is required"],
      trim: true
    },
    duration: {
      type: Number,
      required: [true, "Duration is required"],
      min: 0
    },
    videoUrl: {
      type: String,
      required: [true, "Video URL is required"]
    },
    cast: [castSchema],
    crew: [crewSchema],
    mediaAssets: {
      type: mediaAssetsSchema,
      default: {}
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
    views: {
      type: Number,
      default: 0
    },
    isActive: {
      type: Boolean,
      default: true
    },
    releaseYear: {
      type: Number
    },
    genres: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Genre'
    }]
  },
  { timestamps: true }
)

export default mongoose.model("Content", contentSchema)