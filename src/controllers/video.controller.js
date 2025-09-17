import Video from "../models/video.model.js"
import User, { UserRole } from "../models/user.model.js"
import Channel from "../models/channel.model.js"
import Genre from "../models/genre.model.js"
import Like from "../models/like.model.js"
import Comment from "../models/comment.model.js"
import VideoView from "../models/videoView.model.js"
import { AppError } from "../utils/app-error.js"
import mongoose from "mongoose"

// Create new video
export const createVideo = async (req, res) => {
  try {
    const userId = req.user._id
    const { 
      title, 
      description, 
      contentType, 
      thumbnail, 
      videoUrl, 
      duration, 
      channelId, 
      ageRating, 
      genreId, 
      cast, 
      crew, 
      mediaAssets 
    } = req.body

    // Validate required fields
    if (!title || !description || !contentType || !thumbnail || !videoUrl || !channelId || !ageRating || !genreId) {
      return res.status(400).json({ 
        success: false, 
        message: "Title, description, content type, thumbnail, video URL, channel, age rating, and genre are required" 
      })
    }

    // Check if channel exists and user owns it (or is admin)
    const channel = await Channel.findById(channelId)
    if (!channel) {
      return res.status(404).json({ success: false, message: "Channel not found" })
    }

    // Allow admin users to upload to any channel
    if (channel.owner.toString() !== userId.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: "You can only upload videos to your own channel" 
      })
    }

    // Validate cast members if provided
    if (cast && Array.isArray(cast)) {
      for (const member of cast) {
        if (!member.name || !member.roleType) {
          return res.status(400).json({ 
            success: false, 
            message: "Cast member name and role type are required" 
          })
        }
      }
    }

    // Validate crew members if provided
    if (crew && Array.isArray(crew)) {
      for (const member of crew) {
        if (!member.name || !member.roleType) {
          return res.status(400).json({ 
            success: false, 
            message: "Crew member name and role type are required" 
          })
        }
      }
    }

    // Validate genre if provided
    if (genreId) {
      const genre = await Genre.findById(genreId)
      if (!genre || !genre.isActive) {
        return res.status(404).json({ success: false, message: "Genre not found" })
      }
    }

    // Create new video
    const video = await Video.create({
      title: title.trim(),
      description: description.trim(),
      contentType,
      thumbnail,
      videoUrl,
      duration: duration || 0,
      channel: channelId,
      ageRating,
      genre: genreId,
      cast: cast || [],
      crew: crew || [],
      mediaAssets: mediaAssets || {},
      status: "processing"
    })

    // Populate channel and genre info
    await video.populate([
      { path: 'channel', select: 'name description' },
      { path: 'genre', select: 'name description' }
    ])

    return res.status(201).json({
      success: true,
      message: "Video created successfully",
      video
    })
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ success: false, message: error.message })
    }
    console.error("Create video error:", error)
    return res.status(500).json({ success: false, message: "Failed to create video" })
  }
}

