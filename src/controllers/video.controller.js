import Video from "../models/video.model.js"
import User, { UserRole } from "../models/user.model.js"
import { AppError } from "../utils/app-error.js"

export const uploadVideo = async (req, res) => {
  try {
    const userId = req.user._id

    // Check if user is a creator
    const user = await User.findById(userId)
    if (!user || (user.role !== UserRole.CREATOR && user.role !== UserRole.ADMIN)) {
      return res.status(403).json({ success: false, message: "Only creators can upload videos" })
    }

    const { title, description, videoUrl, thumbnailUrl, duration, isPremium, tags, categories } = req.body

    // Create new video
    const video = await Video.create({
      title,
      description,
      creator: userId,
      videoUrl,
      thumbnailUrl,
      duration,
      isPremium: isPremium || false,
      tags: tags || [],
      categories: categories || [],
      isPublished: false, // Default to unpublished
    })

    return res.json({
      success: true,
      message: "Video uploaded successfully",
      video,
    })
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ success: false, message: error.message })
    }
    console.error("Video upload error:", error)
    return res.status(500).json({ success: false, message: "Failed to upload video" })
  }
}

export const publishVideo = async (req, res) => {
  try {
    const userId = req.user._id
    const { videoId } = req.body

    // Find video
    const video = await Video.findById(videoId)
    if (!video) {
      return res.status(404).json({ success: false, message: "Video not found" })
    }

    // Check if user is the creator of the video
    if (video.creator.toString() !== userId) {
      return res.status(403).json({ success: false, message: "You are not authorized to publish this video" })
    }

    // Update video to published
    video.isPublished = true
    await video.save()

    return res.json({
      success: true,
      message: "Video published successfully",
      video,
    })
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ success: false, message: error.message })
    }
    console.error("Video publish error:", error)
    return res.status(500).json({ success: false, message: "Failed to publish video" })
  }
}

export const getVideos = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 10
    const skip = (page - 1) * limit

    // Get published videos with pagination
    const videos = await Video.find({ isPublished: true })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("creator", "name profilePicture")

    const total = await Video.countDocuments({ isPublished: true })

    return res.json({
      success: true,
      videos,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error("Get videos error:", error)
    return res.status(500).json({ success: false, message: "Failed to get videos" })
  }
}

// Rename to match route handler name
export const getAllVideos = getVideos

export const getVideo = async (req, res) => {
  try {
    const { id } = req.params

    const video = await Video.findById(id)
      .populate("creator", "name profilePicture")

    if (!video) {
      return res.status(404).json({ success: false, message: "Video not found" })
    }

    return res.json({
      success: true,
      video,
    })
  } catch (error) {
    console.error("Get video error:", error)
    return res.status(500).json({ success: false, message: "Failed to get video" })
  }
}

export const updateVideo = async (req, res) => {
  try {
    const userId = req.user._id
    const { id } = req.params
    const updates = req.body

    // Find video
    const video = await Video.findById(id)
    if (!video) {
      return res.status(404).json({ success: false, message: "Video not found" })
    }

    // Check if user is the creator of the video
    if (video.creator.toString() !== userId) {
      return res.status(403).json({ success: false, message: "You are not authorized to update this video" })
    }

    // Update video
    Object.keys(updates).forEach((key) => {
      video[key] = updates[key]
    })

    await video.save()

    return res.json({
      success: true,
      message: "Video updated successfully",
      video,
    })
  } catch (error) {
    console.error("Update video error:", error)
    return res.status(500).json({ success: false, message: "Failed to update video" })
  }
}

export const deleteVideo = async (req, res) => {
  try {
    const userId = req.user._id
    const { id } = req.params

    // Find video
    const video = await Video.findById(id)
    if (!video) {
      return res.status(404).json({ success: false, message: "Video not found" })
    }

    // Check if user is the creator of the video
    if (video.creator.toString() !== userId) {
      return res.status(403).json({ success: false, message: "You are not authorized to delete this video" })
    }

    // Delete video
    await video.remove()

    return res.json({
      success: true,
      message: "Video deleted successfully",
    })
  } catch (error) {
    console.error("Delete video error:", error)
    return res.status(500).json({ success: false, message: "Failed to delete video" })
  }
}

// Add createVideo function to match route handler name
export const createVideo = uploadVideo
