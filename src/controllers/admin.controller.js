import User, { UserRole,UserStatus } from '../models/user.model.js';
import CreatorContent, { ContentType } from '../models/creatorContent.model.js';
import Contract, { ContractStatus } from '../models/contract.model.js';
import { AppError } from '../utils/app-error.js';
import mongoose from 'mongoose';
// Add this import at the top of the file with the other imports
import { transformAllUrls } from '../utils/cloudStorage.js';

/**
 * Get admin dashboard statistics
 * @param {Object} req - Request
 * @param {Object} res - Response
 * @returns {Object} Dashboard statistics
 */
export const getDashboardStats = async (req, res) => {
  try {
    const user = req.user;
    
    // Check if user is admin
    if (user.role !== UserRole.ADMIN) {
      throw new AppError('Unauthorized access', 403);
    }
    
    // Get counts for different statistics
    const [
      totalCreators,
      activeCreators,
      blockedCreators,
      totalShortFilms,
      totalEducationalContent,
      totalSeries,
      pendingApprovals,
      totalContracts,
      pendingContracts
    ] = await Promise.all([
      User.countDocuments({ role: UserRole.CREATOR }),
      User.countDocuments({ role: UserRole.CREATOR, isActive: true, isBlocked: false }),
      User.countDocuments({ role: UserRole.CREATOR, isBlocked: true }),
      CreatorContent.countDocuments({ contentType: ContentType.SHORT_FILM }),
      CreatorContent.countDocuments({ contentType: ContentType.EDUCATIONAL }),
      CreatorContent.countDocuments({ contentType: ContentType.SERIES }),
      CreatorContent.countDocuments({ status: 'processing' }),
      Contract.countDocuments({ type: 'creator' }),
      Contract.countDocuments({ type: 'creator', status: ContractStatus.PENDING })
    ]);
    
    // Get recent content submissions
    const recentContent = await CreatorContent.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('creator', 'name email')
      .select('title contentType status createdAt');
    
    // Get recent creator registrations
    const recentCreators = await User.find({ role: UserRole.CREATOR })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('name email createdAt isActive isBlocked');
    
    return res.json({
      success: true,
      stats: {
        creators: {
          total: totalCreators,
          active: activeCreators,
          blocked: blockedCreators
        },
        content: {
          shortFilms: totalShortFilms,
          educational: totalEducationalContent,
          series: totalSeries,
          pendingApprovals
        },
        contracts: {
          total: totalContracts,
          pending: pendingContracts
        }
      },
      recentContent,
      recentCreators
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Get all creators with detailed information
 * @param {Object} req - Request
 * @param {Object} res - Response
 * @returns {Object} List of creators with pagination
 */
export const getAllCreators = async (req, res) => {
  try {
    const user = req.user;

    // Only admin allowed
    if (user.role !== UserRole.ADMIN) {
      throw new AppError('Unauthorized access', 403);
    }
    
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const status = req.query.status; // 'active', 'inactive', or 'all'
    const sortBy = req.query.sortBy || 'createdAt';
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;

    // Base query for creators
    const query = { role: UserRole.CREATOR };

    // Search filter
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    // Status filter
    if (status === 'active') {
      query.status = UserStatus.ACTIVE;
    } else if (status === 'inactive') {
      query.status = UserStatus.INACTIVE;
    }

    const skip = (page - 1) * limit;

    // Fetch creators and count
    const [creators, total] = await Promise.all([
      User.find(query)
        .sort({ [sortBy]: sortOrder })
        .skip(skip)
        .limit(limit)
        .select('name email status createdAt subscriptionPlan'),
      User.countDocuments(query)
    ]);

    // Enhance creator info
    const creatorsWithDetails = await Promise.all(
      creators.map(async (creator) => {
        const contentCount = await CreatorContent.countDocuments({ creator: creator._id });

        const contract = await Contract.findOne({
          userId: creator._id,
          type: 'creator'
        }).sort({ createdAt: -1 });

        return {
          _id: creator._id,
          name: creator.name,
          email: creator.email,
          status: creator.status === UserStatus.ACTIVE ? 'Active' : 'Inactive',
          subscriptionPlan: creator.subscriptionPlan || 'Free',
          registeredDate: creator.createdAt,
          totalContent: contentCount,
          contractStatus: contract ? contract.status : 'No Contract'
        };
      })
    );

    return res.status(200).json({
      success: true,
      creators: creatorsWithDetails,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get all creators error:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message
    });
  }
};
/**
 * Get creator details by ID
 * @param {Object} c - Context
 * @returns {Object} Creator details
 */
// Get creator by ID
export const getCreatorById = async (req, res) => {
  try {
    const user = req.user;
    const { creatorId } = req.params;
    
    // Check if user is admin
    if (user.role !== UserRole.ADMIN) {
      throw new AppError('Unauthorized access', 403);
    }
    
    // Get creator details
    const creator = await User.findOne({ 
      _id: creatorId,
      role: UserRole.CREATOR
    }).select('-password');
    
    if (!creator) {
      throw new AppError('Creator not found', 404);
    }
    
    // Get creator's content
    const content = await CreatorContent.find({ creator: creatorId })
      .sort({ createdAt: -1 })
      .select('title contentType status createdAt views');
    
    // Get creator's contract
    const contract = await Contract.findOne({ 
      userId: creatorId,
      type: 'creator'
    }).sort({ createdAt: -1 });
    
    return res.json({
      success: true,
      creator
    })
  } catch (error) {
    console.error('Get creator error:', error)
    return res.status(500).json({
      success: false,
      message: error.message
    })
  }
}
/**
 * Block/unblock a creator
 * @param {Object} req - Request
 * @param {Object} res - Response
 * @returns {Object} Updated creator
 */
export const toggleCreatorBlock = async (req, res) => {
  try {
    const user = req.user;
    const { creatorId } = req.params;
    
    // Get action from request body
    let action = req.body.action;
    
    // Check if user is admin
    if (user.role !== UserRole.ADMIN) {
      throw new AppError('Unauthorized access', 403);
    }
    
    // Validate action
    if (action !== 'block' && action !== 'unblock') {
      throw new AppError('Invalid action. Use "block" or "unblock"', 400);
    }
    
    // Find creator
    const creator = await User.findOne({ 
      _id: creatorId,
      role: UserRole.CREATOR
    });
    
    if (!creator) {
      throw new AppError('Creator not found', 404);
    }
    
    // Update block status
    creator.isBlocked = action === 'block';
    
    // If blocking, also set isActive to false
    if (action === 'block') {
      creator.status = UserStatus.INACTIVE;
    }
    if (action === 'unblock') {
      creator.status = UserStatus.ACTIVE;
    }
    
    await creator.save();
    
    // Send email notification to creator
    try {
      const { default: emailService } = await import('../services/email.service.js');
      
      if (action === 'block') {
        await emailService.sendAccountBlockedEmail({
          to: creator.email,
          userName: creator.name
        });
      } else {
        await emailService.sendAccountUnblockedEmail({
          to: creator.email,
          userName: creator.name
        });
      }
    } catch (emailError) {
      console.error('Error sending account status email:', emailError);
    }
    
    return res.status(200).json({
      success: true,
      message: `Creator ${action === 'block' ? 'blocked' : 'unblocked'} successfully`,
      creator: {
        _id: creator._id,
        name: creator.name,
        email: creator.email,
        isBlocked: creator.isBlocked,
        isActive: creator.isActive
      }
    });
  } catch (error) {
    console.error('Toggle creator block error:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Delete a creator
 * @param {Object} req - Request
 * @param {Object} res - Response
 * @returns {Object} Success message
 */
export const deleteCreator = async (req, res) => {
  try {
    const user = req.user;
    const { creatorId } = req.params;
    
    // Check if user is admin
    if (user.role !== UserRole.ADMIN) {
      throw new AppError('Unauthorized access', 403);
    }
    
    // Find creator
    const creator = await User.findOne({ 
      _id: creatorId,
      role: UserRole.CREATOR
    });
    
    if (!creator) {
      throw new AppError('Creator not found', 404);
    }
    
    // Get creator's email for notification
    const creatorEmail = creator.email;
    const creatorName = creator.name;
    
    // Start a session for transaction
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
      // Delete creator's content
      await CreatorContent.deleteMany({ creator: creatorId }, { session });
      
      // Delete creator's contracts
      await Contract.deleteMany({ userId: creatorId }, { session });
      
      // Delete creator
      await User.deleteOne({ _id: creatorId }, { session });
      
      // Commit transaction
      await session.commitTransaction();
    } catch (error) {
      // Abort transaction on error
      await session.abortTransaction();
      throw error;
    } finally {
      // End session
      session.endSession();
    }
    
    // Send email notification to creator
    try {
      const { default: emailService } = await import('../services/email.service.js');
      
      await emailService.sendAccountDeletedEmail({
        to: creatorEmail,
        userName: creatorName
      });
    } catch (emailError) {
      console.error('Error sending account deleted email:', emailError);
    }
    
    return res.status(200).json({
      success: true,
      message: 'Creator and all associated data deleted successfully'
    });
  } catch (error) {
    console.error('Delete creator error:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message
    });
  }
};
/**
 * Get creator content for admin review
 * @param {Object} req - Request
 * @param {Object} res - Response
 * @returns {Object} List of content with pagination
 */
export const getContentForReview = async (req, res) => {
  try {
    const user = req.user;
    
    // Check if user is admin
    if (user.role !== UserRole.ADMIN) {
      throw new AppError('Unauthorized access', 403);
    }
    
    const {
      page = 1,
      limit = 10,
      contentType,
      creatorId,
      search,
      sort = 'createdAt',
      order = 'desc'
    } = req.query;
    
    const query = {};
    
    // Apply filters
    if (contentType) query.contentType = contentType;
    if (creatorId) query.creator = creatorId;
    
    // Use text index for search if available, otherwise use regex
    if (search) {
      // Check if text index exists
      const indexes = await CreatorContent.collection.indexes();
      const hasTextIndex = indexes.some(index => index.textIndexVersion);
      
      if (hasTextIndex) {
        query.$text = { $search: search };
      } else {
        query.$or = [
          { title: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
          { tags: { $regex: search, $options: 'i' } }
        ];
      }
    }
    
    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Determine sort order
    const sortOptions = {};
    sortOptions[sort] = order === 'asc' ? 1 : -1;
    
    // First, get all content matching the query
    const allContent = await CreatorContent.find(query)
      .populate('creator', 'name username profilePicture')
      .populate('genre', 'name nameEs')
      .lean();
    
    // Separate content into pending and reviewed (approved/rejected)
    const pendingContent = allContent.filter(item => item.status === 'processing');
    const reviewedContent = allContent.filter(item => item.status === 'published' || item.status === 'rejected');
    
    // Sort each group by the specified sort options
    const sortFn = (a, b) => {
      const aValue = a[sort];
      const bValue = b[sort];
      
      if (order === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    };
    
    pendingContent.sort(sortFn);
    reviewedContent.sort(sortFn);
    
    // Combine the arrays with pending content first, followed by reviewed content
    const sortedContent = [...pendingContent, ...reviewedContent];
    
    // Apply pagination
    const paginatedContent = sortedContent.slice(skip, skip + parseInt(limit));
    
    // Transform URLs in content before sending to client
    const transformedContent = transformAllUrls(paginatedContent);
    
    return res.json({
      success: true,
      content: transformedContent,
      pagination: {
        total: allContent.length,
        pages: Math.ceil(allContent.length / parseInt(limit)),
        page: parseInt(page),
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Get content for review error:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to fetch content for review'
    });
  }
};