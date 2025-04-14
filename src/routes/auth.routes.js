import { Hono } from "hono"
import { register, login, googleLogin, facebookLogin, becomeCreator } from "../controllers/auth.controller.js"
import { protect } from "../middlewares/auth.middleware.js"

const router = new Hono()

// Public routes
router.post("/register", register)
router.post("/login", login)
router.post("/google", googleLogin)
router.post("/facebook", facebookLogin)

// Protected routes
router.post("/become-creator", protect, becomeCreator)

export default router
