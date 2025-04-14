import stripe from "../config/stripe.js"
import User from "../models/user.model.js"
import Payment, { PaymentStatus, PaymentType } from "../models/payment.model.js"
import { AppError } from "../utils/app-error.js"

export const createCheckoutSession = async (c) => {
  try {
    const userId = c.get("userId")
    const { priceId, successUrl, cancelUrl } = await c.req.json()

    // Find user
    const user = await User.findById(userId)
    if (!user) {
      throw new AppError("User not found", 404)
    }

    if (!user.stripeCustomerId) {
      throw new AppError("Stripe customer ID not found", 400)
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: user.stripeCustomerId,
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        userId: userId,
      },
    })

    // Create payment record
    await Payment.create({
      user: userId,
      amount: 0, // Will be updated when payment is completed
      currency: "usd",
      status: PaymentStatus.PENDING,
      type: PaymentType.SUBSCRIPTION,
      stripeSessionId: session.id,
    })

    return c.json({
      success: true,
      sessionId: session.id,
      url: session.url,
    })
  } catch (error) {
    if (error instanceof AppError) {
      return c.json({ success: false, message: error.message }, error.statusCode)
    }
    console.error("Create checkout session error:", error)
    return c.json({ success: false, message: "Failed to create checkout session" }, 500)
  }
}

export const handleWebhook = async (c) => {
  try {
    const signature = c.req.header("stripe-signature")
    const body = await c.req.text()

    let event

    try {
      event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET)
    } catch (err) {
      return c.text("Webhook signature verification failed", 400)
    }

    // Handle the event
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object

        // Update payment record
        const payment = await Payment.findOne({ stripeSessionId: session.id })
        if (payment) {
          payment.status = PaymentStatus.COMPLETED
          payment.amount = session.amount_total / 100 // Convert from cents
          payment.stripePaymentId = session.payment_intent
          await payment.save()
        }

        // Update user subscription status
        if (session.metadata?.userId) {
          const user = await User.findById(session.metadata.userId)
          if (user) {
            user.subscriptionStatus = "active"
            user.subscriptionId = session.subscription
            await user.save()
          }
        }

        break
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object

        // Create payment record for recurring payments
        if (invoice.customer) {
          const user = await User.findOne({ stripeCustomerId: invoice.customer })
          if (user) {
            await Payment.create({
              user: user._id,
              amount: invoice.amount_paid / 100, // Convert from cents
              currency: invoice.currency,
              status: PaymentStatus.COMPLETED,
              type: PaymentType.SUBSCRIPTION,
              stripePaymentId: invoice.payment_intent,
              metadata: {
                invoiceId: invoice.id,
              },
            })
          }
        }

        break
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object

        // Update user subscription status
        const user = await User.findOne({ subscriptionId: subscription.id })
        if (user) {
          user.subscriptionStatus = "canceled"
          await user.save()
        }

        break
      }
    }

    return c.text("Webhook received", 200)
  } catch (error) {
    console.error("Webhook error:", error)
    return c.text("Webhook error", 500)
  }
}

export const getPaymentHistory = async (c) => {
  try {
    const userId = c.get("userId")

    // Get user's payment history
    const payments = await Payment.find({ user: userId }).sort({ createdAt: -1 })

    return c.json({
      success: true,
      payments,
    })
  } catch (error) {
    console.error("Get payment history error:", error)
    return c.json({ success: false, message: "Failed to fetch payment history" }, 500)
  }
}

export const cancelSubscription = async (c) => {
  try {
    const userId = c.get("userId")

    // Find user
    const user = await User.findById(userId)
    if (!user) {
      throw new AppError("User not found", 404)
    }

    if (!user.subscriptionId) {
      throw new AppError("No active subscription found", 400)
    }

    // Cancel subscription in Stripe
    await stripe.subscriptions.cancel(user.subscriptionId)

    // Update user subscription status
    user.subscriptionStatus = "canceled"
    await user.save()

    return c.json({
      success: true,
      message: "Subscription canceled successfully",
    })
  } catch (error) {
    if (error instanceof AppError) {
      return c.json({ success: false, message: error.message }, error.statusCode)
    }
    console.error("Cancel subscription error:", error)
    return c.json({ success: false, message: "Failed to cancel subscription" }, 500)
  }
}
