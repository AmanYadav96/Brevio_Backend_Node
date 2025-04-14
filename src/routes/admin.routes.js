import { Hono } from "hono"
import { protect, restrictTo } from "../middlewares/auth.middleware.js"
import { UserRole } from "../models/user.model.js"

const router = new Hono()

// Protected routes for admins
router.get("/dashboard", protect, restrictTo(UserRole.ADMIN), (c) => {
  return c.json({ message: "Admin dashboard route" })
})

export default router
