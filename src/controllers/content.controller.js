import Content from "../models/content.model.js"
import { getVideoDuration } from "../utils/videoProcessor.js"

// Create new content
export const createContent = async (req, res) => {
  try {
    const uploads = req.uploads
    const fileUploads = req.fileUploads || []
    const body = req.body
    
    // Handle file uploads
    if (uploads.videoFile) {
      body.videoUrl = uploads.videoFile
    }
    
    if (uploads.verticalBanner) {
      body.mediaAssets = body.mediaAssets || {}
      body.mediaAssets.verticalBanner = uploads.verticalBanner
    }
    
    if (uploads.horizontalBanner) {
      body.mediaAssets = body.mediaAssets || {}
      body.mediaAssets.horizontalBanner = uploads.horizontalBanner
    }
    
    if (uploads.trailer) {
      body.mediaAssets = body.mediaAssets || {}
      body.mediaAssets.trailer = uploads.trailer
      body.mediaAssets.trailerDuration = uploads.trailerDuration || 0
    }
    
    // Handle cast photos
    if (body.cast && Array.isArray(body.cast)) {
      body.cast.forEach((castMember, index) => {
        if (uploads[`castPhoto_${index}`]) {
          castMember.photo = uploads[`castPhoto_${index}`]
        }
      })
    }
    
    // Handle crew photos
    if (body.crew && Array.isArray(body.crew)) {
      body.crew.forEach((crewMember, index) => {
        if (uploads[`crewPhoto_${index}`]) {
          crewMember.photo = uploads[`crewPhoto_${index}`]
        }
      })
    }
    
    const content = await Content.create(body)
    
    // Update file uploads with the content ID
    for (const fileUpload of fileUploads) {
      await FileUpload.findByIdAndUpdate(fileUpload._id, {
        documentId: content._id
      })
    }
    
    return res.status(201).json({ success: true, content })
  } catch (error) {
    console.error("Create content error:", error)
    return res.status(500).json({ success: false, message: error.message })
  }
}

// Get all content
export const getAllContent = async (req, res) => {
  try {
    const { page = 1, limit = 10, contentType, channel } = req.query
    
    const query = {}
    if (contentType) query.contentType = contentType
    if (channel) query.channel = channel
    
    const skip = (page - 1) * limit
    
    const [content, total] = await Promise.all([
      Content.find(query)
        .skip(skip)
        .limit(parseInt(limit))
        .populate('channel', 'name')
        .populate('genres', 'name'),
      Content.countDocuments(query)
    ])
    
    return res.json({
      success: true,
      content,
      pagination: {
        total,
        pages: Math.ceil(total / limit),
        page: parseInt(page),
        limit: parseInt(limit)
      }
    })
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message })
  }
}

// Get content by ID
export const getContent = async (req, res) => {
  try {
    const { id } = req.params
    
    const content = await Content.findById(id)
      .populate('channel', 'name')
      .populate('genres', 'name')
    
    if (!content) {
      return res.status(404).json({ success: false, message: "Content not found" })
    }
    
    return res.json({ success: true, content })
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message })
  }
}

// Update content
export const updateContent = async (req, res) => {
  try {
    const { id } = req.params
    const uploads = req.uploads
    const body = req.body
    
    // Handle file uploads (similar to create)
    if (uploads.videoFile) {
      body.videoUrl = uploads.videoFile
    }
    
    // Handle media assets
    body.mediaAssets = body.mediaAssets || {}
    
    if (uploads.verticalBanner) {
      body.mediaAssets.verticalBanner = uploads.verticalBanner
    }
    
    if (uploads.horizontalBanner) {
      body.mediaAssets.horizontalBanner = uploads.horizontalBanner
    }
    
    if (uploads.trailer) {
      body.mediaAssets.trailer = uploads.trailer
      body.mediaAssets.trailerDuration = uploads.trailerDuration || 0
    }
    
    // Handle cast photos
    if (body.cast && Array.isArray(body.cast)) {
      body.cast.forEach((castMember, index) => {
        if (uploads[`castPhoto_${index}`]) {
          castMember.photo = uploads[`castPhoto_${index}`]
        }
      })
    }
    
    // Handle crew photos
    if (body.crew && Array.isArray(body.crew)) {
      body.crew.forEach((crewMember, index) => {
        if (uploads[`crewPhoto_${index}`]) {
          crewMember.photo = uploads[`crewPhoto_${index}`]
        }
      })
    }
    
    const content = await Content.findByIdAndUpdate(id, body, { 
      new: true,
      runValidators: true
    })
    
    if (!content) {
      return res.status(404).json({ success: false, message: "Content not found" })
    }
    
    return res.json({ success: true, content })
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message })
  }
}

// Delete content
export const deleteContent = async (req, res) => {
  try {
    const { id } = req.params
    
    const content = await Content.findByIdAndDelete(id)
    
    if (!content) {
      return res.status(404).json({ success: false, message: "Content not found" })
    }
    
    return res.json({ 
      success: true, 
      message: "Content deleted successfully" 
    })
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message })
  }
}

// Increment view count
export const incrementViews = async (req, res) => {
  try {
    const { id } = req.params
    
    const content = await Content.findByIdAndUpdate(
      id,
      { $inc: { views: 1 } },
      { new: true }
    )
    
    if (!content) {
      return res.status(404).json({ success: false, message: "Content not found" })
    }
    
    return res.json({ success: true, views: content.views })
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message })
  }
}