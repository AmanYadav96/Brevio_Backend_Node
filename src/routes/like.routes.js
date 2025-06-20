import express from 'express'
import { toggleLike, getLikes, getUserLikes } from '../controllers/like.controller.js'
import { protect, optionalProtect } from '../middlewares/auth.middleware.js'

const router = express.Router()

// Public routes
router.get('/', optionalProtect, getLikes)

// Protected routes
router.use(protect)
router.post('/toggle', toggleLike)
router.get('/user', getUserLikes)

export default router