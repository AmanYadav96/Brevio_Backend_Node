import Save from '../models/save.model.js'
import { AppError } from '../utils/app-error.js'

// Toggle save (save or unsave)
export const toggleSave = async (req, res) => {
  try {
    const userId = req.user._id
    const { contentType, contentId, folder = 'default' } = req.body
    
    // Validate content type
    if (!['content', 'creatorContent'].includes(contentType)) {
      throw new AppError('Invalid content type', 400)
    }
    
    // Check if save already exists
    const existingSave = await Save.findOne({
      user: userId,
      contentType,
      contentId
    })
    
    if (existingSave) {
      // Unsave: Remove the save
      await Save.findByIdAndDelete(existingSave._id)
      
      return res.json({
        success: true,
        message: 'Content unsaved successfully',
        saved: false
      })
    } else {
      // Save: Create a new save
      const newSave = new Save({
        user: userId,
        contentType,
        contentId,
        folder
      })
      
      await newSave.save()
      
      return res.json({
        success: true,
        message: 'Content saved successfully',
        saved: true
      })
    }
  } catch (error) {
    console.error('Toggle save error:', error)
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to toggle save'
    })
  }
}

// Check if content is saved
export const checkSaved = async (req, res) => {
  try {
    const userId = req.user._id
    const { contentType, contentId } = req.query
    
    // Validate content type
    if (!['content', 'creatorContent'].includes(contentType)) {
      throw new AppError('Invalid content type', 400)
    }
    
    // Check if saved
    const save = await Save.findOne({
      user: userId,
      contentType,
      contentId
    })
    
    return res.json({
      success: true,
      saved: !!save,
      folder: save ? save.folder : null
    })
  } catch (error) {
    console.error('Check saved error:', error)
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to check saved status'
    })
  }
}

// Get user's saved content
// Get user's saved content
export const getSavedContent = async (req, res) => {
  try {
    const userId = req.user._id
    const { contentType, folder, page = 1, limit = 10 } = req.query
    
    // Build query
    const query = { user: userId }
    
    if (contentType) {
      if (!['content', 'creatorContent'].includes(contentType)) {
        throw new AppError('Invalid content type', 400)
      }
      query.contentType = contentType
    }
    
    if (folder) {
      query.folder = folder
    }
    
    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit)
    
    // Get saved content with pagination
    const [saves, total] = await Promise.all([
      Save.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate({
          path: 'contentId',
          select: 'title thumbnail description views duration createdAt ageRating genre',
          model: contentType === 'content' ? 'Content' : 'CreatorContent',
          populate: {
            path: 'genre',
            select: 'name nameEs'
          }
        }),
      Save.countDocuments(query)
    ])
    
    return res.json({
      success: true,
      saves,
      pagination: {
        total,
        pages: Math.ceil(total / parseInt(limit)),
        page: parseInt(page),
        limit: parseInt(limit)
      }
    })
  } catch (error) {
    console.error('Get saved content error:', error)
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to get saved content'
    })
  }
}

// Update saved content folder
export const updateSaveFolder = async (req, res) => {
  try {
    const userId = req.user._id
    const saveId = req.params.id
    const { folder } = req.body
    
    // Find the save
    const save = await Save.findById(saveId)
    if (!save) {
      throw new AppError('Saved content not found', 404)
    }
    
    // Check if user is the owner
    if (save.user.toString() !== userId.toString()) {
      throw new AppError('Not authorized to update this saved content', 403)
    }
    
    // Update the folder
    save.folder = folder
    await save.save()
    
    return res.json({
      success: true,
      message: 'Save updated successfully',
      save
    })
  } catch (error) {
    console.error('Update save folder error:', error)
    return res.status(500).json({
      success: false,
      message: error.message
    })
  }
}