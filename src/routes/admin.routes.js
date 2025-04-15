import { Hono } from "hono"
import { protect, restrictTo } from "../middlewares/auth.middleware.js"
import {
  getAllUsers,
  getUser,
  updateUser,
  deleteUser,
  getUserStats
} from "../controllers/user.controller.js"

const router = new Hono()

// Protect all routes and restrict to admin
router.use("*", protect)
router.use("*", restrictTo("admin"))

// User management routes
router.get("/users", getAllUsers)
router.get("/users/stats", getUserStats)
router.get("/users/:id", getUser)
router.put("/users/:id", updateUser)
router.delete("/users/:id", deleteUser)

export default router
