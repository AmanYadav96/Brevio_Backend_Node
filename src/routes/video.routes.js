import { Hono } from "hono"
import { uploadVideo, publishVideo, getVideos, getVideoById, searchVideos } from "../controllers/video.controller.js"
import { protect, restrictTo } from "../middlewares/auth.middleware.js"
import { UserRole } from "../models/user.model.js"

const router = new Hono()

// Public routes
router.get("/", getVideos)
router.get("/:id", getVideoById)
router.get("/search", searchVideos)

// Protected routes
router.post("/", protect, restrictTo(UserRole.CREATOR, UserRole.ADMIN), uploadVideo)
router.post("/publish", protect, restrictTo(UserRole.CREATOR, UserRole.ADMIN), publishVideo)

export default router
