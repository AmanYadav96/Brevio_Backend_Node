import mongoose from "mongoose"
import { OrientationType } from "./contentOrientation.model.js"

// Content type enum
export const ContentType = {
  SHORT_FILM: "shortFilm",
  SERIES: "series",
  EDUCATIONAL: "educational"
}

// Pricing model enum for educational content
export const PricingModel = {
  FREE: "free",
  PAID: "paid",
  SUBSCRIPTION: "subscription"
}

// Lesson schema for educational content
const lessonSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, "Lesson title is required"],
    trim: true
  },
  description: {
    type: String,
    required: [true, "Lesson description is required"],
    trim: true
  },
  videoUrl: {
    type: String,
    required: [true, "Video URL is required"]
  },
  duration: {
    type: Number,
    required: [true, "Duration is required"],
    min: 0
  },
  thumbnail: {
    type: String
  },
  order: {
    type: Number,
    required: true
  },
  isFree: {
    type: Boolean,
    default: false
  }
}, { timestamps: true })

// Episode schema for series
const episodeSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, "Episode title is required"],
    trim: true
  },
  description: {
    type: String,
    required: [true, "Episode description is required"],
    trim: true
  },
  videoUrl: {
    type: String,
    required: [true, "Video URL is required"]
  },
  duration: {
    type: Number,
    required: [true, "Duration is required"],
    min: 0
  },
  thumbnail: {
    type: String
  },
  episodeNumber: {
    type: Number,
    required: true
  }
}, { timestamps: true })

// Season schema for series
const seasonSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, "Season title is required"],
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  seasonNumber: {
    type: Number,
    required: true
  },
  episodes: [episodeSchema],
  thumbnail: {
    type: String
  }
}, { timestamps: true })

// Media assets schema
const mediaAssetsSchema = new mongoose.Schema({
  thumbnail: {
    type: String,
    // Removing the required validation
    // required: [true, "Thumbnail is required"]
  },
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

// Pricing schema for educational content
const pricingSchema = new mongoose.Schema({
  model: {
    type: String,
    enum: Object.values(PricingModel),
    default: PricingModel.FREE
  },
  price: {
    type: Number,
    default: 0,
    min: 0
  },
  currency: {
    type: String,
    default: "USD"
  },
  discountPrice: {
    type: Number,
    min: 0
  },
  discountValidUntil: {
    type: Date
  }
})

// Creator content schema
const creatorContentSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, "Title is required"],
    trim: true
  },
  description: {
    type: String,
    required: [true, "Description is required"],
    trim: true
  },
  contentType: {
    type: String,
    enum: Object.values(ContentType),
    required: [true, "Content type is required"]
  },
  orientation: {
    type: String,
    enum: Object.values(OrientationType),
    required: [true, "Orientation is required"]
  },
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: [true, "Creator is required"]
  },
  videoUrl: {
    type: String,
    // Removing the validation that makes it required for short films
    // validate: {
    //   validator: function(v) {
    //     // Only required for short films
    //     return this.contentType !== ContentType.SHORT_FILM || (v && v.length > 0);
    //   },
    //   message: "Video URL is required for short films"
    // }
    },
  duration: {
    type: Number,
    min: 0
  },
  mediaAssets: mediaAssetsSchema,
  genre: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Genre"
  },
  tags: [String],
  ageRating: {
    type: String,
    enum: ["G", "PG", "PG-13", "R", "18+", "All Ages"],
    default: "PG-13"
  },
  status: {
    type: String,
    enum: ["draft", "processing", "published", "rejected", "archived"],
    default: "draft"
  },
  isActive: {
    type: Boolean,
    default: true
  },
  releaseYear: {
    type: Number
  },
  views: {
    type: Number,
    default: 0
  },
  likes: {
    type: Number,
    default: 0
  },
  videoMetadata: {
    width: Number,
    height: Number,
    aspectRatio: String,
    format: String,
    bitrate: Number
  },
  adminApproved: {
    type: Boolean,
    default: false
  },
  rejectionReason: {
    type: String
  }
}, { timestamps: true })

// Add validation for content type specific fields
creatorContentSchema.pre('validate', function(next) {
  // For SHORT_FILM, videoUrl and duration are required only if status is not 'draft'
  if (this.contentType === ContentType.SHORT_FILM && this.status !== 'draft') {
    if (!this.videoUrl) {
      this.invalidate('videoUrl', 'Video URL is required for short films')
    }
    // if (!this.duration) {
    //   this.invalidate('duration', 'Duration is required for short films')
    // }
  }
  
  // For SERIES, at least one season is required
  if (this.contentType === ContentType.SERIES && (!this.seasons || this.seasons.length === 0)) {
    this.invalidate('seasons', 'At least one season is required for series')
  }
  
  // For EDUCATIONAL, at least one lesson is required
  if (this.contentType === ContentType.EDUCATIONAL && (!this.lessons || this.lessons.length === 0)) {
    this.invalidate('lessons', 'At least one lesson is required for educational content')
  }
  
  // If pricing model is PAID, price must be greater than 0
  if (this.contentType === ContentType.EDUCATIONAL && 
      this.pricing && this.pricing.model === PricingModel.PAID && 
      (!this.pricing.price || this.pricing.price <= 0)) {
    this.invalidate('pricing.price', 'Price must be greater than 0 for paid content')
  }
  
  next()
})

// Add at the end of the schema definition, before exporting
creatorContentSchema.index({ creator: 1 });
creatorContentSchema.index({ status: 1 });
creatorContentSchema.index({ contentType: 1 });
creatorContentSchema.index({ genre: 1 });
creatorContentSchema.index({ createdAt: -1 });
creatorContentSchema.index({ title: 'text', description: 'text', tags: 'text' });
export default mongoose.model("CreatorContent", creatorContentSchema)