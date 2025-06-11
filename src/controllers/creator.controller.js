import CreatorContent, { ContentType } from '../models/creatorContent.model.js';
import Payment, { PaymentType, PaymentStatus } from '../models/payment.model.js';
import Donation from '../models/donation.model.js';
import User, { UserRole } from '../models/user.model.js';
import Like from '../models/like.model.js';
import { AppError } from '../utils/app-error.js';
import mongoose from 'mongoose';
import Channel from '../models/channel.model.js';
import ChannelSubscription from '../models/channelSubscription.model.js';

/**
 * Get creator dashboard statistics and data
 * @param {Object} req - Request
 * @param {Object} res - Response
 * @returns {Object} Dashboard statistics and data
 */
export const getCreatorDashboard = async (req, res) => {
  try {
    const user = req.user;
    
    // Check if user is a creator
    if (user.role !== UserRole.CREATOR) {
      throw new AppError('Unauthorized access', 403);
    }
    
    const creatorId = user._id;
    
    // Get counts for different statistics
    const [
      totalContent,
      publishedContent,
      pendingContent,
      rejectedContent,
      totalShortFilms,
      totalEducationalContent,
      totalSeries
    ] = await Promise.all([
      CreatorContent.countDocuments({ creator: creatorId }),
      CreatorContent.countDocuments({ creator: creatorId, status: 'published' }),
      CreatorContent.countDocuments({ creator: creatorId, status: 'processing' }),
      CreatorContent.countDocuments({ creator: creatorId, status: 'rejected' }),
      CreatorContent.countDocuments({ creator: creatorId, contentType: ContentType.SHORT_FILM }),
      CreatorContent.countDocuments({ creator: creatorId, contentType: ContentType.EDUCATIONAL }),
      CreatorContent.countDocuments({ creator: creatorId, contentType: ContentType.SERIES })
    ]);
    
    // Get revenue statistics
    const [totalPayments, totalDonations] = await Promise.all([
      Payment.aggregate([
        { 
          $match: { 
            creatorId: new mongoose.Types.ObjectId(creatorId),
            status: PaymentStatus.COMPLETED
          } 
        },
        { 
          $group: { 
            _id: null, 
            total: { $sum: "$amount" } 
          } 
        }
      ]),
      Donation.aggregate([
        { 
          $match: { 
            creatorId: new mongoose.Types.ObjectId(creatorId),
            status: 'completed'
          } 
        },
        { 
          $group: { 
            _id: null, 
            total: { $sum: "$amount" } 
          } 
        }
      ])
    ]);
    
    // Get recent content
    const recentContent = await CreatorContent.find({ creator: creatorId })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('title contentType status createdAt');
    
    // Get recent payments
    const recentPayments = await Payment.find({ 
      creatorId,
      status: PaymentStatus.COMPLETED
    })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('userId', 'name email profilePicture')
      .select('amount paymentType createdAt');
    
    // Get recent donations
    const recentDonations = await Donation.find({ 
      creatorId,
      status: 'completed'
    })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('userId', 'name email profilePicture')
      .select('amount message createdAt');
    
    // Calculate total revenue
    const totalRevenue = (totalPayments.length > 0 ? totalPayments[0].total : 0) + 
                         (totalDonations.length > 0 ? totalDonations[0].total : 0);
    
    return res.json({
      success: true,
      stats: {
        content: {
          total: totalContent,
          published: publishedContent,
          pending: pendingContent,
          rejected: rejectedContent,
          shortFilms: totalShortFilms,
          educationalContent: totalEducationalContent,
          series: totalSeries
        },
        revenue: {
          total: totalRevenue,
          payments: totalPayments.length > 0 ? totalPayments[0].total : 0,
          donations: totalDonations.length > 0 ? totalDonations[0].total : 0
        }
      },
      recentContent,
      recentPayments,
      recentDonations
    });
  } catch (error) {
    console.error('Creator dashboard error:', error);
    return res.status(error.statusCode || 500).json({ 
      success: false, 
      message: error.message || 'Failed to fetch dashboard data' 
    });
  }
};

/**
 * Get creator statistics including likes, content count, and content data
 * @param {Object} req - Request
 * @param {Object} res - Response
 * @returns {Object} Creator statistics and content data
 */
