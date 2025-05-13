import mongoose from 'mongoose'

/**
 * Payment types enum for different payment scenarios
 */
export const PaymentType = {
  SUBSCRIPTION: 'subscription',
  COURSE_PURCHASE: 'course_purchase',
  DONATION: 'donation',
  CHANNEL_SUBSCRIPTION: 'channel_subscription',
  CREATOR_PAYOUT: 'creator_payout'
}

/**
 * Payment status enum to track payment lifecycle
 */
export const PaymentStatus = {
  PENDING: 'pending',
  COMPLETED: 'completed',
  FAILED: 'failed',
  REFUNDED: 'refunded',
  PARTIALLY_REFUNDED: 'partially_refunded',
  CANCELLED: 'cancelled'
}

/**
 * Payment method enum for different payment methods
 */
export const PaymentMethod = {
  CREDIT_CARD: 'credit_card',
  DEBIT_CARD: 'debit_card',
  PAYPAL: 'paypal',
  BANK_TRANSFER: 'bank_transfer',
  WALLET: 'wallet',
  PLATFORM_CREDIT: 'platform_credit',
  OTHER: 'other'
}

const paymentSchema = new mongoose.Schema({
  // Common fields for all payment types
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    default: 'USD',
    required: true
  },
  paymentType: {
    type: String,
    enum: Object.values(PaymentType),
    required: true
  },
  status: {
    type: String,
    enum: Object.values(PaymentStatus),
    default: PaymentStatus.PENDING
  },
  paymentMethod: {
    type: String,
    enum: Object.values(PaymentMethod),
    required: true
  },
  
  // User who made the payment (null for creator payouts)
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: function() {
      return this.paymentType !== PaymentType.CREATOR_PAYOUT
    }
  },
  
  // Creator who receives the payment (for donations, course purchases, channel subs, creator payouts)
  creatorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: function() {
      return [
        PaymentType.DONATION, 
        PaymentType.COURSE_PURCHASE, 
        PaymentType.CHANNEL_SUBSCRIPTION,
        PaymentType.CREATOR_PAYOUT
      ].includes(this.paymentType)
    }
  },
  
  // Reference to the subscription plan (for subscription payments)
  subscriptionPlanId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SubscriptionPlan',
    required: function() {
      return this.paymentType === PaymentType.SUBSCRIPTION
    }
  },
  
  // Reference to the course (for course purchase payments)
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CreatorContent',
    required: function() {
      return this.paymentType === PaymentType.COURSE_PURCHASE
    }
  },
  
  // Reference to the donation (for donation payments)
  donationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Donation',
    required: function() {
      return this.paymentType === PaymentType.DONATION
    }
  },
  
  // Reference to the channel subscription (for channel subscription payments)
  channelSubscriptionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ChannelSubscription',
    required: function() {
      return this.paymentType === PaymentType.CHANNEL_SUBSCRIPTION
    }
  },
  
  // External payment provider details
  paymentProviderId: {
    type: String,
    description: 'ID from payment provider (e.g., Stripe payment ID)'
  },
  paymentProviderFee: {
    type: Number,
    default: 0
  },
  
  // Platform fee details
  platformFee: {
    type: Number,
    default: 0
  },
  platformFeePercentage: {
    type: Number,
    default: 0
  },
  
  // Net amount after fees
  netAmount: {
    type: Number,
    required: true
  },
  
  // Refund details
  refundAmount: {
    type: Number,
    default: 0
  },
  refundReason: {
    type: String
  },
  refundedAt: {
    type: Date
  },
  
  // Metadata for additional information
  metadata: {
    type: Object,
    default: {}
  },
  
  // For recurring payments
  isRecurring: {
    type: Boolean,
    default: false
  },
  recurringInterval: {
    type: String,
    enum: ['daily', 'weekly', 'monthly', 'yearly'],
    required: function() {
      return this.isRecurring === true
    }
  },
  nextBillingDate: {
    type: Date
  },
  
  // For creator payouts
  payoutMethod: {
    type: String,
    enum: ['bank_transfer', 'paypal', 'check', 'other'],
    required: function() {
      return this.paymentType === PaymentType.CREATOR_PAYOUT
    }
  },
  payoutBatchId: {
    type: String
  },
  
  // Admin who processed the payment (for creator payouts)
  processedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: function() {
      return this.paymentType === PaymentType.CREATOR_PAYOUT
    }
  },
  
  // Billing information
  billingAddress: {
    street: String,
    city: String,
    state: String,
    postalCode: String,
    country: String
  },
  
  // Receipt/invoice information
  receiptNumber: {
    type: String
  },
  invoiceId: {
    type: String
  },
  
  // Notes
  notes: {
    type: String
  }
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
})

// Indexes for faster queries
paymentSchema.index({ userId: 1, createdAt: -1 })
paymentSchema.index({ creatorId: 1, createdAt: -1 })
paymentSchema.index({ paymentType: 1, status: 1 })
paymentSchema.index({ paymentProviderId: 1 })
paymentSchema.index({ status: 1, createdAt: -1 })

// Virtual for calculating time since payment
paymentSchema.virtual('timeSincePayment').get(function() {
  return Date.now() - this.createdAt.getTime()
})

// Method to mark payment as completed
paymentSchema.methods.markAsCompleted = async function(paymentProviderId) {
  this.status = PaymentStatus.COMPLETED
  if (paymentProviderId) {
    this.paymentProviderId = paymentProviderId
  }
  return this.save()
}

// Method to process refund
paymentSchema.methods.processRefund = async function(amount, reason) {
  const fullRefund = amount >= this.amount
  
  this.refundAmount = amount
  this.refundReason = reason
  this.refundedAt = new Date()
  this.status = fullRefund ? PaymentStatus.REFUNDED : PaymentStatus.PARTIALLY_REFUNDED
  
  return this.save()
}

const Payment = mongoose.model('Payment', paymentSchema)

export default Payment
