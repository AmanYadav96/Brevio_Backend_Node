import Genre from "../models/genre.model.js"
import { AppError } from "../utils/app-error.js"

// Create new genre
export const createGenre = async (req, res) => {
  try {
    const body = req.body
    const genre = await Genre.create(body)
    return res.status(201).json({ success: true, genre })
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ 
        success: false, 
        message: `Genre with name "${error.keyValue.name}" already exists` 
      })
    }
    console.error("Create genre error:", error)
    return res.status(500).json({ success: false, message: "Failed to create genre" })
  }
}

// Get all genres
export const getAllGenres = async (req, res) => {
  try {
    const genres = await Genre.find({ isActive: true })
    return res.json({ success: true, genres })
  } catch (error) {
    console.error("Get all genres error:", error)
    return res.status(500).json({ success: false, message: "Failed to fetch genres" })
  }
}

// Get single genre
export const getGenre = async (req, res) => {
  try {
    const genre = await Genre.findById(req.params.id)
    if (!genre || !genre.isActive) {
      return res.status(404).json({ success: false, message: "Genre not found" })
    }
    return res.json({ success: true, genre })
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({ success: false, message: "Invalid genre ID" })
    }
    console.error("Get genre error:", error)
    return res.status(500).json({ success: false, message: "Failed to fetch genre" })
  }
}

// Update genre
export const updateGenre = async (req, res) => {
  try {
    const body = req.body
    const genre = await Genre.findByIdAndUpdate(
      req.params.id,
      { $set: body },
      { new: true, runValidators: true }
    )
    if (!genre) {
      return res.status(404).json({ success: false, message: "Genre not found" })
    }
    return res.json({ success: true, genre })
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ 
        success: false, 
        message: `Genre with name "${error.keyValue.name}" already exists` 
      })
    }
    if (error.name === "CastError") {
      return res.status(400).json({ success: false, message: "Invalid genre ID" })
    }
    if (error.name === "ValidationError") {
      return res.status(400).json({ 
        success: false, 
        message: Object.values(error.errors).map(err => err.message).join(", ") 
      })
    }
    console.error("Update genre error:", error)
    return res.status(500).json({ success: false, message: "Failed to update genre" })
  }
}

// Delete genre
export const deleteGenre = async (req, res) => {
  try {
    const genre = await Genre.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    )
    if (!genre) {
      return res.status(404).json({ success: false, message: "Genre not found" })
    }
    return res.json({ success: true, message: "Genre deleted successfully" })
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({ success: false, message: "Invalid genre ID" })
    }
    console.error("Delete genre error:", error)
    return res.status(500).json({ success: false, message: "Failed to delete genre" })
  }
}