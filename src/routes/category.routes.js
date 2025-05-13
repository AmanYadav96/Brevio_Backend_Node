import { Hono } from "hono"
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

const app = new Hono()

// Public routes
app.get("/active", getActiveCategories)

// Protected routes
app.use("*", protect)

// Admin only routes
app.post("/", restrictTo(UserRole.ADMIN), createCategory)
app.get("/", restrictTo(UserRole.ADMIN), getAllCategories)
app.get("/:categoryId", restrictTo(UserRole.ADMIN), getCategoryById)
app.put("/:categoryId", restrictTo(UserRole.ADMIN), updateCategory)
app.delete("/:categoryId", restrictTo(UserRole.ADMIN), deleteCategory)

export default app