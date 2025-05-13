import mongoose from 'mongoose'

const donationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  contentId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  contentType: {
    type: String,
    enum: ['video', 'short', 'series', 'course'],
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 1
  },
  currency: {
    type: String,
    default: 'USD'
  },
  message: {
    type: String,
    maxlength: 500
  },
  paymentId: {
    type: String
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed'],
    default: 'pending'
  },
  creatorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, { timestamps: true })

// Create indexes for faster queries
donationSchema.index({ userId: 1, contentId: 1 })
donationSchema.index({ contentId: 1, contentType: 1 })
donationSchema.index({ creatorId: 1 })

const Donation = mongoose.model('Donation', donationSchema)

export default Donation