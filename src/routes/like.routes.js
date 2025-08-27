import express from 'express'
import { toggleLike, getLikes, getUserLikes, getUsersWhoLikedContent } from '../controllers/like.controller.js'
import { protect, optionalProtect } from '../middlewares/auth.middleware.js'

const router = express.Router()

// Public routes
router.get('/', optionalProtect, getLikes)
router.get('/users/:contentId', getUsersWhoLikedContent)

// Protected routes
router.use(protect)
router.post('/toggle', toggleLike)
router.get('/user', getUserLikes)

export default router