import express from "express"
import { protect } from "../middlewares/auth.middleware.js"
import { handleUpload } from "../middlewares/upload.middleware.js"
import {
  createContent,
  getAllContent,
  getContentById,
  updateContent,
  deleteContent,
  getContentByCategory
} from "../controllers/content.controller.js"

const router = express.Router()

// Public routes
router.get("/", getAllContent)
router.get("/:id", getContentById)
router.get("/category/:categoryId", getContentByCategory)

// Protected routes
router.post("/", protect, handleUpload('CONTENT'), createContent)
router.put("/:id", protect, handleUpload('CONTENT'), updateContent)
router.delete("/:id", protect, deleteContent)

export default router