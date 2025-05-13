import { Hono } from "hono"
import { 
  createSlider, 
  getAllSliders, 
  getSliderById, 
  updateSlider, 
  deleteSlider,
  getActiveSliders
} from "../controllers/slider.controller.js"
import { protect, restrictTo } from "../middlewares/auth.middleware.js"
import { UserRole } from "../models/user.model.js"

const app = new Hono()

// Public routes
app.get("/active", getActiveSliders)

// Protected routes
app.use("*", protect)

// Admin only routes
app.post("/", restrictTo(UserRole.ADMIN), createSlider)
app.get("/", restrictTo(UserRole.ADMIN), getAllSliders)
app.get("/:sliderId", restrictTo(UserRole.ADMIN), getSliderById)
app.put("/:sliderId", restrictTo(UserRole.ADMIN), updateSlider)
app.delete("/:sliderId", restrictTo(UserRole.ADMIN), deleteSlider)

export default app