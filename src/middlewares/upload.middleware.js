import path from 'path'
import fs from 'fs'
import { v4 as uuidv4 } from 'uuid'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getVideoDurationInSeconds } from 'get-video-duration'
import File from '../models/file.model.js'
import FileUpload from '../models/fileUpload.model.js'
import { uploadToR2 } from '../utils/cloudStorage.js'

// File type and size constraints
const allowedImageTypes = ['image/jpeg', 'image/png', 'image/webp']
const allowedVideoTypes = ['video/mp4', 'video/webm', 'video/x-matroska', 'video/quicktime']
const maxFileSize = {
  image: 10 * 1024 * 1024, // 10MB
  video: 5 * 1024 * 1024 * 1024 // 5GB
}

// Create temporary directory for video duration processing if needed
// Add this near the top of your file

import os from 'os'

// Replace your temp directory creation code with this
const getTempDirectory = () => {
  // Check if running on Vercel
  if (process.env.VERCEL === '1') {
    // Use the /tmp directory which is writable on Vercel
    const tempDir = path.join('/tmp', 'brevio-uploads')
    
    // Create the directory if it doesn't exist
    try {
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true })
      }
    } catch (error) {
      console.error('Error creating temp directory:', error)
      // Fallback to system temp directory
      return os.tmpdir()
    }
    
    return tempDir
  } else {
    // For local development, use the original path
    const tempDir = path.join(process.cwd(), 'temp')
    
    // Create the directory if it doesn't exist
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true })
    }
    
    return tempDir
  }
}

// Replace your existing temp directory reference with this function call
// For example, if you have something like:
// const tempDir = path.join(process.cwd(), 'temp')
// fs.mkdirSync(tempDir, { recursive: true })

// Replace it with:
const tempDir = getTempDirectory()

// Upload type configurations
export const uploadTypes = {
  CHANNEL: {
    folder: 'channels',
    fields: ['thumbnail', 'logo', 'banner']
  },
  VIDEO: {
    folder: 'videos',
    fields: ['thumbnail', 'videoFile']
  },
  ADVERTISEMENT: {
    folder: 'ads',
    fields: ['thumbnail', 'videoFile']
  },
  CONTENT: {
    folder: 'content',
    fields: [
      'videoFile', 
      'thumbnail',
      'verticalBanner', 
      'horizontalBanner', 
      'trailer'
    ]
  },
  CREATOR_CONTENT: {
    folder: 'creator-content',
    fields: [
      'videoFile', 
      'thumbnail',
      'verticalBanner', 
      'horizontalBanner', 
      'trailer'
    ]
  },
  EPISODE: {
    folder: 'episodes',
    fields: ['videoFile', 'thumbnail']
  },
  LESSON: {
    folder: 'lessons',
    fields: ['videoFile', 'thumbnail']
  }
}

/**
 * Unified file upload middleware
 * @param {string} type - The type of upload (from uploadTypes)
 * @returns {Function} Middleware function
 */
