// Import the new routes
import likeRoutes from './routes/like.routes.js'
import commentRoutes from './routes/comment.routes.js'
import saveRoutes from './routes/save.routes.js'

// Add these lines where you register other routes
app.route('/api/likes', likeRoutes)
app.route('/api/comments', commentRoutes)
app.route('/api/saves', saveRoutes)