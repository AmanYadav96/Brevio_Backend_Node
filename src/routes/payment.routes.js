import express from 'express'
import { 
  createPayment,
  processStripePayment,
  createDonationPaymentIntent,
  getUserPayments,
  getCreatorPayments,
  processCreatorPayout,
  getPaymentDetails,
  processRefund
} from '../controllers/payment.controller.js'
import { protect, restrictTo } from '../middlewares/auth.middleware.js'

const router = express.Router()

// Apply authentication middleware to all routes
router.use(protect)

// Create a new payment
router.post('/', createPayment)

// Process a payment with Stripe
router.post('/process-stripe', processStripePayment)

// Create donation payment intent (combines donation creation with payment intent)
router.post('/donation-intent', createDonationPaymentIntent)

// Get user's payment history
router.get('/user', getUserPayments)

// Get creator's received payments
router.get('/creator', getCreatorPayments)

// Process creator payout (admin only)
router.post('/creator-payout', restrictTo('admin'), processCreatorPayout)

// Get payment details
router.get('/:id', getPaymentDetails)

// Process refund
router.post('/refund', restrictTo('admin'), processRefund)

export default router
