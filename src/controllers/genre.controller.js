import Genre from "../models/genre.model.js"
import { AppError } from "../utils/app-error.js"

// Create new genre
export const createGenre = async (c) => {
  try {
    const body = await c.req.json()
    const genre = await Genre.create(body)
    return c.json({ success: true, genre }, 201)
  } catch (error) {
    if (error.code === 11000) {
      return c.json({ 
        success: false, 
        message: `Genre with name "${error.keyValue.name}" already exists` 
      }, 400)
    }
    console.error("Create genre error:", error)
    return c.json({ success: false, message: "Failed to create genre" }, 500)
  }
}

// Get all genres
export const getAllGenres = async (c) => {
  try {
    const genres = await Genre.find({ isActive: true })
    return c.json({ success: true, genres })
  } catch (error) {
    console.error("Get all genres error:", error)
    return c.json({ success: false, message: "Failed to fetch genres" }, 500)
  }
}

// Get single genre
export const getGenre = async (c) => {
  try {
    const genre = await Genre.findById(c.req.param("id"))
    if (!genre || !genre.isActive) {
      return c.json({ success: false, message: "Genre not found" }, 404)
    }
    return c.json({ success: true, genre })
  } catch (error) {
    if (error.name === "CastError") {
      return c.json({ success: false, message: "Invalid genre ID" }, 400)
    }
    console.error("Get genre error:", error)
    return c.json({ success: false, message: "Failed to fetch genre" }, 500)
  }
}

// Update genre
export const updateGenre = async (c) => {
  try {
    const body = await c.req.json()
    const genre = await Genre.findByIdAndUpdate(
      c.req.param("id"),
      { $set: body },
      { new: true, runValidators: true }
    )
    if (!genre) {
      return c.json({ success: false, message: "Genre not found" }, 404)
    }
    return c.json({ success: true, genre })
  } catch (error) {
    if (error.code === 11000) {
      return c.json({ 
        success: false, 
        message: `Genre with name "${error.keyValue.name}" already exists` 
      }, 400)
    }
    if (error.name === "CastError") {
      return c.json({ success: false, message: "Invalid genre ID" }, 400)
    }
    if (error.name === "ValidationError") {
      return c.json({ 
        success: false, 
        message: Object.values(error.errors).map(err => err.message).join(", ") 
      }, 400)
    }
    console.error("Update genre error:", error)
    return c.json({ success: false, message: "Failed to update genre" }, 500)
  }
}

// Delete genre
export const deleteGenre = async (c) => {
  try {
    const genre = await Genre.findByIdAndUpdate(
      c.req.param("id"),
      { isActive: false },
      { new: true }
    )
    if (!genre) {
      return c.json({ success: false, message: "Genre not found" }, 404)
    }
    return c.json({ success: true, message: "Genre deleted successfully" })
  } catch (error) {
    if (error.name === "CastError") {
      return c.json({ success: false, message: "Invalid genre ID" }, 400)
    }
    console.error("Delete genre error:", error)
    return c.json({ success: false, message: "Failed to delete genre" }, 500)
  }
}