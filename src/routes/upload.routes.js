import express from 'express'
import { protect } from "../middlewares/auth.middleware.js"
import FileUpload from "../models/fileUpload.model.js"

const router = express.Router()

router.get("/progress/:fileId", protect, async (req, res) => {
  try {
    const fileId = req.params.fileId
    const fileUpload = await FileUpload.findById(fileId).select('status progress error url fileName fileSize')
    
    if (!fileUpload) {
      return res.status(404).json({ success: false, message: 'Upload not found' })
    }

    return res.json({
      success: true,
      status: fileUpload.status,
      progress: fileUpload.progress || 0,
      error: fileUpload.error,
      fileName: fileUpload.fileName,
      fileSize: fileUpload.fileSize,
      url: fileUpload.url,
      completed: fileUpload.status === 'complete' || fileUpload.status === 'completed'
    })
  } catch (error) {
    console.error('Error getting upload progress:', error)
    return res.status(500).json({ success: false, message: 'Failed to get upload progress' })
  }
})

export default router