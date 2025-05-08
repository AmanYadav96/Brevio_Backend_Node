import { Hono } from "hono"
import { protect, restrictTo } from "../middlewares/auth.middleware.js"
import { UserRole } from "../models/user.model.js"
import { 
  getUploadStats, 
  getRecentUploads,
  getAdminStorageStats
} from "../controllers/fileUpload.controller.js"

const router = new Hono()

// User routes
router.get("/stats", protect, getUploadStats)
router.get("/recent", protect, getRecentUploads)

// Admin routes
router.get("/admin/stats", protect, restrictTo(UserRole.ADMIN), getAdminStorageStats)

export default router