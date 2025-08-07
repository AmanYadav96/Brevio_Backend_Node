import CreatorContent, { ContentType, PricingModel } from '../models/creatorContent.model.js'
import { OrientationType } from '../models/contentOrientation.model.js'
import videoProcessorService from '../services/videoProcessor.service.js'
import User, { UserRole } from '../models/user.model.js'
import mongoose from 'mongoose'
// Añadir esta importación para la función transformAllUrls
import { transformAllUrls } from '../utils/cloudStorage.js'
// Importación existente para la traducción de estados
import { translateContentStatus } from '../utils/statusTranslation.js'
// Importar la función getBlockedUserIds
import { getBlockedUserIds } from '../controllers/userBlock.controller.js'
import { shouldTranslateToSpanish } from '../utils/languageHandler.js';
// Import Like and Save models for likes count and saved status
import Like from '../models/like.model.js'
import Save from '../models/save.model.js'


// Create new content
export const createContent = async (req, res) => {
  try {
    const user = req.user
    const uploads = req.uploads || {}
    
    // Get body data - either from middleware or from request
    let body = req.body
    
    // Ensure we have valid data
    if (!body || Object.keys(body).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No content data provided'
      })
    }
    
    console.log('Content data being processed:', JSON.stringify(body, null, 2))
    
    // Check if user is creator or admin
    if (user.role !== UserRole.CREATOR && user.role !== UserRole.ADMIN) {
      return res.status(403).json({ 
        success: false, 
        message: "Only creators and admins can upload content" 
      })
    }
    
    // Process video metadata for orientation validation
    let videoMetadata = {}
    if (body.contentType === ContentType.SHORT_FILM && uploads.videoFile) {
      videoMetadata = await videoProcessorService.detectOrientation(uploads.videoFile)
      
      // Validate orientation
      try {
        videoProcessorService.validateOrientation(videoMetadata, body.orientation)
      } catch (error) {
        return res.status(400).json({ 
          success: false, 
          message: req.translate(error.message) 
        })
      }
    }
    
    // Convert string values to appropriate types
    if (body.ageRating && typeof body.ageRating === 'string') {
      // Convert string ageRating to valid enum value
      // Assuming valid values are: 'G', 'PG', 'PG-13', 'R', '18+', etc.
      // Map numeric ratings to valid enum values
      const ageRatingMap = {
        '15': 'PG-13',
        '18': '18+',
        '13': 'PG-13',
        '7': 'PG',
        '0': 'G'
      };
      
      body.ageRating = ageRatingMap[body.ageRating] || 'PG-13';
    }
    
    // Create content with appropriate fields based on content type
    const contentData = {
      ...body,
      creator: user._id,
      videoMetadata,
      status: user.role === UserRole.ADMIN ? 'published' : 'processing',
      adminApproved: user.role === UserRole.ADMIN
    }
    
    // Add media assets
    contentData.mediaAssets = {
      thumbnail: uploads.thumbnail || body.mediaAssets?.thumbnail,
      verticalBanner: uploads.verticalBanner || body.mediaAssets?.verticalBanner,
      horizontalBanner: uploads.horizontalBanner || body.mediaAssets?.horizontalBanner,
      trailer: uploads.trailer || body.mediaAssets?.trailer,
      trailerDuration: uploads.trailerDuration || body.mediaAssets?.trailerDuration
    }
    
    // Add video file if present
    if (uploads.videoFile) {
      contentData.videoUrl = uploads.videoFile
    }
    
    const content = await CreatorContent.create(contentData)
    
    return res.status(201).json({
      success: true,
      message: 'Content created successfully',
      content
    })
  } catch (error) {
    console.error('Create content error:', error)
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to create content'
    })
  }
}

