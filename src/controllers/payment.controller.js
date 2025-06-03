import Payment, { PaymentType, PaymentStatus, PaymentMethod } from '../models/payment.model.js'
import User from '../models/user.model.js'
import Donation from '../models/donation.model.js'
import SubscriptionPlan from '../models/subscription.model.js'
import CreatorContent from '../models/creatorContent.model.js'
import ChannelSubscription from '../models/channelSubscription.model.js'
import stripe from '../config/stripe.js'
import { createError } from '../utils/error.js'
import mongoose from 'mongoose'

// Create a payment
export const createPayment = async (req, res) => {
  try {
    const userId = req.user._id
    const {
      amount,
      currency = 'USD',
      paymentType,
      paymentMethod,
      creatorId,
      subscriptionPlanId,
      courseId,
      donationId,
      channelSubscriptionId,
      metadata = {}
    } = req.body

    // Validate required fields
    if (!amount || !paymentType || !paymentMethod) {
      return res.status(400).json(createError(400, 'Missing required fields'))
    }

    // Validate payment type
    if (!Object.values(PaymentType).includes(paymentType)) {
      return res.status(400).json(createError(400, 'Invalid payment type'))
    }

    // Validate payment method
    if (!Object.values(PaymentMethod).includes(paymentMethod)) {
      return res.status(400).json(createError(400, 'Invalid payment method'))
    }

    // Calculate platform fee (example: 10% of the amount)
    const platformFeePercentage = 0.1
    const platformFee = amount * platformFeePercentage
    const netAmount = amount - platformFee

    // Create payment object
    const paymentData = {
      amount,
      currency,
      paymentType,
      paymentMethod,
      platformFee,
      platformFeePercentage,
      netAmount,
      metadata,
      status: PaymentStatus.PENDING
    }

    // Add type-specific fields
    if (paymentType !== PaymentType.CREATOR_PAYOUT) {
      paymentData.userId = userId
    }

    if ([
      PaymentType.DONATION,
      PaymentType.COURSE_PURCHASE,
      PaymentType.CHANNEL_SUBSCRIPTION,
      PaymentType.CREATOR_PAYOUT
    ].includes(paymentType)) {
      paymentData.creatorId = creatorId
    }

    if (paymentType === PaymentType.SUBSCRIPTION && subscriptionPlanId) {
      paymentData.subscriptionPlanId = subscriptionPlanId
    }

    if (paymentType === PaymentType.COURSE_PURCHASE && courseId) {
      paymentData.courseId = courseId
    }

    if (paymentType === PaymentType.DONATION && donationId) {
      paymentData.donationId = donationId
    }

    if (paymentType === PaymentType.CHANNEL_SUBSCRIPTION && channelSubscriptionId) {
      paymentData.channelSubscriptionId = channelSubscriptionId
    }

    // Create the payment
    const payment = new Payment(paymentData)
    await payment.save()

    return res.status(201).json({
      success: true,
      message: 'Payment created successfully',
      payment
    })
  } catch (error) {
    console.error('Create payment error:', error)
    return res.status(500).json(createError(500, error.message || 'Failed to create payment'))
  }
}

// Process a payment with Stripe
export const processStripePayment = async (c) => {
  try {
    const { paymentId, paymentMethodId } = await c.req.json()

    // Find the payment
    const payment = await Payment.findById(paymentId)
    if (!payment) {
      return c.json(createError(404, 'Payment not found'), 404)
    }

    // Create a payment intent with Stripe
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(payment.amount * 100), // Convert to cents
      currency: payment.currency.toLowerCase(),
      payment_method: paymentMethodId,
      confirm: true,
      description: `Payment for ${payment.paymentType}`,
      metadata: {
        paymentId: payment._id.toString(),
        paymentType: payment.paymentType
      }
    })

    // Update payment with Stripe details
    payment.paymentProviderId = paymentIntent.id
    payment.status = paymentIntent.status === 'succeeded' 
      ? PaymentStatus.COMPLETED 
      : PaymentStatus.PENDING
    
    // If payment succeeded, update related entities
    if (payment.status === PaymentStatus.COMPLETED) {
      await updateRelatedEntities(payment)
    }
    
    await payment.save()

    return c.json({
      success: true,
      message: 'Payment processed successfully',
      payment,
      stripePaymentIntent: paymentIntent
    })
  } catch (error) {
    console.error('Error processing payment:', error)
    return c.json(createError(500, 'Error processing payment: ' + error.message), 500)
  }
}

