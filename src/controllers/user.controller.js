import User from "../models/user.model.js"
import { AppError } from "../utils/app-error.js"
import mongoose from "mongoose"
import Save from "../models/save.model.js"
import Like from "../models/like.model.js"
import Comment from "../models/comment.model.js"
import ChannelSubscription from "../models/channelSubscription.model.js"
import VideoView from "../models/videoView.model.js"
import Donation from "../models/donation.model.js"
import Report from "../models/report.model.js"

// Get all users (for admin)
export const getAllUsers = async (req, res) => {
  try {
    // Get all query parameters at once
    const { 
      page = 1, 
      limit = 5, 
      search = '', 
      sortBy = 'createdAt', 
      sortOrder = 'desc',
      status,
      subscription: subscriptionStatus,
      startDate,
      endDate 
    } = req.query

    // Build query object once
    const query = {
      role: 'user',
      ...(status && { status }),
      ...(subscriptionStatus && { subscriptionStatus }),
      ...(startDate || endDate) && {
        createdAt: {
          ...(startDate && { $gte: new Date(startDate) }),
          ...(endDate && { $lte: new Date(endDate) })
        }
      },
      ...(search && {
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } }
        ]
      })
    }

    // Execute queries in parallel
    const [users, totalUsers, blockedUsers, subscribedUsers] = await Promise.all([
      User.find(query)
        .select('_id name email role status subscriptionStatus profilePicture createdAt')
        .sort({ [sortBy]: sortOrder })
        .skip((parseInt(page) - 1) * parseInt(limit))
        .limit(parseInt(limit))
        .lean(),
      User.countDocuments(query),
      User.countDocuments({ ...query, status: 'suspended' }),
      User.countDocuments({ ...query, subscriptionStatus: 'active' })
    ])

    const totalPages = Math.ceil(totalUsers / limit)

    return res.json({
      success: true,
      stats: {
        totalUsers,
        totalPages,
        currentPage: parseInt(page),
        blockedUsers,
        subscribedUsers
      },
      users: users.map(({ _id, ...user }) => ({
        id: _id.toString(),
        ...user
      }))
    })
  } catch (error) {
    console.error("Get all users error:", error)
    return res.status(500).json({ success: false, message: "Failed to fetch users" })
  }
}

// Add this new function for user profile update
// Update user profile (for the user themselves)
export const updateUserProfile = async (req, res) => {
  try {
    // Log what we're getting from the context
    console.log("Controller received userId:", req.user._id);
    console.log("Request body:", req.body);
    console.log("Uploads:", req.uploads);
    
    const userId = req.user._id; // Get the authenticated user's ID
    
    if (!userId) {
      console.error("No userId found in context");
      return res.status(401).json({ success: false, message: "User not authenticated" });
    }
    
    // Get the current user to check if role is changing
    const currentUser = await User.findById(userId);
    if (!currentUser) {
      throw new AppError("User not found", 404);
    }
    
    // Get updates from request body
    let updates = req.body;
    
    // Handle file uploads if present
    if (req.uploads) {
      if (req.uploads.profilePicture) {
        updates.profilePicture = req.uploads.profilePicture.url;
      }
      
      if (req.uploads.coverPhoto) {
        updates.coverPhoto = req.uploads.coverPhoto.url;
      }
    }
    
    console.log("Updates to be applied:", updates);
    
    // Update the user
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updates },
      { new: true, runValidators: true }
    );
    
    console.log("User updated successfully:", updatedUser);
    
    return res.json({
      success: true,
      message: "Profile updated successfully",
      user: {
        id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        username: updatedUser.username,
        bio: updatedUser.bio,
        profilePicture: updatedUser.profilePicture,
        coverPhoto: updatedUser.coverPhoto,
        role: updatedUser.role
      }
    });
  } catch (error) {
    console.error("Update user profile error:", error);
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    return res.status(500).json({ success: false, message: "Failed to update profile" });
  }
}