// Get user's videos (for dashboard)
export const getUserVideos = async (req, res) => {
  try {
    const userId = req.user._id
    const {
      page = 1,
      limit = 10,
      status,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query

    // Find user's channels
    const userChannels = await Channel.find({ owner: userId }).select('_id')
    const channelIds = userChannels.map(channel => channel._id)

    if (channelIds.length === 0) {
      return res.json({
        success: true,
        videos: [],
        pagination: {
          total: 0,
          page: parseInt(page),
          pages: 0,
          hasNext: false,
          hasPrev: false
        }
      })
    }

    const query = {
      channel: { $in: channelIds },
      isActive: true,
      ...(status && { status })
    }

    const [videos, totalVideos] = await Promise.all([
      Video.find(query)
        .populate('channel', 'name description')
        .populate('genre', 'name description')
        .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
        .skip((parseInt(page) - 1) * parseInt(limit))
        .limit(parseInt(limit))
        .lean(),
      Video.countDocuments(query)
    ])

    // Add stats for each video
    const videosWithStats = await Promise.all(
      videos.map(async (video) => {
        const [likesCount, commentsCount, viewsCount] = await Promise.all([
          Like.countDocuments({ 
            contentType: 'video', 
            contentId: video._id, 
            status: 'active' 
          }),
          Comment.countDocuments({ 
            contentType: 'video', 
            contentId: video._id, 
            status: 'active' 
          }),
          VideoView.countDocuments({ video: video._id })
        ])

        return {
          ...video,
          likesCount,
          commentsCount,
          viewsCount
        }
      })
    )

    const totalPages = Math.ceil(totalVideos / limit)

    return res.json({
      success: true,
      videos: videosWithStats,
      pagination: {
        total: totalVideos,
        page: parseInt(page),
        pages: totalPages,
        hasNext: parseInt(page) < totalPages,
        hasPrev: parseInt(page) > 1
      }
    })
  } catch (error) {
    console.error("Get user videos error:", error)
    return res.status(500).json({ success: false, message: "Failed to get user videos" })
  }
}

// Get all videos with pagination, search, and filtering
export const getAllVideos = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      status,
      channelId,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      startDate,
      endDate
    } = req.query

    // Build query object
    const query = {
      isActive: true,
      ...(status && { status }),
      ...(channelId && { channel: channelId }),
      ...(startDate || endDate) && {
        createdAt: {
          ...(startDate && { $gte: new Date(startDate) }),
          ...(endDate && { $lte: new Date(endDate) })
        }
      },
      ...(search && {
        $or: [
          { title: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } }
        ]
      })
    }

    // Execute queries in parallel
    const [videos, totalVideos] = await Promise.all([
      Video.find(query)
        .populate('channel', 'name description owner')
        .populate({
          path: 'channel',
          populate: {
            path: 'owner',
            select: 'name profilePicture'
          }
        })
        .populate('genre', 'name description')
        .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
        .skip((parseInt(page) - 1) * parseInt(limit))
        .limit(parseInt(limit))
        .lean(),
      Video.countDocuments(query)
    ])

    // Add additional data for each video
    const videosWithStats = await Promise.all(
      videos.map(async (video) => {
        const [likesCount, commentsCount] = await Promise.all([
          Like.countDocuments({ 
            contentType: 'video', 
            contentId: video._id, 
            status: 'active' 
          }),
          Comment.countDocuments({ 
            contentType: 'video', 
            contentId: video._id, 
            status: 'active' 
          })
        ])

        return {
          ...video,
          likesCount,
          commentsCount
        }
      })
    )

    const totalPages = Math.ceil(totalVideos / limit)

    return res.json({
      success: true,
      videos: videosWithStats,
      pagination: {
        total: totalVideos,
        page: parseInt(page),
        pages: totalPages,
        hasNext: parseInt(page) < totalPages,
        hasPrev: parseInt(page) > 1
      }
    })
  } catch (error) {
    console.error("Get all videos error:", error)
    return res.status(500).json({ success: false, message: "Failed to get videos" })
  }
}

// Get single video by ID with full details
export const getVideo = async (req, res) => {
  try {
    const { id } = req.params
    const userId = req.user?._id

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid video ID" })
    }

    const video = await Video.findOne({ _id: id, isActive: true })
      .populate('channel', 'name description owner')
      .populate({
        path: 'channel',
        populate: {
          path: 'owner',
          select: 'name profilePicture email'
        }
      })
      .populate('genre', 'name description')
      .lean()

    if (!video) {
      return res.status(404).json({ success: false, message: "Video not found" })
    }

    // Get additional stats and user interactions
    const [likesCount, commentsCount, viewsCount, userLiked, userViewed] = await Promise.all([
      Like.countDocuments({ 
        contentType: 'video', 
        contentId: id, 
        status: 'active' 
      }),
      Comment.countDocuments({ 
        contentType: 'video', 
        contentId: id, 
        status: 'active' 
      }),
      VideoView.countDocuments({ video: id }),
      userId ? Like.findOne({ 
        contentType: 'video', 
        contentId: id, 
        user: userId, 
        status: 'active' 
      }) : null,
      userId ? VideoView.findOne({ 
        video: id, 
        user: userId 
      }) : null
    ])

    // Increment view count if user hasn't viewed before
    if (userId && !userViewed) {
      await Promise.all([
        VideoView.create({ video: id, user: userId }),
        Video.findByIdAndUpdate(id, { $inc: { views: 1 } })
      ])
    }

    return res.json({
      success: true,
      video: {
        ...video,
        likesCount,
        commentsCount,
        viewsCount,
        userLiked: !!userLiked,
        userViewed: !!userViewed
      }
    })
  } catch (error) {
    console.error("Get video error:", error)
    return res.status(500).json({ success: false, message: "Failed to get video" })
  }
}

