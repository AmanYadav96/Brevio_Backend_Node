import { Hono } from "hono"
import { protect, restrictTo } from "../middlewares/auth.middleware.js"
import { UserRole } from "../models/user.model.js"
import { 
  createContent,
  getAllContent,
  getContent,
  updateContent,
  deleteContent,
  incrementViews
} from "../controllers/content.controller.js"
import { handleUpload } from '../middlewares/upload.middleware.js'
import { validateFileSize } from '../middlewares/fileSize.middleware.js'

const router = new Hono()

// Create content route
router.post("/", 
  protect, 
  restrictTo(UserRole.CREATOR, UserRole.ADMIN),
  validateFileSize({ video: true, trailer: true }),
  handleUpload('CONTENT'),
  createContent
)

// Get all content
router.get("/", getAllContent)

// Get content by ID
router.get("/:id", getContent)

// Update content
router.put("/:id", 
  protect, 
  restrictTo(UserRole.CREATOR, UserRole.ADMIN),
  validateFileSize({ video: true, trailer: true }),
  handleUpload('CONTENT'),
  updateContent
)

// Delete content
router.delete("/:id", 
  protect, 
  restrictTo(UserRole.CREATOR, UserRole.ADMIN), 
  deleteContent
)

// Increment views
router.post("/:id/views", incrementViews)

export default router