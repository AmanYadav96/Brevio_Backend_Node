import { Hono } from "hono"
import { 
  register, 
  login, 
  googleAuth, 
  facebookAuth, 
  appleAuth 
} from "../controllers/auth.controller.js"

const router = new Hono()

// Email/password authentication
router.post("/register", register)
router.post("/login", login)

// Social authentication
router.post("/google", googleAuth)
router.post("/facebook", facebookAuth)
router.post("/apple", appleAuth)

export default router
