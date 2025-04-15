import { Hono } from "hono"
import { createGenre, getAllGenres, getGenre, updateGenre, deleteGenre } from "../controllers/genre.controller.js"
import { protect, restrictTo } from "../middlewares/auth.middleware.js"

const app = new Hono()

// Public routes
app.get("/", getAllGenres)
app.get("/:id", getGenre)

// Admin only routes
app.post("/", protect, restrictTo('admin'), createGenre)
app.put("/:id", protect, restrictTo('admin'), updateGenre)
app.delete("/:id", protect, restrictTo('admin'), deleteGenre)

export default app