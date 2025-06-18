import express from 'express'
import { blockUser, unblockUser, getBlockedUsers } from '../controllers/userBlock.controller.js'
import { protect } from '../middlewares/auth.middleware.js'

const router = express.Router()

// All routes require authentication
router.use(protect)

// Block/unblock routes
router.post('/', blockUser)
router.delete('/:blockedUserId', unblockUser)
router.get('/', getBlockedUsers)

export default router