// Helper function to update related entities when payment is completed
async function updateRelatedEntities(payment) {
  switch (payment.paymentType) {
    case PaymentType.DONATION:
      if (payment.donationId) {
        await Donation.findByIdAndUpdate(payment.donationId, {
          status: 'completed',
          paymentId: payment._id
        })
      }
      break
    case PaymentType.SUBSCRIPTION:
      // Update user subscription status
      if (payment.userId) {
        await User.findByIdAndUpdate(payment.userId, {
          'subscription.status': 'active',
          'subscription.planId': payment.subscriptionPlanId,
          'subscription.startDate': new Date(),
          'subscription.endDate': calculateSubscriptionEndDate(payment)
        })
      }
      break
    case PaymentType.COURSE_PURCHASE:
      // Add course to user's purchased courses
      if (payment.userId && payment.courseId) {
        await User.findByIdAndUpdate(payment.userId, {
          $addToSet: { purchasedCourses: payment.courseId }
        })
      }
      break
    case PaymentType.CHANNEL_SUBSCRIPTION:
      // Update channel subscription status
      if (payment.channelSubscriptionId) {
        await ChannelSubscription.findByIdAndUpdate(payment.channelSubscriptionId, {
          status: 'active',
          paymentId: payment._id
        })
      }
      break
  }
}

// Helper function to calculate subscription end date
function calculateSubscriptionEndDate(payment) {
  const now = new Date()
  const endDate = new Date(now)
  
  // Default to 1 month if no recurring interval specified
  const interval = payment.recurringInterval || 'monthly'
  
  switch (interval) {
    case 'daily':
      endDate.setDate(now.getDate() + 1)
      break
    case 'weekly':
      endDate.setDate(now.getDate() + 7)
      break
    case 'monthly':
      endDate.setMonth(now.getMonth() + 1)
      break
    case 'yearly':
      endDate.setFullYear(now.getFullYear() + 1)
      break
  }
  
  return endDate
}