// Update video
export const updateVideo = async (req, res) => {
  try {
    const userId = req.user._id
    const { id } = req.params
    const updates = req.body

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid video ID" })
    }

    // Find video with channel info
    const video = await Video.findOne({ _id: id, isActive: true })
      .populate('channel', 'owner')

    if (!video) {
      return res.status(404).json({ success: false, message: "Video not found" })
    }

    // Check if user owns the channel (or is admin)
    if (video.channel.owner.toString() !== userId.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: "You are not authorized to update this video" 
      })
    }

    // Filter allowed updates
    const allowedUpdates = ['title', 'description', 'contentType', 'thumbnail', 'ageRating', 'genre', 'cast', 'crew', 'mediaAssets', 'status']
    const filteredUpdates = {}
    
    allowedUpdates.forEach(key => {
      if (updates[key] !== undefined) {
        if (key === 'title' || key === 'description') {
          filteredUpdates[key] = updates[key].trim()
        } else if (key === 'cast' && Array.isArray(updates[key])) {
          // Validate cast members
          for (const member of updates[key]) {
            if (!member.name || !member.roleType) {
              return res.status(400).json({ 
                success: false, 
                message: "Cast member name and role type are required" 
              })
            }
          }
          filteredUpdates[key] = updates[key]
        } else if (key === 'crew' && Array.isArray(updates[key])) {
          // Validate crew members
          for (const member of updates[key]) {
            if (!member.name || !member.roleType) {
              return res.status(400).json({ 
                success: false, 
                message: "Crew member name and role type are required" 
              })
            }
          }
          filteredUpdates[key] = updates[key]
        } else {
          filteredUpdates[key] = updates[key]
        }
      }
    })

    // Validate required fields if provided
    if (filteredUpdates.title && !filteredUpdates.title) {
      return res.status(400).json({ success: false, message: "Title cannot be empty" })
    }
    if (filteredUpdates.description && !filteredUpdates.description) {
      return res.status(400).json({ success: false, message: "Description cannot be empty" })
    }

    // Validate genre if provided
    if (filteredUpdates.genre) {
      const genre = await Genre.findById(filteredUpdates.genre)
      if (!genre || !genre.isActive) {
        return res.status(404).json({ success: false, message: "Genre not found" })
      }
    }

    // Update video
    const updatedVideo = await Video.findByIdAndUpdate(
      id,
      { ...filteredUpdates, updatedAt: new Date() },
      { new: true, runValidators: true }
    ).populate('channel', 'name description owner')
     .populate({
       path: 'channel',
       populate: {
         path: 'owner',
         select: 'name profilePicture'
       }
     })
     .populate('genre', 'name description')

    return res.json({
      success: true,
      message: "Video updated successfully",
      video: updatedVideo
    })
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        success: false, 
        message: Object.values(error.errors)[0].message 
      })
    }
    console.error("Update video error:", error)
    return res.status(500).json({ success: false, message: "Failed to update video" })
  }
}

// Delete video (soft delete)
export const deleteVideo = async (req, res) => {
  try {
    const userId = req.user._id
    const { id } = req.params

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid video ID" })
    }

    // Find video with channel info
    const video = await Video.findOne({ _id: id, isActive: true })
      .populate('channel', 'owner')

    if (!video) {
      return res.status(404).json({ success: false, message: "Video not found" })
    }

    // Check if user owns the channel (or is admin)
    if (video.channel.owner.toString() !== userId.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: "You are not authorized to delete this video" 
      })
    }

    // Soft delete video
    await Video.findByIdAndUpdate(id, { 
      isActive: false, 
      deletedAt: new Date() 
    })

    return res.json({
      success: true,
      message: "Video deleted successfully"
    })
  } catch (error) {
    console.error("Delete video error:", error)
    return res.status(500).json({ success: false, message: "Failed to delete video" })
  }
}

