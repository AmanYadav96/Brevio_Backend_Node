import { Hono } from "hono"
import { protect } from "../middlewares/auth.middleware.js"

const router = new Hono()

// Protected routes
router.get("/profile", protect, (c) => {
  return c.json({ message: "User profile route" })
})

export default router
