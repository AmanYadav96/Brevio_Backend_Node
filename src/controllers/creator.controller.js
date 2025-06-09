import CreatorContent, { ContentType } from '../models/creatorContent.model.js';
import Payment, { PaymentType, PaymentStatus } from '../models/payment.model.js';
import Donation from '../models/donation.model.js';
import User, { UserRole } from '../models/user.model.js';
import Like from '../models/like.model.js';
import { AppError } from '../utils/app-error.js';
import mongoose from 'mongoose';

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