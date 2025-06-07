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
import multer from 'multer'
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

// Configure multer storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, tempDir)
  },
  filename: function (req, file, cb) {
    // Create a unique filename with original extension
    const originalExt = path.extname(file.originalname)
    const filename = `${Date.now()}_${uuidv4()}${originalExt}`
    cb(null, filename)
  }
})

// File filter function to validate file types
const fileFilter = (req, file, cb) => {
  // Check if it's a video file
  if (file.fieldname === 'videoFile' || file.fieldname === 'video' || file.fieldname === 'trailer') {
    if (allowedVideoTypes.includes(file.mimetype)) {
      cb(null, true) // Accept file
    } else {
      cb(new Error(`Invalid video format. Allowed types: ${allowedVideoTypes.join(', ')}`), false)
    }
  } 
  // Check if it's an image file
  else if (['thumbnail', 'logo', 'banner', 'verticalBanner', 'horizontalBanner'].includes(file.fieldname)) {
    if (allowedImageTypes.includes(file.mimetype)) {
      cb(null, true) // Accept file
    } else {
      cb(new Error(`Invalid image format for ${file.fieldname}. Allowed types: ${allowedImageTypes.join(', ')}`), false)
    }
  } 
  // Accept other files
  else {
    cb(null, true)
  }
}

// Function to upload file to cloud storage
async function uploadToCloudStorage(filePath, originalName, mimeType, folder, userId) {
  // Create a unique filename
  const fileExtension = path.extname(originalName);
  const fileName = `${folder}/${uuidv4()}${fileExtension}`;
  
  // Set up S3 client for R2
  const s3Client = new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY
    }
  });
  
  // Read file
  const fileBuffer = fs.readFileSync(filePath);
  
  // Create upload command
  const command = new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME,
    Key: fileName,
    Body: fileBuffer,
    ContentType: mimeType
  });
  
  // Upload to R2
  await s3Client.send(command);
  
  // Return the URL
  return {
    url: `${R2_PUBLIC_URL}/${fileName}`,
    path: fileName
  };
}

