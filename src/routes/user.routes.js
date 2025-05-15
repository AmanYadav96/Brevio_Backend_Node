import { Hono } from 'hono'
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
import { handleUpload } from '../middlewares/upload.middleware.js'

const app = new Hono()

// Apply authentication middleware to all routes
app.use('*', protect)

// User profile routes (for regular users)
app.get('/profile', getUserProfile)
app.patch('/profile', handleUpload('USER'), updateUserProfile)

// Admin routes
app.get('/', restrictTo('admin'), getAllUsers)
app.get('/stats', restrictTo('admin'), getUserStats)
app.get('/:id', restrictTo('admin'), getUser)
app.patch('/:id', restrictTo('admin'), updateUser)
app.delete('/:id', restrictTo('admin'), deleteUser)

export default app