// Get videos by channel
export const getVideosByChannel = async (req, res) => {
  try {
    const { channelId } = req.params
    const {
      page = 1,
      limit = 10,
      status = 'published',
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(channelId)) {
      return res.status(400).json({ success: false, message: "Invalid channel ID" })
    }

    // Check if channel exists
    const channel = await Channel.findById(channelId)
    if (!channel) {
      return res.status(404).json({ success: false, message: "Channel not found" })
    }

    const query = {
      channel: channelId,
      isActive: true,
      ...(status && { status })
    }

    const [videos, totalVideos] = await Promise.all([
      Video.find(query)
        .populate('channel', 'name description')
        .populate('genre', 'name description')
        .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
        .skip((parseInt(page) - 1) * parseInt(limit))
        .limit(parseInt(limit))
        .lean(),
      Video.countDocuments(query)
    ])

    // Add stats for each video
    const videosWithStats = await Promise.all(
      videos.map(async (video) => {
        const [likesCount, commentsCount] = await Promise.all([
          Like.countDocuments({ 
            contentType: 'video', 
            contentId: video._id, 
            status: 'active' 
          }),
          Comment.countDocuments({ 
            contentType: 'video', 
            contentId: video._id, 
            status: 'active' 
          })
        ])

        return {
          ...video,
          likesCount,
          commentsCount
        }
      })
    )

    const totalPages = Math.ceil(totalVideos / limit)

    return res.json({
      success: true,
      channel: {
        id: channel._id,
        name: channel.name,
        description: channel.description
      },
      videos: videosWithStats,
      pagination: {
        total: totalVideos,
        page: parseInt(page),
        pages: totalPages,
        hasNext: parseInt(page) < totalPages,
        hasPrev: parseInt(page) > 1
      }
    })
  } catch (error) {
    console.error("Get videos by channel error:", error)
    return res.status(500).json({ success: false, message: "Failed to get channel videos" })
  }
}

// Get video statistics
export const getVideoStats = async (req, res) => {
  try {
    const { id } = req.params
    const userId = req.user._id

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid video ID" })
    }

    // Find video and check ownership
    const video = await Video.findOne({ _id: id, isActive: true })
      .populate('channel', 'owner')

    if (!video) {
      return res.status(404).json({ success: false, message: "Video not found" })
    }

    // Check if user owns the channel (or is admin)
    if (video.channel.owner.toString() !== userId.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: "You are not authorized to view these statistics" 
      })
    }

    // Get comprehensive stats
    const [likesCount, commentsCount, viewsCount, totalViews] = await Promise.all([
      Like.countDocuments({ 
        contentType: 'video', 
        contentId: id, 
        status: 'active' 
      }),
      Comment.countDocuments({ 
        contentType: 'video', 
        contentId: id, 
        status: 'active' 
      }),
      VideoView.countDocuments({ video: id }),
      VideoView.find({ video: id }).lean()
    ])

    // Calculate engagement rate
    const engagementRate = viewsCount > 0 ? ((likesCount + commentsCount) / viewsCount * 100).toFixed(2) : 0

    return res.json({
      success: true,
      stats: {
        videoId: id,
        title: video.title,
        status: video.status,
        createdAt: video.createdAt,
        likesCount,
        commentsCount,
        viewsCount,
        engagementRate: parseFloat(engagementRate),
        duration: video.duration
      }
    })
  } catch (error) {
    console.error("Get video stats error:", error)
    return res.status(500).json({ success: false, message: "Failed to get video statistics" })
  }
}

// Toggle video status (publish/unpublish)
export const toggleVideoStatus = async (req, res) => {
  try {
    const userId = req.user._id
    const { id } = req.params

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid video ID" })
    }

    // Find video with channel info
    const video = await Video.findOne({ _id: id, isActive: true })
      .populate('channel', 'owner')

    if (!video) {
      return res.status(404).json({ success: false, message: "Video not found" })
    }

    // Check if user owns the channel (or is admin)
    if (video.channel.owner.toString() !== userId.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: "You are not authorized to modify this video" 
      })
    }

    // Toggle status
    const newStatus = video.status === 'published' ? 'processing' : 'published'
    
    const updatedVideo = await Video.findByIdAndUpdate(
      id,
      { status: newStatus, updatedAt: new Date() },
      { new: true }
    ).populate('channel', 'name description')

    return res.json({
      success: true,
      message: `Video ${newStatus === 'published' ? 'published' : 'unpublished'} successfully`,
      video: updatedVideo
    })
  } catch (error) {
    console.error("Toggle video status error:", error)
    return res.status(500).json({ success: false, message: "Failed to toggle video status" })
  }
}

