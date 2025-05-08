import { Hono } from "hono"
import { protect, restrictTo } from "../middlewares/auth.middleware.js"
import { UserRole } from "../models/user.model.js"
import { handleUpload } from "../middlewares/upload.middleware.js"
import {
  createContent,
  addEpisode,
  addLesson,
  approveContent,
  rejectContent,
  getContentById,
  getAllContent,
  purchaseEducationalContent
} from "../controllers/creatorContent.controller.js"

const router = new Hono()

// Content creation routes
router.post("/", protect, handleUpload('creatorContent'), createContent)
router.post("/:contentId/seasons/:seasonId/episodes", protect, handleUpload('episode'), addEpisode)
router.post("/:contentId/lessons", protect, handleUpload('lesson'), addLesson)

// Admin routes
router.patch("/:contentId/approve", protect, restrictTo(UserRole.ADMIN), approveContent)
router.patch("/:contentId/reject", protect, restrictTo(UserRole.ADMIN), rejectContent)

// Content retrieval routes
router.get("/:contentId", getContentById)
router.get("/", protect, getAllContent)

// Purchase route
router.post("/:contentId/purchase", protect, purchaseEducationalContent)

export default router