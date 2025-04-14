import { Hono } from "hono"
import {
  createCheckoutSession,
  handleWebhook,
  getPaymentHistory,
  cancelSubscription,
} from "../controllers/payment.controller.js"
import { protect } from "../middlewares/auth.middleware.js"

const router = new Hono()

// Public routes
router.post("/webhook", handleWebhook)

// Protected routes
router.post("/create-checkout-session", protect, createCheckoutSession)
router.get("/history", protect, getPaymentHistory)
router.post("/cancel-subscription", protect, cancelSubscription)

export default router
