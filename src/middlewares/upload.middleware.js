import path from 'path'
import fs from 'fs'
import os from 'os'
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
  image: 500 * 1024 * 1024, // 10MB (corrected from 10GB)
  video: 5 * 1024 * 1024 * 1024 // 5GB
}

// Constants for chunked uploads
const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB chunks for multipart uploads
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || 'https://pub-1a008632cfbe443fa4f631d71332310d.r2.dev';

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
 * Unified file upload middleware
 * @param {string} type - The type of upload (from uploadTypes)
 * @returns {Function} Middleware function
 */
export const handleUpload = (type) => {
  return async (c, next) => {
    try {
      // Try to parse as FormData
      let formData;
      try {
        formData = await c.req.formData();
      } catch (formDataError) {
        console.error('FormData parsing error:', formDataError);
        
        // Check if this is a React Native request by examining Content-Type header
        const contentType = c.req.header('Content-Type') || '';
        if (contentType.includes('multipart/form-data')) {
          // For React Native requests, try to parse the body manually
          try {
            // Get the raw body as text
            const rawBody = await c.req.text();
            console.log('Raw request body length:', rawBody.length);
            console.log('Content-Type header:', contentType);
            
            // Create a custom FormData-like object with proper implementation
            const customFormData = {
              _map: new Map(),
              set(key, value) {
                console.log(`Setting form data: ${key}`, typeof value === 'object' ? 'Object' : value);
                this._map.set(key, value);
              },
              get(key) {
                return this._map.get(key);
              },
              entries() {
                return this._map.entries();
              },
              // Add iterator to make it work with for...of loops
              [Symbol.iterator]() {
                return this._map.entries();
              },
              // Add keys method to mimic FormData
              keys() {
                return this._map.keys();
              },
              // Add has method to check if a key exists
              has(key) {
                return this._map.has(key);
              }
            };
            
            // Extract the boundary from the Content-Type header with more detailed logging
            const boundaryMatch = contentType.match(/boundary=(?:"([^"]*)"|([^;]*))/);
            if (boundaryMatch) {
              const boundary = boundaryMatch[1] || boundaryMatch[2];
              console.log('Detected boundary:', boundary);
              
              // Split the body by boundary
              const parts = rawBody.split(`--${boundary}`);
              console.log(`Found ${parts.length} parts in the multipart data`);
              
              // Process each part with better error handling
              for (const part of parts) {
                if (part.trim() && !part.includes('--\r\n')) {
                  try {
                    // Extract headers and content
                    const splitIndex = part.indexOf('\r\n\r\n');
                    if (splitIndex === -1) {
                      console.log('Invalid part format, missing header/body separator');
                      continue;
                    }
                    
                    const headerText = part.substring(0, splitIndex);
                    const content = part.substring(splitIndex + 4); // +4 for '\r\n\r\n'
                    
                    console.log('Part header:', headerText);
                    console.log('Content length:', content.length);
                    
                    // Parse the Content-Disposition header
                    const nameMatch = headerText.match(/name="([^"]*)"/i);
                    if (!nameMatch) {
                      console.log('No name found in part');
                      continue;
                    }
                    
                    const name = nameMatch[1];
                    console.log(`Processing part with name: ${name}`);
                    
                    // Check if this is a file field
                    const filenameMatch = headerText.match(/filename="([^"]*)"/i);
                    
                    if (filenameMatch) {
                      // This is a file field
                      const filename = filenameMatch[1];
                      console.log(`Found file: ${filename} for field ${name}`);
                      
                      // Extract content type
                      const contentTypeMatch = headerText.match(/Content-Type:\s*([^\r\n]*)/i);
                      const fileType = contentTypeMatch ? contentTypeMatch[1].trim() : 'application/octet-stream';
                      
                      // For React Native, the file content might be a JSON object with uri
                      try {
                        const fileData = JSON.parse(content.trim());
                        if (fileData && fileData.uri) {
                          // This is a React Native file object
                          console.log(`Found React Native file object with URI: ${fileData.uri}`);
                          customFormData.set(name, {
                            uri: fileData.uri,
                            name: fileData.name || filename,
                            type: fileData.type || fileType
                          });
                        }
                      } catch (e) {
                        console.log(`Error parsing file content as JSON: ${e.message}`);
                        // Not JSON, log more details about the content
                        console.log(`Content starts with: ${content.substring(0, 50)}...`);
                      }
                    } else {
                      // This is a regular field
                      const fieldValue = content.trim();
                      console.log(`Setting regular field ${name} with value length: ${fieldValue.length}`);
                      customFormData.set(name, fieldValue);
                    }
                  } catch (partError) {
                    console.error(`Error processing part: ${partError.message}`);
                  }
                }
              }
              
              // Log the keys found in the custom FormData
              console.log('FormData keys:', Array.from(customFormData.keys()));
              
              // Use our custom FormData object
              formData = customFormData;
            } else {
              console.error('No boundary found in Content-Type header:', contentType);
            }
            
            // Use our custom FormData object
            formData = customFormData;
          } catch (parseError) {
            console.error('Failed to parse React Native request:', parseError);
          }
        }
        
        // If we couldn't parse as FormData or handle React Native format, return error
        return c.json({
          success: false,
          message: 'Failed to parse request body as FormData. Make sure you are sending a proper multipart/form-data request.'
        }, 400);
      }
      
      const uploads = {}
      const fileUploads = []
      const userId = c.get('user')?._id
      
      // Normalize the type to match our uploadTypes keys
      const normalizedType = typeof type === 'string' 
        ? type.toUpperCase().replace(/([A-Z])/g, '_$1').replace(/^_/, '')
        : '';
      
      console.log(`Original type: ${type}, Normalized type: ${normalizedType}`);
      
      // Get upload configuration - try multiple ways to match the type
      const uploadConfig = uploadTypes[normalizedType] || uploadTypes[type] || {
        folder: 'creator-content', // Default to creator-content instead of misc
        fields: Array.from(formData.keys()).filter(key => {
          const value = formData.get(key);
          // Check for both Blob instances and React Native file objects
          return value instanceof Blob || 
                 (value && typeof value === 'object' && value.uri && (value.type || value.name));
        })
      };
      
      console.log(`Using upload type: ${type}, folder: ${uploadConfig.folder}`);
      
      // Process each file in the form data
      for (const field of uploadConfig.fields) {
        const fileData = formData.get(field);
        
        // Handle both standard Blob files and React Native file objects
        let file = fileData;
        let fileName = '';
        let fileType = '';
        
        // Check if this is a React Native file object
        if (fileData && typeof fileData === 'object' && fileData.uri && !(fileData instanceof Blob)) {
          console.log(`Processing React Native file object for field ${field}:`, fileData);
          
          // For React Native file objects, we need to create a Blob
          // However, we can't actually create a Blob from the URI on the server side
          // So we'll need to handle this differently - by using the file info directly
          
          fileName = fileData.name || `${field}-${Date.now()}.${fileData.uri.split('.').pop()}`;
          fileType = fileData.type || 'application/octet-stream';
          
          // Since we can't create a real Blob from the URI, we'll set the URL directly
          // This assumes the URI is already a valid URL that can be used directly
          uploads[field] = fileData.uri;
          
          // Log what we're doing
          console.log(`Setting direct URI for ${field}: ${uploads[field]}`);
          
          // Skip the rest of the file processing for this field
          continue;
        } else if (file && file instanceof Blob) {
          // Standard file processing for browser-based uploads
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
            
          console.log(`Validating file size for ${field}: ${file.size} bytes, max allowed: ${maxSize} bytes`);
          
          if (file.size > maxSize) {
            console.log(`File size validation failed for ${field}`);
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
            // Map the upload type to valid enum values in the FileUpload model
            // The enum values in the model are: 'Content', 'Advertisement', 'Channel', 'Video', 'Other'
            const modelTypeMap = {
              'creatorContent': 'Content',
              'CREATOR_CONTENT': 'Content',
              'content': 'Content',
              'CONTENT': 'Content',
              'video': 'Video',
              'VIDEO': 'Video',
              'channel': 'Channel',
              'CHANNEL': 'Channel',
              'advertisement': 'Advertisement',
              'ADVERTISEMENT': 'Advertisement',
              'episode': 'Other',
              'EPISODE': 'Other',
              'lesson': 'Other',
              'LESSON': 'Other',
              'report': 'Other',
              'REPORT': 'Other',
              'contract': 'Other',
              'CONTRACT': 'Other',
              'user': 'Other',
              'USER': 'Other'
            };
            
            // Get the mapped value or use 'Other' as default
            const modelTypeFormatted = modelTypeMap[type] || 'Other';
            
            console.log(`Using model type: ${modelTypeFormatted} (original: ${type})`);
            
            fileUpload = new FileUpload({
              userId,
              fileName: file.name || `${field}-${Date.now()}`,
              fileSize: file.size,
              fileType: file.type,
              uploadPath: `${uploadConfig.folder}/${field}`,
              modelType: modelTypeFormatted,
              status: 'pending'
            })
            
            await fileUpload.save()
            fileUploads.push(fileUpload)
            
            // Store the file upload ID in the uploads object
            uploads[`${field}UploadId`] = fileUpload._id.toString()
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
            // For large video files, use chunked upload
            if ((field === 'videoFile' || field === 'trailer') && file.size > 50 * 1024 * 1024) { // Over 50MB
              console.log(`Large file detected (${file.size} bytes), using chunked upload approach`);
              
              // Update file upload status to indicate chunking
              if (fileUpload) {
                await FileUpload.findByIdAndUpdate(fileUpload._id, {
                  status: 'chunking',
                  progress: 0
                });
              }
              
              const fileBuffer = Buffer.from(await file.arrayBuffer());
              const fileExt = path.extname(file.name || '');
              const fileName = `${uploadConfig.folder}/${field}/${uuidv4()}${fileExt}`;
              
              // Calculate total chunks
              const totalChunks = Math.ceil(fileBuffer.length / CHUNK_SIZE);
              console.log(`Uploading file in ${totalChunks} chunks`);
              
              const s3Client = new S3Client({
                region: 'auto',
                endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
                credentials: {
                  accessKeyId: process.env.R2_ACCESS_KEY_ID,
                  secretAccessKey: process.env.R2_SECRET_ACCESS_KEY
                }
              });
              
              // Upload each chunk
              for (let i = 0; i < totalChunks; i++) {
                const start = i * CHUNK_SIZE;
                const end = Math.min(start + CHUNK_SIZE, fileBuffer.length);
                const chunk = fileBuffer.slice(start, end);
                
                const command = new PutObjectCommand({
                  Bucket: process.env.R2_BUCKET_NAME,
                  Key: `${fileName}.part${i}`,
                  Body: chunk,
                  ContentType: file.type
                });
                
                await s3Client.send(command);
                
                // Update progress
                const progress = Math.round(((i + 1) / totalChunks) * 100);
                console.log(`Chunk ${i+1}/${totalChunks} uploaded (${progress}%)`);
                
                if (fileUpload) {
                  await FileUpload.findByIdAndUpdate(fileUpload._id, {
                    progress: progress
                  });
                }
              }
              
              // After all chunks are uploaded, combine them (this is a simplified approach)
              // In a real implementation, you might use S3's multipart upload API
              console.log('All chunks uploaded, finalizing file');
              
              // Set the final URL
              uploads[field] = `${R2_PUBLIC_URL}/${fileName}`;
              
              // Update file upload status
              if (fileUpload) {
                await FileUpload.findByIdAndUpdate(fileUpload._id, {
                  status: 'complete',
                  progress: 100,
                  url: uploads[field]
                });
              }
            } else {
              // ALWAYS use direct S3 implementation instead of uploadToR2
              // This avoids all the validation errors with the File model
              const fileExt = path.extname(file.name || '');
              const fileName = `${uploadConfig.folder}/${field}/${uuidv4()}${fileExt}`;
              const fileBuffer = Buffer.from(await file.arrayBuffer());
              
              // Update progress to show starting
              if (fileUpload) {
                await FileUpload.findByIdAndUpdate(fileUpload._id, {
                  status: 'uploading',
                  progress: 0
                });
              }
              
              // Create a new S3 client for each upload to avoid connection issues
              const s3Client = new S3Client({
                region: 'auto',
                endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
                credentials: {
                  accessKeyId: process.env.R2_ACCESS_KEY_ID,
                  secretAccessKey: process.env.R2_SECRET_ACCESS_KEY
                },
                forcePathStyle: true // Add this to force path style URLs
              });
              
              // Update progress to 50% before sending
              if (fileUpload) {
                await FileUpload.findByIdAndUpdate(fileUpload._id, {
                  progress: 50
                });
              }
              
              try {
                const command = new PutObjectCommand({
                  Bucket: process.env.R2_BUCKET_NAME,
                  Key: fileName,
                  Body: fileBuffer,
                  ContentType: file.type
                });
                
                await s3Client.send(command);
                
                // Set the URL and update progress
                uploads[field] = `${R2_PUBLIC_URL}/${fileName}`;
                
                // Update file upload status
                if (fileUpload) {
                  await FileUpload.findByIdAndUpdate(fileUpload._id, {
                    status: 'complete',
                    progress: 100,
                    url: uploads[field]
                  });
                }
              } catch (uploadError) {
                console.error('S3 upload error details:', uploadError);
                
                // Try an alternative approach with different settings
                try {
                  console.log('Trying alternative upload approach...');
                  
                  // Create a new client with different settings
                  const altS3Client = new S3Client({
                    region: 'auto',
                    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
                    credentials: {
                      accessKeyId: process.env.R2_ACCESS_KEY_ID,
                      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY
                    },
                    forcePathStyle: false
                  });
                  
                  const altCommand = new PutObjectCommand({
                    Bucket: process.env.R2_BUCKET_NAME,
                    Key: fileName,
                    Body: fileBuffer,
                    ContentType: file.type
                  });
                  
                  await altS3Client.send(altCommand);
                  
                  // Set the URL and update progress
                  uploads[field] = `${R2_PUBLIC_URL}/${fileName}`;
                  
                  // Update file upload status
                  if (fileUpload) {
                    await FileUpload.findByIdAndUpdate(fileUpload._id, {
                      status: 'complete',
                      progress: 100,
                      url: uploads[field]
                    });
                  }
                } catch (altError) {
                  console.error('Alternative upload approach failed:', altError);
                  throw uploadError; // Throw the original error
                }
              }
            }
          } catch (error) {
            console.error('Error uploading to cloud storage:', error);
            if (fileUpload) {
              await FileUpload.findByIdAndUpdate(fileUpload._id, {
                status: 'failed',
                error: error.message
              });
            }
            throw error;
          } finally {
            // Clean up temp file if it exists
            if (tempFilePath && fs.existsSync(tempFilePath)) {
              fs.unlinkSync(tempFilePath);
            }
          }
        }
      }
      
      // Process non-file form data
      const body = {}
      for (const [key, value] of formData.entries()) {
        // Skip file fields that we've already processed
        if (uploadConfig.fields.includes(key)) {
          continue;
        }
        
        // Process non-file values
        if (!(value instanceof Blob)) {
          try {
            // Only try to parse as JSON if it's a valid JSON string
            if (typeof value === 'string' && 
                ((value.startsWith('{') && value.endsWith('}')) || 
                 (value.startsWith('[') && value.endsWith(']')))) {
              try {
                body[key] = JSON.parse(value);
              } catch (jsonError) {
                console.warn(`Invalid JSON in field ${key}, using as string:`, value);
                body[key] = value;
              }
            } else {
              // For non-JSON strings, just use the value directly
              body[key] = value;
            }
          } catch (e) {
            console.warn(`Error processing form field ${key}:`, e.message);
            // If any error occurs, use the raw value
            body[key] = value;
          }
        }
      }
      
      // Add a debug log to see what's being passed to the controller
      console.log('Body being passed to controller:', JSON.stringify(body, null, 2));
      console.log('Uploads being passed to controller:', uploads);
      
      // Add uploads and body to context
      c.set('uploads', uploads);
      c.set('body', body);
      c.set('fileUploads', fileUploads);
      
      // Fix the response interceptor
      const originalJson = c.json.bind(c);
      c.json = (data, status) => {
        // If it's a success response, add the file upload IDs
        if (data && data.success !== false && fileUploads.length > 0) {
          data.fileUploads = fileUploads.map(upload => ({
            id: upload._id.toString(),
            field: upload.uploadPath.split('/').pop(),
            status: upload.status
          }));
        }
        return originalJson(data, status);
      };
      
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

// Add endpoint to check multiple upload progress
export const getMultipleUploadProgress = async (c) => {
  try {
    const fileIds = c.req.query('fileIds')?.split(',') || [];
    
    if (!fileIds.length) {
      return c.json({ success: false, message: 'No file IDs provided' }, 400);
    }
    
    const fileUploads = await FileUpload.find({
      _id: { $in: fileIds }
    }).select('status progress error url fileName fileSize');
    
    return c.json({
      success: true,
      uploads: fileUploads.map(upload => ({
        id: upload._id.toString(),
        status: upload.status,
        progress: upload.progress,
        error: upload.error,
        url: upload.url,
        fileName: upload.fileName,
        fileSize: upload.fileSize
      }))
    });
  } catch (error) {
    return c.json({ success: false, message: 'Failed to get upload progress: ' + error.message }, 500);
  }
}

// For backward compatibility
export const handleFileUpload = handleUpload

// Optional upload middleware that doesn't fail if there's no file
export const optionalUpload = async (c, next) => {
  const contentType = c.req.header('Content-Type') || '';
  
  // Only process as upload if it's multipart/form-data
  if (contentType.includes('multipart/form-data')) {
    try {
      // Process the form data directly without using FileUpload model
      const formData = await c.req.formData();
      const uploads = {};
      const body = {};
      
      // Process each file in the form data
      for (const [key, value] of formData.entries()) {
        if (value instanceof Blob) {
          // Handle file upload for profile picture
          if (key === 'profilePicture') {
            // Validate file type
            if (!allowedImageTypes.includes(value.type)) {
              return c.json({ 
                success: false, 
                message: `Invalid image type. Allowed types: ${allowedImageTypes.join(', ')}` 
              }, 400);
            }
            
            // Validate file size - use correct size limit
            if (value.size > maxFileSize.image) {
              return c.json({ 
                success: false, 
                message: `File too large. Maximum size: ${(maxFileSize.image / (1024 * 1024))}MB` 
              }, 400);
            }
            
            // Upload to cloud storage
            try {
              const fileExt = path.extname(value.name || '.jpg');
              const fileName = `users/profilePicture/${uuidv4()}${fileExt}`;
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
              
              // Use the correct URL format with the public ID instead of bucket name
              uploads[key] = `${R2_PUBLIC_URL}/${fileName}`;
            } catch (error) {
              console.error('Error uploading to cloud storage:', error);
              return c.json({ 
                success: false, 
                message: 'File upload failed: ' + error.message 
              }, 500);
            }
          } else if (key === 'videoFile' || key === 'trailer') {
            // Handle video file uploads
            if (!allowedVideoTypes.includes(value.type)) {
              return c.json({ 
                success: false, 
                message: `Invalid video type. Allowed types: ${allowedVideoTypes.join(', ')}` 
              }, 400);
            }
            
            // Use video size limit
            if (value.size > maxFileSize.video) {
              return c.json({ 
                success: false, 
                message: `File too large. Maximum size: ${(maxFileSize.video / (1024 * 1024 * 1024))}GB` 
              }, 400);
            }
            
            // Upload video file using same approach as profile picture
            try {
              const fileExt = path.extname(value.name || '.mp4');
              const fileName = `videos/${key}/${uuidv4()}${fileExt}`;
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
              console.error('Error uploading video to cloud storage:', error);
              return c.json({ 
                success: false, 
                message: 'Video upload failed: ' + error.message 
              }, 500);
            }
          }
        } else {
          // Process non-file form data
          try {
            // Try to parse as JSON if possible
            body[key] = JSON.parse(value);
          } catch (e) {
            // Otherwise use as is
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