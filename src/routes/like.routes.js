import { Hono } from 'hono'
import { toggleLike, getLikes, getUserLikes } from '../controllers/like.controller.js'
import { protect } from '../middlewares/auth.middleware.js'

const app = new Hono()

// Public routes
app.get('/', getLikes)

// Protected routes
app.use('*', protect)
app.post('/toggle', toggleLike)
app.get('/user', getUserLikes)

export default app