import mongoose from 'mongoose'

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
    ref: 'Subscription',
    required: true
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
  }
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