import { Hono } from "hono"
import { protect } from "../middlewares/auth.middleware.js"
import File from "../models/file.model.js"

const router = new Hono()

router.get("/progress/:fileId", protect, async (c) => {
  try {
    const fileId = c.req.param('fileId')
    const file = await File.findById(fileId).select('status progress error')
    
    if (!file) {
      return c.json({ success: false, message: 'Upload not found' }, 404)
    }

    return c.json({
      success: true,
      status: file.status,
      progress: file.progress,
      error: file.error
    })
  } catch (error) {
    return c.json({ success: false, message: 'Failed to get upload progress' }, 500)
  }
})

export default router