import express from "express"
import { protect } from "../middlewares/auth.middleware.js"
import { getCreatorDashboard, getCreatorStats } from "../controllers/creator.controller.js"

const router = express.Router()

// All routes require authentication
router.use(protect)

// Get creator dashboard data
router.get("/dashboard", getCreatorDashboard)

// Get creator statistics and content data
router.get("/stats", getCreatorStats)

export default router
