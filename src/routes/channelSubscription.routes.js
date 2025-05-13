import { Hono } from "hono"
import { 
  subscribeToChannel, 
  getUserSubscriptions, 
  getChannelSubscribers, 
  cancelSubscription, 
  checkSubscription,
  updateLastWatched
} from "../controllers/channelSubscription.controller.js"
import { protect } from "../middlewares/auth.middleware.js"

const app = new Hono()

// All routes require authentication
app.use("*", protect)

// Subscribe to a channel
app.post("/", subscribeToChannel)

// Get all channels a user is subscribed to
app.get("/my-subscriptions", getUserSubscriptions)

// Get all subscribers of a channel
app.get("/channel/:channelId/subscribers", getChannelSubscribers)

// Cancel a subscription
app.patch("/:subscriptionId/cancel", cancelSubscription)

// Check if user is subscribed to a channel
app.get("/check/:channelId", checkSubscription)

// Update last watched time
app.patch("/:channelId/watch", updateLastWatched)

export default app