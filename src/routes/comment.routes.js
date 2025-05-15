import { Hono } from 'hono'
import { 
  createComment, 
  getComments, 
  updateComment, 
  deleteComment, 
  reportComment,
  getUserComments
} from '../controllers/comment.controller.js'
import { protect } from '../middlewares/auth.middleware.js'

const app = new Hono()

// Public routes
app.get('/', getComments)

// Protected routes
app.use('*', protect)
app.post('/', createComment)
app.patch('/:id', updateComment)
app.delete('/:id', deleteComment)
app.post('/:id/report', reportComment)
app.get('/user', getUserComments)

export default app