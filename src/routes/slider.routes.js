import express from "express"
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

const router = express.Router()

// Public routes
router.get("/active", getActiveSliders)

// Protected routes
router.use(protect)

// Admin only routes
router.post("/", restrictTo(UserRole.ADMIN), createSlider)
router.get("/", restrictTo(UserRole.ADMIN), getAllSliders)
router.get("/:sliderId", restrictTo(UserRole.ADMIN), getSliderById)
router.put("/:sliderId", restrictTo(UserRole.ADMIN), updateSlider)
router.delete("/:sliderId", restrictTo(UserRole.ADMIN), deleteSlider)

export default router