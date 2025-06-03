import express from 'express'
import { 
  createDonation, 
  processDonation, 
  getUserDonations, 
  getCreatorDonations,
  getContentDonations
} from '../controllers/donation.controller.js'
import { protect } from '../middlewares/auth.middleware.js'

const router = express.Router()

// Apply authentication middleware to all routes
router.use(protect)

// Create a new donation
router.post('/', createDonation)

// Process a donation payment
router.post('/process', processDonation)

// Get user's donations
router.get('/user', getUserDonations)

// Get creator's received donations
router.get('/creator', getCreatorDonations)

// Get donations for a specific content
router.get('/content/:contentId/:contentType', getContentDonations)

export default router