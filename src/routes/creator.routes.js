import { Hono } from "hono"
import { protect, restrictTo } from "../middlewares/auth.middleware.js"
import { UserRole } from "../models/user.model.js"

const router = new Hono()

// Protected routes for creators
router.get("/dashboard", protect, restrictTo(UserRole.CREATOR, UserRole.ADMIN), (c) => {
  return c.json({ message: "Creator dashboard route" })
})

export default router
