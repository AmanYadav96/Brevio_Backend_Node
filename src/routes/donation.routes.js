import { Hono } from 'hono'
import { 
  createDonation, 
  processDonation, 
  getUserDonations, 
  getCreatorDonations,
  getContentDonations
} from '../controllers/donation.controller.js'
import { protect } from '../middlewares/auth.middleware.js'

const app = new Hono()

// Apply authentication middleware to all routes
app.use('*', protect)

// Create a new donation
app.post('/', createDonation)

// Process a donation payment
app.post('/process', processDonation)

// Get user's donations
app.get('/user', getUserDonations)

// Get creator's received donations
app.get('/creator', getCreatorDonations)

// Get donations for a specific content
app.get('/content/:contentId/:contentType', getContentDonations)

export default app