import User, { UserRole } from '../models/user.model.js';
import CreatorContent, { ContentType } from '../models/creatorContent.model.js';
import Contract, { ContractStatus } from '../models/contract.model.js';
import { AppError } from '../utils/app-error.js';
import mongoose from 'mongoose';

/**
 * Get admin dashboard statistics
 * @param {Object} c - Context
 * @returns {Object} Dashboard statistics
 */
export const getDashboardStats = async (c) => {
  try {
    const user = c.get('user');
    
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
    
    return c.json({
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
    return c.json({
      success: false,
      message: error.message
    }, error.statusCode || 500);
  }
};

/**
 * Get all creators with detailed information
 * @param {Object} c - Context
 * @returns {Object} List of creators with pagination
 */
export const getAllCreators = async (c) => {
  try {
    const user = c.get('user');
    
    // Check if user is admin
    if (user.role !== UserRole.ADMIN) {
      throw new AppError('Unauthorized access', 403);
    }
    
    const page = parseInt(c.req.query('page')) || 1;
    const limit = parseInt(c.req.query('limit')) || 10;
    const search = c.req.query('search') || '';
    const status = c.req.query('status'); // active, blocked, all
    const sortBy = c.req.query('sortBy') || 'createdAt';
    const sortOrder = c.req.query('sortOrder') || 'desc';
    
    // Build query
    const query = { role: UserRole.CREATOR };
    
    // Add search filter
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Add status filter
    if (status === 'active') {
      query.isActive = true;
      query.isBlocked = false;
    } else if (status === 'blocked') {
      query.isBlocked = true;
    }
    
    // Calculate pagination
    const skip = (page - 1) * limit;
    
    // Sort options
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;
    
    // Get creators with pagination
    const [creators, total] = await Promise.all([
      User.find(query)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .select('name email isActive isBlocked createdAt subscriptionPlan'),
      User.countDocuments(query)
    ]);
    
    // Get additional data for each creator
    const creatorsWithDetails = await Promise.all(
      creators.map(async (creator) => {
        // Get content count
        const contentCount = await CreatorContent.countDocuments({ creator: creator._id });
        
        // Get contract status
        const contract = await Contract.findOne({ 
          userId: creator._id,
          type: 'creator'
        }).sort({ createdAt: -1 });
        
        return {
          _id: creator._id,
          name: creator.name,
          email: creator.email,
          status: creator.isBlocked ? 'Blocked' : (creator.isActive ? 'Active' : 'Inactive'),
          subscriptionPlan: creator.subscriptionPlan || 'Free',
          registeredDate: creator.createdAt,
          totalContent: contentCount,
          contractStatus: contract ? contract.status : 'No Contract'
        };
      })
    );
    
    return c.json({
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
    return c.json({
      success: false,
      message: error.message
    }, error.statusCode || 500);
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
    const { action } = await c.req.json();
    
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
      creator.isActive = false;
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