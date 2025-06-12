import dotenv from 'dotenv';
dotenv.config();

// Debug environment variables
console.log('Environment variables loaded:');
console.log('FIREBASE_API_KEY:', process.env.FIREBASE_API_KEY);
console.log('NODE_ENV:', process.env.NODE_ENV);

import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import morgan from 'morgan';
import helmet from 'helmet';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectDB } from "./src/config/database.js";
import socketService from './src/services/socket.service.js';
import { swaggerSpec } from './src/config/swagger.js';
import swaggerUi from 'swagger-ui-express';

// Import routes
import authRoutes from "./src/routes/auth.routes.js";
import userRoutes from "./src/routes/user.routes.js";
import creatorRoutes from "./src/routes/creator.routes.js";
import adminRoutes from "./src/routes/admin.routes.js";
import videoRoutes from "./src/routes/video.routes.js";
import paymentRoutes from "./src/routes/payment.routes.js";
import genreRoutes from "./src/routes/genre.routes.js";
import subscriptionRoutes from "./src/routes/subscription.routes.js";
import channelRoutes from "./src/routes/channel.routes.js";
import donationRoutes from "./src/routes/donation.routes.js";
import reportRoutes from "./src/routes/report.routes.js";
import contractRoutes from "./src/routes/contract.routes.js";
import advertisementRoutes from "./src/routes/advertisement.routes.js";
import uploadRoutes from "./src/routes/upload.routes.js";
import fileUploadRoutes from "./src/routes/fileUpload.routes.js";
import creatorContentRoutes from "./src/routes/creatorContent.routes.js";
import channelSubscriptionRoutes from "./src/routes/channelSubscription.routes.js";
import sliderRoutes from "./src/routes/slider.routes.js";
import categoryRoutes from "./src/routes/category.routes.js";
import likeRoutes from './src/routes/like.routes.js'
import commentRoutes from './src/routes/comment.routes.js'
import saveRoutes from './src/routes/save.routes.js'
import passwordRoutes from './src/routes/password.routes.js'

// Add these lines where you register other routes

import videoViewRoutes from "./src/routes/videoView.routes.js"
import { errorHandler } from "./src/middlewares/error.middleware.js";

const app = express();
const PORT = process.env.PORT || 5000;

// Database connection with retry mechanism
const connectWithRetry = async () => {
  try {
    await connectDB();
    console.log('MongoDB Connected');
  } catch (err) {
    console.error('MongoDB connection error:', err);
    return null;
  }
};

// Middleware to ensure DB connection
app.use(async (req, res, next) => {
  if (!global.mongoConnected) {
    await connectWithRetry();
    global.mongoConnected = true;
  }
  next();
});

// Middleware
app.use(morgan('dev'));

// Updated CORS configuration to allow all origins
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  exposedHeaders: ['Access-Control-Allow-Origin'],
  credentials: true,
  optionsSuccessStatus: 204
}));

// Add additional headers for CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  next();
});

app.use(helmet());
app.use(express.json({limit:'500mb'}));
app.use(express.urlencoded({ extended: true , limit: '500mb' }));


// Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/creators", creatorRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/videos", videoRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/channels", channelRoutes);
app.use("/api/subscriptions", subscriptionRoutes);
app.use("/api/genres", genreRoutes);
app.use("/api/advertisements", advertisementRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/file-uploads", fileUploadRoutes);
app.use("/api/creator-content", creatorContentRoutes);
app.use("/api/channel-subscriptions", channelSubscriptionRoutes);
app.use("/api/sliders", sliderRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/donations", donationRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/contracts", contractRoutes);
app.use("/api/views", videoViewRoutes)
app.use("/api/passwords",passwordRoutes)

app.use('/api/likes', likeRoutes)
app.use('/api/comments', commentRoutes)
app.use('/api/saves', saveRoutes)
// Health check route
app.get("/", (req, res) => res.json({ status: "Server is running" }));

// Swagger documentation
app.use('/api-docs', swaggerUi.serve);
app.get('/api-docs', swaggerUi.setup(swaggerSpec));
app.get('/api-docs/swagger.json', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.json(swaggerSpec);
});

// Debug endpoint
app.get('/api-docs/debug', (req, res) => {
  res.json({
    paths: Object.keys(swaggerSpec.paths || {}),
    tags: swaggerSpec.tags || [],
    components: Object.keys(swaggerSpec.components || {})
  });
});

// Error handling middleware
app.use(errorHandler);

// Process-level error handlers to prevent server shutdown
process.on('uncaughtException', (error) => {
  console.error('UNCAUGHT EXCEPTION! 💥');
  console.error(error.name, error.message, error.stack);
  // Log the error but keep the server running
  // For truly fatal errors, you might want to use a process manager like PM2 to restart the process
});

process.on('unhandledRejection', (error) => {
  console.error('UNHANDLED REJECTION! 💥');
  console.error(error.name, error.message, error.stack);
  // Log the error but keep the server running
});

const options = {
  key: fs.readFileSync('./cert/private.key'),
  cert: fs.readFileSync('./cert/certificate.crt'),
  ca: fs.readFileSync('./cert/ca_bundle.crt') // If you have a CA bundle
};
// Create HTTP server
// Create server with extended timeout
const server = http.createServer({
  requestTimeout: 300000*20, // 5 minutes
  headersTimeout: 300000*20, // 5 minutes + 5 seconds
}, app);

// Use this server instead of app.listen
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});


// Export for serverless environments
export default app;
