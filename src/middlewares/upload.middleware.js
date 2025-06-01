import path from 'path'
import fs from 'fs'
import os from 'os'
import { v4 as uuidv4 } from 'uuid'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getVideoDurationInSeconds } from 'get-video-duration'
import formidable from 'formidable'
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
      
      // Configure formidable
      const form = formidable({
        multiples: true,
        maxFileSize: maxFileSize.video, // Set to largest possible size
        filter: (part) => {
          // Return true to accept the file, false to reject
          if (!part.originalFilename || !part.mimetype) return false;
          
          // Check file type based on field name
          const field = part.name;
          if ((field === 'videoFile' || field === 'trailer') && 
              !allowedVideoTypes.includes(part.mimetype)) {
            return false;
          }
          
          if ((field.includes('thumbnail') || field.includes('Banner') || field.includes('logo')) && 
              !allowedImageTypes.includes(part.mimetype)) {
            return false;
          }
          
          return true;
        }
      });
      
      // Parse the form data
      await new Promise((resolve, reject) => {
        form.parse(c.req.raw, async (err, fields, files) => {
          if (err) {
            console.error('FormData parsing error:', err);
            reject(err);
            return;
          }
          
          // Process form fields
          for (const [key, value] of Object.entries(fields)) {
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
          
          // Process files
          for (const [fieldName, fileInfo] of Object.entries(files)) {
            if (!uploadConfig.fields.includes(fieldName)) continue;
            
            const fileArray = Array.isArray(fileInfo) ? fileInfo : [fileInfo];
            
            for (const file of fileArray) {
              try {
                // Create file upload tracking record
                let fileUpload = null;
                if (userId) {
                  fileUpload = new FileUpload({
                    userId,
                    fileName: file.originalFilename,
                    fileSize: file.size,
                    fileType: file.mimetype,
                    status: 'uploading',
                    field: fieldName,
                    modelType: type === 'CHANNEL' ? 'Channel' : 
                              type === 'VIDEO' ? 'Video' : 
                              type === 'ADVERTISEMENT' ? 'Advertisement' : 
                              type === 'CONTENT' || type === 'CREATOR_CONTENT' ? 'Content' : 'Other',
                    uploadPath: `${uploadConfig.folder}/${fieldName}`
                  });
                  
                  await fileUpload.save();
                  fileUploads.push(fileUpload);
                }
                
                // Read file content
                const fileBuffer = fs.readFileSync(file.filepath);
                
                // Generate unique filename
                const fileExt = path.extname(file.originalFilename);
                const fileName = `${uploadConfig.folder}/${fieldName}/${uuidv4()}${fileExt}`;
                
                // Upload to R2
                const command = new PutObjectCommand({
                  Bucket: process.env.R2_BUCKET_NAME,
                  Key: fileName,
                  Body: fileBuffer,
                  ContentType: file.mimetype
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
                uploads[fieldName] = `${R2_PUBLIC_URL}/${fileName}`;
                
                // Update file upload status
                if (fileUpload) {
                  await FileUpload.findByIdAndUpdate(fileUpload._id, {
                    status: 'completed',
                    url: uploads[fieldName],
                    progress: 100
                  });
                }
                
                // Calculate video duration for video files
                if ((fieldName === 'videoFile' || fieldName === 'trailer') && 
                    file.mimetype.startsWith('video/')) {
                  try {
                    const duration = await getVideoDurationInSeconds(file.filepath);
                    
                    // Add duration to body
                    if (fieldName === 'trailer') {
                      body.trailerDuration = Math.round(duration);
                    } else {
                      body.duration = Math.round(duration);
                    }
                  } catch (error) {
                    console.error('Error calculating video duration:', error);
                  }
                }
                
                // Clean up temp file
                fs.unlinkSync(file.filepath);
                
              } catch (error) {
                console.error(`Error processing ${fieldName}:`, error);
                
                // Update file upload status on error
                if (fileUpload) {
                  await FileUpload.findByIdAndUpdate(fileUpload._id, {
                    status: 'failed',
                    error: error.message
                  });
                }
                
                reject(error);
                return;
              }
            }
          }
          
          resolve();
        });
      });
      
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