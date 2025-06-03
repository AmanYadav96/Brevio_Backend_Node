import express from "express"
import { protect } from "../middlewares/auth.middleware.js"
import { handleUpload } from "../middlewares/upload.middleware.js"
import {  getUploadStats } from "../controllers/fileUpload.controller.js"

const router = express.Router()

// Upload file route
// router.post("/", protect, handleUpload('FILE'), uploadFile)

// Get upload status
router.get("/:fileId/status", protect, getUploadStats)

export default router