// Add episode to series
export const addEpisode = async (req, res) => {
  try {
    const user = req.user
    const uploads = req.uploads || {}
    const { contentId, seasonId } = req.params
    
    // Get body data
    const body = req.body
    
    // Find content and verify ownership
    const content = await CreatorContent.findById(contentId)
    
    if (!content) {
      return res.status(404).json({ 
        success: false, 
        message: "Content not found" 
      })
    }
    
    // Check if user is creator or admin
    if (!content.creator.equals(user._id) && user.role !== UserRole.ADMIN) {
      return res.status(403).json({ 
        success: false, 
        message: "You don't have permission to modify this content" 
      })
    }
    
    // Verify content type is series
    if (content.contentType !== ContentType.SERIES) {
      return res.status(400).json({ 
        success: false, 
        message: "This operation is only valid for series content" 
      })
    }
    
    // Find the season
    const season = content.seasons.id(seasonId)
    if (!season) {
      return res.status(404).json({ 
        success: false, 
        message: "Season not found" 
      })
    }
    
    // Process video metadata for orientation validation
    let videoMetadata = {}
    if (uploads.videoFile) {
      videoMetadata = await videoProcessorService.detectOrientation(uploads.videoFile)
      
      // Validate orientation
      try {
        videoProcessorService.validateOrientation(videoMetadata, content.orientation)
      } catch (error) {
        return res.status(400).json({ 
          success: false, 
          message: error.message 
        })
      }
    }
    
    // Create episode
    const episode = {
      ...body,
      videoUrl: uploads.videoFile,
      thumbnail: uploads.thumbnail || body.thumbnail,
      duration: videoMetadata.duration || body.duration
    }
    
    // Add episode to season
    season.episodes.push(episode)
    
    // Update content status if it was rejected
    if (content.status === 'rejected') {
      content.status = 'processing'
      content.rejectionReason = ''
    }
    
    await content.save()
    
    return res.json({ 
      success: true, 
      episode: season.episodes[season.episodes.length - 1],
      message: "Episode added successfully"
    })
  } catch (error) {
    console.error("Add episode error:", error)
    return res.status(500).json({ 
      success: false, 
      message: error.message 
    })
  }
}

// Add lesson to educational content
export const addLesson = async (req, res) => {
  try {
    const user = req.user
    const uploads = req.uploads || {}
    const { contentId } = req.params
    
    // Get body data
    const body = req.body
    
    // Find content and verify ownership
    const content = await CreatorContent.findById(contentId)
    
    if (!content) {
      return res.status(404).json({ 
        success: false, 
        message: "Content not found" 
      })
    }
    
    // Check if user is creator or admin
    if (!content.creator.equals(user._id) && user.role !== UserRole.ADMIN) {
      return res.status(403).json({ 
        success: false, 
        message: "You don't have permission to modify this content" 
      })
    }
    
    // Verify content type is educational
    if (content.contentType !== ContentType.EDUCATIONAL) {
      return res.status(400).json({ 
        success: false, 
        message: "This operation is only valid for educational content" 
      })
    }
    
    // Process video metadata for orientation validation
    let videoMetadata = {}
    if (uploads.videoFile) {
      videoMetadata = await videoProcessorService.detectOrientation(uploads.videoFile)
      
      // Validate orientation
      try {
        videoProcessorService.validateOrientation(videoMetadata, content.orientation)
      } catch (error) {
        return res.status(400).json({ 
          success: false, 
          message: error.message 
        })
      }
    }
    
    // Create lesson
    const lesson = {
      ...body,
      videoUrl: uploads.videoFile,
      thumbnail: uploads.thumbnail || body.thumbnail,
      duration: videoMetadata.duration || body.duration,
      order: content.lessons.length + 1
    }
    
    // Add lesson to content
    content.lessons.push(lesson)
    
    // Update content status if it was rejected
    if (content.status === 'rejected') {
      content.status = 'processing'
      content.rejectionReason = ''
    }
    
    await content.save()
    
    return res.json({ 
      success: true, 
      lesson: content.lessons[content.lessons.length - 1],
      message: "Lesson added successfully"
    })
  } catch (error) {
    console.error("Add lesson error:", error)
    return res.status(500).json({ 
      success: false, 
      message: error.message 
    })
  }
}

// Admin approve content
export const approveContent = async (req, res) => {
  try {
    const user = req.user
    const { contentId } = req.params
    
    // Check if user is admin
    if (user.role !== UserRole.ADMIN) {
      return res.status(403).json({ 
        success: false, 
        message: "Only admins can approve content" 
      })
    }
    
    // Find and update content
    const content = await CreatorContent.findByIdAndUpdate(
      contentId,
      {
        status: 'published',
        adminApproved: true
      },
      { new: true }
    ).populate('creator', 'name email');
    
    if (!content) {
      return res.status(404).json({ 
        success: false, 
        message: "Content not found" 
      })
    }
    
    // Send approval email to creator
    try {
      const { default: emailService } = await import('../services/email.service.js');
      
      await emailService.sendContentApprovalEmail({
        to: content.creator.email,
        userName: content.creator.name,
        contentTitle: content.title,
        contentType: content.contentType,
        contentId: content._id
      });
      
      console.log(`Content approval email sent to ${content.creator.email}`);
    } catch (emailError) {
      // Log error but don't fail the request
      console.error("Error sending content approval email:", emailError);
    }
    
    return res.json({ 
      success: true, 
      content,
      message: "Content approved and published successfully"
    })
  } catch (error) {
    console.error("Approve content error:", error)
    return res.status(500).json({ 
      success: false, 
      message: error.message 
    })
  }
}

