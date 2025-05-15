import Save from '../models/save.model.js'
import { AppError } from '../utils/app-error.js'

// Toggle save (save or unsave)
export const toggleSave = async (c) => {
  try {
    const userId = c.get('user')._id
    const { contentType, contentId, folder = 'default' } = await c.req.json()
    
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
      
      return c.json({
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
      
      return c.json({
        success: true,
        message: 'Content saved successfully',
        saved: true
      })
    }
  } catch (error) {
    console.error('Toggle save error:', error)
    return c.json({
      success: false,
      message: error.message || 'Failed to toggle save'
    }, error.statusCode || 500)
  }
}

// Check if content is saved
export const checkSaved = async (c) => {
  try {
    const userId = c.get('user')._id
    const { contentType, contentId } = c.req.query()
    
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
    
    return c.json({
      success: true,
      saved: !!save,
      folder: save ? save.folder : null
    })
  } catch (error) {
    console.error('Check saved error:', error)
    return c.json({
      success: false,
      message: error.message || 'Failed to check saved status'
    }, error.statusCode || 500)
  }
}

// Get user's saved content
export const getSavedContent = async (c) => {
  try {
    const userId = c.get('user')._id
    const { contentType, folder, page = 1, limit = 10 } = c.req.query()
    
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
    
    // Get saved content with pagination
    const savedContent = await Save.find(query)
      .sort({ createdAt: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit))
      .populate({
        path: 'contentId',
        select: 'title description thumbnail duration'
      })
    
    const total = await Save.countDocuments(query)
    
    // Get user's folders
    const folders = await Save.distinct('folder', { user: userId })
    
    return c.json({
      success: true,
      savedContent,
      folders,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit))
      }
    })
  } catch (error) {
    console.error('Get saved content error:', error)
    return c.json({
      success: false,
      message: error.message || 'Failed to get saved content'
    }, error.statusCode || 500)
  }
}

// Update saved content folder
export const updateSavedFolder = async (c) => {
  try {
    const userId = c.get('user')._id
    const saveId = c.req.param('id')
    const { folder } = await c.req.json()
    
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
    
    return c.json({
      success: true,
      message: 'Saved content updated successfully',
      save
    })
  } catch (error) {
    console.error('Update saved folder error:', error)
    return c.json({
      success: false,
      message: error.message || 'Failed to update saved content'
    }, error.statusCode || 500)
  }
}