import Like from '../models/like.model.js'
import Comment from '../models/comment.model.js'
import User from '../models/user.model.js'
import { AppError } from '../utils/app-error.js'

// Toggle like (like or unlike)
export const toggleLike = async (req, res) => {
  try {
    const userId = req.user._id
    const { contentType, contentId } = req.body
    
    // Validate content type
    if (!['content', 'creatorContent', 'comment'].includes(contentType)) {
      throw new AppError('Invalid content type', 400)
    }
    
    // Check if like already exists
    const existingLike = await Like.findOne({
      user: userId,
      contentType,
      contentId
    })
    
    if (existingLike) {
      // Unlike: Remove the like
      await Like.findByIdAndDelete(existingLike._id)
      
      // If it's a comment, decrement the likes count
      if (contentType === 'comment') {
        await Comment.findByIdAndUpdate(contentId, { $inc: { likes: -1 } })
      }
      
      return res.json({
        success: true,
        message: 'Content unliked successfully',
        liked: false
      })
    } else {
      // Like: Create a new like
      const newLike = new Like({
        user: userId,
        contentType,
        contentId
      })
      
      await newLike.save()
      
      // If it's a comment, increment the likes count
      if (contentType === 'comment') {
        await Comment.findByIdAndUpdate(contentId, { $inc: { likes: 1 } })
      }
      
      return res.json({
        success: true,
        message: 'Content liked successfully',
        liked: true
      })
    }
  } catch (error) {
    console.error('Toggle like error:', error)
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to toggle like'
    })
  }
}

// Get likes for content
// Get likes for content
export const getLikes = async (req, res) => {
  try {
    const { contentType, contentId, userId } = req.query
    
    // Validate content type
    if (!['content', 'creatorContent', 'comment'].includes(contentType)) {
      throw new AppError('Invalid content type', 400)
    }
    
    // Count likes
    const likesCount = await Like.countDocuments({
      contentType,
      contentId
    })
    
    // Check if the specified user has liked this content
    let userLiked = false
    
    // Only check if userId is valid and not 'undefined'
    if (userId && userId !== 'undefined') {
      const userLike = await Like.findOne({
        user: userId,
        contentType,
        contentId
      })
      userLiked = !!userLike
    } else if (req.user) {
      // Fall back to authenticated user if available
      const userLike = await Like.findOne({
        user: req.user._id,
        contentType,
        contentId
      })
      userLiked = !!userLike
    }
    
    return res.json({
      success: true,
      likesCount,
      userLiked
    })
  } catch (error) {
    console.error('Get likes error:', error)
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to get likes'
    })
  }
}

// Get user's liked content
// Get user likes
export const getUserLikes = async (req, res) => {
  try {
    const userId = req.user._id
    const { contentType, page = 1, limit = 10 } = req.query
    
    // Build query
    const query = { user: userId }
    if (contentType) {
      if (!['content', 'creatorContent', 'comment'].includes(contentType)) {
        throw new AppError('Invalid content type', 400)
      }
      query.contentType = contentType
    }
    
    // Get likes with pagination
    const likes = await Like.find(query)
      .sort({ createdAt: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit))
      .populate({
        path: 'contentId',
        select: 'title description thumbnail'
      })
    
    const total = await Like.countDocuments(query)
    
    return res.json({
      success: true,
      likes,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    })
  } catch (error) {
    console.error('Get user likes error:', error)
    return res.status(500).json({
      success: false,
      message: error.message
    })
  }
}

// Get users who liked specific content with their emails
export const getUsersWhoLikedContent = async (req, res) => {
  try {
    const { contentId } = req.params
    const { contentType = 'creatorContent' } = req.query
    
    // Validate content type
    if (!['content', 'creatorContent', 'comment'].includes(contentType)) {
      throw new AppError('Invalid content type', 400)
    }
    
    // Get all likes for this content and populate user data
    const likes = await Like.find({
      contentType,
      contentId
    }).populate('user', 'name email username createdAt')
    
    // Extract user information with emails
    const usersWhoLiked = likes.map(like => ({
      userId: like.user._id,
      name: like.user.name,
      email: like.user.email,
      username: like.user.username,
      likedAt: like.createdAt,
      userCreatedAt: like.user.createdAt
    }))
    
    // Get total count
    const totalLikes = likes.length
    
    return res.json({
      success: true,
      contentId,
      contentType,
      totalLikes,
      users: usersWhoLiked
    })
  } catch (error) {
    console.error('Get users who liked content error:', error)
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to get users who liked content'
    })
  }
}