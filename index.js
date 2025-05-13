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
import genreRoutes from "./src/routes/genre.routes.js"
import subscriptionRoutes from "./src/routes/subscription.routes.js"
import channelRoutes from "./src/routes/channel.routes.js"
import { errorHandler } from "./src/middlewares/error.middleware.js"
import { swaggerSpec } from './src/config/swagger.js'
import advertisementRoutes from "./src/routes/advertisement.routes.js"
import uploadRoutes from "./src/routes/upload.routes.js"
import fileUploadRoutes from "./src/routes/fileUpload.routes.js"
import creatorContentRoutes from "./src/routes/creatorContent.routes.js"
import channelSubscriptionRoutes from "./src/routes/channelSubscription.routes.js"
import sliderRoutes from "./src/routes/slider.routes.js"
import categoryRoutes from "./src/routes/category.routes.js"

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

// Middlewares and routes setup
app.use('*', async (c, next) => {
  if (!global.mongoConnected) {
    await connectWithRetry()
    global.mongoConnected = true
  }
  await next()
})

app.use("*", logger())
app.use("*", cors())
app.use("*", secureHeaders())

// Routes
app.route("/api/auth", authRoutes)
app.route("/api/users", userRoutes)
app.route("/api/creators", creatorRoutes)
app.route("/api/admin", adminRoutes)
app.route("/api/videos", videoRoutes)
app.route("/api/payments", paymentRoutes)
app.route("/api/channels", channelRoutes)
app.route("/api/subscriptions", subscriptionRoutes)
app.route("/api/genres", genreRoutes)
app.route("/api/advertisements", advertisementRoutes)
app.route("/api/upload", uploadRoutes)
app.route("/api/file-uploads", fileUploadRoutes)
app.route("/api/creator-content", creatorContentRoutes)
app.route("/api/channel-subscriptions", channelSubscriptionRoutes)
app.route("/api/sliders", sliderRoutes)
app.route("/api/categories", categoryRoutes)

// Error handling middleware
app.use("*", errorHandler)

// Health check route
app.get("/", (c) => c.json({ status: "Server is running" }))

// Swagger documentation routes
app.get('/api-docs', async (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="description" content="SwaggerUI" />
        <title>Brevio API Documentation</title>
        <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@latest/swagger-ui.css" />
    </head>
    <body>
        <div id="swagger-ui"></div>
        <script src="https://unpkg.com/swagger-ui-dist@latest/swagger-ui-bundle.js" crossorigin></script>
        <script src="https://unpkg.com/swagger-ui-dist@latest/swagger-ui-standalone-preset.js" crossorigin></script>
        <script>
            window.onload = () => {
                window.ui = SwaggerUIBundle({
                    url: '/api-docs/swagger.json',
                    dom_id: '#swagger-ui',
                    deepLinking: true,
                    presets: [
                        SwaggerUIBundle.presets.apis,
                        SwaggerUIStandalonePreset
                    ],
                    layout: "BaseLayout"
                });
            };
        </script>
    </body>
    </html>
  `)
})

// Make sure the swagger.json endpoint is accessible
app.get('/api-docs/swagger.json', (c) => {
  // Add CORS headers specifically for this endpoint
  c.header('Access-Control-Allow-Origin', '*')
  c.header('Access-Control-Allow-Methods', 'GET')
  c.header('Access-Control-Allow-Headers', 'Content-Type')
  
  return c.json(swaggerSpec)
})

// Add a debug endpoint to see what's in the swagger spec
app.get('/api-docs/debug', (c) => {
  return c.json({
    paths: Object.keys(swaggerSpec.paths || {}),
    tags: swaggerSpec.tags || [],
    components: Object.keys(swaggerSpec.components || {})
  })
})

// For local development
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 5000
  serve({
    fetch: app.fetch,
    port: PORT
  }, () => {
    console.log(`Server is running on http://localhost:${PORT}`)
  })
}

// Export a serverless function handler for Vercel
export default async function handler(request, response) {
  // Connect to database if not already connected
  if (!global.mongoConnected) {
    await connectWithRetry()
    global.mongoConnected = true
  }
  
  // Use Hono's fetch handler
  const fetchHandler = app.fetch
  
  // Create a Request object from the incoming request
  const url = new URL(request.url, `http://${request.headers.host || 'localhost'}`)
  const req = new Request(url, {
    method: request.method,
    headers: request.headers,
    body: request.body ? request.body : undefined
  })
  
  // Process the request with Hono
  const res = await fetchHandler(req)
  
  // Set status code
  response.statusCode = res.status
  
  // Set headers
  for (const [key, value] of res.headers.entries()) {
    response.setHeader(key, value)
  }
  
  // Send response body
  const body = await res.arrayBuffer()
  response.end(Buffer.from(body))
}
