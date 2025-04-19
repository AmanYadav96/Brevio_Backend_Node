import { uploadToR2 } from '../utils/cloudStorage.js'
import { getVideoDurationInSeconds } from 'get-video-duration'
import File from '../models/file.model.js'

const allowedImageTypes = ['image/jpeg', 'image/png', 'image/webp']
const allowedVideoTypes = ['video/mp4', 'video/webm', 'video/x-matroska', 'video/quicktime']
const maxFileSize = {
  image: 10 * 1024 * 1024, // 10MB
  video: 5 * 1024 * 1024 * 1024 // 5GB
}

export const handleFileUpload = (modelName) => async (c, next) => {
  try {
    const formData = await c.req.formData()
    const uploads = {}
    const userId = c.get('user')._id

    for (const [key, file] of formData.entries()) {
      if (file instanceof Blob) {
        // Create upload tracking record
        const uploadTracker = await File.create({
          originalName: file.name,
          fileType: file.type,
          fileSize: file.size,
          uploadedBy: userId,
          status: 'uploading',
          progress: 0,
          usedIn: {
            model: modelName,
            documentId: formData.get('id') || 'pending'
          }
        })

        // Validate file type with more video formats
        if (key.includes('video') && !allowedVideoTypes.includes(file.type)) {
          await File.findByIdAndUpdate(uploadTracker._id, { status: 'failed', error: 'Invalid file type' })
          return c.json({ 
            success: false, 
            message: `Invalid video type. Allowed types: ${allowedVideoTypes.join(', ')}` 
          }, 400)
        }

        if (key.includes('image') && !allowedImageTypes.includes(file.type)) {
          await File.findByIdAndUpdate(uploadTracker._id, { status: 'failed', error: 'Invalid file type' })
          return c.json({ 
            success: false, 
            message: `Invalid image type. Allowed types: ${allowedImageTypes.join(', ')}` 
          }, 400)
        }

        // Validate file size
        const maxSize = key.includes('video') ? maxFileSize.video : maxFileSize.image
        if (file.size > maxSize) {
          await File.findByIdAndUpdate(uploadTracker._id, { status: 'failed', error: 'File too large' })
          return c.json({ 
            success: false, 
            message: `File too large. Maximum size: ${maxSize / (1024 * 1024 * 1024)}GB` 
          }, 400)
        }

        const fileUrl = await uploadToR2(file, key, userId, modelName, uploadTracker._id)
        uploads[key] = fileUrl
      }
    }

    c.set('uploads', uploads)
    await next()
  } catch (error) {
    console.error('File upload error:', error)
    return c.json({ success: false, message: "File upload failed" }, 500)
  }
}

// Add endpoint to check upload progress
export const getUploadProgress = async (c) => {
  try {
    const fileId = c.req.param('fileId')
    const file = await File.findById(fileId).select('status progress error')
    
    if (!file) {
      return c.json({ success: false, message: 'Upload not found' }, 404)
    }

    return c.json({
      success: true,
      status: file.status,
      progress: file.progress,
      error: file.error
    })
  } catch (error) {
    return c.json({ success: false, message: 'Failed to get upload progress' }, 500)
  }
}


export const uploadTypes = {
  CHANNEL: {
    folder: 'channels',
    fields: ['thumbnail']
  },
  VIDEO: {
    folder: 'videos',
    fields: ['thumbnail', 'videoFile']
  },
  ADVERTISEMENT: {
    folder: 'ads',
    fields: ['thumbnail', 'videoFile']
  }
}

export const handleUpload = (type) => async (c, next) => {
  try {
    const formData = await c.req.formData()
    const uploads = {}
    const userId = c.get('user')._id

    for (const field of uploadTypes[type].fields) {
      const file = formData.get(field)
      if (file && file instanceof Blob) {
        // Get video duration if it's a video file
        if (field === 'videoFile' && file.type.startsWith('video/')) {
          const arrayBuffer = await file.arrayBuffer()
          const duration = await getVideoDurationInSeconds(Buffer.from(arrayBuffer))
          uploads.duration = Math.round(duration)
        }

        const fileUrl = await uploadToR2(
          file,
          `${uploadTypes[type].folder}/${field}`,
          userId,
          { model: type, documentId: 'pending' }
        )
        uploads[field] = fileUrl
      }
    }

    c.set('uploads', uploads)
    await next()
  } catch (error) {
    return c.json({ success: false, message: "File upload failed" }, 500)
  }
}