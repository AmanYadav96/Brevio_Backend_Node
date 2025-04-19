import Video from "../models/video.model.js"
import User, { UserRole } from "../models/user.model.js"
import { AppError } from "../utils/app-error.js"

export const uploadVideo = async (c) => {
  try {
    const userId = c.get("userId")

    // Check if user is a creator
    const user = await User.findById(userId)
    if (!user || (user.role !== UserRole.CREATOR && user.role !== UserRole.ADMIN)) {
      throw new AppError("Only creators can upload videos", 403)
    }

    const { title, description, videoUrl, thumbnailUrl, duration, isPremium, tags, categories } = await c.req.json()

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

    return c.json({
      success: true,
      message: "Video uploaded successfully",
      video,
    })
  } catch (error) {
    if (error instanceof AppError) {
      return c.json({ success: false, message: error.message }, error.statusCode)
    }
    console.error("Video upload error:", error)
    return c.json({ success: false, message: "Failed to upload video" }, 500)
  }
}

export const publishVideo = async (c) => {
  try {
    const userId = c.get("userId")
    const { videoId } = await c.req.json()

    // Find video
    const video = await Video.findById(videoId)
    if (!video) {
      throw new AppError("Video not found", 404)
    }

    // Check if user is the creator of the video
    if (video.creator.toString() !== userId) {
      throw new AppError("You are not authorized to publish this video", 403)
    }

    // Update video to published
    video.isPublished = true
    await video.save()

    return c.json({
      success: true,
      message: "Video published successfully",
      video,
    })
  } catch (error) {
    if (error instanceof AppError) {
      return c.json({ success: false, message: error.message }, error.statusCode)
    }
    console.error("Video publish error:", error)
    return c.json({ success: false, message: "Failed to publish video" }, 500)
  }
}

export const getVideos = async (c) => {
  try {
    const page = Number.parseInt(c.req.query("page") || "1")
    const limit = Number.parseInt(c.req.query("limit") || "10")
    const skip = (page - 1) * limit

    // Get published videos with pagination
    const videos = await Video.find({ isPublished: true })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("creator", "name profilePicture")

    const total = await Video.countDocuments({ isPublished: true })

    return c.json({
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
    return c.json({ success: false, message: "Failed to fetch videos" }, 500)
  }
}

export const getVideoById = async (c) => {
  try {
    const { id } = c.req.param()

    // Find video and increment views
    const video = await Video.findByIdAndUpdate(id, { $inc: { views: 1 } }, { new: true }).populate(
      "creator",
      "name profilePicture",
    )

    if (!video) {
      throw new AppError("Video not found", 404)
    }

    // Check if video is published
    if (!video.isPublished) {
      const userId = c.get("userId")

      // If not published, only creator or admin can view
      if (!userId || video.creator._id.toString() !== userId) {
        const user = await User.findById(userId)
        if (!user || user.role !== UserRole.ADMIN) {
          throw new AppError("Video is not published", 403)
        }
      }
    }

    return c.json({
      success: true,
      video,
    })
  } catch (error) {
    if (error instanceof AppError) {
      return c.json({ success: false, message: error.message }, error.statusCode)
    }
    console.error("Get video error:", error)
    return c.json({ success: false, message: "Failed to fetch video" }, 500)
  }
}

export const searchVideos = async (c) => {
  try {
    const { query } = c.req.query()
    const page = Number.parseInt(c.req.query("page") || "1")
    const limit = Number.parseInt(c.req.query("limit") || "10")
    const skip = (page - 1) * limit

    if (!query) {
      throw new AppError("Search query is required", 400)
    }

    // Search videos using text index
    const videos = await Video.find(
      {
        $text: { $search: query },
        isPublished: true,
      },
      { score: { $meta: "textScore" } },
    )
      .sort({ score: { $meta: "textScore" } })
      .skip(skip)
      .limit(limit)
      .populate("creator", "name profilePicture")

    const total = await Video.countDocuments({
      $text: { $search: query },
      isPublished: true,
    })

    return c.json({
      success: true,
      videos,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    if (error instanceof AppError) {
      return c.json({ success: false, message: error.message }, error.statusCode)
    }
    console.error("Search videos error:", error)
    return c.json({ success: false, message: "Failed to search videos" }, 500)
  }
}

export const createVideo = async (c) => {
  try {
    const uploads = c.get('uploads')
    const body = await c.req.json()

    if (uploads.thumbnail) {
      body.thumbnail = uploads.thumbnail
    }
    if (uploads.videoFile) {
      body.videoUrl = uploads.videoFile
    }

    const video = await Video.create(body)
    return c.json({ success: true, video }, 201)
  } catch (error) {
    console.error("Create video error:", error)
    return c.json({ success: false, message: "Failed to create video" }, 500)
  }
}

export const getAllVideos = async (c) => {
  try {
    const page = parseInt(c.req.query('page')) || 1
    const limit = 10
    const skip = (page - 1) * limit
    const search = c.req.query('search') || ''
    const channel = c.req.query('channel')

    const query = { isActive: true }
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ]
    }
    if (channel) query.channel = channel

    const [videos, total] = await Promise.all([
      Video.find(query)
        .populate('channel', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Video.countDocuments(query)
    ])

    return c.json({
      success: true,
      videos,
      pagination: {
        total,
        pages: Math.ceil(total / limit),
        page,
        limit
      }
    })
  } catch (error) {
    console.error("Get videos error:", error)
    return c.json({ success: false, message: "Failed to fetch videos" }, 500)
  }
}

export const getVideo = async (c) => {
  try {
    const video = await Video.findById(c.req.param("id"))
      .populate('channel', 'name')
      .lean()

    if (!video || !video.isActive) {
      return c.json({ success: false, message: "Video not found" }, 404)
    }

    // Increment views
    await Video.findByIdAndUpdate(video._id, { $inc: { views: 1 } })

    return c.json({ success: true, video })
  } catch (error) {
    console.error("Get video error:", error)
    return c.json({ success: false, message: "Failed to fetch video" }, 500)
  }
}

export const updateVideo = async (c) => {
  try {
    const uploads = c.get('uploads')
    const body = await c.req.json()

    if (uploads.thumbnail) {
      body.thumbnail = uploads.thumbnail
    }
    if (uploads.videoFile) {
      body.videoUrl = uploads.videoFile
    }

    const video = await Video.findByIdAndUpdate(
      c.req.param("id"),
      { $set: body },
      { new: true, runValidators: true }
    ).populate('channel', 'name')

    if (!video) {
      return c.json({ success: false, message: "Video not found" }, 404)
    }
    return c.json({ success: true, video })
  } catch (error) {
    console.error("Update video error:", error)
    return c.json({ success: false, message: "Failed to update video" }, 500)
  }
}

export const deleteVideo = async (c) => {
  try {
    const video = await Video.findByIdAndUpdate(
      c.req.param("id"),
      { isActive: false },
      { new: true }
    )
    if (!video) {
      return c.json({ success: false, message: "Video not found" }, 404)
    }
    return c.json({ success: true, message: "Video deleted successfully" })
  } catch (error) {
    console.error("Delete video error:", error)
    return c.json({ success: false, message: "Failed to delete video" }, 500)
  }
}
