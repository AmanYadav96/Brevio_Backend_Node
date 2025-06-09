import express from 'express'
import { toggleLike, getLikes, getUserLikes } from '../controllers/like.controller.js'
import { optionalProtect } from '../middlewares/auth.middleware.js'

const router = express.Router()

// Public routes
// Change this line
router.get('/', optionalProtect, getLikes)

// Protected routes
router.use(protect)
router.post('/toggle', toggleLike)
router.get('/user', getUserLikes)

export default router