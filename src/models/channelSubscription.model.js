import mongoose from 'mongoose'

const purchasedCourseSchema = new mongoose.Schema({
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CreatorContent',
    required: true
  },
  purchaseDate: {
    type: Date,
    default: Date.now
  },
  price: {
    type: Number,
    default: 0
  },
  accessType: {
    type: String,
    enum: ['lifetime', 'limited'],
    default: 'lifetime'
  },
  expiryDate: {
    type: Date
  },
  paymentId: String
})

const channelSubscriptionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  channel: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Channel',
    required: true
  },
  subscription: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subscription'
  },
  subscriptionType: {
    type: String,
    enum: ['regular', 'course_purchase'],
    default: 'regular'
  },
  startDate: {
    type: Date,
    default: Date.now
  },
  endDate: {
    type: Date,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  autoRenew: {
    type: Boolean,
    default: true
  },
  paymentHistory: [{
    paymentId: String,
    amount: Number,
    date: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed'],
      default: 'pending'
    }
  }],
  lastWatched: {
    type: Date
  },
  purchasedCourses: [purchasedCourseSchema]
}, {
  timestamps: true
})

// Create a compound index to ensure a user can only subscribe to a channel once
channelSubscriptionSchema.index({ user: 1, channel: 1 }, { unique: true })

// Add method to check if subscription is active
channelSubscriptionSchema.methods.isSubscriptionActive = function() {
  return this.isActive && new Date() < this.endDate
}

const ChannelSubscription = mongoose.model('ChannelSubscription', channelSubscriptionSchema)

export default ChannelSubscription