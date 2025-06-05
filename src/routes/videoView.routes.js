import express from "express"
import { protect, restrictTo } from "../middlewares/auth.middleware.js"
import { UserRole } from "../models/user.model.js"
import {
  recordView,
  updateView,
  getContentViewCount,
  getContentViewStats,
  getTopViewedContent,
  getCreatorViewStats,
  getGlobalViewStats
} from "../controllers/videoView.controller.js"

const router = express.Router()

// Public routes
router.post("/content/:contentId", recordView) // Record a view (no auth required)
router.get("/content/:contentId/count", getContentViewCount) // Get view count for content
router.get("/top", getTopViewedContent) // Get top viewed content

// Protected routes (require authentication)
router.put("/update/:viewId", protect, updateView) // Update view duration/completion
router.get("/content/:contentId/stats", protect, getContentViewStats) // Get detailed view stats for content
router.get("/creator/stats", protect, restrictTo(UserRole.CREATOR, UserRole.ADMIN), getCreatorViewStats) // Get creator's content view stats
router.get("/admin/stats", protect, restrictTo(UserRole.ADMIN), getGlobalViewStats) // Get global view stats (admin only)

export default router