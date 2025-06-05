import VideoView from "../models/videoView.model.js"
import CreatorContent from "../models/creatorContent.model.js"
import { UserRole } from "../models/user.model.js"
import mongoose from "mongoose"

// Record a view for a video
export const recordView = async (req, res) => {
  try {
    const { contentId } = req.params
    const { viewDuration, completionPercentage } = req.body
    
    // Get user info if authenticated
    const userId = req.user ? req.user._id : null
    
    // Get IP address
    const ipAddress = req.headers['x-forwarded-for'] || 
                      req.connection.remoteAddress ||
                      req.socket.remoteAddress ||
                      req.connection.socket.remoteAddress ||
                      '0.0.0.0'
    
    // Get user agent
    const userAgent = req.headers['user-agent']
    
    // Check if content exists
    const content = await CreatorContent.findById(contentId)
    if (!content) {
      return res.status(404).json({
        success: false,
        message: "Content not found"
      })
    }
    
    // Check if this is a unique view (first view from this IP/user in the last 24 hours)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
    
    const existingView = await VideoView.findOne({
      content: contentId,
      $or: [
        { viewer: userId },
        { ipAddress }
      ],
      viewDate: { $gte: oneDayAgo }
    })
    
    const isUnique = !existingView
    
    // Create view record
    const view = await VideoView.create({
      content: contentId,
      viewer: userId,
      ipAddress,
      userAgent,
      viewDuration: viewDuration || 0,
      completionPercentage: completionPercentage || 0,
      isUnique
    })
    
    // If this is a unique view, increment the view count on the content
    if (isUnique) {
      await CreatorContent.findByIdAndUpdate(contentId, {
        $inc: { views: 1 }
      })
    }
    
    return res.status(201).json({
      success: true,
      message: "View recorded successfully",
      view,
      isUnique
    })
  } catch (error) {
    console.error("Record view error:", error)
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to record view"
    })
  }
}

// Update view duration/completion (for when user watches more of the video)
export const updateView = async (req, res) => {
  try {
    const { viewId } = req.params
    const { viewDuration, completionPercentage } = req.body
    
    // Find and update the view
    const view = await VideoView.findByIdAndUpdate(
      viewId,
      {
        viewDuration: viewDuration || 0,
        completionPercentage: completionPercentage || 0
      },
      { new: true }
    )
    
    if (!view) {
      return res.status(404).json({
        success: false,
        message: "View record not found"
      })
    }
    
    return res.json({
      success: true,
      message: "View updated successfully",
      view
    })
  } catch (error) {
    console.error("Update view error:", error)
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to update view"
    })
  }
}

// Get view count for a specific content
export const getContentViewCount = async (req, res) => {
  try {
    const { contentId } = req.params
    
    // Get content with view count
    const content = await CreatorContent.findById(contentId).select('title views')
    
    if (!content) {
      return res.status(404).json({
        success: false,
        message: "Content not found"
      })
    }
    
    return res.json({
      success: true,
      content: {
        _id: content._id,
        title: content.title,
        views: content.views
      }
    })
  } catch (error) {
    console.error("Get content view count error:", error)
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to get view count"
    })
  }
}

// Get view statistics for a specific content
export const getContentViewStats = async (req, res) => {
  try {
    const { contentId } = req.params
    const { startDate, endDate } = req.query
    
    // Check if content exists
    const content = await CreatorContent.findById(contentId)
    if (!content) {
      return res.status(404).json({
        success: false,
        message: "Content not found"
      })
    }
    
    // Prepare date filter
    const dateFilter = {}
    if (startDate) {
      dateFilter.$gte = new Date(startDate)
    }
    if (endDate) {
      dateFilter.$lte = new Date(endDate)
    }
    
    // Prepare match stage
    const matchStage = {
      content: mongoose.Types.ObjectId(contentId)
    }
    
    if (Object.keys(dateFilter).length > 0) {
      matchStage.viewDate = dateFilter
    }
    
    // Get view statistics
    const viewStats = await VideoView.aggregate([
      { $match: matchStage },
      { $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$viewDate" } },
        totalViews: { $sum: 1 },
        uniqueViews: { $sum: { $cond: ["$isUnique", 1, 0] } },
        avgViewDuration: { $avg: "$viewDuration" },
        avgCompletionPercentage: { $avg: "$completionPercentage" }
      }},
      { $sort: { _id: 1 } }
    ])
    
    // Get total view count
    const totalViews = content.views
    
    return res.json({
      success: true,
      content: {
        _id: content._id,
        title: content.title
      },
      totalViews,
      viewStats
    })
  } catch (error) {
    console.error("Get content view stats error:", error)
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to get view statistics"
    })
  }
}