export const getCreatorStats = async (req, res) => {
  try {
    const user = req.user;
    
    // Check if user is a creator
    if (user.role !== UserRole.CREATOR) {
      throw new AppError('Unauthorized access', 403);
    }
    
    const creatorId = user._id;
    
    // Get all content created by this creator
    const creatorContent = await CreatorContent.find({ creator: creatorId })
      .select('_id title description contentType status views likes createdAt mediaAssets')
      .sort({ createdAt: -1 });
    
    // Get content counts by type and status
    const contentCounts = {
      total: creatorContent.length,
      byType: {
        shortFilm: creatorContent.filter(c => c.contentType === ContentType.SHORT_FILM).length,
        series: creatorContent.filter(c => c.contentType === ContentType.SERIES).length,
        educational: creatorContent.filter(c => c.contentType === ContentType.EDUCATIONAL).length
      },
      byStatus: {
        draft: creatorContent.filter(c => c.status === 'draft').length,
        processing: creatorContent.filter(c => c.status === 'processing').length,
        published: creatorContent.filter(c => c.status === 'published').length,
        rejected: creatorContent.filter(c => c.status === 'rejected').length,
        archived: creatorContent.filter(c => c.status === 'archived').length
      }
    };
    
    // Get total likes received on all content
    const contentIds = creatorContent.map(content => content._id);
    const totalLikes = await Like.countDocuments({
      contentType: 'creatorContent',
      contentId: { $in: contentIds }
    });
    
    // Calculate total views
    const totalViews = creatorContent.reduce((sum, content) => sum + (content.views || 0), 0);
    
    return res.json({
      success: true,
      stats: {
        totalLikes,
        totalViews,
        contentCounts
      },
      content: creatorContent
    });
  } catch (error) {
    console.error('Creator stats error:', error);
    return res.status(error.statusCode || 500).json({ 
      success: false, 
      message: error.message || 'Failed to fetch creator statistics' 
    });
  }
};

/**
 * Get creator profile by user ID
 * @param {Object} req - Request
 * @param {Object} res - Response
 * @returns {Object} Creator profile with content and stats
 */
export const getCreatorProfileById = async (req, res) => {
  try {
    const { creatorId } = req.params;
    
    // Validate MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(creatorId)) {
      throw new AppError('Invalid creator ID', 400);
    }
    
    // Find creator by ID
    const creator = await User.findOne({ 
      _id: creatorId, 
      role: UserRole.CREATOR 
    }).select('_id name username bio profilePicture createdAt');
    
    if (!creator) {
      throw new AppError('Creator not found', 404);
    }
    
    // Get creator's content with pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12; // Instagram-like grid
    const skip = (page - 1) * limit;
    
    // Find creator's channel
    const channel = await Channel.findOne({
      'owner.email': creator.email
    }).select('_id name thumbnail type');
    
    // Get published content only
    const [content, totalContent, subscribers, totalLikes, totalViews] = await Promise.all([
      CreatorContent.find({ 
        creator: creatorId,
        status: 'published'
      })
        .select('_id title contentType mediaAssets.thumbnail views likes createdAt')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      
      CreatorContent.countDocuments({ 
        creator: creatorId,
        status: 'published'
      }),
      
      // Count subscribers/followers if channel exists
      channel ? ChannelSubscription.countDocuments({
        channel: channel._id,
        isActive: true
      }) : 0,
      
      // Count total likes across all content
      Like.countDocuments({
        contentType: 'creatorContent',
        contentId: { $in: await CreatorContent.find({ creator: creatorId }).distinct('_id') }
      }),
      
      // Calculate total views
      CreatorContent.aggregate([
        { $match: { creator: new mongoose.Types.ObjectId(creatorId) } },
        { $group: { _id: null, totalViews: { $sum: "$views" } } }
      ])
    ]);
    
    // Format content for Instagram-like grid
    const formattedContent = content.map(item => ({
      id: item._id,
      title: item.title,
      contentType: item.contentType,
      thumbnail: item.mediaAssets?.thumbnail || '',
      views: item.views || 0,
      likes: item.likes || 0,
      createdAt: item.createdAt
    }));
    
    return res.json({
      success: true,
      profile: {
        id: creator._id,
        name: creator.name,
        username: creator.username,
        bio: creator.bio,
        profilePicture: creator.profilePicture,
        joinedDate: creator.createdAt,
        channel: channel || null,
        stats: {
          posts: totalContent,
          followers: subscribers,
          likes: totalLikes,
          views: totalViews.length > 0 ? totalViews[0].totalViews : 0
        }
      },
      content: formattedContent,
      pagination: {
        total: totalContent,
        pages: Math.ceil(totalContent / limit),
        page,
        limit
      }
    });
  } catch (error) {
    console.error('Get creator profile error:', error);
    return res.status(error.statusCode || 500).json({ 
      success: false, 
      message: error.message || 'Failed to fetch creator profile' 
    });
  }
};