// Search videos with advanced filtering
export const searchVideos = async (req, res) => {
  try {
    const {
      q: searchQuery = '',
      page = 1,
      limit = 10,
      status = 'published',
      sortBy = 'relevance',
      sortOrder = 'desc',
      minDuration,
      maxDuration,
      channelId
    } = req.query

    // Build search query
    const query = {
      isActive: true,
      status,
      ...(channelId && { channel: channelId }),
      ...(minDuration && { duration: { $gte: parseInt(minDuration) } }),
      ...(maxDuration && { 
        duration: { 
          ...query.duration,
          $lte: parseInt(maxDuration) 
        } 
      })
    }

    // Add text search if query provided
    if (searchQuery.trim()) {
      query.$or = [
        { title: { $regex: searchQuery, $options: 'i' } },
        { description: { $regex: searchQuery, $options: 'i' } }
      ]
    }

    // Determine sort criteria
    let sortCriteria = {}
    if (sortBy === 'relevance' && searchQuery.trim()) {
      // For relevance, we'll sort by a combination of factors
      sortCriteria = { views: -1, createdAt: -1 }
    } else if (sortBy === 'views') {
      sortCriteria = { views: sortOrder === 'desc' ? -1 : 1 }
    } else if (sortBy === 'duration') {
      sortCriteria = { duration: sortOrder === 'desc' ? -1 : 1 }
    } else {
      sortCriteria = { [sortBy]: sortOrder === 'desc' ? -1 : 1 }
    }

    const [videos, totalVideos] = await Promise.all([
      Video.find(query)
        .populate('channel', 'name description owner')
        .populate({
          path: 'channel',
          populate: {
            path: 'owner',
            select: 'name profilePicture'
          }
        })
        .populate('genre', 'name description')
        .sort(sortCriteria)
        .skip((parseInt(page) - 1) * parseInt(limit))
        .limit(parseInt(limit))
        .lean(),
      Video.countDocuments(query)
    ])

    // Add stats for each video
    const videosWithStats = await Promise.all(
      videos.map(async (video) => {
        const [likesCount, commentsCount] = await Promise.all([
          Like.countDocuments({ 
            contentType: 'video', 
            contentId: video._id, 
            status: 'active' 
          }),
          Comment.countDocuments({ 
            contentType: 'video', 
            contentId: video._id, 
            status: 'active' 
          })
        ])

        return {
          ...video,
          likesCount,
          commentsCount
        }
      })
    )

    const totalPages = Math.ceil(totalVideos / limit)

    return res.json({
      success: true,
      searchQuery,
      videos: videosWithStats,
      pagination: {
        total: totalVideos,
        page: parseInt(page),
        pages: totalPages,
        hasNext: parseInt(page) < totalPages,
        hasPrev: parseInt(page) > 1
      }
    })
  } catch (error) {
    console.error("Search videos error:", error)
    return res.status(500).json({ success: false, message: "Failed to search videos" })
  }
}

// Step 1: Create video with basic information
export const createVideoBasic = async (req, res) => {
  try {
    const userId = req.user._id
    const { 
      title, 
      description, 
      contentType, 
      channelId, 
      ageRating, 
      genreId, 
      cast, 
      crew 
    } = req.body

    // Validate required fields
    if (!title || !description || !contentType || !channelId || !ageRating || !genreId) {
      return res.status(400).json({ 
        success: false, 
        message: "Title, description, content type, channel, age rating, and genre are required" 
      })
    }

    // Check if channel exists and user owns it (or is admin)
    const channel = await Channel.findById(channelId)
    if (!channel) {
      return res.status(404).json({ success: false, message: "Channel not found" })
    }

    // Allow admin users to upload to any channel
    if (channel.owner.toString() !== userId.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: "You can only upload videos to your own channel" 
      })
    }

    // Check if genre exists
    const genre = await Genre.findById(genreId)
    if (!genre) {
      return res.status(404).json({ success: false, message: "Genre not found" })
    }

    // Create video with basic information
    const videoData = {
      title,
      description,
      contentType,
      thumbnail: '', // Will be uploaded later
      videoUrl: '', // Will be uploaded later
      duration: 0,
      channel: channelId,
      ageRating,
      genre: genreId,
      cast: cast || [],
      crew: crew || [],
      mediaAssets: {
        verticalBanner: '',
        horizontalBanner: '',
        trailer: ''
      },
      status: 'processing' // Start as processing until video is uploaded
    }

    const video = await Video.create(videoData)
    await video.populate('channel genre')

    return res.status(201).json({
      success: true,
      video,
      message: "Video draft created successfully. Please upload video file and media assets."
    })
  } catch (error) {
    console.error("Create basic video error:", error)
    return res.status(500).json({ 
      success: false, 
      message: error.message 
    })
  }
}

