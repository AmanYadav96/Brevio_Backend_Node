import { Hono } from "hono"
import { protect } from "../middlewares/auth.middleware.js"
import FileUpload from "../models/fileUpload.model.js"

const router = new Hono()

router.get("/progress/:fileId", protect, async (c) => {
  try {
    const fileId = c.req.param('fileId')
    const fileUpload = await FileUpload.findById(fileId).select('status progress error url fileName fileSize')
    
    if (!fileUpload) {
      return c.json({ success: false, message: 'Upload not found' }, 404)
    }

    return c.json({
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
    return c.json({ success: false, message: 'Failed to get upload progress' }, 500)
  }
})

// Add a new endpoint to get all uploads for the current user
router.get("/user-uploads", protect, async (c) => {
  try {
    const userId = c.get('user')._id
    const { limit = 10, page = 1 } = c.req.query()
    
    const skip = (parseInt(page) - 1) * parseInt(limit)
    
    const [uploads, total] = await Promise.all([
      FileUpload.find({ userId })
        .select('status progress error url fileName fileSize createdAt')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      FileUpload.countDocuments({ userId })
    ])
    
    return c.json({
      success: true,
      uploads,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    })
  } catch (error) {
    console.error('Error getting user uploads:', error)
    return c.json({ success: false, message: 'Failed to get user uploads' }, 500)
  }
})

export default router