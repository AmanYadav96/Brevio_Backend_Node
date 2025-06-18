import CreatorContent, { ContentType, PricingModel } from '../models/creatorContent.model.js'
import { OrientationType } from '../models/contentOrientation.model.js'
import videoProcessorService from '../services/videoProcessor.service.js'
import User, { UserRole } from '../models/user.model.js'
import mongoose from 'mongoose'

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
    
    const content = await CreatorContent.findById(contentId)
      .populate('creator', 'name username profilePicture')
      // Removed the genres population since it's not in the schema
    
    if (!content) {
      return res.status(404).json({ 
        success: false, 
        message: "Content not found" 
      })
    }
    
    // Transform URLs in content before sending to client
    const transformedContent = transformAllUrls(content);
    
    return res.json({ 
      success: true, 
      content: transformedContent
    });
  } catch (error) {
    console.error("Get content error:", error)
    return res.status(500).json({ 
      success: false, 
      message: error.message 
    })
  }
}

// Add this import at the top of the file
import { transformAllUrls } from '../utils/cloudStorage.js';

// Import the utility function at the top of the file
import { getBlockedUserIds } from './userBlock.controller.js';

// Get all content (with filters)
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
      order = 'desc'
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
    
    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Determine sort order
    const sortOptions = {};
    sortOptions[sort] = order === 'asc' ? 1 : -1;
    
    // Use lean() to get plain JavaScript objects instead of Mongoose documents
    // This is much faster and uses less memory
    const [content, total] = await Promise.all([
      CreatorContent.find(query)
        .populate('creator', 'name username profilePicture')
        .populate('genre', 'name nameEs')
        .sort(sortOptions)
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      CreatorContent.countDocuments(query)
    ]);
    
    // Transform URLs in content before sending to client
    const transformedContent = transformAllUrls(content);
    
    // Shuffle the content array if needed
    const shuffledContent = [...transformedContent].sort(() => Math.random() - 0.5);
    
    return res.json({
      success: true,
      content: shuffledContent,
      pagination: {
        total,
        pages: Math.ceil(total / parseInt(limit)),
        page: parseInt(page),
        limit: parseInt(limit)
      }
    });
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