// Step 2: Upload main video file
export const uploadMainVideo = async (req, res) => {
  let videoToRollback = null
  
  try {
    const uploads = req.uploads || {}
    const body = req.body
    const user = req.user
    const fileUploads = req.fileUploads || []
    const { videoId } = req.params
    
    console.log('Uploads object:', uploads)
    console.log('Body object:', body)
    
    // Find video and verify ownership
    const video = await Video.findById(videoId).populate('channel')
    
    if (!video) {
      return res.status(404).json({
        success: false,
        message: "Video not found"
      })
    }
    
    // Store video reference for potential rollback
    videoToRollback = video
    
    // Check if user owns the channel (or is admin)
    if (video.channel.owner.toString() !== user._id.toString() && user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to modify this video"
      })
    }
    
    // Check if video upload failed (uploads object will be empty or missing videoFile)
    if (!uploads.videoFile) {
      // If this is a video without videoUrl, it means video upload failed
      // Delete the video to rollback the basic data creation
      if (video.status === 'processing' && !video.videoUrl) {
        console.log('Video upload failed, rolling back video creation:', videoId)
        await Video.findByIdAndDelete(videoId)
        
        return res.status(500).json({
          success: false,
          message: "Video upload failed. Video has been removed. Please try creating the video again."
        })
      }
      
      return res.status(400).json({
        success: false,
        message: "No video file provided"
      })
    }
    
    // Update video with video URL and duration
    video.videoUrl = uploads.videoFile.url.trim()
    video.duration = uploads.videoFile.duration || video.duration || 0
    
    // Update thumbnail if provided
    if (uploads.thumbnail) {
      video.thumbnail = uploads.thumbnail.url.trim()
    }
    
    // Update status if all required fields are present
    if (video.title && video.description && video.videoUrl && video.thumbnail) {
      video.status = 'published'
    }
    
    await video.save()
    
    return res.json({
      success: true,
      video,
      fileUploads,
      message: "Video uploaded successfully"
    })
  } catch (error) {
    console.error("Upload main video error:", error)
    
    // Rollback: Delete video if it was created and video upload failed
    if (videoToRollback && videoToRollback.status === 'processing' && !videoToRollback.videoUrl) {
      try {
        console.log('Rolling back video creation due to error:', videoToRollback._id)
        await Video.findByIdAndDelete(videoToRollback._id)
        
        return res.status(500).json({
          success: false,
          message: "Video upload failed. Video has been removed. Please try creating the video again."
        })
      } catch (rollbackError) {
        console.error('Error during rollback:', rollbackError)
        return res.status(500).json({
          success: false,
          message: "Video upload failed and rollback failed. Please contact support."
        })
      }
    }
    
    return res.status(500).json({
      success: false,
      message: error.message
    })
  }
}

// Step 3: Upload media assets
export const uploadVideoMediaAssets = async (req, res) => {
  try {
    const user = req.user
    const uploads = req.uploads || {}
    const fileUploads = req.fileUploads || []
    const { videoId } = req.params
    
    // Find video and verify ownership
    const video = await Video.findById(videoId).populate('channel')
    
    if (!video) {
      return res.status(404).json({ 
        success: false, 
        message: "Video not found" 
      })
    }
    
    // Check if user owns the channel (or is admin)
    if (video.channel.owner.toString() !== user._id.toString() && user.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: "You don't have permission to modify this video" 
      })
    }
    
    // Update media assets
    video.mediaAssets = {
      verticalBanner: uploads.verticalBanner?.url || video.mediaAssets?.verticalBanner || '',
      horizontalBanner: uploads.horizontalBanner?.url || video.mediaAssets?.horizontalBanner || '',
      trailer: uploads.trailer?.url || video.mediaAssets?.trailer || ''
    }
    
    // Update thumbnail if provided
    if (uploads.thumbnail) {
      video.thumbnail = uploads.thumbnail.url.trim()
    }
    
    // Update status if this completes the video
    if (video.status === 'processing' && video.videoUrl && video.thumbnail) {
      video.status = 'published'
    }
    
    await video.save()
    
    return res.json({ 
      success: true, 
      video,
      fileUploads,
      message: "Media assets uploaded successfully"
    })
  } catch (error) {
    console.error("Upload video media assets error:", error)
    return res.status(500).json({ 
      success: false, 
      message: error.message 
    })
  }
}
