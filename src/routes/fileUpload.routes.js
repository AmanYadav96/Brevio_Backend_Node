import express from "express"
import { protect } from "../middlewares/auth.middleware.js"
import { handleUpload } from "../middlewares/upload.middleware.js"
import { getUploadStats, getUploadProgress, getRecentUploads } from "../controllers/fileUpload.controller.js"

const router = express.Router()

// Upload file route
// router.post("/", protect, handleUpload('FILE'), uploadFile)

// Get upload statistics
router.get("/stats", protect, getUploadStats)

// Get recent uploads
router.get("/recent", protect, getRecentUploads)

// Get upload progress by fileId
router.get("/:fileId/progress", protect, getUploadProgress)

export default router