// Get top viewed content
export const getTopViewedContent = async (req, res) => {
  try {
    const { limit = 10, period } = req.query
    
    // Prepare date filter for specific time periods
    let dateFilter = {}
    const now = new Date()
    
    if (period === 'day') {
      const oneDayAgo = new Date(now.setDate(now.getDate() - 1))
      dateFilter = { createdAt: { $gte: oneDayAgo } }
    } else if (period === 'week') {
      const oneWeekAgo = new Date(now.setDate(now.getDate() - 7))
      dateFilter = { createdAt: { $gte: oneWeekAgo } }
    } else if (period === 'month') {
      const oneMonthAgo = new Date(now.setMonth(now.getMonth() - 1))
      dateFilter = { createdAt: { $gte: oneMonthAgo } }
    }
    
    // Get top viewed content
    const topContent = await CreatorContent.find(dateFilter)
      .sort({ views: -1 })
      .limit(parseInt(limit))
      .select('title description views mediaAssets.thumbnail contentType orientation creator')
      .populate('creator', 'name profilePicture')
    
    return res.json({
      success: true,
      topContent
    })
  } catch (error) {
    console.error("Get top viewed content error:", error)
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to get top viewed content"
    })
  }
}

// Get creator content view statistics (for creator dashboard)
export const getCreatorViewStats = async (req, res) => {
  try {
    const userId = req.user._id
    const { startDate, endDate } = req.query
    
    // Prepare date filter
    const dateFilter = {}
    if (startDate) {
      dateFilter.$gte = new Date(startDate)
    }
    if (endDate) {
      dateFilter.$lte = new Date(endDate)
    }
    
    // Get creator's content
    const creatorContent = await CreatorContent.find({ creator: userId })
      .select('_id title views')
    
    const contentIds = creatorContent.map(content => content._id)
    
    // Prepare match stage
    const matchStage = {
      content: { $in: contentIds.map(id => mongoose.Types.ObjectId(id)) }
    }
    
    if (Object.keys(dateFilter).length > 0) {
      matchStage.viewDate = dateFilter
    }
    
    // Get aggregated view statistics
    const viewStats = await VideoView.aggregate([
      { $match: matchStage },
      { $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$viewDate" } },
        totalViews: { $sum: 1 },
        uniqueViews: { $sum: { $cond: ["$isUnique", 1, 0] } }
      }},
      { $sort: { _id: 1 } }
    ])
    
    // Get total views for each content
    const contentViewStats = await Promise.all(
      creatorContent.map(async (content) => {
        return {
          _id: content._id,
          title: content.title,
          totalViews: content.views
        }
      })
    )
    
    // Calculate total views across all content
    const totalViews = contentViewStats.reduce((sum, content) => sum + content.totalViews, 0)
    
    return res.json({
      success: true,
      totalViews,
      contentViewStats,
      dailyViewStats: viewStats
    })
  } catch (error) {
    console.error("Get creator view stats error:", error)
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to get creator view statistics"
    })
  }
}

// Admin: Get global view statistics
export const getGlobalViewStats = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== UserRole.ADMIN) {
      return res.status(403).json({
        success: false,
        message: "Only admins can access global view statistics"
      })
    }
    
    const { startDate, endDate } = req.query
    
    // Prepare date filter
    const dateFilter = {}
    if (startDate) {
      dateFilter.$gte = new Date(startDate)
    }
    if (endDate) {
      dateFilter.$lte = new Date(endDate)
    }
    
    // Prepare match stage
    const matchStage = {}
    if (Object.keys(dateFilter).length > 0) {
      matchStage.viewDate = dateFilter
    }
    
    // Get global view statistics
    const viewStats = await VideoView.aggregate([
      { $match: matchStage },
      { $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$viewDate" } },
        totalViews: { $sum: 1 },
        uniqueViews: { $sum: { $cond: ["$isUnique", 1, 0] } }
      }},
      { $sort: { _id: 1 } }
    ])
    
    // Get total views across all content
    const totalViewsResult = await CreatorContent.aggregate([
      { $group: {
        _id: null,
        totalViews: { $sum: "$views" }
      }}
    ])
    
    const totalViews = totalViewsResult.length > 0 ? totalViewsResult[0].totalViews : 0
    
    return res.json({
      success: true,
      totalViews,
      viewStats
    })
  } catch (error) {
    console.error("Get global view stats error:", error)
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to get global view statistics"
    })
  }
}