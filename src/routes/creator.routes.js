import express from "express"
import { protect } from "../middlewares/auth.middleware.js"
import { 
  getCreatorDashboard, 
  getCreatorStats,
  getCreatorProfileById,
  searchCreators 
} from "../controllers/creator.controller.js"

const router = express.Router()

// Public routes - no authentication required
router.get("/profile/:creatorId", getCreatorProfileById)
router.get("/search", searchCreators)

// All routes below require authentication
router.use(protect)

// Get creator dashboard data
router.get("/dashboard", getCreatorDashboard)

// Get creator statistics and content data
router.get("/stats", getCreatorStats)

export default router
