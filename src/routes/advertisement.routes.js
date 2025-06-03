import express from "express"
import { protect, restrictTo } from "../middlewares/auth.middleware.js"
import { UserRole } from "../models/user.model.js"
import {
  createAdvertisement,
  getAllAdvertisements,
  getAdvertisementById,
  updateAdvertisement,
  deleteAdvertisement
} from "../controllers/advertisement.controller.js"

const router = express.Router()

// All routes require admin access
router.use(protect)
router.use(restrictTo(UserRole.ADMIN))

router.post("/", createAdvertisement)
router.get("/", getAllAdvertisements)
router.get("/:id", getAdvertisementById)
router.put("/:id", updateAdvertisement)
router.delete("/:id", deleteAdvertisement)

export default router