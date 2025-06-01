import path from 'path'
import fs from 'fs'
import os from 'os'
import { v4 as uuidv4 } from 'uuid'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getVideoDurationInSeconds } from 'get-video-duration'
import formidable from 'formidable'
import FileUpload from '../models/fileUpload.model.js'
import socketService from '../services/socket.service.js';

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
      console.log('Content-Type:', c.req.header('Content-Type'));
      
      // Get user from context
      const user = c.get('user');
      
      // Get upload configuration
      const uploadConfig = uploadTypes[type] || uploadTypes.DEFAULT;
      console.log('Upload config:', uploadConfig);
      
      // Initialize uploads object
      const uploads = {};
      const body = {};
      
      try {
        // Process the form data using Hono's built-in multipart handling
        console.log('Attempting to parse form data...');
        const formData = await c.req.parseBody();
        console.log('Form data keys:', Object.keys(formData));
        
        // Process fields
        for (const [key, value] of Object.entries(formData)) {
          console.log(`Processing field: ${key}, type:`, typeof value, value instanceof File ? 'File' : 'Not File');
          
          if (value instanceof File) {
            console.log(`File details for ${key}:`, {
              name: value.name,
              size: value.size,
              type: value.type
            });
            
            // Handle file uploads
            if (uploadConfig.fields.includes(key) || (key === 'video' && uploadConfig.fields.includes('videoFile'))) {
              // Validate file type for videos
              const isVideo = key === 'video' || key === 'videoFile' || key === 'trailer';
              
              if (isVideo && !allowedVideoTypes.includes(value.type)) {
                return c.json({
                  success: false,
                  message: `Invalid video format. Allowed types: ${allowedVideoTypes.join(', ')}`
                }, 400);
              }
              
              // Validate file type for images
              if (['thumbnail', 'logo', 'banner', 'verticalBanner', 'horizontalBanner'].includes(key) && 
                  !allowedImageTypes.includes(value.type)) {
                return c.json({
                  success: false,
                  message: `Invalid image format for ${key}. Allowed types: ${allowedImageTypes.join(', ')}`
                }, 400);
              }
              
              // Validate file size
              const maxSize = isVideo ? maxFileSize.video : maxFileSize.image;
              
              if (value.size > maxSize) {
                const maxSizeMB = maxSize / (1024 * 1024);
                return c.json({
                  success: false,
                  message: `File too large for ${key}. Maximum size: ${maxSizeMB}MB`
                }, 400);
              }
              
              try {
                // Create a unique filename
                const fileExtension = path.extname(value.name);
                const fileName = `${uploadConfig.folder}/${uuidv4()}${fileExtension}`;
                
                // Get the file buffer
                const arrayBuffer = await value.arrayBuffer();
                const buffer = Buffer.from(arrayBuffer);
                
                // Set up S3 client for R2
                const s3Client = new S3Client({
                  region: 'auto',
                  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
                  credentials: {
                    accessKeyId: process.env.R2_ACCESS_KEY_ID,
                    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY
                  }
                });
                
                // Create upload command
                const command = new PutObjectCommand({
                  Bucket: process.env.R2_BUCKET_NAME,
                  Key: fileName,
                  Body: buffer,
                  ContentType: value.type
                });
                
                // Upload to R2
                await s3Client.send(command);
                
                // Set the URL in uploads object with proper field name mapping
                if (key === 'video') {
                  // Map 'video' field to 'videoFile' in uploads object
                  uploads['videoFile'] = `${R2_PUBLIC_URL}/${fileName}`;
                  console.log('Set videoFile URL:', uploads['videoFile']);
                } else {
                  uploads[key] = `${R2_PUBLIC_URL}/${fileName}`;
                  console.log(`Set ${key} URL:`, uploads[key]);
                }
                
              } catch (uploadError) {
                console.error(`Error uploading ${key}:`, uploadError);
                return c.json({
                  success: false,
                  message: `${key} upload failed: ${uploadError.message}`
                }, 500);
              }
            }
          } else {
            // Handle regular form fields
            body[key] = value;
          }
        }
        
        console.log('Final uploads object:', uploads);
        
      } catch (parseError) {
        console.error('Error parsing form data:', parseError);
        return c.json({ 
          success: false, 
          message: `Error parsing form data: ${parseError.message}` 
        }, 400);
      }
      
      // Add uploads and body to context
      c.set('uploads', uploads);
      c.set('body', body);
      
      return next();
    } catch (error) {
      console.error('Upload error:', error);
      return c.json({ 
        success: false, 
        message: `Upload failed: ${error.message}` 
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
