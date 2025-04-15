import { Hono } from "hono"
import { cors } from "hono/cors"
import 'dotenv/config'
import { logger } from "hono/logger"
import { secureHeaders } from "hono/secure-headers"
import { serve } from '@hono/node-server'
import { connectDB } from "./src/config/database.js"
import authRoutes from "./src/routes/auth.routes.js"
import userRoutes from "./src/routes/user.routes.js"
import creatorRoutes from "./src/routes/creator.routes.js"
import adminRoutes from "./src/routes/admin.routes.js"
import videoRoutes from "./src/routes/video.routes.js"
import paymentRoutes from "./src/routes/payment.routes.js"
import { errorHandler } from "./src/middlewares/error.middleware.js"
import { swaggerSpec } from './src/config/swagger.js'

// Initialize Hono app
const app = new Hono()

// Database connection with retry mechanism
const connectWithRetry = async () => {
  try {
    await connectDB()
    console.log('MongoDB Connected')
  } catch (err) {
    console.error('MongoDB connection error:', err)
    return null
  }
}

// Middlewares
app.use("*", logger())
app.use("*", cors())
app.use("*", secureHeaders())

// Connect DB before handling routes
app.use('*', async (c, next) => {
  if (!global.mongoConnected) {
    await connectWithRetry()
    global.mongoConnected = true
  }
  await next()
})

// Routes
app.route("/api/auth", authRoutes)
app.route("/api/users", userRoutes)
app.route("/api/creators", creatorRoutes)
app.route("/api/admin", adminRoutes)
app.route("/api/videos", videoRoutes)
app.route("/api/payments", paymentRoutes)

// Error handling middleware
app.use("*", errorHandler)

// Health check route
app.get("/", (c) => c.json({ status: "Server is running" }))

// Development server
if (process.env.NODE_ENV === 'development') {
  const PORT = process.env.PORT || 5000
  serve({
    fetch: app.fetch,
    port: PORT
  })
}

// Vercel serverless function handler
export default async function handler(request) {
  if (!global.mongoConnected) {
    await connectWithRetry()
    global.mongoConnected = true
  }
  
  return app.fetch(request)
}
