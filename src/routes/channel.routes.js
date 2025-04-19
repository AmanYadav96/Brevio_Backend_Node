import { Hono } from "hono"
import { protect, restrictTo } from "../middlewares/auth.middleware.js"
import { UserRole } from "../models/user.model.js"
import { 
  createChannel,
  getAllChannels,
  getChannel,
  updateChannel,
  deleteChannel,
  getChannelStats,
  getChannelDashboard
} from "../controllers/channel.controller.js"
import { handleUpload, uploadTypes } from '../middlewares/upload.middleware.js'

const router = new Hono()

// Dashboard route (must be before /:id routes)
router.get("/dashboard", protect, restrictTo(UserRole.ADMIN), getChannelDashboard)

// Admin routes
router.post("/", 
  protect, 
  restrictTo(UserRole.ADMIN), 
  handleUpload('CHANNEL'),
  createChannel
)
router.get("/", protect, getAllChannels)

// Routes with ID parameter
router.get("/:id", protect, getChannel)
router.put("/:id", protect, restrictTo(UserRole.ADMIN), updateChannel)
router.delete("/:id", protect, restrictTo(UserRole.ADMIN), deleteChannel)
router.get("/:id/stats", protect, restrictTo(UserRole.ADMIN), getChannelStats)

export default router