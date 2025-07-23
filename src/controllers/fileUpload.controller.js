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

// Get upload progress by fileId
export const getUploadProgress = async (req, res) => {
  try {
    const { fileId } = req.params;
    const userId = req.user._id;
    
    // Find the file upload record
    const fileUpload = await FileUpload.findOne({ 
      _id: fileId,
      userId: userId
    });
    
    if (!fileUpload) {
      return res.status(404).json({ 
        success: false, 
        message: 'Upload not found' 
      });
    }
    
    // Calculate upload speed and estimated time remaining if upload is in progress
    let uploadSpeed = 0;
    let estimatedTimeRemaining = 0;
    
    if (fileUpload.status === 'uploading' || fileUpload.status === 'chunking') {
      // Calculate upload speed based on progress and time elapsed
      const timeElapsed = (Date.now() - new Date(fileUpload.updatedAt).getTime()) / 1000; // in seconds
      const uploadedBytes = (fileUpload.progress / 100) * fileUpload.fileSize;
      
      if (timeElapsed > 0) {
        uploadSpeed = uploadedBytes / timeElapsed; // bytes per second
        
        // Calculate estimated time remaining
        const remainingBytes = fileUpload.fileSize - uploadedBytes;
        if (uploadSpeed > 0) {
          estimatedTimeRemaining = Math.round(remainingBytes / uploadSpeed); // seconds
        }
      }
    }
    
    return res.json({
      success: true,
      upload: {
        fileId: fileUpload._id,
        fileName: fileUpload.fileName,
        fileSize: fileUpload.fileSize,
        fileType: fileUpload.fileType,
        status: fileUpload.status,
        progress: fileUpload.progress,
        url: fileUpload.url,
        createdAt: fileUpload.createdAt,
        updatedAt: fileUpload.updatedAt,
        uploadSpeed: Math.round(uploadSpeed / 1024), // KB/s
        estimatedTimeRemaining: estimatedTimeRemaining, // seconds
        uploadedBytes: Math.round((fileUpload.progress / 100) * fileUpload.fileSize),
        totalBytes: fileUpload.fileSize
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Get file uploads by content ID
export const getUploadProgressByContentId = async (req, res) => {
  try {
    const { contentId } = req.params;
    const userId = req.user._id;
    
    // Validate contentId
    if (!mongoose.Types.ObjectId.isValid(contentId)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid content ID' 
      });
    }
    
    // Find file uploads for the specific content using contentId field
    const fileUploads = await FileUpload.find({ 
      contentId: contentId,
      userId: userId
    }).sort({ createdAt: -1 });
    
    if (fileUploads.length === 0) {
      return res.json({
        success: true,
        uploads: [],
        count: 0,
        overallProgress: {
          totalFiles: 0,
          completedFiles: 0,
          failedFiles: 0,
          uploadingFiles: 0,
          compressingFiles: 0,
          overallPercentage: 0,
          totalSize: 0,
          uploadedSize: 0
        }
      });
    }
    
    // Calculate overall progress statistics
    let totalFiles = fileUploads.length;
    let completedFiles = 0;
    let failedFiles = 0;
    let uploadingFiles = 0;
    let compressingFiles = 0;
    let totalSize = 0;
    let uploadedSize = 0;
    
    // Process each upload and calculate detailed progress
    const uploadsWithProgress = fileUploads.map(upload => {
      const currentTime = Date.now();
      const createdTime = new Date(upload.createdAt).getTime();
      const updatedTime = new Date(upload.updatedAt).getTime();
      
      // Calculate upload speed and time remaining
      let uploadSpeed = 0;
      let estimatedTimeRemaining = 0;
      let uploadedBytes = Math.round((upload.progress / 100) * upload.fileSize);
      
      // Update counters
      totalSize += upload.fileSize;
      uploadedSize += uploadedBytes;
      
      if (upload.status === 'completed' || upload.status === 'complete') {
        completedFiles++;
        uploadedBytes = upload.fileSize;
      } else if (upload.status === 'failed' || upload.status === 'error') {
        failedFiles++;
      } else if (upload.status === 'compressing') {
        compressingFiles++;
      } else if (upload.status === 'uploading' || upload.status === 'chunking') {
        uploadingFiles++;
        
        // Calculate speed and ETA for active uploads
        const timeElapsed = (updatedTime - createdTime) / 1000;
        if (timeElapsed > 0 && upload.progress > 0) {
          uploadSpeed = uploadedBytes / timeElapsed;
          const remainingBytes = upload.fileSize - uploadedBytes;
          if (uploadSpeed > 0) {
            estimatedTimeRemaining = Math.round(remainingBytes / uploadSpeed);
          }
        }
      }
      
      return {
        _id: upload._id,
        fileName: upload.fileName,
        fileSize: upload.fileSize,
        fileType: upload.fileType,
        status: upload.status,
        progress: upload.progress || 0,
        url: upload.url,
        field: upload.field,
        createdAt: upload.createdAt,
        updatedAt: upload.updatedAt,
        uploadSpeed: Math.round(uploadSpeed / 1024), // KB/s
        estimatedTimeRemaining: estimatedTimeRemaining, // seconds
        uploadedBytes: uploadedBytes,
        remainingBytes: upload.fileSize - uploadedBytes,
        stage: upload.status === 'compressing' ? 'compression' : 
               upload.status === 'uploading' ? 'upload' : 
               upload.status === 'completed' ? 'complete' : 'unknown'
      };
    });
    
    // Calculate overall percentage
    const overallPercentage = totalSize > 0 ? Math.round((uploadedSize / totalSize) * 100) : 0;
    
    return res.json({
      success: true,
      uploads: uploadsWithProgress,
      count: totalFiles,
      overallProgress: {
        totalFiles,
        completedFiles,
        failedFiles,
        uploadingFiles,
        compressingFiles,
        overallPercentage,
        totalSize,
        uploadedSize,
        remainingSize: totalSize - uploadedSize
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Update the existing getFileUploadsByContentId function
export const getFileUploadsByContentId = async (req, res) => {
  try {
    const { contentId } = req.params;
    const userId = req.user._id;
    
    // Validate contentId
    if (!mongoose.Types.ObjectId.isValid(contentId)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid content ID' 
      });
    }
    
    // Find file uploads for the specific content using contentId field
    const fileUploads = await FileUpload.find({ 
      contentId: contentId,
      userId: userId // Ensure user can only see their own uploads
    }).sort({ createdAt: -1 });
    
    return res.json({
      success: true,
      uploads: fileUploads,
      count: fileUploads.length
    });
  } catch (error) {
    return res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};