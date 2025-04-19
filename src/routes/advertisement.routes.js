import { Hono } from "hono"
import { protect, restrictTo } from "../middlewares/auth.middleware.js"
import { UserRole } from "../models/user.model.js"
import {
  createAdvertisement,
  getAllAdvertisements,
  updateAdvertisement,
  deleteAdvertisement
} from "../controllers/advertisement.controller.js"
import { handleUpload, uploadTypes } from '../middlewares/upload.middleware.js'

const router = new Hono()

// Admin only routes
router.post("/",
  protect,
  restrictTo(UserRole.ADMIN),
  handleUpload('ADVERTISEMENT'),
  createAdvertisement
)
router.get("/", protect, restrictTo(UserRole.ADMIN), getAllAdvertisements)
router.put("/:id", protect, restrictTo(UserRole.ADMIN), updateAdvertisement)
router.delete("/:id", protect, restrictTo(UserRole.ADMIN), deleteAdvertisement)

export default router