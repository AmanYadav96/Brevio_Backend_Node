import express from "express"
import { 
  createCategory, 
  getAllCategories, 
  getCategoryById, 
  updateCategory, 
  deleteCategory,
  getActiveCategories
} from "../controllers/category.controller.js"
import { protect, restrictTo } from "../middlewares/auth.middleware.js"
import { UserRole } from "../models/user.model.js"

const router = express.Router()

// Public routes
router.get("/active", getActiveCategories)

// Protected routes - apply protect middleware to all routes below
router.use(protect)

// Admin only routes
router.post("/", restrictTo(UserRole.ADMIN), createCategory)
router.get("/", restrictTo(UserRole.ADMIN), getAllCategories)
router.get("/:categoryId", restrictTo(UserRole.ADMIN), getCategoryById)
router.put("/:categoryId", restrictTo(UserRole.ADMIN), updateCategory)
router.delete("/:categoryId", restrictTo(UserRole.ADMIN), deleteCategory)

export default router