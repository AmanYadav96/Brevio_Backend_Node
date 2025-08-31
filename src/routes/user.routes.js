import express from 'express'
import { 
  getAllUsers, 
  getUser, 
  updateUser, 
  deleteUser, 
  getUserStats,
  updateUserProfile,
  getUserProfile,
  getEnhancedProfile,
  deleteUserAccount // Add this import
} from '../controllers/user.controller.js'
import { protect, restrictTo } from '../middlewares/auth.middleware.js'
import { handleUpload, optionalUpload } from '../middlewares/upload.middleware.js'
import { 
  realTimeDataMiddleware
} from '../middlewares/dbOptimization.middleware.js'

const router = express.Router()

// Apply authentication middleware to all routes
router.use(protect)

// User profile routes (for regular users) - no caching for live data
router.get('/profile', getUserProfile) // No cache - shows live data immediately
router.get('/profile/enhanced/:userId?', getEnhancedProfile) // Enhanced profile with stats
router.patch('/profile', optionalUpload, updateUserProfile)
router.delete('/account', realTimeDataMiddleware(), deleteUserAccount) // No cache for account deletion

// Admin routes
router.get('/', restrictTo('admin'), getAllUsers) // No cache - live user data
router.get('/stats', restrictTo('admin'), getUserStats) // No cache - live stats data
router.get('/:id', restrictTo('admin'), getUser) // No cache - shows live user data
router.patch('/:id', restrictTo('admin'), updateUser) // No cache for updates
router.delete('/:id', restrictTo('admin'), realTimeDataMiddleware(), deleteUser) // No cache for deletions

export default router
