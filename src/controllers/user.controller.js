import User, { UserRole, UserStatus } from "../models/user.model.js"
import { AppError } from "../utils/app-error.js"
import mongoose from "mongoose"
import Save from "../models/save.model.js"
import Like from "../models/like.model.js"
import Comment from "../models/comment.model.js"
import ChannelSubscription from "../models/channelSubscription.model.js"
import VideoView from "../models/videoView.model.js"
import Donation from "../models/donation.model.js"
import Report from "../models/report.model.js"
import EmailService from "../services/email.service.js"
// Add this import at the top of the file
import { isIpFromSpain } from "../utils/geolocation.js"

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
    
    // In updateUserProfile function where you check geolocation
    console.log('All request headers:', req.headers);
    // Check if role is being changed to CREATOR and verify geolocation
    if (updates.role === UserRole.CREATOR && currentUser.role !== UserRole.CREATOR) {
    // Get IP address from request - try multiple sources with more detailed logging
    const forwardedIp = req.headers['x-forwarded-for'] ? req.headers['x-forwarded-for'].split(',')[0].trim() : undefined;
    const realIp = req.headers['x-real-ip'];
    const socketIp = req.connection.remoteAddress;
    const expressIp = req.ip;
    
    // Use the first available IP in this priority order
    const ip = forwardedIp || realIp || socketIp || expressIp;
    
    console.log('Original IP headers:', {
      'x-forwarded-for': req.headers['x-forwarded-for'],
      'x-real-ip': req.headers['x-real-ip'],
      'remoteAddress': req.connection.remoteAddress,
      'req.ip': req.ip
    });
    
    console.log("User IP for geolocation check:", ip);
    
    // Check if IP is from Spain
    if (!isIpFromSpain(ip)) {
      throw new AppError("Creator registration is only available in Spain", 403);
    }
    console.log("Geolocation check passed: IP is from Spain");
    }
    
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
    // Execute queries in parallel for better performance
    const [totalUsers, premiumUsers, blockedUsers, activeUsers, inactiveUsers, pendingUsers] = await Promise.all([
      User.countDocuments(), // Total users
      User.countDocuments({ subscriptionStatus: 'active' }), // Premium users with active subscription
      User.countDocuments({ status: UserStatus.SUSPENDED }), // Blocked/suspended users
      User.countDocuments({ status: UserStatus.ACTIVE }), // Active users
      User.countDocuments({ status: UserStatus.INACTIVE }), // Inactive users
      User.countDocuments({ status: UserStatus.PENDING }) // Pending users
    ]);

    // Get user role distribution
    const regularUsers = await User.countDocuments({ role: UserRole.USER });
    const creatorUsers = await User.countDocuments({ role: UserRole.CREATOR });
    const adminUsers = await User.countDocuments({ role: UserRole.ADMIN });

    return res.json({
      success: true,
      stats: {
        totalUsers,
        usersByStatus: {
          active: activeUsers,
          inactive: inactiveUsers,
          blocked: blockedUsers,
          pending: pendingUsers
        },
        usersByRole: {
          regular: regularUsers,
          creator: creatorUsers,
          admin: adminUsers
        },
        premiumUsers,
        regularUsers: totalUsers - premiumUsers,
        verificationRate: totalUsers > 0 ? ((activeUsers / totalUsers) * 100).toFixed(2) + '%' : '0%'
      }
    });
  } catch (error) {
    console.error("Get user stats error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch user statistics" });
  }
}

// Delete user account (for the user themselves)
export const deleteUserAccount = async (req, res) => {
  console.log("Starting deleteUserAccount for user:", req.user._id);
  try {
    const userId = req.user._id; // Get the authenticated user's ID
    console.log("User ID for deletion:", userId);
    
    // Get user data for email
    const user = await User.findById(userId);
    if (!user) {
      throw new AppError("User not found", 404);
    }
    
    // Start a session for transaction
    console.log("Attempting to start MongoDB session");
    const session = await mongoose.startSession();
    session.startTransaction();
    console.log("Transaction started successfully");
    
    try {
      console.log("Beginning deletion of user-related data");
      
      // Send account deleted email
      try {
        const emailService = new EmailService();
        console.log("Attempting to send account deleted email to:", user.email);
        const emailResult = await emailService.sendAccountDeletedEmail({
          to: user.email,
          name: user.name
        });
        console.log("Account deleted email sent to user:", emailResult.messageId);
      } catch (emailError) {
        console.error("Error sending account deleted email:", emailError);
        // Log more detailed error information
        console.error("Error details:", JSON.stringify(emailError, null, 2));
        // Continue with deletion even if email fails
      }
      
      // Execute deletions sequentially instead of using Promise.all
      // Delete user's saved content
      const savedResult = await Save.deleteMany({ user: userId }, { session });
      console.log(`Deleted ${savedResult.deletedCount} saved items`);
      
      // Delete user's likes
      const likesResult = await Like.deleteMany({ user: userId }, { session });
      console.log(`Deleted ${likesResult.deletedCount} likes`);
      
      // Delete user's comments
      const commentsResult = await Comment.deleteMany({ user: userId }, { session });
      console.log(`Deleted ${commentsResult.deletedCount} comments`);
      
      // Delete user's channel subscriptions
      const subscriptionsResult = await ChannelSubscription.deleteMany({ user: userId }, { session });
      console.log(`Deleted ${subscriptionsResult.deletedCount} channel subscriptions`);
      
      // Delete user's video views
      const viewsResult = await VideoView.deleteMany({ viewer: userId }, { session });
      console.log(`Deleted ${viewsResult.deletedCount} video views`);
      
      // Delete user's donations
      const donationsResult = await Donation.deleteMany({ userId: userId }, { session });
      console.log(`Deleted ${donationsResult.deletedCount} donations`);
      
      // Delete user's reports
      const reportsResult = await Report.deleteMany({ reporterId: userId }, { session });
      console.log(`Deleted ${reportsResult.deletedCount} reports`);
      
      console.log("All related data deletion completed");
      
      // Finally, delete the user
      console.log("Attempting to delete user document");
      const deletedUser = await User.findByIdAndDelete(userId).session(session);
      
      if (!deletedUser) {
        console.log("User not found for deletion");
        throw new AppError("User not found", 404);
      }
      console.log("User document deleted successfully:", deletedUser._id);
      
      // Commit the transaction
      console.log("Committing transaction");
      await session.commitTransaction();
      console.log("Transaction committed successfully");
      session.endSession();
      
      console.log("User account deletion completed successfully");
      return res.json({
        success: true,
        message: "Your account has been deleted successfully"
      });
    } catch (error) {
      // Abort transaction on error
      console.error("Error in transaction, aborting:", error);
      console.error("Error stack:", error.stack);
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  } catch (error) {
    if (error instanceof AppError) {
      console.error("AppError in deleteUserAccount:", error.message, error.statusCode);
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    console.error("Delete user account error:", error);
    console.error("Error details:", JSON.stringify(error, Object.getOwnPropertyNames(error)));
    console.error("Error stack:", error.stack);
    return res.status(500).json({ success: false, message: "Failed to delete your account" });
  }
};