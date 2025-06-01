import { Hono } from "hono"
import { 
  register, 
  login, 
  googleLogin, 
  facebookAuth, 
  appleAuth,
  becomeCreator 
} from "../controllers/auth.controller.js"
import { protect } from "../middlewares/auth.middleware.js"

const router = new Hono()

// Email/password authentication
router.post("/register", register)
router.post("/login", login)

// Social authentication
router.post("/google", googleLogin)
router.post("/facebook", facebookAuth)
router.post("/apple", appleAuth)

// Creator upgrade route
router.post("/become-creator", protect, becomeCreator)

export default router
