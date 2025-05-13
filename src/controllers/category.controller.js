import Category from '../models/category.model.js'
import CreatorContent from '../models/creatorContent.model.js'
import { UserRole } from '../models/user.model.js'

// Create a new category
export const createCategory = async (c) => {
  try {
    const user = c.get('user')
    const { name, description, associatedContent, status } = await c.req.json()
    
    // Check if category with same name exists
    const existingCategory = await Category.findOne({ name })
    if (existingCategory) {
      return c.json({
        success: false,
        message: 'Category with this name already exists'
      }, 400)
    }
    
    // Validate associated content IDs
    if (associatedContent && associatedContent.length > 0) {
      const contentIds = associatedContent.map(item => item.content)
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
    
    const category = await Category.create({
      name,
      description,
      associatedContent: associatedContent || [],
      status: status || 'active',
      createdBy: user._id
    })
    
    return c.json({
      success: true,
      message: 'Category created successfully',
      data: category
    })
  } catch (error) {
    console.error('Create category error:', error)
    return c.json({
      success: false,
      message: error.message
    }, 500)
  }
}

// Get all categories
export const getAllCategories = async (c) => {
  try {
    const { status } = c.req.query()
    const query = {}
    
    if (status) {
      query.status = status
    }
    
    const categories = await Category.find(query)
      .populate({
        path: 'associatedContent.content',
        select: 'title thumbnail contentType'
      })
      .sort({ name: 1 })
    
    return c.json({
      success: true,
      count: categories.length,
      data: categories
    })
  } catch (error) {
    console.error('Get categories error:', error)
    return c.json({
      success: false,
      message: error.message
    }, 500)
  }
}

// Get category by ID
export const getCategoryById = async (c) => {
  try {
    const { categoryId } = c.req.param()
    
    const category = await Category.findById(categoryId)
      .populate({
        path: 'associatedContent.content',
        select: 'title thumbnail contentType'
      })
    
    if (!category) {
      return c.json({
        success: false,
        message: 'Category not found'
      }, 404)
    }
    
    return c.json({
      success: true,
      data: category
    })
  } catch (error) {
    console.error('Get category error:', error)
    return c.json({
      success: false,
      message: error.message
    }, 500)
  }
}

// Update category
export const updateCategory = async (c) => {
  try {
    const { categoryId } = c.req.param()
    const updates = await c.req.json()
    
    // Check if name is being updated and if it already exists
    if (updates.name) {
      const existingCategory = await Category.findOne({ 
        name: updates.name,
        _id: { $ne: categoryId }
      })
      
      if (existingCategory) {
        return c.json({
          success: false,
          message: 'Category with this name already exists'
        }, 400)
      }
    }
    
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
    
    const category = await Category.findByIdAndUpdate(
      categoryId,
      updates,
      { new: true }
    ).populate({
      path: 'associatedContent.content',
      select: 'title thumbnail contentType'
    })
    
    if (!category) {
      return c.json({
        success: false,
        message: 'Category not found'
      }, 404)
    }
    
    return c.json({
      success: true,
      message: 'Category updated successfully',
      data: category
    })
  } catch (error) {
    console.error('Update category error:', error)
    return c.json({
      success: false,
      message: error.message
    }, 500)
  }
}

// Delete category
export const deleteCategory = async (c) => {
  try {
    const { categoryId } = c.req.param()
    
    const category = await Category.findByIdAndDelete(categoryId)
    
    if (!category) {
      return c.json({
        success: false,
        message: 'Category not found'
      }, 404)
    }
    
    return c.json({
      success: true,
      message: 'Category deleted successfully'
    })
  } catch (error) {
    console.error('Delete category error:', error)
    return c.json({
      success: false,
      message: error.message
    }, 500)
  }
}

// Get active categories for public
export const getActiveCategories = async (c) => {
  try {
    const categories = await Category.find({ status: 'active' })
      .populate({
        path: 'associatedContent.content',
        select: 'title thumbnail contentType videoFile duration'
      })
      .sort({ name: 1 })
    
    return c.json({
      success: true,
      count: categories.length,
      data: categories
    })
  } catch (error) {
    console.error('Get active categories error:', error)
    return c.json({
      success: false,
      message: error.message
    }, 500)
  }
}