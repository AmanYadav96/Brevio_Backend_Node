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
        <script>
            window.onload = () => {
                window.ui = SwaggerUIBundle({
                    url: '/api-docs/swagger.json',
                    dom_id: '#swagger-ui',
                });
            };
        </script>
    </body>
    </html>
  `)
})

app.get('/api-docs/swagger.json', (c) => {
  return c.json(swaggerSpec)
})

const PORT = process.env.PORT || 5000
serve({
  fetch: app.fetch,
  port: PORT
}, () => {
  console.log(`Server is running on http://localhost:${PORT}`)
})

// Change module.exports to ES module export
export { app }
