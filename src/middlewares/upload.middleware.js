import path from 'path'
import fs from 'fs'
import os from 'os'
import { v4 as uuidv4 } from 'uuid'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getVideoDurationInSeconds } from 'get-video-duration'
import FileUpload from '../models/fileUpload.model.js'

// File type and size constraints
const allowedImageTypes = ['image/jpeg', 'image/png', 'image/webp']
const allowedVideoTypes = ['video/mp4', 'video/webm', 'video/x-matroska', 'video/quicktime']
const maxFileSize = {
  image: 500 * 1024 * 1024, // 500MB
  video: 5 * 1024 * 1024 * 1024 // 5GB
}

// Constants for cloud storage
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || 'https://pub-1a008632cfbe443fa4f631d71332310d.r2.dev';

// Get temp directory for video processing
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

// Get temp directory
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
  },
  REPORT: {
    folder: 'reports',
    fields: ['proofFile']
  },
  CONTRACT: {
    folder: 'contracts',
    fields: ['contractFile', 'attachment', 'signature']
  },
  USER: {
    folder: 'users',
    fields: ['profilePicture']
  }
}

/**
 * Simple file upload middleware
 * @param {string} type - The type of upload (from uploadTypes)
 * @returns {Function} Middleware function
 */
export const handleUpload = (type) => {
  return async (c, next) => {
    try {
      // Initialize context variables
      const uploads = {}
      const fileUploads = []
      const body = {}
      const userId = c.get('user')?._id
      
      // Get upload configuration
      const uploadConfig = uploadTypes[type] || {
        folder: 'misc',
        fields: []
      }
      
      console.log(`Using upload type: ${type}, folder: ${uploadConfig.folder}`);
      
      // Parse as FormData
      let formData;
      try {
        formData = await c.req.formData();
      } catch (error) {
        console.error('FormData parsing error:', error);
        return c.json({
          success: false,
          message: 'Failed to parse request body as FormData. Make sure you are sending a proper multipart/form-data request.'
        }, 400);
      }
      
      // Process each file in the form data
      for (const field of uploadConfig.fields) {
        const fileData = formData.get(field);
        if (!fileData || !(fileData instanceof Blob)) continue;
        
        // Validate file type
        if ((field === 'videoFile' || field === 'trailer') && !allowedVideoTypes.includes(fileData.type)) {
          return c.json({ 
            success: false, 
            message: `Invalid video type for ${field}. Allowed types: ${allowedVideoTypes.join(', ')}` 
          }, 400);
        }
        
        if ((field.includes('thumbnail') || field.includes('Banner') || field.includes('logo')) && 
            !allowedImageTypes.includes(fileData.type)) {
          return c.json({ 
            success: false, 
            message: `Invalid image type for ${field}. Allowed types: ${allowedImageTypes.join(', ')}` 
          }, 400);
        }
        
        // Validate file size
        const maxSize = (field === 'videoFile' || field === 'trailer') ? 
          maxFileSize.video : maxFileSize.image;
          
        if (fileData.size > maxSize) {
          return c.json({ 
            success: false, 
            message: `File too large for ${field}. Maximum size: ${
              (field === 'videoFile' || field === 'trailer') ? 
                (maxSize / (1024 * 1024 * 1024)) + 'GB' : 
                (maxSize / (1024 * 1024)) + 'MB'
            }` 
          }, 400);
        }
        
        // Create file upload tracking record
        // Create file upload tracking record
        // Create file upload tracking record
        let fileUpload = null;
        if (userId) {
          fileUpload = new FileUpload({
            userId,
            fileName: fileData.name || `${field}.${fileData.type.split('/')[1]}`,
            fileSize: fileData.size,
            fileType: fileData.type,
            status: 'uploading',
            field,
            // Add the missing required fields
            modelType: type === 'CHANNEL' ? 'Channel' : 
                       type === 'VIDEO' ? 'Video' : 
                       type === 'ADVERTISEMENT' ? 'Advertisement' : 
                       type === 'CONTENT' || type === 'CREATOR_CONTENT' ? 'Content' : 'Other',
            uploadPath: `${uploadConfig.folder}/${field}`
          });
          
          await fileUpload.save();
          fileUploads.push(fileUpload);
        }
        
        try {
          // Get file buffer
          const fileBuffer = Buffer.from(await fileData.arrayBuffer());
          
          // Generate unique filename
          const fileExt = path.extname(fileData.name || `.${fileData.type.split('/')[1]}`);
          const fileName = `${uploadConfig.folder}/${field}/${uuidv4()}${fileExt}`;
          
          // Upload to R2
          const command = new PutObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME,
            Key: fileName,
            Body: fileBuffer,
            ContentType: fileData.type
          });
          
          const s3Client = new S3Client({
            region: 'auto',
            endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
            credentials: {
              accessKeyId: process.env.R2_ACCESS_KEY_ID,
              secretAccessKey: process.env.R2_SECRET_ACCESS_KEY
            }
          });
          
          await s3Client.send(command);
          
          // Set URL in uploads object
          uploads[field] = `${R2_PUBLIC_URL}/${fileName}`;
          
          // Update file upload status
          if (fileUpload) {
            await FileUpload.findByIdAndUpdate(fileUpload._id, {
              status: 'completed',
              url: uploads[field],
              progress: 100
            });
          }
          
          // Calculate video duration for video files
          if ((field === 'videoFile' || field === 'trailer') && fileData.type.startsWith('video/')) {
            try {
              // Write to temp file to get duration
              const tempFilePath = path.join(tempDir, `${uuidv4()}${fileExt}`);
              fs.writeFileSync(tempFilePath, fileBuffer);
              
              const duration = await getVideoDurationInSeconds(tempFilePath);
              
              // Clean up temp file
              fs.unlinkSync(tempFilePath);
              
              // Add duration to body
              if (field === 'trailer') {
                body.trailerDuration = Math.round(duration);
              } else {
                body.duration = Math.round(duration);
              }
            } catch (error) {
              console.error('Error calculating video duration:', error);
            }
          }
        } catch (error) {
          console.error(`Error uploading ${field}:`, error);
          
          // Update file upload status on error
          if (fileUpload) {
            await FileUpload.findByIdAndUpdate(fileUpload._id, {
              status: 'failed',
              error: error.message
            });
          }
          
          return c.json({
            success: false,
            message: `Failed to upload ${field}: ${error.message}`
          }, 500);
        }
      }
      
      // Process non-file form data
      for (const [key, value] of formData.entries()) {
        // Skip files that were already processed
        if (uploadConfig.fields.includes(key) && value instanceof Blob) {
          continue;
        }
        
        // Handle regular form fields
        if (!(value instanceof Blob)) {
          try {
            // Try to parse as JSON if it looks like JSON
            if (typeof value === 'string' && 
                ((value.startsWith('{') && value.endsWith('}')) || 
                (value.startsWith('[') && value.endsWith(']')))) {
              try {
                body[key] = JSON.parse(value);
              } catch (jsonError) {
                body[key] = value;
              }
            } else {
              body[key] = value;
            }
          } catch (e) {
            body[key] = value;
          }
        }
      }
      
      // Set uploads and body in context
      c.set('uploads', uploads);
      c.set('body', body);
      c.set('fileUploads', fileUploads);
      
      // Override c.json to include fileUploads in response
      const originalJson = c.json;
      c.json = (data, status) => {
        try {
          if (data && data.success !== false && fileUploads.length > 0) {
            data.fileUploads = fileUploads.map(upload => ({
              _id: upload._id,
              field: upload.field,
              status: upload.status,
              progress: upload.progress || 0,
              url: upload.url
            }));
          }
        } catch (error) {
          console.error('Error adding fileUploads to response:', error);
        }
        
        return originalJson.call(c, data, status);
      };
      
      return next();
    } catch (error) {
      console.error('Upload middleware error:', error);
      
      return c.json({
        success: false,
        message: 'File upload failed: ' + error.message
      }, 500);
    }
  };
};