// Get user profile
export const getUserProfile = async (req, res) => {
  try {
    const userId = req.user._id // Get the authenticated user's ID
    
    const user = await User.findById(userId).select('-password')
    if (!user) {
      throw new AppError("User not found", 404)
    }

    return res.json({
      success: true,
      user
    })
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ success: false, message: error.message })
    }
    return res.status(500).json({ success: false, message: "Failed to fetch profile" })
  }
}

// Get single user (for admin)
export const getUser = async (req, res) => {
  try {
    const userId = req.params.id
    
    const user = await User.findById(userId).select('-password')
    if (!user) {
      throw new AppError("User not found", 404)
    }

    return res.json({
      success: true,
      user
    })
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ success: false, message: error.message })
    }
    console.error("Get user error:", error)
    return res.status(500).json({ success: false, message: "Failed to fetch user" })
  }
}

// Update user (for admin)
export const updateUser = async (req, res) => {
  try {
    const userId = req.params.id
    const updates = req.body
    
    // Prevent updating sensitive fields
    delete updates.password
    delete updates.firebaseUid
    delete updates.stripeCustomerId

    const user = await User.findByIdAndUpdate(
      userId,
      updates,
      { new: true, runValidators: true }
    ).select('-password')

    if (!user) {
      throw new AppError("User not found", 404)
    }

    return res.json({
      success: true,
      user
    })
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ success: false, message: error.message })
    }
    console.error("Update user error:", error)
    return res.status(500).json({ success: false, message: "Failed to update user" })
  }
}

// Delete user (for admin)
export const deleteUser = async (req, res) => {
  try {
    const userId = req.params.id
    
    const user = await User.findByIdAndDelete(userId)
    if (!user) {
      throw new AppError("User not found", 404)
    }

    return res.json({
      success: true,
      message: "User deleted successfully"
    })
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ success: false, message: error.message })
    }
    console.error("Delete user error:", error)
    return res.status(500).json({ success: false, message: "Failed to delete user" })
  }
}

// Get user stats (for admin)
export const getUserStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments()
    const creators = await User.countDocuments({ role: 'creator' })
    const viewers = await User.countDocuments({ role: 'viewer' })
    const verifiedUsers = await User.countDocuments({ isEmailVerified: true })

    return res.json({
      success: true,
      stats: {
        totalUsers,
        creators,
        viewers,
        verifiedUsers
      }
    })
  } catch (error) {
    console.error("Get user stats error:", error)
    return res.status(500).json({ success: false, message: "Failed to fetch user statistics" })
  }}

// Delete user account (for the user themselves)
export const deleteUserAccount = async (req, res) => {
  try {
    const userId = req.user._id; // Get the authenticated user's ID
    
    // Start a session for transaction
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
      // Delete user-related data from various collections
      await Promise.all([
        // Delete user's saved content
        Save.deleteMany({ user: userId }, { session }),
        
        // Delete user's likes
        Like.deleteMany({ user: userId }, { session }),
        
        // Delete user's comments
        Comment.deleteMany({ user: userId }, { session }),
        
        // Delete user's channel subscriptions
        ChannelSubscription.deleteMany({ user: userId }, { session }),
        
        // Delete user's video views
        VideoView.deleteMany({ viewer: userId }, { session }),
        
        // Delete user's donations
        Donation.deleteMany({ userId: userId }, { session }),
        
        // Delete user's reports
        Report.deleteMany({ reporterId: userId }, { session }),
      ]);
      
      // Finally, delete the user
      const deletedUser = await User.findByIdAndDelete(userId).session(session);
      
      if (!deletedUser) {
        throw new AppError("User not found", 404);
      }
      
      // Commit the transaction
      await session.commitTransaction();
      session.endSession();
      
      return res.json({
        success: true,
        message: "Your account has been deleted successfully"
      });
    } catch (error) {
      // Abort transaction on error
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    console.error("Delete user account error:", error);
    return res.status(500).json({ success: false, message: "Failed to delete your account" });
  }
};