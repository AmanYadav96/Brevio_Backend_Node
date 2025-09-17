import express from 'express';
import { 
  register, 
  login, 
  googleLogin, 
  facebookAuth, 
  appleAuth,
  becomeCreator,
  verifyEmail,
  resendVerificationOTP,
  resendOTP
} from "../controllers/auth.controller.js";
import { protect } from "../middlewares/auth.middleware.js";

const router = express.Router();

// Email/password authentication
router.post("/register", register);
router.post("/login", login);

// Email verification
router.post("/verify-email", verifyEmail);
router.post("/resend-verification", resendVerificationOTP);
router.post("/resend-otp", resendOTP);

// Social authentication
router.post("/google", googleLogin);
router.post("/facebook", facebookAuth);
router.post("/apple", appleAuth);

// Creator upgrade route
router.post("/become-creator", protect, becomeCreator);

export default router;