// Export the getMultipleUploadProgress function
export const getMultipleUploadProgress = async (c) => {
  try {
    const { fileIds } = await c.req.json();
    
    if (!fileIds.length) {
      return c.json({ success: false, message: 'No file IDs provided' }, 400);
    }
    
    const fileUploads = await FileUpload.find({
      _id: { $in: fileIds }
    }).select('status progress error url fileName fileSize field');
    
    return c.json({
      success: true,
      uploads: fileUploads.map(upload => ({
        _id: upload._id,
        status: upload.status,
        progress: upload.progress || 0,
        error: upload.error,
        url: upload.url,
        fileName: upload.fileName,
        fileSize: upload.fileSize,
        field: upload.field
      }))
    });
  } catch (error) {
    return c.json({
      success: false,
      message: 'Failed to get upload progress: ' + error.message
    }, 500);
  }
};

// Optional upload middleware for profile pictures and other optional files
export const optionalUpload = async (c, next) => {
  const contentType = c.req.header('Content-Type') || '';
  
  if (contentType.includes('multipart/form-data')) {
    try {
      let formData;
      try {
        formData = await c.req.formData();
      } catch (error) {
        console.error('FormData parsing error in optionalUpload:', error);
        return next();
      }
      
      const uploads = {};
      const body = {};
      
      for (const [key, value] of formData.entries()) {
        if (value instanceof Blob) {
          // Handle file uploads
          if (key === 'profilePicture') {
            if (!allowedImageTypes.includes(value.type)) {
              return c.json({ 
                success: false, 
                message: 'Invalid image type. Allowed types: ' + allowedImageTypes.join(', ') 
              }, 400);
            }
            
            if (value.size > maxFileSize.image) {
              return c.json({ 
                success: false, 
                message: `File too large. Maximum size: ${(maxFileSize.image / (1024 * 1024))}MB` 
              }, 400);
            }
            
            try {
              const fileExt = path.extname(value.name || '.jpg');
              const fileName = `users/profile/${uuidv4()}${fileExt}`;
              const fileBuffer = Buffer.from(await value.arrayBuffer());
              
              const command = new PutObjectCommand({
                Bucket: process.env.R2_BUCKET_NAME,
                Key: fileName,
                Body: fileBuffer,
                ContentType: value.type
              });
              
              const s3Client = new S3Client({
                region: 'auto',
                endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
                credentials: {
                  accessKeyId: process.env.R2_ACCESS_KEY_ID,
                  secretAccessKey: process.env.R2_SECRET_ACCESS_KEY
                }
              });
              
              await s3Client.send(command);
              
              uploads[key] = `${R2_PUBLIC_URL}/${fileName}`;
            } catch (error) {
              console.error('Error uploading profile picture:', error);
              return c.json({ 
                success: false, 
                message: 'Profile picture upload failed: ' + error.message 
              }, 500);
            }
          } else {
            // Handle other file types
            try {
              const fileExt = path.extname(value.name || `.${value.type.split('/')[1]}`);
              const fileName = `misc/${key}/${uuidv4()}${fileExt}`;
              const fileBuffer = Buffer.from(await value.arrayBuffer());
              
              const command = new PutObjectCommand({
                Bucket: process.env.R2_BUCKET_NAME,
                Key: fileName,
                Body: fileBuffer,
                ContentType: value.type
              });
              
              const s3Client = new S3Client({
                region: 'auto',
                endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
                credentials: {
                  accessKeyId: process.env.R2_ACCESS_KEY_ID,
                  secretAccessKey: process.env.R2_SECRET_ACCESS_KEY
                }
              });
              
              await s3Client.send(command);
              
              uploads[key] = `${R2_PUBLIC_URL}/${fileName}`;
            } catch (error) {
              console.error(`Error uploading ${key}:`, error);
              return c.json({ 
                success: false, 
                message: `${key} upload failed: ` + error.message 
              }, 500);
            }
          }
        } else {
          // Process non-file form data
          try {
            // Try to parse as JSON if possible
            if (typeof value === 'string' && 
                ((value.startsWith('{') && value.endsWith('}')) || 
                (value.startsWith('[') && value.endsWith(']')))) {
              try {
                body[key] = JSON.parse(value);
              } catch (jsonError) {
                body[key] = value;
              }
            } else {
              body[key] = value;
            }
          } catch (e) {
            body[key] = value;
          }
        }
      }
      
      // Add uploads and body to context
      c.set('uploads', uploads);
      c.set('body', body);
      
      return next();
    } catch (error) {
      console.error('Optional upload error:', error);
      // Continue without file upload if there's an error
      return next();
    }
  }
  
  // Otherwise just continue
  return next();
};