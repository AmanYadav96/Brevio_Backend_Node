import User, { UserRole,UserStatus } from '../models/user.model.js';
import CreatorContent, { ContentType } from '../models/creatorContent.model.js';
import Contract, { ContractStatus } from '../models/contract.model.js';
import { AppError } from '../utils/app-error.js';
import mongoose from 'mongoose';

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
export const getCreatorById = async (c) => {
  try {
    const user = c.get('user');
    const { creatorId } = c.req.param();
    
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
    
    return c.json({
      success: true,
      creator: {
        ...creator.toObject(),
        totalContent: content.length,
        contractStatus: contract ? contract.status : 'No Contract',
        contractId: contract ? contract._id : null
      },
      content
    });
  } catch (error) {
    console.error('Get creator by ID error:', error);
    return c.json({
      success: false,
      message: error.message
    }, error.statusCode || 500);
  }
};

/**
 * Block/unblock a creator
 * @param {Object} c - Context
 * @returns {Object} Updated creator
 */
export const toggleCreatorBlock = async (c) => {
  try {
    const user = c.get('user');
    const { creatorId } = c.req.param();
    
    // Try to parse JSON body, but handle potential errors
    let action;
    try {
      const body = await c.req.json();
      action = body.action;
    } catch (parseError) {
      // If JSON parsing fails, try to get from URL query parameter
      action = c.req.query('action');
      
      // If still no action, check if it's in form data
      if (!action) {
        try {
          const formData = await c.req.parseBody();
          action = formData.action;
        } catch (formError) {
          // If all parsing methods fail, return error
          throw new AppError('Invalid request format. Action parameter is required', 400);
        }
      }
    }
    
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
    
    return c.json({
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
    return c.json({
      success: false,
      message: error.message
    }, error.statusCode || 500);
  }
};

/**
 * Delete a creator
 * @param {Object} c - Context
 * @returns {Object} Success message
 */
export const deleteCreator = async (c) => {
  try {
    const user = c.get('user');
    const { creatorId } = c.req.param();
    
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
    
    return c.json({
      success: true,
      message: 'Creator and all associated data deleted successfully'
    });
  } catch (error) {
    console.error('Delete creator error:', error);
    return c.json({
      success: false,
      message: error.message
    }, error.statusCode || 500);
  }
};