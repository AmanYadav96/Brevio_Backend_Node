import UserBlock from '../models/userBlock.model.js'
import User from '../models/user.model.js'
import mongoose from 'mongoose'

// Block a user
export const blockUser = async (req, res) => {
  try {
    const userId = req.user._id
    const { blockedUserId } = req.body

    // Validate blockedUserId
    if (!blockedUserId || !mongoose.Types.ObjectId.isValid(blockedUserId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID'
      })
    }

    // Check if the blocked user exists
    const blockedUser = await User.findById(blockedUserId)
    if (!blockedUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      })
    }

    // Prevent blocking yourself
    if (userId.toString() === blockedUserId) {
      return res.status(400).json({
        success: false,
        message: 'You cannot block yourself'
      })
    }

    // Create block record (upsert to handle potential duplicates)
    const userBlock = await UserBlock.findOneAndUpdate(
      { user: userId, blockedUser: blockedUserId },
      { user: userId, blockedUser: blockedUserId },
      { upsert: true, new: true }
    )

    return res.status(200).json({
      success: true,
      message: 'User blocked successfully',
      userBlock
    })
  } catch (error) {
    console.error('Block user error:', error)
    
    // Handle duplicate key error (user already blocked)
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'You have already blocked this user'
      })
    }
    
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to block user'
    })
  }
}

// Unblock a user
export const unblockUser = async (req, res) => {
  try {
    const userId = req.user._id
    const { blockedUserId } = req.params

    // Validate blockedUserId
    if (!blockedUserId || !mongoose.Types.ObjectId.isValid(blockedUserId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID'
      })
    }

    // Find and delete the block record
    const result = await UserBlock.findOneAndDelete({
      user: userId,
      blockedUser: blockedUserId
    })

    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'Block record not found'
      })
    }

    return res.status(200).json({
      success: true,
      message: 'User unblocked successfully'
    })
  } catch (error) {
    console.error('Unblock user error:', error)
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to unblock user'
    })
  }
}

// Get all blocked users for the current user
export const getBlockedUsers = async (req, res) => {
  try {
    const userId = req.user._id
    const { page = 1, limit = 10 } = req.query

    const skip = (parseInt(page) - 1) * parseInt(limit)

    const [blockedUsers, total] = await Promise.all([
      UserBlock.find({ user: userId })
        .populate('blockedUser', 'name username profilePicture')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      UserBlock.countDocuments({ user: userId })
    ])

    return res.status(200).json({
      success: true,
      blockedUsers: blockedUsers.map(block => block.blockedUser),
      pagination: {
        total,
        pages: Math.ceil(total / parseInt(limit)),
        page: parseInt(page),
        limit: parseInt(limit)
      }
    })
  } catch (error) {
    console.error('Get blocked users error:', error)
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to get blocked users'
    })
  }
}

// Utility function to get blocked user IDs for a user
export const getBlockedUserIds = async (userId) => {
  try {
    const blocks = await UserBlock.find({ user: userId })
    return blocks.map(block => block.blockedUser)
  } catch (error) {
    console.error('Get blocked user IDs error:', error)
    return []
  }
}