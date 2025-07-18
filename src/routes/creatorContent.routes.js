import express from "express"
import { protect, restrictTo } from "../middlewares/auth.middleware.js"
import { UserRole } from "../models/user.model.js"
import { handleUpload } from "../middlewares/upload.middleware.js"
import {
  createContentBasic,
  uploadMainVideo,
  uploadMediaAssets,
  addEpisode,
  addLesson,
  approveContent,
  rejectContent,
  bulkApproveContent,  // Add this
  bulkRejectContent,   // Add this
  getContentById,
  getAllContent,
  purchaseEducationalContent,
  updateContent,
  deleteContent,
  markContentAsReviewed,
  bulkMarkContentAsReviewed
} from "../controllers/creatorContent.controller.js"

const router = express.Router()

// Content creation routes - new workflow
router.post("/basic", protect, createContentBasic)
router.post("/:contentId/video", protect, handleUpload('CREATOR_CONTENT'), uploadMainVideo)
router.post("/:contentId/media", protect, handleUpload('CREATOR_CONTENT'), uploadMediaAssets)

// Existing routes
router.post("/:contentId/seasons/:seasonId/episodes", protect, handleUpload('episode'), addEpisode)
router.post("/:contentId/lessons", protect, handleUpload('lesson'), addLesson)

// Admin routes
router.patch("/:contentId/approve", protect, restrictTo(UserRole.ADMIN), approveContent)
router.patch("/:contentId/reject", protect, restrictTo(UserRole.ADMIN), rejectContent)
// Add these new routes
router.patch("/:contentId/review", protect, restrictTo(UserRole.ADMIN), markContentAsReviewed)
router.post("/bulk/review", protect, restrictTo(UserRole.ADMIN), bulkMarkContentAsReviewed)

// Content retrieval routes
router.get("/:contentId", getContentById)
router.get("/", protect, getAllContent)

// Purchase route
router.post("/:contentId/purchase", protect, purchaseEducationalContent)

// New routes for content editing and deletion
router.patch("/:contentId", protect, handleUpload('CREATOR_CONTENT'), updateContent)
router.delete("/:contentId", protect, deleteContent)

// Bulk admin routes
router.post("/bulk/approve", protect, restrictTo(UserRole.ADMIN), bulkApproveContent)
router.post("/bulk/reject", protect, restrictTo(UserRole.ADMIN), bulkRejectContent)

export default router