import mongoose from "mongoose"

// Payment status enum
export const PaymentStatus = {
  PENDING: "pending",
  COMPLETED: "completed",
  FAILED: "failed",
  REFUNDED: "refunded",
}

// Payment type enum
export const PaymentType = {
  SUBSCRIPTION: "subscription",
  ONE_TIME: "one_time",
  CREATOR_PAYOUT: "creator_payout",
}

const paymentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    amount: {
      type: Number,
      required: [true, "Amount is required"],
    },
    currency: {
      type: String,
      default: "usd",
    },
    status: {
      type: String,
      enum: Object.values(PaymentStatus),
      default: PaymentStatus.PENDING,
    },
    type: {
      type: String,
      enum: Object.values(PaymentType),
      required: true,
    },
    stripePaymentId: {
      type: String,
    },
    stripeSessionId: {
      type: String,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
  },
)

const Payment = mongoose.model("Payment", paymentSchema)

export default Payment
