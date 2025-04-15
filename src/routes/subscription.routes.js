import { Hono } from "hono"
import { createPlan, getAllPlans, getPlan, updatePlan, deletePlan } from "../controllers/subscription.controller.js"
import { protect, restrictTo } from "../middlewares/auth.middleware.js"

const app = new Hono()

// Public routes
app.get("/", getAllPlans)
app.get("/:id", getPlan)

// Admin only routes
app.post("/", protect, restrictTo('admin'), createPlan)
app.put("/:id", protect, restrictTo('admin'), updatePlan)
app.delete("/:id", protect, restrictTo('admin'), deletePlan)

export default app