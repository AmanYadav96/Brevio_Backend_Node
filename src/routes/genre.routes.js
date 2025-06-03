import express from "express"
import { createGenre, getAllGenres, getGenre, updateGenre, deleteGenre } from "../controllers/genre.controller.js"
import { protect, restrictTo } from "../middlewares/auth.middleware.js"
import { UserRole } from "../models/user.model.js"

const router = express.Router()

// Public routes
router.get("/", getAllGenres)
router.get("/:id", getGenre)

// Admin only routes
router.post("/", protect, restrictTo(UserRole.ADMIN), createGenre)
router.put("/:id", protect, restrictTo(UserRole.ADMIN), updateGenre)
router.delete("/:id", protect, restrictTo(UserRole.ADMIN), deleteGenre)

export default router