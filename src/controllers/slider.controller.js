import Slider from '../models/slider.model.js'
import CreatorContent from '../models/creatorContent.model.js'
import { UserRole } from '../models/user.model.js'

// Create a new slider
export const createSlider = async (req, res) => {
  try {
    const user = req.user
    const { title, image, associatedContent, status } = req.body
    
    // Validate associated content IDs
    if (associatedContent && associatedContent.length > 0) {
      const contentIds = associatedContent.map(item => item.content)
      const validContent = await CreatorContent.countDocuments({
        _id: { $in: contentIds },
        status: 'published'
      })
      
      if (validContent !== contentIds.length) {
        return res.status(400).json({
          success: false,
          message: 'One or more content items are invalid or not published'
        })
      }
    }
    
    const slider = await Slider.create({
      title,
      image,
      associatedContent: associatedContent || [],
      status: status || 'active',
      createdBy: user._id
    })
    
    return res.json({
      success: true,
      message: 'Slider created successfully',
      data: slider
    })
  } catch (error) {
    console.error('Create slider error:', error)
    return res.status(500).json({
      success: false,
      message: error.message
    })
  }
}

// Get all sliders
// Before:


// After:
export const getAllSliders = async (req, res) => {
  try {
    const { status } = req.query
    const query = {}
    
    if (status) {
      query.status = status
    }
    
    const sliders = await Slider.find(query)
      .populate({
        path: 'associatedContent.content',
        select: 'title thumbnail contentType'
      })
      .sort({ createdAt: -1 })
    
    return res.json({
      success: true,
      count: sliders.length,
      data: sliders
    })
  } catch (error) {
    console.error('Get sliders error:', error)
    return res.status(500).json({
      success: false,
      message: error.message
    })
  }
}

// Get slider by ID
export const getSliderById = async (req, res) => {
  try {
    const { sliderId } = req.params
    
    const slider = await Slider.findById(sliderId)
      .populate({
        path: 'associatedContent.content',
        select: 'title thumbnail contentType'
      })
    
    if (!slider) {
      return res.status(404).json({
        success: false,
        message: 'Slider not found'
      })
    }
    
    return res.json({
      success: true,
      data: slider
    })
  } catch (error) {
    console.error('Get slider error:', error)
    return res.status(500).json({
      success: false,
      message: error.message
    })
  }
}

// Update slider
export const updateSlider = async (c) => {
  try {
    const { sliderId } = c.req.param()
    const updates = await c.req.json()
    
    // Validate associated content IDs if provided
    if (updates.associatedContent && updates.associatedContent.length > 0) {
      const contentIds = updates.associatedContent.map(item => item.content)
      const validContent = await CreatorContent.countDocuments({
        _id: { $in: contentIds },
        status: 'published'
      })
      
      if (validContent !== contentIds.length) {
        return c.json({
          success: false,
          message: 'One or more content items are invalid or not published'
        }, 400)
      }
    }
    
    const slider = await Slider.findByIdAndUpdate(
      sliderId,
      updates,
      { new: true }
    ).populate({
      path: 'associatedContent.content',
      select: 'title thumbnail contentType'
    })
    
    if (!slider) {
      return c.json({
        success: false,
        message: 'Slider not found'
      }, 404)
    }
    
    return c.json({
      success: true,
      message: 'Slider updated successfully',
      data: slider
    })
  } catch (error) {
    console.error('Update slider error:', error)
    return c.json({
      success: false,
      message: error.message
    }, 500)
  }
}

// Delete slider
export const deleteSlider = async (c) => {
  try {
    const { sliderId } = c.req.param()
    
    const slider = await Slider.findByIdAndDelete(sliderId)
    
    if (!slider) {
      return c.json({
        success: false,
        message: 'Slider not found'
      }, 404)
    }
    
    return c.json({
      success: true,
      message: 'Slider deleted successfully'
    })
  } catch (error) {
    console.error('Delete slider error:', error)
    return c.json({
      success: false,
      message: error.message
    }, 500)
  }
}

// Get active sliders for public
export const getActiveSliders = async (c) => {
  try {
    const sliders = await Slider.find({ status: 'active' })
      .populate({
        path: 'associatedContent.content',
        select: 'title thumbnail contentType videoFile duration'
      })
      .sort({ createdAt: -1 })
    
    return c.json({
      success: true,
      count: sliders.length,
      data: sliders
    })
  } catch (error) {
    console.error('Get active sliders error:', error)
    return c.json({
      success: false,
      message: error.message
    }, 500)
  }
}