// Admin reject content
export const rejectContent = async (req, res) => {
  try {
    const user = req.user
    const { contentId } = req.params
    const { reason } = req.body
    
    // Check if user is admin
    if (user.role !== UserRole.ADMIN) {
      return res.status(403).json({ 
        success: false, 
        message: "Only admins can reject content" 
      })
    }
    
    // Find and update content
    const content = await CreatorContent.findByIdAndUpdate(
      contentId,
      {
        status: 'rejected',
        adminApproved: false,
        rejectionReason: reason || "Content does not meet platform guidelines"
      },
      { new: true }
    ).populate('creator', 'name email');
    
    if (!content) {
      return res.status(404).json({ 
        success: false, 
        message: "Content not found" 
      })
    }
    
    // Send rejection email to creator
    try {
      const { default: emailService } = await import('../services/email.service.js');
      
      await emailService.sendContentRejectionEmail({
        to: content.creator.email,
        userName: content.creator.name,
        contentTitle: content.title,
        contentType: content.contentType,
        contentId: content._id,
        rejectionReason: content.rejectionReason
      });
      
      console.log(`Content rejection email sent to ${content.creator.email}`);
    } catch (emailError) {
      // Log error but don't fail the request
      console.error("Error sending content rejection email:", emailError);
    }
    
    return res.json({ 
      success: true, 
      content,
      message: "Content rejected successfully"
    })
  } catch (error) {
    console.error("Reject content error:", error)
    return res.status(500).json({ 
      success: false, 
      message: error.message 
    })
  }
}

// Get content by ID
export const getContentById = async (req, res) => {
  try {
    const { contentId } = req.params
    const user = req.user; // Get authenticated user if available
    
    const content = await CreatorContent.findById(contentId)
      .populate('creator', 'name username profilePicture')
      .populate('genre', 'name nameEs')
    
    if (!content) {
      return res.status(404).json({ 
        success: false, 
        message: "Content not found" 
      })
    }
    
    // Transform URLs in content before sending to client
    const transformedContent = transformAllUrls(content);
    
    // Get likes count for this content
    const likesCount = await Like.countDocuments({
      contentType: 'creatorContent',
      contentId: contentId
    });
    
    // Check if user has saved this content (only if user is authenticated)
    let userSaved = false;
    let savedFolder = null;
    if (user) {
      const saveRecord = await Save.findOne({
        user: user._id,
        contentType: 'creatorContent',
        contentId: contentId
      });
      userSaved = !!saveRecord;
      savedFolder = saveRecord ? saveRecord.folder : null;
    }
    
    // Check if user has liked this content (only if user is authenticated)
    let userLiked = false;
    if (user) {
      const likeRecord = await Like.findOne({
        user: user._id,
        contentType: 'creatorContent',
        contentId: contentId
      });
      userLiked = !!likeRecord;
    }
    
    // Add likes and saved info to content
    const contentWithLikesAndSaves = {
      ...transformedContent,
      likesCount,
      userSaved,
      savedFolder,
      userLiked
    };
    
    // Traducir el estado a español para la respuesta
    if (contentWithLikesAndSaves.status) {
      contentWithLikesAndSaves.statusInSpanish = translateContentStatus(contentWithLikesAndSaves.status);
    }
    
    return res.json({ 
      success: true, 
      content: contentWithLikesAndSaves
    });
  } catch (error) {
    console.error("Get content error:", error)
    return res.status(500).json({ 
      success: false, 
      message: error.message 
    })
  }
}

