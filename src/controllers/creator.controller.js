import CreatorContent, { ContentType } from '../models/creatorContent.model.js';
import Payment, { PaymentType, PaymentStatus } from '../models/payment.model.js';
import Donation from '../models/donation.model.js';
import User, { UserRole } from '../models/user.model.js';
import Like from '../models/like.model.js';
import { AppError } from '../utils/app-error.js';
import mongoose from 'mongoose';
import Channel from '../models/channel.model.js';
import ChannelSubscription from '../models/channelSubscription.model.js';
import { transformAllUrls } from '../utils/cloudStorage.js';
import { shouldTranslateToSpanish } from '../utils/languageHandler.js';
import { translateContentStatus } from '../utils/statusTranslation.js';
import { translateAgeRating } from '../utils/ageRatingTranslation.js';
import { translateContentType } from '../utils/contentTypeTranslation.js';

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
    const {
      page,
      limit,
      ignoreLimit = false
    } = req.query;
    
    // Determinar si se debe traducir al español
    const translateToSpanish = shouldTranslateToSpanish(req);
    
    // Build content query
    let contentQuery = CreatorContent.find({ creator: creatorId })
      .select('_id title description contentType status views likes createdAt mediaAssets ageRating genre')
      .populate('genre', 'name nameEs')
      .sort({ createdAt: -1 });
    
    // Apply pagination only if page and limit are provided and ignoreLimit is false
    const shouldPaginate = page && limit && !ignoreLimit && ignoreLimit !== 'true';
    if (shouldPaginate) {
      const skip = (parseInt(page) - 1) * parseInt(limit);
      contentQuery = contentQuery.skip(skip).limit(parseInt(limit));
    }
    
    // Get content and total count
    const [creatorContent, totalContent] = await Promise.all([
      contentQuery,
      CreatorContent.countDocuments({ creator: creatorId })
    ]);
    
    // Transformar los datos y aplicar traducciones si es necesario
    const transformedContent = creatorContent.map(content => {
      const contentObj = content.toObject();
      
      if (translateToSpanish) {
        // Aplicar traducciones manteniendo las claves originales
        contentObj.status = translateContentStatus(contentObj.status);
        contentObj.ageRating = translateAgeRating(contentObj.ageRating);
        contentObj.contentType = translateContentType(contentObj.contentType);
        
        // Usar el nombre en español del género si está disponible
        if (contentObj.genre && contentObj.genre.nameEs) {
          contentObj.genre.name = contentObj.genre.nameEs;
          delete contentObj.genre.nameEs; // Opcional: eliminar el campo nameEs para mantener la estructura limpia
        }
      }
      
      return contentObj;
    });
    
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
    
    // Traducir las claves de estadísticas si es necesario
    if (translateToSpanish) {
      // Traducir los tipos de contenido en las estadísticas
      const translatedByType = {};
      Object.keys(contentCounts.byType).forEach(key => {
        const count = contentCounts.byType[key];
        const translatedKey = translateContentType(key);
        translatedByType[key] = count; // Mantener la clave original
      });
      contentCounts.byType = translatedByType;
      
      // Traducir los estados en las estadísticas
      const translatedByStatus = {};
      Object.keys(contentCounts.byStatus).forEach(key => {
        const count = contentCounts.byStatus[key];
        const translatedKey = translateContentStatus(key);
        translatedByStatus[key] = count; // Mantener la clave original
      });
      contentCounts.byStatus = translatedByStatus;
    }
    
    // Get total likes received on all content
    const contentIds = creatorContent.map(content => content._id);
    const totalLikes = await Like.countDocuments({
      contentType: 'creatorContent',
      contentId: { $in: contentIds }
    });
    
    // Calculate total views
    const totalViews = creatorContent.reduce((sum, content) => sum + (content.views || 0), 0);
    
    // Build response object
    const response = {
      success: true,
      language: translateToSpanish ? 'es' : 'en', // Añadir para depuración
      stats: {
        totalLikes,
        totalViews,
        contentCounts
      },
      content: transformedContent
    };
    
    // Add pagination info if pagination is applied
    if (shouldPaginate) {
      response.pagination = {
        total: totalContent,
        pages: Math.ceil(totalContent / parseInt(limit)),
        page: parseInt(page),
        limit: parseInt(limit)
      };
    } else {
      response.total = totalContent;
    }
    
    return res.json(response);
  } catch (error) {
    console.error('Creator stats error:', error);
    return res.status(error.statusCode || 500).json({ 
      success: false, 
      message: error.message || 'Failed to fetch creator stats' 
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
    
    // Check if translation to Spanish is needed
    const translateToSpanish = shouldTranslateToSpanish(req);
    
    // Validate MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(creatorId)) {
      throw new AppError('Invalid creator ID', 400);
    }
    
    // Find creator by ID - use lean() for better performance
    const creator = await User.findOne({ 
      _id: creatorId, 
      role: UserRole.CREATOR 
    }).select('_id name username bio profilePicture createdAt').lean();
    
    if (!creator) {
      throw new AppError('Creator not found', 404);
    }
    
    // Get creator's content with pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const skip = (page - 1) * limit;
    
    // Find creator's channel - use lean()
    const channel = await Channel.findOne({
      'owner.email': creator.email
    }).select('_id name thumbnail type').lean();
    
    // Get content IDs first (more efficient)
    const contentIds = await CreatorContent.find({ 
      creator: creatorId,
      status: 'published'
    }).select('_id').lean();
    
    const idArray = contentIds.map(item => item._id);
    
    // Run queries in parallel for better performance
    const [content, totalContent, subscribers, totalLikes, totalViews] = await Promise.all([
      CreatorContent.find({ 
        creator: creatorId,
        status: 'published'
      })
        .select('_id title contentType mediaAssets.thumbnail views likes createdAt ageRating genre')
        .populate('genre', 'name nameEs')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      
      contentIds.length, // We already have the count from the previous query
      
      channel ? ChannelSubscription.countDocuments({
        channel: channel._id,
        isActive: true
      }) : 0,
      
      Like.countDocuments({
        contentType: 'creatorContent',
        contentId: { $in: idArray }
      }),
      
      CreatorContent.aggregate([
        { $match: { creator: new mongoose.Types.ObjectId(creatorId) } },
        { $group: { _id: null, totalViews: { $sum: "$views" } } }
      ])
    ]);
    
    // Format content
    const formattedContent = content.map(item => ({
      id: item._id,
      title: item.title,
      contentType: item.contentType,
      thumbnail: item.mediaAssets?.thumbnail || '',
      views: item.views || 0,
      likes: item.likes || 0,
      createdAt: item.createdAt,
      ageRating: item.ageRating || null,
      genre: item.genre || null
    }));
    
    // Transform URLs in the response
    const transformedContent = transformAllUrls(formattedContent);
    
    return res.json({
      success: true,
      profile: transformAllUrls({
        id: creator._id,  // This is where the ObjectId is being passed
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
      }),
      content: transformedContent,
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

/**
 * Search creators by name or username
 * @param {Object} req - Request
 * @param {Object} res - Response
 * @returns {Object} List of creators matching search criteria
 */
/**
 * Get creator's own profile data (authenticated creator)
 * @param {Object} req - Request
 * @param {Object} res - Response
 * @returns {Object} Creator's own profile data with comprehensive stats
 */
export const getCreatorOwnProfile = async (req, res) => {
  try {
    const user = req.user;
    
    // Check if user is a creator
    if (user.role !== UserRole.CREATOR) {
      throw new AppError('Unauthorized access. Only creators can access this endpoint.', 403);
    }
    
    const creatorId = user._id;
    
    // Check if translation to Spanish is needed
    const translateToSpanish = shouldTranslateToSpanish(req);
    
    // Get creator basic info
    const creator = await User.findById(creatorId)
      .select('_id name username bio email profilePicture socialProfiles createdAt status subscriptionStatus')
      .lean();
    
    if (!creator) {
      throw new AppError('Creator not found', 404);
    }
    
    // Find creator's channel
    const channel = await Channel.findOne({
      'owner.email': creator.email
    }).select('_id name description thumbnail type createdAt').lean();
    
    // Get comprehensive statistics in parallel
    const [
      totalContent,
      publishedContent,
      pendingContent,
      rejectedContent,
      totalShortFilms,
      totalEducationalContent,
      totalSeries,
      subscribers,
      totalLikes,
      totalViews,
      totalDonations,
      recentContent
    ] = await Promise.all([
      CreatorContent.countDocuments({ creator: creatorId }),
      CreatorContent.countDocuments({ creator: creatorId, status: 'published' }),
      CreatorContent.countDocuments({ creator: creatorId, status: 'processing' }),
      CreatorContent.countDocuments({ creator: creatorId, status: 'rejected' }),
      CreatorContent.countDocuments({ creator: creatorId, contentType: ContentType.SHORT_FILM }),
      CreatorContent.countDocuments({ creator: creatorId, contentType: ContentType.EDUCATIONAL }),
      CreatorContent.countDocuments({ creator: creatorId, contentType: ContentType.SERIES }),
      
      // Channel subscribers
      channel ? ChannelSubscription.countDocuments({
        channel: channel._id,
        isActive: true
      }) : 0,
      
      // Total likes across all content
      CreatorContent.aggregate([
        { $match: { creator: new mongoose.Types.ObjectId(creatorId) } },
        { $group: { _id: null, totalLikes: { $sum: "$likes" } } }
      ]),
      
      // Total views across all content
      CreatorContent.aggregate([
        { $match: { creator: new mongoose.Types.ObjectId(creatorId) } },
        { $group: { _id: null, totalViews: { $sum: "$views" } } }
      ]),
      
      // Total donations received
      Donation.aggregate([
        { $match: { creator: new mongoose.Types.ObjectId(creatorId) } },
        { $group: { _id: null, totalAmount: { $sum: "$amount" }, totalCount: { $sum: 1 } } }
      ]),
      
      // Recent content (last 5 items)
      CreatorContent.find({ creator: creatorId })
        .select('_id title contentType status mediaAssets.thumbnail views likes createdAt')
        .populate('genre', 'name nameEs')
        .sort({ createdAt: -1 })
        .limit(5)
        .lean()
    ]);
    
    // Format recent content
    const formattedRecentContent = recentContent.map(item => ({
      id: item._id,
      title: item.title,
      contentType: translateToSpanish ? translateContentType(item.contentType) : item.contentType,
      status: translateToSpanish ? translateContentStatus(item.status) : item.status,
      thumbnail: item.mediaAssets?.thumbnail || '',
      views: item.views || 0,
      likes: item.likes || 0,
      createdAt: item.createdAt,
      genre: item.genre || null
    }));
    
    // Prepare response data
    const profileData = {
      id: creator._id,
      name: creator.name,
      username: creator.username,
      bio: creator.bio,
      email: creator.email,
      profilePicture: creator.profilePicture,
      socialProfiles: creator.socialProfiles || {},
      joinedDate: creator.createdAt,
      status: creator.status,
      subscriptionStatus: creator.subscriptionStatus,
      
      // Channel information
      channel: channel ? {
        id: channel._id,
        name: channel.name,
        description: channel.description,
        thumbnail: channel.thumbnail,
        type: channel.type,
        createdAt: channel.createdAt
      } : null,
      
      // Comprehensive statistics
      stats: {
        content: {
          total: totalContent,
          published: publishedContent,
          pending: pendingContent,
          rejected: rejectedContent,
          byType: {
            shortFilms: totalShortFilms,
            educational: totalEducationalContent,
            series: totalSeries
          }
        },
        engagement: {
          subscribers: subscribers,
          totalLikes: totalLikes.length > 0 ? totalLikes[0].totalLikes : 0,
          totalViews: totalViews.length > 0 ? totalViews[0].totalViews : 0
        },
        monetization: {
          totalDonations: totalDonations.length > 0 ? totalDonations[0].totalAmount : 0,
          donationCount: totalDonations.length > 0 ? totalDonations[0].totalCount : 0
        }
      },
      
      // Recent content
      recentContent: formattedRecentContent
    };
    
    // Transform URLs in the response
    const transformedProfile = transformAllUrls(profileData);
    
    return res.json({
      success: true,
      profile: transformedProfile
    });
    
  } catch (error) {
    console.error('Get creator own profile error:', error);
    return res.status(error.statusCode || 500).json({ 
      success: false, 
      message: error.message || 'Failed to fetch creator profile' 
    });
  }
};

export const searchCreators = async (req, res) => {
  try {
    const {
      search = '',
      page = 1,
      limit = 10,
      sort = 'createdAt',
      order = 'desc'
    } = req.query;
    
    const query = { role: UserRole.CREATOR };
    
    // Apply search filter if provided - using simple regex without complex operators
    if (search) {
      const searchRegex = new RegExp(search, 'i');
      query.$or = [
        { name: searchRegex },
        { username: searchRegex }
      ];
    }
    
    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Determine sort order
    const sortOptions = {};
    sortOptions[sort] = order === 'asc' ? 1 : -1;
    
    // Execute query
    const [creators, total] = await Promise.all([
      User.find(query)
        .select('_id name username bio profilePicture createdAt')
        .sort(sortOptions)
        .skip(skip)
        .limit(parseInt(limit)),
      User.countDocuments(query)
    ]);
    
    return res.json({
      success: true,
      creators,
      pagination: {
        total,
        pages: Math.ceil(total / parseInt(limit)),
        page: parseInt(page),
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Search creators error:', error);
    return res.status(error.statusCode || 500).json({ 
      success: false, 
      message: error.message || 'Failed to search creators' 
    });
  }
};