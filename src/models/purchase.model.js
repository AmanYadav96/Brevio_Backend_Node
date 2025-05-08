import mongoose from "mongoose"

const purchaseSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    content: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CreatorContent',
      required: true
    },
    amount: {
      type: Number,
      required: true
    },
    currency: {
      type: String,
      required: true,
      default: 'USD'
    },
    paymentMethod: {
      type: String,
      required: true,
      enum: ['stripe', 'paypal', 'apple', 'google']
    },
    paymentId: {
      type: String,
      required: true
    },
    status: {
      type: String,
      required: true,
      enum: ['pending', 'completed', 'failed', 'refunded'],
      default: 'pending'
    },
    refundReason: {
      type: String
    }
  },
  { timestamps: true }
)

// Ensure a user can only purchase a content once
purchaseSchema.index({ user: 1, content: 1 }, { unique: true })

export default mongoose.model("Purchase", purchaseSchema)