// Modificar la función getAllContent para traducir los estados
export const getAllContent = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      contentType,
      orientation,
      status,
      creatorId,
      genre,
      search,
      sort = 'createdAt',
      order = 'desc',
      ignoreLimit = true // Add this parameter to bypass pagination
    } = req.query;
    
    const query = {};
    
    // Apply filters
    if (contentType) query.contentType = contentType;
    if (orientation) query.orientation = orientation;
    if (status) query.status = status;
    if (creatorId) query.creator = creatorId;
    if (genre) query.genre = genre;
    
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
    
    // Only show published content for non-admin users
    const user = req.user;
    if (!user || user.role !== UserRole.ADMIN) {
      query.status = 'published';
    }
    
    // Filter out content from blocked users if user is authenticated
    if (user) {
      const blockedUserIds = await getBlockedUserIds(user._id);
      if (blockedUserIds.length > 0) {
        query.creator = { $nin: blockedUserIds };
      }
    }
    
    // Determine sort order
    const sortOptions = {};
    sortOptions[sort] = order === 'asc' ? 1 : -1;
    
    // Build the query
    let contentQuery = CreatorContent.find(query)
      .populate('creator', 'name username profilePicture')
      .populate('genre', 'name nameEs')
      .sort(sortOptions)
      .lean();
    
    // Apply pagination only if ignoreLimit is false
    if (!ignoreLimit && ignoreLimit !== 'true') {
      const skip = (parseInt(page) - 1) * parseInt(limit);
      contentQuery = contentQuery.skip(skip).limit(parseInt(limit));
    }
    
    // Execute queries
    const [content, total] = await Promise.all([
      contentQuery,
      CreatorContent.countDocuments(query)
    ]);
    
    // Transform URLs in content before sending to client
    const transformedContent = transformAllUrls(content);
    
    // Add likes count and saved status for each content
    const contentWithLikesAndSaves = await Promise.all(
      transformedContent.map(async (contentItem) => {
        // Get likes count for this content
        const likesCount = await Like.countDocuments({
          contentType: 'creatorContent',
          contentId: contentItem._id
        });
        
        // Check if user has saved this content (only if user is authenticated)
        let userSaved = false;
        let savedFolder = null;
        if (user) {
          const saveRecord = await Save.findOne({
            user: user._id,
            contentType: 'creatorContent',
            contentId: contentItem._id
          });
          userSaved = !!saveRecord;
          savedFolder = saveRecord ? saveRecord.folder : null;
        }
        
        // Check if user has liked this content (only if user is authenticated)
        let userLiked = false;
        if (user) {
          const likeRecord = await Like.findOne({
            user: user._id,
            contentType: 'creatorContent',
            contentId: contentItem._id
          });
          userLiked = !!likeRecord;
        }
        
        return {
          ...contentItem,
          likesCount,
          userSaved,
          savedFolder,
          userLiked
        };
      })
    );
    
    // Shuffle the content array if needed
    const shuffledContent = [...contentWithLikesAndSaves].sort(() => Math.random() - 0.5);
    
    // Build response based on whether pagination is ignored
    const response = {
      success: true,
      content: shuffledContent
    };
    
    // Add pagination info only if limits are not ignored
    if (!ignoreLimit && ignoreLimit !== 'true') {
      response.pagination = {
        total,
        pages: Math.ceil(total / parseInt(limit)),
        page: parseInt(page),
        limit: parseInt(limit)
      };
    } else {
      response.total = total;
    }
    
    return res.json(response);
  } catch (error) {
    console.error('Get all content error:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to fetch content'
    });
  }
};

// Purchase educational content
export const purchaseEducationalContent = async (req, res) => {
  try {
    const user = req.user
    const { contentId } = req.params
    
    // Find content
    const content = await CreatorContent.findById(contentId)
    
    if (!content) {
      return res.status(404).json({ 
        success: false, 
        message: "Content not found" 
      })
    }
    
    // Verify content type is educational
    if (content.contentType !== ContentType.EDUCATIONAL) {
      return res.status(400).json({ 
        success: false, 
        message: "This operation is only valid for educational content" 
      })
    }
    
    // Verify content is published
    if (content.status !== 'published') {
      return res.status(400).json({ 
        success: false, 
        message: "This content is not available for purchase" 
      })
    }
    
    // Check if content is paid
    if (content.pricing.model !== PricingModel.PAID) {
      return res.status(400).json({ 
        success: false, 
        message: "This content is not available for purchase" 
      })
    }
    
    // TODO: Implement payment processing logic here
    // This would typically involve:
    // 1. Creating a payment intent with Stripe
    // 2. Processing the payment
    // 3. Recording the purchase in a purchases collection
    
    // For now, we'll just return a success message
    return res.json({ 
      success: true, 
      message: "Purchase flow initiated",
      content: {
        id: content._id,
        title: content.title,
        price: content.pricing.discountPrice || content.pricing.price,
        currency: content.pricing.currency
      }
    })
  } catch (error) {
    console.error("Purchase content error:", error)
    return res.status(500).json({ 
      success: false, 
      message: error.message 
    })
  }
}

