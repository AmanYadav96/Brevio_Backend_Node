import express from "express"
import { protect } from "../middlewares/auth.middleware.js"
import { getCreatorDashboard } from "../controllers/creator.controller.js"

const router = express.Router()

// All routes require authentication
router.use(protect)

// Get creator dashboard data
router.get("/dashboard", getCreatorDashboard)

export default router
