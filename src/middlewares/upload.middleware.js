import path from 'path'
import fs from 'fs'
import os from 'os'
import { v4 as uuidv4 } from 'uuid'
import { 
  S3Client, 
  PutObjectCommand, 
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand
} from '@aws-sdk/client-s3'
import { getVideoDurationInSeconds } from 'get-video-duration'
import formidable from 'formidable'
import FileUpload from '../models/fileUpload.model.js'
import socketService from '../services/socket.service.js'

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
 * Enhanced file upload middleware with chunked upload support
 * @param {string} type - The type of upload (from uploadTypes)
 * @returns {Function} Middleware function
 */
export const handleUpload = (type) => {
  return async (c, next) => {
    try {
      const contentType = c.req.header('Content-Type') || '';
      console.log('Request path:', c.req.path);
      console.log('Content-Type:', contentType);
      
      // Get user from context
      const user = c.get('user');
      
      // Get upload configuration based on type
      const uploadConfig = uploadTypes[type];
      console.log('Upload config:', uploadConfig);
      
      // Initialize uploads object
      const uploads = {};
      const body = {};
      
      // Check for chunked upload action
      const url = new URL(c.req.url, 'http://localhost');
      const action = url.searchParams.get('action');
      const chunkIndex = url.searchParams.get('chunkIndex');
      const totalChunks = url.searchParams.get('totalChunks');
      const fileId = url.searchParams.get('fileId');
      
      // Handle chunked upload if action is specified
      if (action && contentType.includes('multipart/form-data')) {
        let result;
        
        switch (action) {
          case 'initialize':
            result = await initializeChunkedUpload(c, uploadConfig);
            return c.json(result);
            
          case 'upload':
            if (!fileId || chunkIndex === null) {
              return c.json({
                success: false,
                message: 'Missing fileId or chunkIndex'
              }, 400);
            }
            result = await handleChunkUpload(c, fileId, parseInt(chunkIndex), parseInt(totalChunks));
            return c.json(result);
            
          case 'complete':
            if (!fileId) {
              return c.json({
                success: false,
                message: 'Missing fileId'
              }, 400);
            }
            result = await completeChunkedUpload(c, fileId);
            return c.json(result);
            
          case 'abort':
            if (!fileId) {
              return c.json({
                success: false,
                message: 'Missing fileId'
              }, 400);
            }
            result = await abortChunkedUpload(c, fileId);
            return c.json(result);
        }
      }
      
      // Only process if content type is multipart/form-data
      if (contentType.includes('multipart/form-data')) {
        try {
          // Use formidable for more robust form parsing
          const form = formidable({
            maxFileSize: maxFileSize.video, // Set to max video size
            multiples: true,
            keepExtensions: true,
            uploadDir: tempDir,
            allowEmptyFiles: false,
            maxFields: 20,
            maxFieldsSize: 1 * 1024 * 1024, // 1MB for text fields
          });
          
          // Parse the form using the raw Node.js request object
          const [fields, files] = await new Promise((resolve, reject) => {
            // Use c.req.raw to get the Node.js native request object
            form.parse(c.req.raw, (err, fields, files) => {
              if (err) return reject(err);
              resolve([fields, files]);
            });
          })
          
          // Process fields
          for (const [key, value] of Object.entries(fields)) {
            // Handle regular form fields
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
          
          // Process files
          for (const [key, fileInfo] of Object.entries(files)) {
            const file = Array.isArray(fileInfo) ? fileInfo[0] : fileInfo;
            
            if (!file) continue;
            
            // Handle file uploads
            if (uploadConfig.fields.includes(key) || (key === 'video' && uploadConfig.fields.includes('videoFile'))) {
              // Validate file type for videos
              const isVideo = key === 'video' || key === 'videoFile' || key === 'trailer';
              
              if (isVideo && !allowedVideoTypes.includes(file.mimetype)) {
                return c.json({
                  success: false,
                  message: `Invalid video format. Allowed types: ${allowedVideoTypes.join(', ')}`
                }, 400);
              }
              
              // Validate file type for images
              if (['thumbnail', 'logo', 'banner', 'verticalBanner', 'horizontalBanner'].includes(key) && 
                  !allowedImageTypes.includes(file.mimetype)) {
                return c.json({
                  success: false,
                  message: `Invalid image format for ${key}. Allowed types: ${allowedImageTypes.join(', ')}`
                }, 400);
              }
              
              // Validate file size
              const maxSize = isVideo ? maxFileSize.video : maxFileSize.image;
              
              if (file.size > maxSize) {
                const maxSizeMB = maxSize / (1024 * 1024);
                return c.json({
                  success: false,
                  message: `File too large for ${key}. Maximum size: ${maxSizeMB}MB`
                }, 400);
              }
              
              try {
                // Create a unique filename
                const fileExtension = path.extname(file.originalFilename);
                const fileName = `${uploadConfig.folder}/${uuidv4()}${fileExtension}`;
                
                // Set up S3 client for R2
                const s3Client = new S3Client({
                  region: 'auto',
                  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
                  credentials: {
                    accessKeyId: process.env.R2_ACCESS_KEY_ID,
                    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY
                  }
                });
                
                // For video files larger than 100MB, use chunked upload
                if (isVideo && file.size > 100 * 1024 * 1024) {
                  // Create a file upload record
                  const fileUpload = await FileUpload.create({
                    userId: user.id,
                    fileName: file.originalFilename,
                    fileSize: file.size,
                    fileType: file.mimetype,
                    uploadPath: fileName,
                    modelType: 'Other',
                    status: 'chunking',
                    progress: 0
                  });
                  
                  // Initialize multipart upload
                  const createCommand = new CreateMultipartUploadCommand({
                    Bucket: process.env.R2_BUCKET_NAME,
                    Key: fileName,
                    ContentType: file.mimetype
                  });
                  
                  const { UploadId } = await s3Client.send(createCommand);
                  
                  // Update file upload record with upload ID
                  await FileUpload.findByIdAndUpdate(fileUpload._id, { uploadId: UploadId });
                  
                  // Read file and upload in chunks
                  const fileBuffer = fs.readFileSync(file.filepath);
                  const chunkSize = 5 * 1024 * 1024; // 5MB chunks
                  const chunks = Math.ceil(file.size / chunkSize);
                  const parts = [];
                  
                  for (let i = 0; i < chunks; i++) {
                    const start = i * chunkSize;
                    const end = Math.min(start + chunkSize, file.size);
                    const chunk = fileBuffer.slice(start, end);
                    
                    const uploadPartCommand = new UploadPartCommand({
                      Bucket: process.env.R2_BUCKET_NAME,
                      Key: fileName,
                      UploadId: UploadId,
                      PartNumber: i + 1,
                      Body: chunk
                    });
                    
                    const { ETag } = await s3Client.send(uploadPartCommand);
                    
                    parts.push({
                      ETag,
                      PartNumber: i + 1
                    });
                    
                    // Update progress
                    const progress = Math.round(((i + 1) / chunks) * 100);
                    await FileUpload.findByIdAndUpdate(fileUpload._id, { progress });
                    
                    // Emit progress via socket
                    socketService.emitUploadProgress(user.id, fileUpload._id.toString(), progress);
                  }
                  
                  // Complete multipart upload
                  const completeCommand = new CompleteMultipartUploadCommand({
                    Bucket: process.env.R2_BUCKET_NAME,
                    Key: fileName,
                    UploadId: UploadId,
                    MultipartUpload: {
                      Parts: parts
                    }
                  });
                  
                  await s3Client.send(completeCommand);
                  
                  // Update file upload record
                  const fileUrl = `${R2_PUBLIC_URL}/${fileName}`;
                  await FileUpload.findByIdAndUpdate(fileUpload._id, {
                    status: 'completed',
                    progress: 100,
                    url: fileUrl
                  });
                  
                  // Emit completion via socket
                  socketService.emitUploadComplete(user.id, fileUpload._id.toString(), fileUrl);
                  
                  // Set the URL in uploads object with proper field name mapping
                  if (key === 'video') {
                    uploads['videoFile'] = fileUrl;
                  } else {
                    uploads[key] = fileUrl;
                  }
                } else {
                  // Regular upload for smaller files
                  const fileBuffer = fs.readFileSync(file.filepath);
                  
                  // Create upload command
                  const command = new PutObjectCommand({
                    Bucket: process.env.R2_BUCKET_NAME,
                    Key: fileName,
                    Body: fileBuffer,
                    ContentType: file.mimetype
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
                }
                
                // Clean up temp file
                fs.unlinkSync(file.filepath);
                
              } catch (uploadError) {
                console.error(`Error uploading ${key}:`, uploadError);
                return c.json({
                  success: false,
                  message: `${key} upload failed: ${uploadError.message}`
                }, 500);
              }
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
      } else {
        console.log('Not a multipart/form-data request, skipping file processing');
        // For non-multipart requests, try to parse as JSON
        try {
          const jsonBody = await c.req.json();
          Object.assign(body, jsonBody);
        } catch (error) {
          console.log('Not a JSON request either, continuing');
        }
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

/**
 * Initialize a chunked upload
 * @param {Object} c - Hono context
 * @param {Object} uploadConfig - Upload configuration
 * @returns {Object} Initialization result
 */
async function initializeChunkedUpload(c, uploadConfig) {
  try {
    const user = c.get('user');
    const form = formidable({
      maxFileSize: 10 * 1024 * 1024, // Just for metadata, not the actual file
      multiples: false,
      keepExtensions: true,
      uploadDir: tempDir,
    });
    
    // Parse the form
    const [fields] = await new Promise((resolve, reject) => {
      form.parse(c.req.raw, (err, fields) => {
        if (err) return reject(err);
        resolve([fields]);
      });
    });
    
    const { fileName, fileSize, fileType, field } = fields;
    
    if (!fileName || !fileSize || !fileType || !field) {
      return {
        success: false,
        message: 'Missing required fields'
      };
    }
    
    // Validate file type
    const isVideo = field === 'video' || field === 'videoFile' || field === 'trailer';
    
    if (isVideo && !allowedVideoTypes.includes(fileType)) {
      return {
        success: false,
        message: `Invalid video format. Allowed types: ${allowedVideoTypes.join(', ')}`
      };
    }
    
    if (['thumbnail', 'logo', 'banner', 'verticalBanner', 'horizontalBanner'].includes(field) && 
        !allowedImageTypes.includes(fileType)) {
      return {
        success: false,
        message: `Invalid image format for ${field}. Allowed types: ${allowedImageTypes.join(', ')}`
      };
    }
    
    // Validate file size
    const maxSize = isVideo ? maxFileSize.video : maxFileSize.image;
    
    if (parseInt(fileSize) > maxSize) {
      const maxSizeMB = maxSize / (1024 * 1024);
      return {
        success: false,
        message: `File too large for ${field}. Maximum size: ${maxSizeMB}MB`
      };
    }
    
    // Create a unique filename
    const fileExtension = path.extname(fileName);
    const uploadPath = `${uploadConfig.folder}/${uuidv4()}${fileExtension}`;
    
    // Create file upload record
    const fileUpload = await FileUpload.create({
      userId: user.id,
      fileName: fileName,
      fileSize: parseInt(fileSize),
      fileType: fileType,
      uploadPath: uploadPath,
      modelType: 'Other',
      status: 'pending',
      progress: 0
    });
    
    // Set up S3 client for R2
    const s3Client = new S3Client({
      region: 'auto',
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY
      }
    });
    
    // Initialize multipart upload
    const createCommand = new CreateMultipartUploadCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: uploadPath,
      ContentType: fileType
    });
    
    const { UploadId } = await s3Client.send(createCommand);
    
    // Update file upload record with upload ID
    await FileUpload.findByIdAndUpdate(fileUpload._id, { 
      uploadId: UploadId,
      status: 'uploading'
    });
    
    return {
      success: true,
      fileId: fileUpload._id.toString(),
      uploadId: UploadId
    };
  } catch (error) {
    console.error('Error initializing chunked upload:', error);
    return {
      success: false,
      message: `Failed to initialize upload: ${error.message}`
    };
  }
}

/**
 * Handle a chunk upload
 * @param {Object} c - Hono context
 * @param {string} fileId - File ID
 * @param {number} chunkIndex - Chunk index
 * @param {number} totalChunks - Total number of chunks
 * @returns {Object} Chunk upload result
 */
async function handleChunkUpload(c, fileId, chunkIndex, totalChunks) {
  try {
    // Find the file upload record
    const fileUpload = await FileUpload.findById(fileId);
    
    if (!fileUpload) {
      return {
        success: false,
        message: 'File upload record not found'
      };
    }
    
    if (fileUpload.status === 'failed') {
      return {
        success: false,
        message: 'Upload already failed'
      };
    }
    
    // Parse the form
    const form = formidable({
      maxFileSize: 10 * 1024 * 1024, // 10MB per chunk
      multiples: false,
      keepExtensions: true,
      uploadDir: tempDir,
    });
    
    const [_, files] = await new Promise((resolve, reject) => {
      form.parse(c.req.raw, (err, fields, files) => {
        if (err) return reject(err);
        resolve([fields, files]);
      });
    });
    
    const chunkFile = files.chunk;
    
    if (!chunkFile) {
      return {
        success: false,
        message: 'No chunk file found'
      };
    }
    
    // Set up S3 client for R2
    const s3Client = new S3Client({
      region: 'auto',
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY
      }
    });
    
    // Upload the chunk
    const fileBuffer = fs.readFileSync(chunkFile.filepath);
    
    const uploadPartCommand = new UploadPartCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: fileUpload.uploadPath,
      UploadId: fileUpload.uploadId,
      PartNumber: chunkIndex + 1,
      Body: fileBuffer
    });
    
    const { ETag } = await s3Client.send(uploadPartCommand);
    
    // Update progress
    const progress = Math.round(((chunkIndex + 1) / totalChunks) * 100);
    await FileUpload.findByIdAndUpdate(fileId, { progress });
    
    // Emit progress via socket
    socketService.emitUploadProgress(fileUpload.userId, fileId, progress);
    
    // Clean up temp file
    fs.unlinkSync(chunkFile.filepath);
    
    return {
      success: true,
      etag: ETag,
      partNumber: chunkIndex + 1,
      progress
    };
  } catch (error) {
    console.error('Error uploading chunk:', error);
    
    // Update file upload record
    await FileUpload.findByIdAndUpdate(fileId, {
      status: 'failed',
      error: error.message
    });
    
    // Emit error via socket
    const fileUpload = await FileUpload.findById(fileId);
    if (fileUpload) {
      socketService.emitUploadError(fileUpload.userId, fileId, error.message);
    }
    
    return {
      success: false,
      message: `Failed to upload chunk: ${error.message}`
    };
  }
}

/**
 * Complete a chunked upload
 * @param {Object} c - Hono context
 * @param {string} fileId - File ID
 * @returns {Object} Completion result
 */
async function completeChunkedUpload(c, fileId) {
  try {
    // Find the file upload record
    const fileUpload = await FileUpload.findById(fileId);
    
    if (!fileUpload) {
      return {
        success: false,
        message: 'File upload record not found'
      };
    }
    
    if (fileUpload.status === 'failed') {
      return {
        success: false,
        message: 'Upload already failed'
      };
    }
    
    // Parse the form
    const form = formidable({
      maxFieldsSize: 1 * 1024 * 1024, // 1MB for fields
    });
    
    const [fields] = await new Promise((resolve, reject) => {
      form.parse(c.req.raw, (err, fields) => {
        if (err) return reject(err);
        resolve([fields]);
      });
    });
    
    const { parts } = fields;
    
    if (!parts) {
      return {
        success: false,
        message: 'Missing parts information'
      };
    }
    
    let parsedParts;
    try {
      parsedParts = JSON.parse(parts);
    } catch (error) {
      return {
        success: false,
        message: 'Invalid parts format'
      };
    }
    
    // Set up S3 client for R2
    const s3Client = new S3Client({
      region: 'auto',
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY
      }
    });
    
    // Complete multipart upload
    const completeCommand = new CompleteMultipartUploadCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: fileUpload.uploadPath,
      UploadId: fileUpload.uploadId,
      MultipartUpload: {
        Parts: parsedParts
      }
    });
    
    await s3Client.send(completeCommand);
    
    // Update file upload record
    const fileUrl = `${R2_PUBLIC_URL}/${fileUpload.uploadPath}`;
    await FileUpload.findByIdAndUpdate(fileId, {
      status: 'completed',
      progress: 100,
      url: fileUrl
    });
    
    // Emit completion via socket
    socketService.emitUploadComplete(fileUpload.userId, fileId, fileUrl);
    
    return {
      success: true,
      url: fileUrl
    };
  } catch (error) {
    console.error('Error completing chunked upload:', error);
    
    // Update file upload record
    await FileUpload.findByIdAndUpdate(fileId, {
      status: 'failed',
      error: error.message
    });
    
    // Emit error via socket
    const fileUpload = await FileUpload.findById(fileId);
    if (fileUpload) {
      socketService.emitUploadError(fileUpload.userId, fileId, error.message);
    }
    
    return {
      success: false,
      message: `Failed to complete upload: ${error.message}`
    };
  }
}

/**
 * Abort a chunked upload
 * @param {Object} c - Hono context
 * @param {string} fileId - File ID
 * @returns {Object} Abort result
 */
async function abortChunkedUpload(c, fileId) {
  try {
    // Find the file upload record
    const fileUpload = await FileUpload.findById(fileId);
    
    if (!fileUpload) {
      return {
        success: false,
        message: 'File upload record not found'
      };
    }
    
    // Set up S3 client for R2
    const s3Client = new S3Client({
      region: 'auto',
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY
      }
    });
    
    // Abort multipart upload
    const abortCommand = new AbortMultipartUploadCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: fileUpload.uploadPath,
      UploadId: fileUpload.uploadId
    });
    
    await s3Client.send(abortCommand);
    
    // Update file upload record
    await FileUpload.findByIdAndUpdate(fileId, {
      status: 'failed',
      error: 'Upload aborted by user'
    });
    
    return {
      success: true,
      message: 'Upload aborted successfully'
    };
  } catch (error) {
    console.error('Error aborting chunked upload:', error);
    return {
      success: false,
      message: `Failed to abort upload: ${error.message}`
    };
  }
}

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
