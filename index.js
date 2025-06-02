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
import donationRoutes from "./src/routes/donation.routes.js"
import reportRoutes from "./src/routes/report.routes.js" // Add this import
import contractRoutes from "./src/routes/contract.routes.js" // Add contract routes import
import { errorHandler } from "./src/middlewares/error.middleware.js"
import { swaggerSpec } from './src/config/swagger.js'
import advertisementRoutes from "./src/routes/advertisement.routes.js"
import uploadRoutes from "./src/routes/upload.routes.js"
import fileUploadRoutes from "./src/routes/fileUpload.routes.js"
import creatorContentRoutes from "./src/routes/creatorContent.routes.js"
import channelSubscriptionRoutes from "./src/routes/channelSubscription.routes.js"
import sliderRoutes from "./src/routes/slider.routes.js"
import categoryRoutes from "./src/routes/category.routes.js"
import adminRouter from './src/routes/admin.routes.js';

// Add these imports at the top
import http from 'http';
import socketService from './src/services/socket.service.js';

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
app.route("/api/donations", donationRoutes)
app.route("/api/reports", reportRoutes)
app.route("/api/contracts", contractRoutes) // Add contract routes
// Admin routes
app.route('/api/admin', adminRouter);

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
  
  // Create HTTP server instead of using serve directly
  const server = http.createServer((req, res) => {
    // Create a full URL from the path
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`).toString();
    
    // Only include body for methods that support it
    const requestOptions = {
      method: req.method,
      headers: req.headers
    };
    
    // Add body only for methods that support it (not GET or HEAD)
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      requestOptions.body = req;
      requestOptions.duplex = 'half'; // Add this line to specify the duplex option
    }
    
    app.fetch(new Request(url, requestOptions)).then(response => {
      res.statusCode = response.status;
      
      // Set headers
      for (const [key, value] of response.headers.entries()) {
        res.setHeader(key, value);
      }
      
      // Send response
      response.arrayBuffer().then(buffer => {
        res.end(Buffer.from(buffer));
      });
    });
  });
  
  // Initialize Socket.io with the HTTP server
  socketService.initialize(server);
  
  // Start the server
  server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
}
server.timeout = 1000000
// Export a serverless function handler for Vercel
export default async function handler(request, response) {
  try {
    // Connect to database if not already connected
    if (!global.mongoConnected) {
      await connectWithRetry()
      global.mongoConnected = true
    }
    
    // Create headers object from request headers
    const headers = new Headers()
    for (const [key, value] of Object.entries(request.headers)) {
      headers.set(key, value)
    }
    
    // Handle request body
    let body = null
    if (request.body) {
      if (typeof request.body === 'string') {
        body = request.body
      } else if (Buffer.isBuffer(request.body)) {
        body = request.body
      } else {
        body = JSON.stringify(request.body)
      }
    }
    
    // Create a proper URL from the request
    const host = request.headers.host || 'localhost'
    const protocol = host.includes('localhost') ? 'http' : 'https'
    const url = new URL(request.url, `${protocol}://${host}`)
    
    // Create a proper Request object
    const req = new Request(url.toString(), {
      method: request.method,
      headers: headers,
      body: body
    })
    
    // Process with Hono
    const res = await app.fetch(req)
    
    // Set status code
    response.statusCode = res.status
    
    // Set headers
    for (const [key, value] of res.headers.entries()) {
      response.setHeader(key, value)
    }
    
    // Handle response based on content type
    const contentType = res.headers.get('content-type') || ''
    
    if (contentType.includes('text/html')) {
      const text = await res.text()
      response.end(text)
    } else if (contentType.includes('application/json')) {
      const text = await res.text()
      response.end(text)
    } else {
      const buffer = await res.arrayBuffer()
      response.end(Buffer.from(buffer))
    }
  } catch (error) {
    console.error('Serverless function error:', error)
    response.statusCode = 500
    response.setHeader('Content-Type', 'application/json')
    response.end(JSON.stringify({ 
      success: false, 
      message: 'Internal server error',
      error: error.message
    }))
  }
}