export const handleUpload = (type) => {
  return async (c, next) => {
    try {
      const formData = await c.req.formData()
      const uploads = {}
      const fileUploads = []
      const userId = c.get('user')?._id
      
      // Get upload configuration
      const uploadConfig = uploadTypes[type] || {
        folder: 'misc',
        fields: Array.from(formData.keys()).filter(key => 
          formData.get(key) instanceof Blob
        )
      }
      
      // Process each file in the form data
      for (const field of uploadConfig.fields) {
        const file = formData.get(field)
        
        if (file && file instanceof Blob) {
          // Validate file type
          if ((field === 'videoFile' || field === 'trailer') && !allowedVideoTypes.includes(file.type)) {
            return c.json({ 
              success: false, 
              message: `Invalid video type for ${field}. Allowed types: ${allowedVideoTypes.join(', ')}` 
            }, 400)
          }
          
          if ((field.includes('thumbnail') || field.includes('Banner') || field.includes('logo')) && 
              !allowedImageTypes.includes(file.type)) {
            return c.json({ 
              success: false, 
              message: `Invalid image type for ${field}. Allowed types: ${allowedImageTypes.join(', ')}` 
            }, 400)
          }
          
          // Validate file size
          const maxSize = (field === 'videoFile' || field === 'trailer') ? 
            maxFileSize.video : maxFileSize.image
            
          if (file.size > maxSize) {
            return c.json({ 
              success: false, 
              message: `File too large for ${field}. Maximum size: ${
                (field === 'videoFile' || field === 'trailer') ? 
                  (maxSize / (1024 * 1024 * 1024)) + 'GB' : 
                  (maxSize / (1024 * 1024)) + 'MB'
              }` 
            }, 400)
          }
          
          // Create file upload tracking record if user is authenticated
          let fileUpload = null
          if (userId) {
            fileUpload = new FileUpload({
              userId,
              fileName: file.name || `${field}-${Date.now()}`,
              fileSize: file.size,
              fileType: file.type,
              uploadPath: `${uploadConfig.folder}/${field}`,
              modelType: type,
              status: 'uploading'
            })
            
            await fileUpload.save()
            fileUploads.push(fileUpload)
          }
          
          // For video files, we need to get duration
          let tempFilePath = null
          if ((field === 'videoFile' || field === 'trailer') && file.type.startsWith('video/')) {
            try {
              // Create a temporary file just for duration calculation
              const ext = path.extname(file.name || '.mp4')
              tempFilePath = path.join(tempDir, `${uuidv4()}${ext}`)
              const buffer = Buffer.from(await file.arrayBuffer())
              fs.writeFileSync(tempFilePath, buffer)
              
              const duration = await getVideoDurationInSeconds(tempFilePath)
              
              if (field === 'trailer') {
                uploads.trailerDuration = Math.round(duration)
              } else {
                uploads.duration = Math.round(duration)
              }
            } catch (error) {
              console.error('Error getting video duration:', error)
            }
          }
          
          // Upload to cloud storage
          try {
            // Use the existing uploadToR2 utility if available
            if (typeof uploadToR2 === 'function') {
              const fileUrl = await uploadToR2(
                file,
                `${uploadConfig.folder}/${field}`,
                userId,
                { model: type, documentId: 'pending' }
              )
              uploads[field] = fileUrl
            } else {
              // Fallback to direct S3 implementation
              const fileExt = path.extname(file.name || '')
              const fileName = `${uploadConfig.folder}/${uuidv4()}${fileExt}`
              const fileBuffer = Buffer.from(await file.arrayBuffer())
              
              const command = new PutObjectCommand({
                Bucket: process.env.R2_BUCKET_NAME,
                Key: fileName,
                Body: fileBuffer,
                ContentType: file.type
              })
              
              const s3Client = new S3Client({
                region: 'auto',
                endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
                credentials: {
                  accessKeyId: process.env.R2_ACCESS_KEY_ID,
                  secretAccessKey: process.env.R2_SECRET_ACCESS_KEY
                }
              })
              
              await s3Client.send(command)
              uploads[field] = `https://${process.env.R2_BUCKET_NAME}.r2.dev/${fileName}`
            }
            
            // Update file upload status
            if (fileUpload) {
              await FileUpload.findByIdAndUpdate(fileUpload._id, {
                status: 'completed',
                url: uploads[field]
              })
            }
          } catch (error) {
            console.error('Error uploading to cloud storage:', error)
            if (fileUpload) {
              await FileUpload.findByIdAndUpdate(fileUpload._id, {
                status: 'failed',
                error: error.message
              })
            }
            throw error
          } finally {
            // Clean up temp file if it exists
            if (tempFilePath && fs.existsSync(tempFilePath)) {
              fs.unlinkSync(tempFilePath)
            }
          }
        }
      }
      
      // Process non-file form data
      const body = {}
      for (const [key, value] of formData.entries()) {
        if (!(value instanceof Blob)) {
          try {
            // Try to parse as JSON if possible
            body[key] = JSON.parse(value)
          } catch (e) {
            // Otherwise use as is
            body[key] = value
          }
        }
      }
      
      // Add uploads and body to context
      c.set('uploads', uploads)
      c.set('body', body)
      c.set('fileUploads', fileUploads)
      
      await next()
    } catch (error) {
      console.error('Upload error:', error)
      
      // Mark any tracked uploads as failed
      const fileUploads = c.get('fileUploads') || []
      for (const upload of fileUploads) {
        await FileUpload.findByIdAndUpdate(upload._id, {
          status: 'failed',
          error: error.message
        })
      }
      
      return c.json({ 
        success: false, 
        message: 'File upload failed: ' + error.message 
      }, 500)
    }
  }
}

// Add endpoint to check upload progress
export const getUploadProgress = async (c) => {
  try {
    const fileId = c.req.param('fileId')
    const fileUpload = await FileUpload.findById(fileId).select('status progress error url')
    
    if (!fileUpload) {
      return c.json({ success: false, message: 'Upload not found' }, 404)
    }

    return c.json({
      success: true,
      status: fileUpload.status,
      progress: fileUpload.progress,
      error: fileUpload.error,
      url: fileUpload.url
    })
  } catch (error) {
    return c.json({ success: false, message: 'Failed to get upload progress' }, 500)
  }
}

// For backward compatibility
export const handleFileUpload = handleUpload