// Create multer upload instance with size limits
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB limit for all files
    files: 10 // Maximum 10 files per request
  },
  fileFilter: fileFilter
})

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
      'video', // Add this line to accept both field names
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
  return async (req, res, next) => {
    try {
      const contentType = req.headers['content-type'] || '';
      console.log('Request path:', req.path);
      console.log('Content-Type:', contentType);
      console.log('Starting file upload, content type:', req.headers['content-type']);
      console.log('Content length:', req.headers['content-length'], 'bytes');
      
      // Add request timeout listener
      req.on('timeout', () => {
        console.error('Request timeout occurred during file upload');
      });
      
      req.on('close', () => {
        if (!req.complete) {
          console.error('Client closed connection prematurely');
        }
      });
      
      // Get user from request (set by auth middleware)
      const user = req.user;
      
      // Get upload configuration based on type
      const uploadConfig = uploadTypes[type];
      console.log('Upload config:', uploadConfig);
      
      // Initialize uploads object
      const uploads = {};
      const body = {};
      
      // Check for chunked upload action
      const url = new URL(req.url, `http://${req.headers.host}`);
      const action = url.searchParams.get('action');
      const chunkIndex = url.searchParams.get('chunkIndex');
      const totalChunks = url.searchParams.get('totalChunks');
      const fileId = url.searchParams.get('fileId');
      
      // Handle chunked upload if action is specified
      if (action) {
        let result;
        
        switch (action) {
          case 'initialize':
            result = await initializeChunkedUpload(req, uploadConfig, user);
            return res.json(result);
            
          case 'upload':
            if (!fileId || chunkIndex === null) {
              return res.status(400).json({
                success: false,
                message: 'Missing fileId or chunkIndex'
              });
            }
            result = await handleChunkUpload(req, fileId, parseInt(chunkIndex), parseInt(totalChunks));
            return res.json(result);
            
          case 'complete':
            if (!fileId) {
              return res.status(400).json({
                success: false,
                message: 'Missing fileId'
              });
            }
            result = await completeChunkedUpload(req, fileId);
            return res.json(result);
            
          case 'abort':
            if (!fileId) {
              return res.status(400).json({
                success: false,
                message: 'Missing fileId'
              });
            }
            result = await abortChunkedUpload(req, fileId);
            return res.json(result);
        }
      }
      
      // Use multer to handle the file uploads
      const multerUpload = upload.fields(
        uploadConfig.fields.map(field => ({ name: field, maxCount: 1 }))
      );
      
      multerUpload(req, res, async (err) => {
        if (err) {
          console.error('Multer error:', err);
          if (err instanceof multer.MulterError) {
            // A Multer error occurred when uploading
            if (err.code === 'LIMIT_FILE_SIZE') {
              return res.status(400).json({
                success: false,
                message: 'File too large. Maximum size: 500MB'
              });
            }
            return res.status(400).json({
              success: false,
              message: `Upload error: ${err.message}`
            });
          }
          return res.status(400).json({
            success: false,
            message: err.message
          });
        }
        
        // Initialize uploads object
        const uploads = {};
        
        // Process uploaded files
        if (req.files) {
          for (const [fieldName, files] of Object.entries(req.files)) {
            const file = files[0]; // Get the first file for each field
            
            if (!file) continue;
            
            // Determine if this is a video file
            const isVideo = fieldName === 'videoFile' || fieldName === 'video' || fieldName === 'trailer';
            
            try {
              // Create a unique filename
              const fileExtension = path.extname(file.originalname);
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
                  fileName: file.originalname,
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
                const fileBuffer = fs.readFileSync(file.path);
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
                if (fieldName === 'video') {
                  uploads['videoFile'] = fileUrl;
                } else {
                  uploads[fieldName] = fileUrl;
                }
              } else {
                // Create a file upload record for tracking
                const fileUpload = await FileUpload.create({
                  userId: user.id,
                  fileName: file.originalname,
                  fileSize: file.size,
                  fileType: file.mimetype,
                  uploadPath: fileName,
                  modelType: 'Other',
                  status: 'uploading',
                  progress: 0
                });
                
                // Update progress to 5% when starting upload to R2
                await FileUpload.findByIdAndUpdate(fileUpload._id, { progress: 5 });
                socketService.emitUploadProgress(user.id, fileUpload._id.toString(), 5);
                console.log(`Starting upload to R2 for ${file.originalname} (${Math.round(file.size / 1024 / 1024 * 100) / 100}MB)`);
                
                // Regular upload for smaller files
                const fileBuffer = fs.readFileSync(file.path);
                const fileSize = file.size;
                
                // Create upload command
                const command = new PutObjectCommand({
                  Bucket: process.env.R2_BUCKET_NAME,
                  Key: fileName,
                  Body: fileBuffer,
                  ContentType: file.mimetype
                });
                
                // Set up progress tracking
                let lastReportedProgress = 5;
                let uploadStartTime = Date.now();
                
                // Use a wrapper to track progress
                const uploadWithProgress = async () => {
                  try {
                    // Upload to R2
                    await s3Client.send(command);
                    
                    // Calculate upload speed and update progress in increments
                    const uploadTime = (Date.now() - uploadStartTime) / 1000; // seconds
                    const uploadSpeed = Math.round((fileSize / uploadTime) / 1024); // KB/s
                    
                    // Update progress in increments of 20% (or choose your preferred increment)
                    const progressIncrements = [25, 50, 75, 95];
                    
                    for (const progress of progressIncrements) {
                      if (lastReportedProgress < progress) {
                        await FileUpload.findByIdAndUpdate(fileUpload._id, { progress });
                        socketService.emitUploadProgress(user.id, fileUpload._id.toString(), progress);
                        console.log(`Upload progress for ${file.originalname}: ${progress}% (${Math.round(fileSize * progress / 100 / 1024 / 1024 * 100) / 100}MB / ${Math.round(fileSize / 1024 / 1024 * 100) / 100}MB), Speed: ${uploadSpeed}KB/s`);
                        lastReportedProgress = progress;
                        
                        // Add a small delay to make the progress updates visible
                        await new Promise(resolve => setTimeout(resolve, 200));
                      }
                    }
                    
                    // Update progress to 100% when upload completes
                    await FileUpload.findByIdAndUpdate(fileUpload._id, { 
                      progress: 100,
                      status: 'completed',
                      url: `${R2_PUBLIC_URL}/${fileName}`
                    });
                    socketService.emitUploadProgress(user.id, fileUpload._id.toString(), 100);
                    console.log(`Upload completed for ${file.originalname}`);
                    
                    return true;
                  } catch (error) {
                    console.error('Error during upload:', error);
                    await FileUpload.findByIdAndUpdate(fileUpload._id, { 
                      status: 'failed',
                      error: error.message
                    });
                    socketService.emitUploadError(user.id, fileUpload._id.toString(), error.message);
                    return false;
                  }
                };
                
                // Execute the upload with progress tracking
                const uploadSuccess = await uploadWithProgress();
                
                if (!uploadSuccess) {
                  return res.status(500).json({
                    success: false,
                    message: 'Failed to upload file to storage'
                  });
                }
                
                // Get video duration if it's a video file
                let duration = null;
                if (isVideo) {
                  try {
                    duration = await getVideoDurationInSeconds(file.path);
                  } catch (durationError) {
                    console.error('Error getting video duration:', durationError);
                  }
                }
                
                // Set the URL in uploads object with proper field name mapping
                const fileUrl = `${R2_PUBLIC_URL}/${fileName}`;
                if (fieldName === 'video') {
                  // Map 'video' field to 'videoFile' in uploads object
                  uploads['videoFile'] = {
                    url: fileUrl,
                    fileName: file.originalname,
                    fileSize: file.size,
                    mimeType: file.mimetype,
                    ...(duration && { duration })
                  };
                  console.log('Set videoFile URL:', uploads['videoFile']);
                } else {
                  uploads[fieldName] = {
                    url: fileUrl,
                    fileName: file.originalname,
                    fileSize: file.size,
                    mimeType: file.mimetype,
                    ...(duration && { duration })
                  };
                  console.log(`Set ${fieldName} URL:`, uploads[fieldName]);
                }
              }
              
              // Clean up temp file
              try {
                fs.unlinkSync(file.path);
              } catch (unlinkError) {
                console.error('Error deleting temp file:', unlinkError);
              }
              
            } catch (uploadError) {
              console.error(`Error uploading ${fieldName}:`, uploadError);
              return res.status(500).json({
                success: false,
                message: `${fieldName} upload failed: ${uploadError.message}`
              });
            }
          }
        }
        
        console.log('Final uploads object:', uploads);
        
        // Add uploads to request object
        req.uploads = uploads;
        
        // Continue to the next middleware
        next();
      });
    } catch (error) {
      console.error('Upload error:', error);
      return res.status(500).json({ 
        success: false, 
        message: `Upload failed: ${error.message}` 
      });
    }
  };
};

