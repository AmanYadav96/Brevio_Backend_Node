import { Hono } from 'hono'
import { 
  createPayment,
  processStripePayment,
  getUserPayments,
  getCreatorPayments,
  processCreatorPayout,
  getPaymentDetails,
  processRefund
} from '../controllers/payment.controller.js'
import { protect, restrictTo } from '../middlewares/auth.middleware.js'

const app = new Hono()

// Apply authentication middleware to all routes
app.use('*', protect)

// Create a new payment
app.post('/', createPayment)

// Process a payment with Stripe
app.post('/process-stripe', processStripePayment)

// Get user's payment history
app.get('/user', getUserPayments)

// Get creator's received payments
app.get('/creator', getCreatorPayments)

// Process creator payout (admin only)
app.post('/creator-payout', restrictTo('admin'), processCreatorPayout)

// Get payment details
app.get('/:id', getPaymentDetails)

// Process refund
app.post('/refund', restrictTo('admin'), processRefund)

export default app
