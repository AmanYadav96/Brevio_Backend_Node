import FileUpload from '../models/fileUpload.model.js'
import mongoose from 'mongoose'

// Get upload statistics
export const getUploadStats = async (req, res) => {
  try {
    const userId = req.user._id
    
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
    
    return res.json({
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
    return res.status(500).json({ success: false, message: error.message })
  }
}

// Get recent uploads
export const getRecentUploads = async (req, res) => {
  try {
    const userId = req.user._id
    const { page = 1, limit = 10 } = req.query
    
    const skip = (page - 1) * limit
    
    const [uploads, total] = await Promise.all([
      FileUpload.find({ userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      FileUpload.countDocuments({ userId })
    ])
    
    return res.json({
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
    return res.status(500).json({ success: false, message: error.message })
  }
}

// Get admin storage statistics
export const getAdminStorageStats = async (req, res) => {
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
      }}
    ])
    
    return res.json({
      success: true,
      stats: {
        totalSize,
        sizeInGB: Math.round(totalSize / (1024 * 1024 * 1024) * 100) / 100,
        byUser: userStats
      }
    })
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message })
  }
}