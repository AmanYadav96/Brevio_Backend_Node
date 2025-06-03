import express from 'express'
import { 
  getAllUsers, 
  getUser, 
  updateUser, 
  deleteUser, 
  getUserStats,
  updateUserProfile,
  getUserProfile
} from '../controllers/user.controller.js'
import { protect, restrictTo } from '../middlewares/auth.middleware.js'
import { handleUpload, optionalUpload } from '../middlewares/upload.middleware.js'

const router = express.Router()

// Apply authentication middleware to all routes
router.use(protect)

// User profile routes (for regular users)
router.get('/profile', getUserProfile)
router.patch('/profile', optionalUpload, updateUserProfile)

// Admin routes
router.get('/', restrictTo('admin'), getAllUsers)
router.get('/stats', restrictTo('admin'), getUserStats)
router.get('/:id', restrictTo('admin'), getUser)
router.patch('/:id', restrictTo('admin'), updateUser)
router.delete('/:id', restrictTo('admin'), deleteUser)

export default router