/**
 * Initialize a chunked upload
 * @param {Object} req - Express request object
 * @param {Object} uploadConfig - Upload configuration
 * @returns {Object} Initialization result
 */
async function initializeChunkedUpload(req, uploadConfig, user) {
  try {
    // Create a multer instance for metadata parsing
    const metadataStorage = multer.memoryStorage();
    const metadataUpload = multer({ storage: metadataStorage }).none();
    
    // Parse form fields using multer
    await new Promise((resolve, reject) => {
      metadataUpload(req, req.res, (err) => {
        if (err) return reject(err);
        resolve();
      });
    });
    
    // Get fields from request body
    const { fileName, fileSize, fileType, field } = req.body;
    
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
 * @param {Object} req - Express request object
 * @param {string} fileId - File ID
 * @param {number} chunkIndex - Chunk index
 * @param {number} totalChunks - Total number of chunks
 * @returns {Object} Chunk upload result
 */
async function handleChunkUpload(req, fileId, chunkIndex, totalChunks) {
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
    
    // Configure multer for chunk upload
    const chunkStorage = multer.diskStorage({
      destination: function (req, file, cb) {
        cb(null, tempDir);
      },
      filename: function (req, file, cb) {
        const filename = `chunk_${Date.now()}_${uuidv4()}`;
        cb(null, filename);
      }
    });
    
    const chunkUpload = multer({ 
      storage: chunkStorage,
      limits: {
        fileSize: 500 * 1024 * 1024 // 500MB limit for chunks
      }
    }).single('chunk');
    
    // Process the chunk upload
    await new Promise((resolve, reject) => {
      chunkUpload(req, req.res, (err) => {
        if (err) {
          console.error('Chunk parsing error:', err);
          return reject(err);
        }
        resolve();
      });
    });
    
    if (!req.file) {
      return {
        success: false,
        message: 'No chunk file found'
      };
    }
    
    const chunkFile = req.file;
    
    // Set up S3 client for R2
    const s3Client = new S3Client({
      region: 'auto',
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY
      }
    });
    
    // Upload the chunk with retry logic
    let attempts = 0;
    const maxAttempts = 3;
    let uploadSuccess = false;
    let ETag;
    
    while (attempts < maxAttempts && !uploadSuccess) {
      try {
        // Read the chunk file
        const chunkBuffer = fs.readFileSync(chunkFile.path);
        
        // Upload the chunk to S3
        const uploadPartCommand = new UploadPartCommand({
          Bucket: process.env.R2_BUCKET_NAME,
          Key: fileUpload.uploadPath,
          UploadId: fileUpload.uploadId,
          PartNumber: chunkIndex + 1,
          Body: chunkBuffer
        });
        
        const response = await s3Client.send(uploadPartCommand);
        ETag = response.ETag;
        uploadSuccess = true;
      } catch (error) {
        attempts++;
        console.error(`Chunk upload attempt ${attempts} failed:`, error);
        
        if (attempts >= maxAttempts) {
          // Mark upload as failed
          await FileUpload.findByIdAndUpdate(fileId, { status: 'failed' });
          
          // Clean up temp file
          try {
            fs.unlinkSync(chunkFile.path);
          } catch (unlinkError) {
            console.error('Error deleting temp file:', unlinkError);
          }
          
          return {
            success: false,
            message: `Failed to upload chunk after ${maxAttempts} attempts: ${error.message}`
          };
        }
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
      }
    }
    
    // Clean up temp file
    try {
      fs.unlinkSync(chunkFile.path);
    } catch (unlinkError) {
      console.error('Error deleting temp file:', unlinkError);
    }
    
    // Update progress with timestamp for speed calculation
    const progress = Math.round(((chunkIndex + 1) / totalChunks) * 100);
    const uploadedBytes = Math.round((progress / 100) * fileUpload.fileSize);
    
    await FileUpload.findByIdAndUpdate(fileId, { 
      progress,
      updatedAt: new Date() // Update timestamp for speed calculation
    });
    
    // Emit progress via socket with more details
    socketService.emitUploadStatus(
      fileUpload.userId, 
      fileId, 
      'uploading', 
      progress, 
      {
        uploadedBytes: uploadedBytes,
        totalBytes: fileUpload.fileSize,
        chunkIndex: chunkIndex + 1,
        totalChunks: totalChunks
      }
    );
    
    return {
      success: true,
      etag: ETag,
      partNumber: chunkIndex + 1
    };
  } catch (error) {
    console.error('Error handling chunk upload:', error);
    return {
      success: false,
      message: `Failed to process chunk: ${error.message}`
    };
  }
}

