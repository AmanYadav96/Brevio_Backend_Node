import Like from '../models/like.model.js'
import Comment from '../models/comment.model.js'
import { AppError } from '../utils/app-error.js'

// Toggle like (like or unlike)
export const toggleLike = async (c) => {
  try {
    const userId = c.get('user')._id
    const { contentType, contentId } = await c.req.json()
    
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
      
      return c.json({
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
      
      return c.json({
        success: true,
        message: 'Content liked successfully',
        liked: true
      })
    }
  } catch (error) {
    console.error('Toggle like error:', error)
    return c.json({
      success: false,
      message: error.message || 'Failed to toggle like'
    }, error.statusCode || 500)
  }
}

// Get likes for content
export const getLikes = async (c) => {
  try {
    const { contentType, contentId } = c.req.query()
    
    // Validate content type
    if (!['content', 'creatorContent', 'comment'].includes(contentType)) {
      throw new AppError('Invalid content type', 400)
    }
    
    // Count likes
    const likesCount = await Like.countDocuments({
      contentType,
      contentId
    })
    
    // Check if the current user has liked this content
    let userLiked = false
    if (c.get('user')) {
      const userId = c.get('user')._id
      const userLike = await Like.findOne({
        user: userId,
        contentType,
        contentId
      })
      userLiked = !!userLike
    }
    
    return c.json({
      success: true,
      likesCount,
      userLiked
    })
  } catch (error) {
    console.error('Get likes error:', error)
    return c.json({
      success: false,
      message: error.message || 'Failed to get likes'
    }, error.statusCode || 500)
  }
}

// Get user's liked content
export const getUserLikes = async (c) => {
  try {
    const userId = c.get('user')._id
    const { contentType, page = 1, limit = 10 } = c.req.query()
    
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
    
    return c.json({
      success: true,
      likes,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit))
      }
    })
  } catch (error) {
    console.error('Get user likes error:', error)
    return c.json({
      success: false,
      message: error.message || 'Failed to get user likes'
    }, error.statusCode || 500)
  }
}