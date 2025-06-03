import express from 'express'
import { 
  createComment, 
  getComments, 
  updateComment, 
  deleteComment, 
  reportComment,
  getUserComments
} from '../controllers/comment.controller.js'
import { protect } from '../middlewares/auth.middleware.js'

const router = express.Router()

// Public routes
router.get('/', getComments)

// Protected routes
router.use(protect)
router.post('/', createComment)
router.patch('/:id', updateComment)
router.delete('/:id', deleteComment)
router.post('/:id/report', reportComment)
router.get('/user', getUserComments)

export default router