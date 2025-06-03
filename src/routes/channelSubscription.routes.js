import express from "express"
import { 
  subscribeToChannel, 
  getUserSubscriptions, 
  getChannelSubscribers, 
  cancelSubscription, 
  checkSubscription,
  updateLastWatched,
  addPurchasedCourse,
  getUserPurchasedCourses,
  checkCoursePurchase
} from "../controllers/channelSubscription.controller.js"
import { protect } from "../middlewares/auth.middleware.js"

const router = express.Router()

// All routes require authentication
router.use(protect)

// Subscribe to a channel
router.post("/", subscribeToChannel)

// Get all channels a user is subscribed to
router.get("/my-subscriptions", getUserSubscriptions)

// Get all subscribers of a channel
router.get("/channel/:channelId/subscribers", getChannelSubscribers)

// Cancel a subscription
router.patch("/:subscriptionId/cancel", cancelSubscription)

// Check if user is subscribed to a channel
router.get("/check/:channelId", checkSubscription)

// Update last watched content
router.patch("/last-watched", updateLastWatched)

// Course purchase routes
router.post("/courses", addPurchasedCourse)
router.get("/courses", getUserPurchasedCourses)
router.get("/courses/:contentId", checkCoursePurchase)

export default router