/**
 * Complete a chunked upload
 * @param {Object} req - Express request object
 * @param {string} fileId - File ID
 * @returns {Object} Completion result
 */
async function completeChunkedUpload(req, fileId) {
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
    
    // Configure multer for metadata parsing
    const metadataStorage = multer.memoryStorage();
    const metadataUpload = multer({ storage: metadataStorage }).none();
    
    // Parse form fields using multer
    await new Promise((resolve, reject) => {
      metadataUpload(req, req.res, (err) => {
        if (err) return reject(err);
        resolve();
      });
    });
    
    // Get parts information from request body
    const { parts } = req.body;
    
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
    
    // Complete the multipart upload
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
    
    // Mark upload as failed
    await FileUpload.findByIdAndUpdate(fileId, { status: 'failed' });
    
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
async function abortChunkedUpload(req, fileId) {
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
export const getMultipleUploadProgress = async (req, res) => {
  try {
    const { fileIds } = req.body;
    
    if (!fileIds || !fileIds.length) {
      return res.status(400).json({ success: false, message: 'No file IDs provided' });
    }
    
    const fileUploads = await FileUpload.find({
      _id: { $in: fileIds }
    }).select('status progress error url fileName fileSize field');
    
    return res.json({
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
    return res.status(500).json({
      success: false,
      message: 'Failed to get upload progress: ' + error.message
    });
  }
};

/**
 * Optional file upload middleware using multer
 * @returns {Function} Middleware function
 */
export const optionalUpload = (req, res, next) => {
  // Configure multer for optional uploads
  const optionalMulterUpload = upload.fields([
    { name: 'profilePicture', maxCount: 1 }
  ]);
  
  optionalMulterUpload(req, res, async (err) => {
    if (err) {
      console.error('Multer error in optional upload:', err);
      return res.status(400).json({
        success: false,
        message: `Upload error: ${err.message}`
      });
    }
    
    // Initialize uploads object
    const uploads = {};
    
    // Process uploaded files
    if (req.files) {
      for (const [fieldName, files] of Object.entries(req.files)) {
        const file = files[0]; // Get the first file for each field
        
        if (!file) continue;
        
        try {
          // Upload file to cloud storage
          const uploadResult = await uploadToCloudStorage(
            file.path,
            file.originalname,
            file.mimetype,
            'users',
            req.user._id
          );
          
          // Add to uploads object
          uploads[fieldName] = {
            url: uploadResult.url,
            fileName: file.originalname,
            fileSize: file.size,
            mimeType: file.mimetype
          };
          
          // Clean up temp file
          try {
            fs.unlinkSync(file.path);
          } catch (unlinkError) {
            console.error('Error deleting temp file:', unlinkError);
          }
        } catch (uploadError) {
          console.error(`Error uploading ${fieldName}:`, uploadError);
          // Continue without failing - this is optional upload
        }
      }
    }
    
    // Add uploads to request object
    req.uploads = uploads;
    
    // Continue to the next middleware
    next();
  });
};
