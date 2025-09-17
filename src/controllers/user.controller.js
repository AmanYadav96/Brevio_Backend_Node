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
import { isIpFromSpain } from "../utils/geolocation.js"
import cacheService from "../services/cache.service.js"
import CreatorContent from "../models/creatorContent.model.js"
import Content from "../models/content.model.js"
import Channel from "../models/channel.model.js"
import { transformAllUrls } from "../utils/cloudStorage.js"

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
      
      // Handle avatar field (alias for profilePicture)
      if (req.uploads.avatar) {
        updates.profilePicture = req.uploads.avatar.url;
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

// Get comprehensive user profile with all details
export const getComprehensiveProfile = async (req, res) => {
  try {
    const userId = req.user._id // Get the authenticated user's ID
    
    // Get user profile
    const user = await User.findById(userId).select('-password').lean()
    if (!user) {
      throw new AppError("User not found", 404)
    }

    // Initialize response object
    const profileData = {
      success: true,
      user: transformAllUrls(user),
      content: [],
      creatorContent: [],
      channel: null,
      stats: {
        totalContent: 0,
        totalCreatorContent: 0,
        publishedContent: 0,
        draftContent: 0,
        totalViews: 0,
        totalLikes: 0,
        totalComments: 0,
        totalSaves: 0,
        channelSubscribers: 0,
        totalLikesReceived: 0,
        totalSubscribers: 0,
        totalContentUploaded: 0
      },
      activity: {
        likedContent: [],
        savedContent: [],
        comments: [],
        subscriptions: []
      }
    }

    // Get user's regular content
    const content = await Content.find({ creator: userId })
      .populate('genres', 'name nameEs description descriptionEs type isActive')
      .sort({ createdAt: -1 })
      .lean()

    profileData.content = content.map(item => transformAllUrls(item))
    profileData.stats.totalContent = content.length
    profileData.stats.totalContentUploaded += content.length

    // If user is a creator, get their creator content and channel
    if (user.role === UserRole.CREATOR) {
      // Get creator's channel
      const channel = await Channel.findOne({
        'owner.email': user.email
      }).select('_id name description thumbnail type createdAt subscribers').lean()
      
      if (channel) {
        profileData.channel = transformAllUrls(channel)
        profileData.stats.channelSubscribers = channel.subscribers || 0
      }

      // Get creator's content
      const creatorContent = await CreatorContent.find({ creator: userId })
        .populate('genre', 'name nameEs description descriptionEs type isActive')
        .sort({ createdAt: -1 })
        .lean()

      // Transform URLs and calculate stats
      profileData.creatorContent = creatorContent.map(item => transformAllUrls(item))
      profileData.stats.totalCreatorContent = creatorContent.length
      profileData.stats.publishedContent = creatorContent.filter(c => c.status === 'published').length
      profileData.stats.draftContent = creatorContent.filter(c => c.status === 'draft').length
      profileData.stats.totalViews = creatorContent.reduce((sum, c) => sum + (c.views || 0), 0)
      profileData.stats.totalLikes = creatorContent.reduce((sum, c) => sum + (c.likes || 0), 0)
      profileData.stats.totalContentUploaded += creatorContent.length

      // Get total comments on creator's content
      const contentIds = creatorContent.map(c => c._id)
      if (contentIds.length > 0) {
        const totalComments = await Comment.countDocuments({
          contentType: 'CreatorContent',
          contentId: { $in: contentIds },
          status: 'active'
        })
        profileData.stats.totalComments = totalComments
      }

      // Get total likes received on all creator content
      if (contentIds.length > 0) {
        const totalLikesReceived = await Like.countDocuments({
          contentType: 'CreatorContent',
          contentId: { $in: contentIds }
        })
        profileData.stats.totalLikesReceived = totalLikesReceived
      }

      // Get total subscribers to user's channel
      if (channel) {
        const totalSubscribers = await ChannelSubscription.countDocuments({
          channel: channel._id
        })
        profileData.stats.totalSubscribers = totalSubscribers
        profileData.stats.channelSubscribers = totalSubscribers
      }
    }

    // Get user's activity (for all users)
    const [likedContent, savedContent, userComments, subscriptions] = await Promise.all([
      // Liked content
      Like.find({ user: userId })
        .sort({ createdAt: -1 })
        .limit(20)
        .lean(),
      
      // Saved content
      Save.find({ user: userId })
        .sort({ createdAt: -1 })
        .limit(20)
        .lean(),
      
      // User's comments
      Comment.find({ user: userId, status: 'active' })
        .sort({ createdAt: -1 })
        .limit(20)
        .lean(),
      
      // Channel subscriptions
      ChannelSubscription.find({ subscriber: userId })
        .sort({ createdAt: -1 })
        .limit(20)
        .lean()
    ])

    // Transform and assign activity data
    profileData.activity.likedContent = likedContent.map(item => transformAllUrls(item))
    profileData.activity.savedContent = savedContent.map(item => transformAllUrls(item))
    profileData.activity.comments = userComments.map(item => transformAllUrls(item))
    profileData.activity.subscriptions = subscriptions.map(item => transformAllUrls(item))

    // Update activity stats
    profileData.stats.totalSaves = savedContent.length

    // For non-creator users, also calculate likes received on regular content
    if (user.role !== UserRole.CREATOR && content.length > 0) {
      const regularContentIds = content.map(c => c._id)
      const totalLikesReceived = await Like.countDocuments({
        contentType: 'Content',
        contentId: { $in: regularContentIds }
      })
      profileData.stats.totalLikesReceived = totalLikesReceived
    }

    return res.json(profileData)
  } catch (error) {
    console.error('Get comprehensive profile error:', error)
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ success: false, message: error.message })
    }
    return res.status(500).json({ success: false, message: "Failed to fetch comprehensive profile" })
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
  const startTime = Date.now();
  console.log("=== DELETE ACCOUNT API STARTED ===");
  console.log("Timestamp:", new Date().toISOString());
  console.log("Request IP:", req.ip || req.connection.remoteAddress);
  console.log("User Agent:", req.get('User-Agent'));
  console.log("Starting deleteUserAccount for user:", req.user._id);
  console.log("User details:", {
    id: req.user._id,
    email: req.user.email,
    name: req.user.name,
    role: req.user.role,
    isActive: req.user.isActive
  });
  
  try {
    const userId = req.user._id; // Get the authenticated user's ID
    console.log("User ID for deletion:", userId);
    console.log("Validating user ID format...");
    
    if (!userId) {
      console.error("ERROR: No user ID found in request");
      throw new AppError("User authentication failed", 401);
    }
    
    // Get user data for email
    console.log("Fetching user data from database...");
    const user = await User.findById(userId);
    if (!user) {
      console.error("ERROR: User not found in database with ID:", userId);
      throw new AppError("User not found", 404);
    }
    console.log("User found successfully:", {
      id: user._id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt,
      isActive: user.isActive
    });
    
    // Start a session for transaction
    console.log("Attempting to start MongoDB session...");
    let session;
    try {
      session = await mongoose.startSession();
      console.log("MongoDB session created successfully");
      session.startTransaction();
      console.log("Transaction started successfully");
    } catch (sessionError) {
      console.error("ERROR: Failed to start MongoDB session:", sessionError);
      throw new AppError("Database transaction failed to start", 500);
    }
    
    try {
      console.log("Beginning deletion of user-related data");
      
      // Send account deleted email
      console.log("=== EMAIL NOTIFICATION STEP ===");
      try {
        console.log("Attempting to send account deleted email to:", user.email);
        console.log("Email service configuration check...");
        
        if (!user.email) {
          console.warn("WARNING: User has no email address, skipping email notification");
        } else {
          const emailResult = await EmailService.sendAccountDeletedEmail({
            to: user.email,
            name: user.name
          });
          console.log("✅ Account deleted email sent successfully:", {
            messageId: emailResult.messageId,
            recipient: user.email,
            timestamp: new Date().toISOString()
          });
        }
      } catch (emailError) {
        console.error("❌ ERROR: Failed to send account deleted email:", {
          error: emailError.message,
          stack: emailError.stack,
          recipient: user.email,
          timestamp: new Date().toISOString()
        });
        console.error("Email error details:", JSON.stringify(emailError, Object.getOwnPropertyNames(emailError), 2));
        console.log("⚠️  Continuing with account deletion despite email failure...");
      }
      
      // Execute deletions sequentially instead of using Promise.all
      console.log("=== DATA DELETION PHASE ===");
      const deletionResults = {};
      
      try {
        // Delete user's saved content
        console.log("🗑️  Deleting saved content...");
        const savedResult = await Save.deleteMany({ user: userId }, { session });
        deletionResults.savedItems = savedResult.deletedCount;
        console.log(`✅ Deleted ${savedResult.deletedCount} saved items`);
      } catch (error) {
        console.error("❌ ERROR deleting saved content:", error.message);
        throw error;
      }
      
      try {
        // Delete user's likes
        console.log("🗑️  Deleting likes...");
        const likesResult = await Like.deleteMany({ user: userId }, { session });
        deletionResults.likes = likesResult.deletedCount;
        console.log(`✅ Deleted ${likesResult.deletedCount} likes`);
      } catch (error) {
        console.error("❌ ERROR deleting likes:", error.message);
        throw error;
      }
      
      try {
        // Delete user's comments
        console.log("🗑️  Deleting comments...");
        const commentsResult = await Comment.deleteMany({ user: userId }, { session });
        deletionResults.comments = commentsResult.deletedCount;
        console.log(`✅ Deleted ${commentsResult.deletedCount} comments`);
      } catch (error) {
        console.error("❌ ERROR deleting comments:", error.message);
        throw error;
      }
      
      try {
        // Delete user's channel subscriptions
        console.log("🗑️  Deleting channel subscriptions...");
        const subscriptionsResult = await ChannelSubscription.deleteMany({ user: userId }, { session });
        deletionResults.subscriptions = subscriptionsResult.deletedCount;
        console.log(`✅ Deleted ${subscriptionsResult.deletedCount} channel subscriptions`);
      } catch (error) {
        console.error("❌ ERROR deleting channel subscriptions:", error.message);
        throw error;
      }
      
      try {
        // Delete user's video views
        console.log("🗑️  Deleting video views...");
        const viewsResult = await VideoView.deleteMany({ viewer: userId }, { session });
        deletionResults.videoViews = viewsResult.deletedCount;
        console.log(`✅ Deleted ${viewsResult.deletedCount} video views`);
      } catch (error) {
        console.error("❌ ERROR deleting video views:", error.message);
        throw error;
      }
      
      try {
        // Delete user's donations
        console.log("🗑️  Deleting donations...");
        const donationsResult = await Donation.deleteMany({ userId: userId }, { session });
        deletionResults.donations = donationsResult.deletedCount;
        console.log(`✅ Deleted ${donationsResult.deletedCount} donations`);
      } catch (error) {
        console.error("❌ ERROR deleting donations:", error.message);
        throw error;
      }
      
      try {
        // Delete user's reports
        console.log("🗑️  Deleting reports...");
        const reportsResult = await Report.deleteMany({ reporterId: userId }, { session });
        deletionResults.reports = reportsResult.deletedCount;
        console.log(`✅ Deleted ${reportsResult.deletedCount} reports`);
      } catch (error) {
        console.error("❌ ERROR deleting reports:", error.message);
        throw error;
      }
      
      console.log("✅ All related data deletion completed successfully:", deletionResults);
      
      // Finally, delete the user
      console.log("=== USER DOCUMENT DELETION ===");
      console.log("Attempting to delete user document with ID:", userId);
      
      try {
        const deletedUser = await User.findByIdAndDelete(userId).session(session);
        
        if (!deletedUser) {
          console.error("❌ ERROR: User document not found for deletion");
          throw new AppError("User not found", 404);
        }
        
        console.log("✅ User document deleted successfully:", {
          deletedUserId: deletedUser._id,
          deletedUserEmail: deletedUser.email,
          deletedUserName: deletedUser.name
        });
      } catch (userDeletionError) {
        console.error("❌ ERROR deleting user document:", userDeletionError.message);
        throw userDeletionError;
      }
      
      // Commit the transaction
      console.log("=== TRANSACTION COMMIT ===");
      console.log("Committing transaction...");
      
      try {
        await session.commitTransaction();
        console.log("✅ Transaction committed successfully");
      } catch (commitError) {
        console.error("❌ ERROR committing transaction:", commitError.message);
        throw commitError;
      } finally {
        session.endSession();
        console.log("📝 Database session ended");
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      console.log("=== DELETE ACCOUNT API COMPLETED SUCCESSFULLY ===");
      console.log("✅ User account deletion completed successfully");
      console.log("⏱️  Total execution time:", duration, "ms");
      console.log("📊 Final deletion summary:", deletionResults);
      
      return res.json({
        success: true,
        message: "Your account has been deleted successfully"
      });
    } catch (error) {
      // Abort transaction on error
      console.log("=== TRANSACTION ROLLBACK ===");
      console.error("❌ ERROR in transaction, aborting:", {
        error: error.message,
        type: error.constructor.name,
        timestamp: new Date().toISOString()
      });
      console.error("Error stack:", error.stack);
      
      try {
        if (session) {
          await session.abortTransaction();
          console.log("🔄 Transaction aborted successfully");
          session.endSession();
          console.log("📝 Database session ended after rollback");
        }
      } catch (rollbackError) {
        console.error("❌ ERROR during transaction rollback:", rollbackError.message);
      }
      
      throw error;
    }
  } catch (error) {
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log("=== DELETE ACCOUNT API FAILED ===");
    console.error("❌ Delete user account operation failed");
    console.error("⏱️  Execution time before failure:", duration, "ms");
    
    if (error instanceof AppError) {
      console.error("🚫 AppError in deleteUserAccount:", {
        message: error.message,
        statusCode: error.statusCode,
        timestamp: new Date().toISOString()
      });
      return res.status(error.statusCode).json({ 
        success: false, 
        message: error.message 
      });
    }
    
    console.error("💥 Unexpected error in deleteUserAccount:", {
      message: error.message,
      type: error.constructor.name,
      timestamp: new Date().toISOString()
    });
    console.error("Error details:", JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
    console.error("Error stack:", error.stack);
    
    return res.status(500).json({ 
      success: false, 
      message: "Failed to delete your account" 
    });
  }
};