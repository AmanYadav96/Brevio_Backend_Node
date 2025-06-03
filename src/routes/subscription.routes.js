import express from "express"
import { createPlan, getAllPlans, getPlan, updatePlan, deletePlan } from "../controllers/subscription.controller.js"
import { protect, restrictTo } from "../middlewares/auth.middleware.js"
import { UserRole } from "../models/user.model.js"

const router = express.Router()

// Public routes
router.get("/", getAllPlans)
router.get("/:id", getPlan)

// Admin only routes
router.post("/", protect, restrictTo(UserRole.ADMIN), createPlan)
router.put("/:id", protect, restrictTo(UserRole.ADMIN), updatePlan)
router.delete("/:id", protect, restrictTo(UserRole.ADMIN), deletePlan)

export default router