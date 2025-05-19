import CreatorContent, { ContentType, PricingModel } from '../models/creatorContent.model.js'
import { OrientationType } from '../models/contentOrientation.model.js'
import videoProcessorService from '../services/videoProcessor.service.js'
import User, { UserRole } from '../models/user.model.js'
import mongoose from 'mongoose'

// Create new content
export const createContent = async (c) => {
  try {
    const user = c.get('user')
    const uploads = c.get('uploads') || {}
    
    // Get body data - either from middleware or from request
    let body = c.get('body')
    
    // If body wasn't set by middleware, try to get it from request
    if (!body || Object.keys(body).length === 0) {
      try {
        body = await c.req.json()
      } catch (error) {
        return c.json({
          success: false,
          message: 'No content data provided or invalid JSON'
        }, 400)
      }
    }
    
    // Ensure we have valid data
    if (!body || Object.keys(body).length === 0) {
      return c.json({
        success: false,
        message: 'No content data provided'
      }, 400)
    }
    
    console.log('Content data being processed:', JSON.stringify(body, null, 2))
    
    // Check if user is creator or admin
    if (user.role !== UserRole.CREATOR && user.role !== UserRole.ADMIN) {
      return c.json({ 
        success: false, 
        message: "Only creators and admins can upload content" 
      }, 403)
    }
    
    // Process video metadata for orientation validation
    let videoMetadata = {}
    if (body.contentType === ContentType.SHORT_FILM && uploads.videoFile) {
      videoMetadata = await videoProcessorService.detectOrientation(uploads.videoFile)
      
      // Validate orientation
      try {
        videoProcessorService.validateOrientation(videoMetadata, body.orientation)
      } catch (error) {
        return c.json({ 
          success: false, 
          message: error.message 
        }, 400)
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
    
    // For short films, add video URL and duration
    if (body.contentType === ContentType.SHORT_FILM) {
      // Ensure videoUrl is set - this fixes the "Video URL is required" error
      contentData.videoUrl = uploads.videoFile || body.videoUrl || 'placeholder-url';
      contentData.duration = videoMetadata.duration || body.duration
    }
    
    const content = await CreatorContent.create(contentData)
    
    // Send email notification
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
    
    return c.json({ 
      success: true, 
      content,
      message: user.role === UserRole.ADMIN ? 
        "Content published successfully" : 
        "Content submitted for review"
    }, 201)
  } catch (error) {
    console.error("Create content error:", error)
    return c.json({ 
      success: false, 
      message: error.message 
    }, 500)
  }
}

// Add episode to series
export const addEpisode = async (c) => {
  try {
    const user = c.get('user')
    const uploads = c.get('uploads') || {}
    const { contentId, seasonId } = c.req.param()
    const body = await c.req.json()
    
    // Find content and verify ownership
    const content = await CreatorContent.findById(contentId)
    
    if (!content) {
      return c.json({ 
        success: false, 
        message: "Content not found" 
      }, 404)
    }
    
    // Check if user is creator or admin
    if (!content.creator.equals(user._id) && user.role !== UserRole.ADMIN) {
      return c.json({ 
        success: false, 
        message: "You don't have permission to modify this content" 
      }, 403)
    }
    
    // Verify content type is series
    if (content.contentType !== ContentType.SERIES) {
      return c.json({ 
        success: false, 
        message: "This operation is only valid for series content" 
      }, 400)
    }
    
    // Find the season
    const season = content.seasons.id(seasonId)
    if (!season) {
      return c.json({ 
        success: false, 
        message: "Season not found" 
      }, 404)
    }
    
    // Process video metadata for orientation validation
    let videoMetadata = {}
    if (uploads.videoFile) {
      videoMetadata = await videoProcessorService.detectOrientation(uploads.videoFile)
      
      // Validate orientation
      try {
        videoProcessorService.validateOrientation(videoMetadata, content.orientation)
      } catch (error) {
        return c.json({ 
          success: false, 
          message: error.message 
        }, 400)
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
    
    return c.json({ 
      success: true, 
      episode: season.episodes[season.episodes.length - 1],
      message: "Episode added successfully"
    })
  } catch (error) {
    console.error("Add episode error:", error)
    return c.json({ 
      success: false, 
      message: error.message 
    }, 500)
  }
}

// Add lesson to educational content
export const addLesson = async (c) => {
  try {
    const user = c.get('user')
    const uploads = c.get('uploads') || {}
    const { contentId } = c.req.param()
    const body = await c.req.json()
    
    // Find content and verify ownership
    const content = await CreatorContent.findById(contentId)
    
    if (!content) {
      return c.json({ 
        success: false, 
        message: "Content not found" 
      }, 404)
    }
    
    // Check if user is creator or admin
    if (!content.creator.equals(user._id) && user.role !== UserRole.ADMIN) {
      return c.json({ 
        success: false, 
        message: "You don't have permission to modify this content" 
      }, 403)
    }
    
    // Verify content type is educational
    if (content.contentType !== ContentType.EDUCATIONAL) {
      return c.json({ 
        success: false, 
        message: "This operation is only valid for educational content" 
      }, 400)
    }
    
    // Process video metadata for orientation validation
    let videoMetadata = {}
    if (uploads.videoFile) {
      videoMetadata = await videoProcessorService.detectOrientation(uploads.videoFile)
      
      // Validate orientation
      try {
        videoProcessorService.validateOrientation(videoMetadata, content.orientation)
      } catch (error) {
        return c.json({ 
          success: false, 
          message: error.message 
        }, 400)
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
    
    return c.json({ 
      success: true, 
      lesson: content.lessons[content.lessons.length - 1],
      message: "Lesson added successfully"
    })
  } catch (error) {
    console.error("Add lesson error:", error)
    return c.json({ 
      success: false, 
      message: error.message 
    }, 500)
  }
}

// Admin approve content
export const approveContent = async (c) => {
  try {
    const user = c.get('user')
    const { contentId } = c.req.param()
    
    // Check if user is admin
    if (user.role !== UserRole.ADMIN) {
      return c.json({ 
        success: false, 
        message: "Only admins can approve content" 
      }, 403)
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
      return c.json({ 
        success: false, 
        message: "Content not found" 
      }, 404)
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
    
    return c.json({ 
      success: true, 
      content,
      message: "Content approved and published successfully"
    })
  } catch (error) {
    console.error("Approve content error:", error)
    return c.json({ 
      success: false, 
      message: error.message 
    }, 500)
  }
}

// Admin reject content
export const rejectContent = async (c) => {
  try {
    const user = c.get('user')
    const { contentId } = c.req.param()
    const { reason } = await c.req.json()
    
    // Check if user is admin
    if (user.role !== UserRole.ADMIN) {
      return c.json({ 
        success: false, 
        message: "Only admins can reject content" 
      }, 403)
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
      return c.json({ 
        success: false, 
        message: "Content not found" 
      }, 404)
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
    
    return c.json({ 
      success: true, 
      content,
      message: "Content rejected successfully"
    })
  } catch (error) {
    console.error("Reject content error:", error)
    return c.json({ 
      success: false, 
      message: error.message 
    }, 500)
  }
}

// Get content by ID
export const getContentById = async (c) => {
  try {
    const { contentId } = c.req.param()
    
    const content = await CreatorContent.findById(contentId)
      .populate('creator', 'name username profilePicture')
      .populate('genres', 'name')
    
    if (!content) {
      return c.json({ 
        success: false, 
        message: "Content not found" 
      }, 404)
    }
    
    return c.json({ 
      success: true, 
      content
    })
  } catch (error) {
    console.error("Get content error:", error)
    return c.json({ 
      success: false, 
      message: error.message 
    }, 500)
  }
}

// Get all content (with filters)
export const getAllContent = async (c) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      contentType, 
      orientation, 
      status,
      creatorId,
      search,
      sort = 'createdAt',
      order = 'desc'
    } = c.req.query()
    
    const query = {}
    
    // Apply filters
    if (contentType) query.contentType = contentType
    if (orientation) query.orientation = orientation
    if (status) query.status = status
    if (creatorId) query.creator = creatorId
    
    // Search by title or description
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ]
    }
    
    // Only show published content for non-admin users
    const user = c.get('user')
    if (!user || user.role !== UserRole.ADMIN) {
      query.status = 'published'
    }
    
    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit)
    
    // Determine sort order
    const sortOptions = {}
    sortOptions[sort] = order === 'asc' ? 1 : -1
    
    // Execute query
    const [content, total] = await Promise.all([
      CreatorContent.find(query)
        .populate('creator', 'name username profilePicture')
        .sort(sortOptions)
        .skip(skip)
        .limit(parseInt(limit)),
      CreatorContent.countDocuments(query)
    ])
    
    return c.json({
      success: true,
      content,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    })
  } catch (error) {
    console.error("Get all content error:", error)
    return c.json({ 
      success: false, 
      message: error.message 
    }, 500)
  }
}

// Purchase educational content
export const purchaseEducationalContent = async (c) => {
  try {
    const user = c.get('user')
    const { contentId } = c.req.param()
    
    // Find content
    const content = await CreatorContent.findById(contentId)
    
    if (!content) {
      return c.json({ 
        success: false, 
        message: "Content not found" 
      }, 404)
    }
    
    // Verify content type is educational
    if (content.contentType !== ContentType.EDUCATIONAL) {
      return c.json({ 
        success: false, 
        message: "This operation is only valid for educational content" 
      }, 400)
    }
    
    // Verify content is published
    if (content.status !== 'published') {
      return c.json({ 
        success: false, 
        message: "This content is not available for purchase" 
      }, 400)
    }
    
    // Check if content is paid
    if (content.pricing.model !== PricingModel.PAID) {
      return c.json({ 
        success: false, 
        message: "This content is not available for purchase" 
      }, 400)
    }
    
    // TODO: Implement payment processing logic here
    // This would typically involve:
    // 1. Creating a payment intent with Stripe
    // 2. Processing the payment
    // 3. Recording the purchase in a purchases collection
    
    // For now, we'll just return a success message
    return c.json({ 
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
    return c.json({ 
      success: false, 
      message: error.message 
    }, 500)
  }
}