// Step 1: Create basic content with metadata only
export const createContentBasic = async (req, res) => {
  try {
    // Get user from request
    const user = req.user;
    
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: 'User not authenticated' 
      });
    }
    
    // Parse request body
    const body = req.body;
    
    // Ensure we have valid data
    if (!body || Object.keys(body).length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'No content data provided' 
      });
    }
    
    console.log('Basic content data being processed:', JSON.stringify(body, null, 2));
    
    // Check if user is creator or admin
    if (user.role !== UserRole.CREATOR && user.role !== UserRole.ADMIN) {
      return res.status(403).json({ 
        success: false, 
        message: "Only creators and admins can upload content" 
      });
    }
    
    // Create content with appropriate fields based on content type
    const contentData = {
      ...body,
      creator: user._id,
      status: 'draft', // Start as draft until video is uploaded
      adminApproved: false
    };
    
    // Initialize empty media assets
    contentData.mediaAssets = {
      thumbnail: '',
      verticalBanner: '',
      horizontalBanner: '',
      trailer: '',
      trailerDuration: 0
    };
    
    const content = await CreatorContent.create(contentData);
    
    return res.status(201).json({ 
      success: true, 
      content, 
      message: "Content draft created successfully. Please upload video and media assets." 
    });
  } catch (error) {
    console.error("Create basic content error:", error);
    return res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// Step 2: Upload main video
export const uploadMainVideo = async (req, res) => {
  try {
    const uploads = req.uploads || {}  
    const body = req.body;
    
    console.log('Uploads object:', uploads);
    console.log('Body object:', body);
    
    const user = req.user;
    const fileUploads = req.fileUploads || [];
    const { contentId } = req.params;
    
    // Find content and verify ownership
    const content = await CreatorContent.findById(contentId);
    
    if (!content) {
      return res.status(404).json({
        success: false,
        message: "Content not found"
      });
    }
    
    // Check if user is creator or admin
    if (!content.creator.equals(user._id) && user.role !== UserRole.ADMIN) {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to modify this content"
      });
    }
    
    // Ensure we have a video file
    if (!uploads.videoFile) {
      return res.status(400).json({
        success: false,
        message: "No video file provided"
      });
    }
    
    // Process video metadata for orientation validation
    let videoMetadata = {}
    if (content.contentType === ContentType.SHORT_FILM && uploads.videoFile) {
      // Change this line:
      // videoMetadata = await videoProcessorService.detectOrientation(uploads.videoFile)
      // To this:
      videoMetadata = await videoProcessorService.detectOrientation(uploads.videoFile.url.trim())
      
      // Validate orientation
      try {
        videoProcessorService.validateOrientation(videoMetadata, content.orientation)
      } catch (error) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }
    }
    
    // Update content with video URL and metadata
    content.videoUrl = uploads.videoFile.url.trim();
    content.duration = videoMetadata.duration || content.duration;
    content.videoMetadata = videoMetadata;
    content.duration = videoMetadata.duration || content.duration;
    
    // Update status if all required fields are present
    if (content.title && content.description && content.videoUrl) {
      content.status = user.role === UserRole.ADMIN ? 'published' : 'processing';
    }
    
    await content.save();
    
    return res.json({
      success: true,
      content,
      fileUploads,
      message: "Video uploaded successfully"
    });
  } catch (error) {
    console.error("Upload main video error:", error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
}

// Step 3: Upload media assets
export const uploadMediaAssets = async (req, res) => {
  try {
    const user = req.user
    const uploads = req.uploads || {}
    const fileUploads = req.fileUploads || []
    const { contentId } = req.params
    
    // Find content and verify ownership
    const content = await CreatorContent.findById(contentId)
    
    if (!content) {
      return res.status(404).json({ 
        success: false, 
        message: "Content not found" 
      })
    }
    
    // Check if user is creator or admin
    if (!content.creator.equals(user._id) && user.role !== UserRole.ADMIN) {
      return res.status(403).json({ 
        success: false, 
        message: "You don't have permission to modify this content" 
      })
    }
    
    // Update media assets
    content.mediaAssets = {
      thumbnail: uploads.thumbnail?.url || content.mediaAssets?.thumbnail || '',
      verticalBanner: uploads.verticalBanner?.url || content.mediaAssets?.verticalBanner || '',
      horizontalBanner: uploads.horizontalBanner?.url || content.mediaAssets?.horizontalBanner || '',
      trailer: uploads.trailer?.url || content.mediaAssets?.trailer || '',
      trailerDuration: uploads.trailer?.duration || content.mediaAssets?.trailerDuration || 0
    }
    
    // Update status if this completes the content
    if (content.status === 'draft' && content.videoUrl) {
      content.status = user.role === UserRole.ADMIN ? 'published' : 'processing'
    }
    
    await content.save()
    
    // Send email notification if content is complete
    if (content.status === 'processing' || content.status === 'published') {
      try {
        const { default: emailService } = await import('../services/email.service.js');
        
        // Send email to creator
        await emailService.sendContentUploadedEmail({
          to: user.email,
          userName: user.name,
          contentTitle: content.title,
          contentType: content.contentType,
          contentId: content._id,
          isAutoApproved: user.role === UserRole.ADMIN
        });
        
        // If creator is not admin, send notification to admins
        if (user.role !== UserRole.ADMIN) {
          // Find admin emails
          const admins = await User.find({ role: UserRole.ADMIN }).select('email name');
          
          if (admins.length > 0) {
            // Send notification to each admin
            for (const admin of admins) {
              await emailService.sendContentReviewNotificationEmail({
                to: admin.email,
                adminName: admin.name,
                creatorName: user.name,
                contentTitle: content.title,
                contentType: content.contentType,
                contentId: content._id
              });
            }
          }
        }
        
        console.log(`Content upload email sent to ${user.email}`);
      } catch (emailError) {
        // Log error but don't fail the request
        console.error("Error sending content upload email:", emailError);
      }
    }
    
    return res.json({ 
      success: true, 
      content,
      fileUploads,
      message: "Media assets uploaded successfully"
    })
  } catch (error) {
    console.error("Upload media assets error:", error)
    return res.status(500).json({ 
      success: false, 
      message: error.message 
    })
  }
}

// Update content by ID
export const updateContent = async (req, res) => {
  try {
    const { contentId } = req.params;
    const user = req.user;
    const updateData = req.body;
    const uploads = req.uploads || {};
    
    // Determine if we should translate to Spanish
    const translateToSpanish = shouldTranslateToSpanish(req);
    
    // Find the content
    const content = await CreatorContent.findById(contentId);
    
    if (!content) {
      const errorMessage = translateToSpanish ? 
        "Contenido no encontrado" : 
        "Content not found";
      
      return res.status(404).json({ 
        success: false, 
        message: errorMessage
      });
    }
    
    // Check if user is the creator or an admin
    if (content.creator.toString() !== user._id.toString() && 
        user.role !== UserRole.ADMIN) {
      const errorMessage = translateToSpanish ? 
        "No tienes permiso para editar este contenido" : 
        "You don't have permission to edit this content";
      
      return res.status(403).json({ 
        success: false, 
        message: errorMessage
      });
    }
    
    // Restricted fields that cannot be directly updated
    const restrictedFields = [
      'creator', 
      'views', 
      'likes', 
      'adminApproved',
      'videoMetadata',
      'videoUrl' // Prevent updating main video through this endpoint
    ];
    
    // Remove restricted fields from update data
    restrictedFields.forEach(field => {
      if (updateData[field]) {
        delete updateData[field];
      }
    });
    
    // Special handling for status changes
    if (updateData.status) {
      // Only allow certain status transitions
      if (content.status === 'rejected' && updateData.status !== 'draft') {
        // If content was rejected, it can only be changed to draft
        updateData.status = 'draft';
      }
      
      // If changing from rejected to draft, reset rejection reason
      if (content.status === 'rejected' && updateData.status === 'draft') {
        updateData.rejectionReason = null;
      }
      
      // Only admins can approve content
      if (updateData.status === 'published' && user.role !== UserRole.ADMIN) {
        delete updateData.status;
      }
    }
    
    // Handle file uploads if present in the request
    if (Object.keys(uploads).length > 0) {
      // Update media assets with uploaded files
      updateData.mediaAssets = {
        thumbnail: uploads.thumbnail?.url || content.mediaAssets?.thumbnail || '',
        verticalBanner: uploads.verticalBanner?.url || content.mediaAssets?.verticalBanner || '',
        horizontalBanner: uploads.horizontalBanner?.url || content.mediaAssets?.horizontalBanner || '',
        trailer: uploads.trailer?.url || content.mediaAssets?.trailer || '',
        trailerDuration: uploads.trailer?.duration || content.mediaAssets?.trailerDuration || 0
      };
    }
    
    // Update the content
    const updatedContent = await CreatorContent.findByIdAndUpdate(
      contentId,
      updateData,
      { new: true, runValidators: true }
    ).populate('creator', 'name username profilePicture');
    
    // Transform URLs in content before sending to client
    const transformedContent = transformAllUrls(updatedContent);
    
    // Translate status if needed
    if (translateToSpanish && transformedContent.status) {
      transformedContent.statusInSpanish = translateContentStatus(transformedContent.status);
    }
    
    const successMessage = translateToSpanish ? 
      "Contenido actualizado exitosamente" : 
      "Content updated successfully";
    
    return res.json({ 
      success: true, 
      message: successMessage,
      language: translateToSpanish ? 'es' : 'en',
      content: transformedContent
    });
  } catch (error) {
    console.error("Update content error:", error);
    return res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// Delete content by ID
export const deleteContent = async (req, res) => {
  try {
    const { contentId } = req.params;
    const user = req.user;
    
    // Determine if we should translate to Spanish
    const translateToSpanish = shouldTranslateToSpanish(req);
    
    // Find the content
    const content = await CreatorContent.findById(contentId);
    
    if (!content) {
      const errorMessage = translateToSpanish ? 
        "Contenido no encontrado" : 
        "Content not found";
      
      return res.status(404).json({ 
        success: false, 
        message: errorMessage
      });
    }
    
    // Check if user is the creator or an admin
    if (content.creator.toString() !== user._id.toString() && 
        user.role !== UserRole.ADMIN) {
      const errorMessage = translateToSpanish ? 
        "No tienes permiso para eliminar este contenido" : 
        "You don't have permission to delete this content";
      
      return res.status(403).json({ 
        success: false, 
        message: errorMessage
      });
    }
    
    let result;
    
    // If content is published, perform a soft delete (archive)
    if (content.status === 'published') {
      result = await CreatorContent.findByIdAndUpdate(
        contentId,
        { status: 'archived' },
        { new: true }
      );
      
      const successMessage = translateToSpanish ? 
        "Contenido archivado exitosamente" : 
        "Content archived successfully";
      
      return res.json({ 
        success: true, 
        message: successMessage,
        language: translateToSpanish ? 'es' : 'en',
        content: result
      });
    } 
    // For content in other states (draft, processing, rejected), perform hard delete
    else {
      result = await CreatorContent.findByIdAndDelete(contentId);
      
      const successMessage = translateToSpanish ? 
        "Contenido eliminado exitosamente" : 
        "Content deleted successfully";
      
      return res.json({ 
        success: true, 
        message: successMessage,
        language: translateToSpanish ? 'es' : 'en'
      });
    }
  } catch (error) {
    console.error("Delete content error:", error);
    return res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// Bulk approve content
export const bulkApproveContent = async (req, res) => {
  try {
    const user = req.user
    const { contentIds } = req.body
    
    // Validate input
    if (!contentIds || !Array.isArray(contentIds) || contentIds.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: "Please provide an array of content IDs" 
      })
    }
    
    // Check if user is admin
    if (user.role !== UserRole.ADMIN) {
      return res.status(403).json({ 
        success: false, 
        message: "Only admins can approve content" 
      })
    }
    
    // Find and update all content items
    const updateResult = await CreatorContent.updateMany(
      { _id: { $in: contentIds } },
      {
        status: 'published',
        adminApproved: true
      }
    );
    
    // Get updated content with creator info for emails
    const updatedContent = await CreatorContent.find(
      { _id: { $in: contentIds } }
    ).populate('creator', 'name email');
    
    // Send approval emails to creators
    const emailPromises = [];
    const { default: emailService } = await import('../services/email.service.js');
    
    for (const content of updatedContent) {
      try {
        const emailPromise = emailService.sendContentApprovalEmail({
          to: content.creator.email,
          userName: content.creator.name,
          contentTitle: content.title,
          contentType: content.contentType,
          contentId: content._id
        });
        
        emailPromises.push(emailPromise);
      } catch (emailError) {
        console.error(`Error preparing approval email for content ${content._id}:`, emailError);
      }
    }
    
    // Wait for all emails to be sent, but don't block the response
    Promise.allSettled(emailPromises)
      .then(results => {
        const sentCount = results.filter(r => r.status === 'fulfilled').length;
        console.log(`Sent ${sentCount}/${emailPromises.length} content approval emails`);
      })
      .catch(error => {
        console.error("Error sending bulk approval emails:", error);
      });
    
    return res.json({ 
      success: true, 
      message: `${updateResult.modifiedCount} content items approved and published successfully`,
      modifiedCount: updateResult.modifiedCount,
      matchedCount: updateResult.matchedCount
    })
  } catch (error) {
    console.error("Bulk approve content error:", error)
    return res.status(500).json({ 
      success: false, 
      message: error.message 
    })
  }
}

// Bulk reject content
export const bulkRejectContent = async (req, res) => {
  try {
    const user = req.user
    const { contentIds, reason } = req.body
    
    // Validate input
    if (!contentIds || !Array.isArray(contentIds) || contentIds.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: "Please provide an array of content IDs" 
      })
    }
    
    // Check if user is admin
    if (user.role !== UserRole.ADMIN) {
      return res.status(403).json({ 
        success: false, 
        message: "Only admins can reject content" 
      })
    }
    
    // Find and update all content items
    const updateResult = await CreatorContent.updateMany(
      { _id: { $in: contentIds } },
      {
        status: 'rejected',
        adminApproved: false,
        rejectionReason: reason || "Content does not meet platform guidelines"
      }
    );
    
    // Get updated content with creator info for emails
    const updatedContent = await CreatorContent.find(
      { _id: { $in: contentIds } }
    ).populate('creator', 'name email');
    
    // Send rejection emails to creators
    const emailPromises = [];
    const { default: emailService } = await import('../services/email.service.js');
    
    for (const content of updatedContent) {
      try {
        const emailPromise = emailService.sendContentRejectionEmail({
          to: content.creator.email,
          userName: content.creator.name,
          contentTitle: content.title,
          contentType: content.contentType,
          contentId: content._id,
          rejectionReason: content.rejectionReason
        });
        
        emailPromises.push(emailPromise);
      } catch (emailError) {
        console.error(`Error preparing rejection email for content ${content._id}:`, emailError);
      }
    }
    
    // Wait for all emails to be sent, but don't block the response
    Promise.allSettled(emailPromises)
      .then(results => {
        const sentCount = results.filter(r => r.status === 'fulfilled').length;
        console.log(`Sent ${sentCount}/${emailPromises.length} content rejection emails`);
      })
      .catch(error => {
        console.error("Error sending bulk rejection emails:", error);
      });
    
    return res.json({ 
      success: true, 
      message: `${updateResult.modifiedCount} content items rejected successfully`,
      modifiedCount: updateResult.modifiedCount,
      matchedCount: updateResult.matchedCount
    })
  } catch (error) {
    console.error("Bulk reject content error:", error)
    return res.status(500).json({ 
      success: false, 
      message: error.message 
    })
  }
}

// Mark content as reviewed
export const markContentAsReviewed = async (req, res) => {
  try {
    const user = req.user
    const { contentId } = req.params
    const { reason } = req.body  // Get reason from request body
    
    // Check if user is admin
    if (user.role !== UserRole.ADMIN) {
      return res.status(403).json({ 
        success: false, 
        message: "Only admins can mark content as reviewed" 
      })
    }
    
    // Find and update content
    const content = await CreatorContent.findByIdAndUpdate(
      contentId,
      {
        status: 'reviewed',
        adminApproved: false,
        rejectionReason: reason || "Content does not meet platform guidelines"  // Store the reason
      },
      { new: true }
    ).populate('creator', 'name email');
    
    if (!content) {
      return res.status(404).json({ 
        success: false, 
        message: "Content not found" 
      })
    }
    
    // Send rejection email to creator with the custom reason
    try {
      const { default: emailService } = await import('../services/email.service.js');
      
      await emailService.sendContentFinalRejectionEmail({
        to: content.creator.email,
        userName: content.creator.name,
        contentTitle: content.title,
        contentType: content.contentType,
        contentId: content._id,
        rejectionReason: content.rejectionReason || "No cumple con nuestras directrices de contenido."
      });
      
      console.log(`Correo de rechazo definitivo enviado a ${content.creator.email}`);
    } catch (emailError) {
      // Log error but don't fail the request
      console.error("Error al enviar correo de rechazo definitivo:", emailError);
    }
    
    return res.json({ 
      success: true, 
      content,
      message: "Content marked as reviewed successfully"
    })
  } catch (error) {
    console.error("Mark content as reviewed error:", error)
    return res.status(500).json({ 
      success: false, 
      message: error.message 
    })
  }
}

// Bulk mark content as reviewed
export const bulkMarkContentAsReviewed = async (req, res) => {
  try {
    const user = req.user
    const { contentIds, reason } = req.body  // Get reason from request body
    
    // Validate input
    if (!contentIds || !Array.isArray(contentIds) || contentIds.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: "Please provide an array of content IDs" 
      })
    }
    
    // Check if user is admin
    if (user.role !== UserRole.ADMIN) {
      return res.status(403).json({ 
        success: false, 
        message: "Only admins can mark content as reviewed" 
      })
    }
    
    // Store the rejection reason
    const rejectionReason = reason || "Content does not meet platform guidelines";
    
    // Find and update all content items
    const updateResult = await CreatorContent.updateMany(
      { _id: { $in: contentIds } },
      {
        status: 'reviewed',
        adminApproved: false,
        rejectionReason: rejectionReason  // Store the reason
      }
    );
    
    // Get updated content with creator info for emails
    const updatedContent = await CreatorContent.find(
      { _id: { $in: contentIds } }
    ).populate('creator', 'name email');
    
    // Send rejection emails to creators
    const emailPromises = [];
    const { default: emailService } = await import('../services/email.service.js');
    
    for (const content of updatedContent) {
      try {
        // Only send email if creator and creator.email exist
        if (content.creator && content.creator.email) {
          const emailPromise = emailService.sendContentRejectionEmail({
            to: content.creator.email,
            userName: content.creator.name,
            contentTitle: content.title,
            contentType: content.contentType,
            contentId: content._id,
            rejectionReason: rejectionReason  // Use the custom reason
          });
          
          emailPromises.push(emailPromise);
        }
      } catch (emailError) {
        console.error(`Error preparing review email for content ${content._id}:`, emailError);
      }
    }
    
    // Wait for all emails to be sent, but don't block the response
    Promise.allSettled(emailPromises)
      .then(results => {
        const sentCount = results.filter(r => r.status === 'fulfilled').length;
        console.log(`Sent ${sentCount}/${emailPromises.length} content review emails`);
      })
      .catch(error => {
        console.error("Error sending bulk review emails:", error);
      });
    
    return res.json({ 
      success: true, 
      message: `${updateResult.modifiedCount} content items marked as reviewed successfully`,
      modifiedCount: updateResult.modifiedCount,
      matchedCount: updateResult.matchedCount
    })
  } catch (error) {
    console.error("Bulk mark content as reviewed error:", error)
    return res.status(500).json({ 
      success: false, 
      message: error.message 
    })
  }
}