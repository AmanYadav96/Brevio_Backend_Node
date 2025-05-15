import Comment from '../models/comment.model.js'
import { AppError } from '../utils/app-error.js'

// Create a comment
export const createComment = async (c) => {
  try {
    const userId = c.get('user')._id
    const { contentType, contentId, text, parentComment } = await c.req.json()
    
    // Validate content type
    if (!['content', 'creatorContent'].includes(contentType)) {
      throw new AppError('Invalid content type', 400)
    }
    
    // Validate text
    if (!text || text.trim().length === 0) {
      throw new AppError('Comment text is required', 400)
    }
    
    // If it's a reply, check if parent comment exists
    if (parentComment) {
      const parent = await Comment.findById(parentComment)
      if (!parent) {
        throw new AppError('Parent comment not found', 404)
      }
      
      // Ensure the parent comment is for the same content
      if (parent.contentId.toString() !== contentId || parent.contentType !== contentType) {
        throw new AppError('Invalid parent comment', 400)
      }
      
      // Prevent nested replies (only one level of nesting)
      if (parent.parentComment) {
        throw new AppError('Cannot reply to a reply', 400)
      }
    }
    
    // Create the comment
    const comment = new Comment({
      user: userId,
      contentType,
      contentId,
      text,
      parentComment: parentComment || null
    })
    
    await comment.save()
    
    // Populate user info
    await comment.populate('user', 'name profilePicture')
    
    return c.json({
      success: true,
      message: 'Comment created successfully',
      comment
    }, 201)
  } catch (error) {
    console.error('Create comment error:', error)
    return c.json({
      success: false,
      message: error.message || 'Failed to create comment'
    }, error.statusCode || 500)
  }
}

// Get comments for content
export const getComments = async (c) => {
  try {
    const { contentType, contentId, page = 1, limit = 10 } = c.req.query()
    
    // Validate content type
    if (!['content', 'creatorContent'].includes(contentType)) {
      throw new AppError('Invalid content type', 400)
    }
    
    // Get top-level comments (not replies)
    const comments = await Comment.find({
      contentType,
      contentId,
      parentComment: null,
      status: 'active'
    })
      .sort({ createdAt: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit))
      .populate('user', 'name profilePicture')
      .populate({
        path: 'replies',
        match: { status: 'active' },
        options: { sort: { createdAt: 1 } },
        populate: { path: 'user', select: 'name profilePicture' }
      })
    
    const total = await Comment.countDocuments({
      contentType,
      contentId,
      parentComment: null,
      status: 'active'
    })
    
    return c.json({
      success: true,
      comments,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit))
      }
    })
  } catch (error) {
    console.error('Get comments error:', error)
    return c.json({
      success: false,
      message: error.message || 'Failed to get comments'
    }, error.statusCode || 500)
  }
}

// Update a comment
export const updateComment = async (c) => {
  try {
    const userId = c.get('user')._id
    const commentId = c.req.param('id')
    const { text } = await c.req.json()
    
    // Validate text
    if (!text || text.trim().length === 0) {
      throw new AppError('Comment text is required', 400)
    }
    
    // Find the comment
    const comment = await Comment.findById(commentId)
    if (!comment) {
      throw new AppError('Comment not found', 404)
    }
    
    // Check if user is the comment owner
    if (comment.user.toString() !== userId.toString()) {
      throw new AppError('Not authorized to update this comment', 403)
    }
    
    // Update the comment
    comment.text = text
    await comment.save()
    
    return c.json({
      success: true,
      message: 'Comment updated successfully',
      comment
    })
  } catch (error) {
    console.error('Update comment error:', error)
    return c.json({
      success: false,
      message: error.message || 'Failed to update comment'
    }, error.statusCode || 500)
  }
}

// Delete a comment
export const deleteComment = async (c) => {
  try {
    const userId = c.get('user')._id
    const userRole = c.get('user').role
    const commentId = c.req.param('id')
    
    // Find the comment
    const comment = await Comment.findById(commentId)
    if (!comment) {
      throw new AppError('Comment not found', 404)
    }
    
    // Check if user is the comment owner or an admin
    const isOwner = comment.user.toString() === userId.toString()
    const isAdmin = userRole === 'admin'
    
    if (!isOwner && !isAdmin) {
      throw new AppError('Not authorized to delete this comment', 403)
    }
    
    // Soft delete the comment
    comment.status = 'deleted'
    await comment.save()
    
    return c.json({
      success: true,
      message: 'Comment deleted successfully'
    })
  } catch (error) {
    console.error('Delete comment error:', error)
    return c.json({
      success: false,
      message: error.message || 'Failed to delete comment'
    }, error.statusCode || 500)
  }
}

// Report a comment
export const reportComment = async (c) => {
  try {
    const commentId = c.req.param('id')
    const { reason } = await c.req.json()
    
    // Find the comment
    const comment = await Comment.findById(commentId)
    if (!comment) {
      throw new AppError('Comment not found', 404)
    }
    
    // Increment report count
    comment.reports += 1
    
    // If reports exceed threshold, hide the comment
    if (comment.reports >= 5) {
      comment.status = 'hidden'
    }
    
    await comment.save()
    
    // TODO: Create a report record with the reason
    
    return c.json({
      success: true,
      message: 'Comment reported successfully'
    })
  } catch (error) {
    console.error('Report comment error:', error)
    return c.json({
      success: false,
      message: error.message || 'Failed to report comment'
    }, error.statusCode || 500)
  }
}

// Get user's comments
export const getUserComments = async (c) => {
  try {
    const userId = c.get('user')._id
    const { page = 1, limit = 10 } = c.req.query()
    
    // Get comments
    const comments = await Comment.find({
      user: userId,
      status: 'active'
    })
      .sort({ createdAt: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit))
      .populate('contentId', 'title thumbnail')
    
    const total = await Comment.countDocuments({
      user: userId,
      status: 'active'
    })
    
    return c.json({
      success: true,
      comments,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit))
      }
    })
  } catch (error) {
    console.error('Get user comments error:', error)
    return c.json({
      success: false,
      message: error.message || 'Failed to get user comments'
    }, error.statusCode || 500)
  }
}