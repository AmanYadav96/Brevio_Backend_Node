import FileUpload from '../models/fileUpload.model.js'
import mongoose from 'mongoose'

// Get upload statistics
export const getUploadStats = async (c) => {
  try {
    const userId = c.get('user')._id
    
    // Get total uploads by user
    const totalUploads = await FileUpload.countDocuments({ userId })
    
    // Get total size of all uploads
    const sizeAggregate = await FileUpload.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId) } },
      { $group: { _id: null, totalSize: { $sum: "$fileSize" } } }
    ])
    
    const totalSize = sizeAggregate.length > 0 ? sizeAggregate[0].totalSize : 0
    
    // Get uploads by file type
    const typeStats = await FileUpload.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId) } },
      { $group: { 
        _id: "$fileType", 
        count: { $sum: 1 },
        totalSize: { $sum: "$fileSize" }
      }}
    ])
    
    // Get uploads by model type
    const modelStats = await FileUpload.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId) } },
      { $group: { 
        _id: "$modelType", 
        count: { $sum: 1 },
        totalSize: { $sum: "$fileSize" }
      }}
    ])
    
    return c.json({
      success: true,
      stats: {
        totalUploads,
        totalSize,
        sizeInMB: Math.round(totalSize / (1024 * 1024) * 100) / 100,
        byFileType: typeStats,
        byModelType: modelStats
      }
    })
  } catch (error) {
    return c.json({ success: false, message: error.message }, 500)
  }
}

// Get recent uploads
export const getRecentUploads = async (c) => {
  try {
    const userId = c.get('user')._id
    const { page = 1, limit = 10 } = c.req.query()
    
    const skip = (page - 1) * limit
    
    const [uploads, total] = await Promise.all([
      FileUpload.find({ userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      FileUpload.countDocuments({ userId })
    ])
    
    return c.json({
      success: true,
      uploads,
      pagination: {
        total,
        pages: Math.ceil(total / limit),
        page: parseInt(page),
        limit: parseInt(limit)
      }
    })
  } catch (error) {
    return c.json({ success: false, message: error.message }, 500)
  }
}

// Get admin storage statistics
export const getAdminStorageStats = async (c) => {
  try {
    // Get total size of all uploads
    const sizeAggregate = await FileUpload.aggregate([
      { $group: { _id: null, totalSize: { $sum: "$fileSize" } } }
    ])
    
    const totalSize = sizeAggregate.length > 0 ? sizeAggregate[0].totalSize : 0
    
    // Get uploads by user
    const userStats = await FileUpload.aggregate([
      { $group: { 
        _id: "$userId", 
        count: { $sum: 1 },
        totalSize: { $sum: "$fileSize" }
      }},
      { $sort: { totalSize: -1 } },
      { $limit: 10 }
    ])
    
    // Populate user details
    const populatedUserStats = await FileUpload.populate(userStats, {
      path: '_id',
      select: 'name email'
    })
    
    return c.json({
      success: true,
      stats: {
        totalSize,
        sizeInGB: Math.round(totalSize / (1024 * 1024 * 1024) * 100) / 100,
        topUsers: populatedUserStats
      }
    })
  } catch (error) {
    return c.json({ success: false, message: error.message }, 500)
  }
}