// Get user's payment history
export const getUserPayments = async (c) => {
  try {
    const userId = c.get('user')._id
    const page = parseInt(c.req.query('page')) || 1
    const limit = parseInt(c.req.query('limit')) || 10
    const paymentType = c.req.query('type')
    
    const query = { userId }
    if (paymentType && Object.values(PaymentType).includes(paymentType)) {
      query.paymentType = paymentType
    }
    
    const payments = await Payment.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('creatorId', 'name email profilePicture')
      .populate('subscriptionPlanId', 'name price')
      .populate('courseId', 'title price')
    
    const total = await Payment.countDocuments(query)
    
    return c.json({
      success: true,
      payments,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Error getting user payments:', error)
    return c.json(createError(500, 'Error getting user payments'), 500)
  }
}

// Get creator's received payments
export const getCreatorPayments = async (c) => {
  try {
    const creatorId = c.get('user')._id
    const page = parseInt(c.req.query('page')) || 1
    const limit = parseInt(c.req.query('limit')) || 10
    const paymentType = c.req.query('type')
    const startDate = c.req.query('startDate')
    const endDate = c.req.query('endDate')
    
    const query = { 
      creatorId,
      status: PaymentStatus.COMPLETED
    }
    
    if (paymentType && Object.values(PaymentType).includes(paymentType)) {
      query.paymentType = paymentType
    }
    
    // Date filtering
    if (startDate || endDate) {
      query.createdAt = {}
      if (startDate) {
        query.createdAt.$gte = new Date(startDate)
      }
      if (endDate) {
        query.createdAt.$lte = new Date(endDate)
      }
    }
    
    const payments = await Payment.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('userId', 'name email profilePicture')
      .populate('courseId', 'title')
      .populate('donationId')
    
    const total = await Payment.countDocuments(query)
    
    // Calculate total earnings
    const earnings = await Payment.aggregate([
      { $match: { 
        creatorId: new mongoose.Types.ObjectId(creatorId), 
        status: PaymentStatus.COMPLETED 
      }},
      { $group: { 
        _id: '$paymentType', 
        total: { $sum: '$netAmount' },
        count: { $sum: 1 }
      }}
    ])
    
    // Calculate total earnings across all payment types
    const totalEarnings = await Payment.aggregate([
      { $match: { 
        creatorId: new mongoose.Types.ObjectId(creatorId), 
        status: PaymentStatus.COMPLETED 
      }},
      { $group: { 
        _id: null, 
        total: { $sum: '$netAmount' } 
      }}
    ])
    
    return c.json({
      success: true,
      payments,
      stats: {
        totalPayments: total,
        totalEarnings: totalEarnings.length > 0 ? totalEarnings[0].total : 0,
        earningsByType: earnings
      },
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Error getting creator payments:', error)
    return c.json(createError(500, 'Error getting creator payments'), 500)
  }
}

// Process creator payout (admin only)
export const processCreatorPayout = async (c) => {
  try {
    const adminId = c.get('user')._id
    const { 
      creatorId, 
      amount, 
      currency = 'USD',
      payoutMethod,
      notes
    } = await c.req.json()
    
    // Create the payout payment
    const payment = new Payment({
      amount,
      currency,
      paymentType: PaymentType.CREATOR_PAYOUT,
      paymentMethod: PaymentMethod.BANK_TRANSFER,
      creatorId,
      processedBy: adminId,
      status: PaymentStatus.COMPLETED,
      payoutMethod,
      notes,
      netAmount: amount, // No platform fee for payouts
      platformFee: 0,
      platformFeePercentage: 0
    })
    
    await payment.save()
    
    return c.json({
      success: true,
      message: 'Creator payout processed successfully',
      payment
    })
  } catch (error) {
    console.error('Error processing creator payout:', error)
    return c.json(createError(500, 'Error processing creator payout'), 500)
  }
}

// Get payment details
export const getPaymentDetails = async (c) => {
  try {
    const paymentId = c.req.param('id')
    
    const payment = await Payment.findById(paymentId)
      .populate('userId', 'name email profilePicture')
      .populate('creatorId', 'name email profilePicture')
      .populate('subscriptionPlanId')
      .populate('courseId')
      .populate('donationId')
      .populate('channelSubscriptionId')
    
    if (!payment) {
      return c.json(createError(404, 'Payment not found'), 404)
    }
    
    return c.json({
      success: true,
      payment
    })
  } catch (error) {
    console.error('Error getting payment details:', error)
    return c.json(createError(500, 'Error getting payment details'), 500)
  }
}

// Process refund
export const processRefund = async (c) => {
  try {
    const { paymentId, amount, reason } = await c.req.json()
    
    const payment = await Payment.findById(paymentId)
    if (!payment) {
      return c.json(createError(404, 'Payment not found'), 404)
    }
    
    if (payment.status !== PaymentStatus.COMPLETED) {
      return c.json(createError(400, 'Only completed payments can be refunded'), 400)
    }
    
    // Process refund with Stripe if payment was made with Stripe
    if (payment.paymentProviderId) {
      await stripe.refunds.create({
        payment_intent: payment.paymentProviderId,
        amount: Math.round(amount * 100), // Convert to cents
        reason: 'requested_by_customer'
      })
    }
    
    // Update payment with refund details
    await payment.processRefund(amount, reason)
    
    return c.json({
      success: true,
      message: 'Refund processed successfully',
      payment
    })
  } catch (error) {
    console.error('Error processing refund:', error)
    return c.json(createError(500, 'Error processing refund: ' + error.message), 500)
  }
}
