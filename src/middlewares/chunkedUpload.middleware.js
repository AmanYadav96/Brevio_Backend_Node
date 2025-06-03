import path from 'path';
import fs from 'fs';
import os from 'os';
import { v4 as uuidv4 } from 'uuid';
import { S3Client, PutObjectCommand, DeleteObjectCommand, CreateMultipartUploadCommand, UploadPartCommand, CompleteMultipartUploadCommand, AbortMultipartUploadCommand } from '@aws-sdk/client-s3';
import FileUpload from '../models/fileUpload.model.js';
import socketService from '../services/socket.service.js';

// File type and size constraints
const allowedImageTypes = ['image/jpeg', 'image/png', 'image/webp'];
const allowedVideoTypes = ['video/mp4', 'video/webm', 'video/x-matroska', 'video/quicktime'];
const maxFileSize = {
  image: 500 * 1024 * 1024, // 500MB
  video: 5 * 1024 * 1024 * 1024 // 5GB
};

// Constants for cloud storage
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || 'https://pub-1a008632cfbe443fa4f631d71332310d.r2.dev';

// Get temp directory for chunk storage
const getTempDirectory = () => {
  const tempDir = path.join(process.cwd(), 'temp', 'chunks');
  
  // Create the directory if it doesn't exist
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  
  return tempDir;
};

// Set up S3 client for R2
const getS3Client = () => {
  return new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY
    }
  });
};

// Initialize upload - creates a FileUpload record and returns an upload ID
export const initializeUpload = async (c) => {
  try {
    const user = c.get('user');
    const { fileName, fileSize, fileType, modelType, documentId, field } = await c.req.json();
    
    // Validate file type
    const isVideo = fileType.startsWith('video/');
    const isImage = fileType.startsWith('image/');
    
    if (isVideo && !allowedVideoTypes.includes(fileType)) {
      return c.json({
        success: false,
        message: `Invalid video format. Allowed types: ${allowedVideoTypes.join(', ')}`
      }, 400);
    }
    
    if (isImage && !allowedImageTypes.includes(fileType)) {
      return c.json({
        success: false,
        message: `Invalid image format. Allowed types: ${allowedImageTypes.join(', ')}`
      }, 400);
    }
    
    // Validate file size
    const maxSize = isVideo ? maxFileSize.video : maxFileSize.image;
    if (fileSize > maxSize) {
      const maxSizeMB = maxSize / (1024 * 1024);
      return c.json({
        success: false,
        message: `File too large. Maximum size: ${maxSizeMB}MB`
      }, 400);
    }
    
    // Create a unique filename
    const fileExtension = path.extname(fileName);
    const uniqueFileName = `${modelType.toLowerCase()}/${uuidv4()}${fileExtension}`;
    
    // Create a record in the database
    const fileUpload = await FileUpload.create({
      userId: user._id,
      fileName,
      fileSize,
      fileType,
      uploadPath: uniqueFileName,
      modelType,
      documentId: documentId || null,
      status: 'pending',
      progress: 0,
      field
    });
    
    // Initialize multipart upload with R2
    const s3Client = getS3Client();
    const multipartUpload = await s3Client.send(new CreateMultipartUploadCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: uniqueFileName,
      ContentType: fileType
    }));
    
    // Update the file upload record with the upload ID
    fileUpload.uploadId = multipartUpload.UploadId;
    await fileUpload.save();
    
    // Notify client via socket
    socketService.emitUploadStatus(user._id.toString(), fileUpload._id.toString(), 'initialized', 0);
    
    return c.json({
      success: true,
      fileId: fileUpload._id,
      uploadId: multipartUpload.UploadId,
      fileName: uniqueFileName
    });
  } catch (error) {
    console.error('Error initializing upload:', error);
    return c.json({
      success: false,
      message: `Failed to initialize upload: ${error.message}`
    }, 500);
  }
};

// Upload a chunk
export const uploadChunk = async (c) => {
  try {
    const user = c.get('user');
    const { fileId, chunkIndex, totalChunks } = c.req.query();
    
    // Get the file upload record
    const fileUpload = await FileUpload.findById(fileId);
    if (!fileUpload) {
      return c.json({
        success: false,
        message: 'Upload not found'
      }, 404);
    }
    
    // Verify ownership
    if (fileUpload.userId.toString() !== user._id.toString()) {
      return c.json({
        success: false,
        message: 'You do not have permission to upload to this file'
      }, 403);
    }
    
    // Get the chunk data
    const formData = await c.req.formData();
    const chunk = formData.get('chunk');
    
    if (!chunk) {
      return c.json({
        success: false,
        message: 'No chunk data provided'
      }, 400);
    }
    
    // Convert chunk to buffer
    const arrayBuffer = await chunk.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Upload the chunk to R2
    const s3Client = getS3Client();
    const partNumber = parseInt(chunkIndex) + 1; // Part numbers start at 1
    
    const uploadPartResult = await s3Client.send(new UploadPartCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: fileUpload.uploadPath,
      UploadId: fileUpload.uploadId,
      PartNumber: partNumber,
      Body: buffer
    }));
    
    // Calculate progress
    const progress = Math.round(((parseInt(chunkIndex) + 1) / parseInt(totalChunks)) * 100);
    
    // Update progress in database
    fileUpload.progress = progress;
    if (progress === 100) {
      fileUpload.status = 'chunking';
    } else {
      fileUpload.status = 'uploading';
    }
    await fileUpload.save();
    
    // Notify client via socket
    socketService.emitUploadStatus(
      user._id.toString(), 
      fileId, 
      'uploading', 
      progress, 
      {
        chunkIndex: parseInt(chunkIndex),
        totalChunks: parseInt(totalChunks),
        etag: uploadPartResult.ETag
      }
    );
    
    return c.json({
      success: true,
      progress,
      partNumber,
      etag: uploadPartResult.ETag
    });
  } catch (error) {
    console.error('Error uploading chunk:', error);
    return c.json({
      success: false,
      message: `Failed to upload chunk: ${error.message}`
    }, 500);
  }
};

// Complete multipart upload
export const completeUpload = async (c) => {
  try {
    const user = c.get('user');
    const { fileId, parts } = await c.req.json();
    
    // Get the file upload record
    const fileUpload = await FileUpload.findById(fileId);
    if (!fileUpload) {
      return c.json({
        success: false,
        message: 'Upload not found'
      }, 404);
    }
    
    // Verify ownership
    if (fileUpload.userId.toString() !== user._id.toString()) {
      return c.json({
        success: false,
        message: 'You do not have permission to complete this upload'
      }, 403);
    }
    
    // Complete the multipart upload
    const s3Client = getS3Client();
    await s3Client.send(new CompleteMultipartUploadCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: fileUpload.uploadPath,
      UploadId: fileUpload.uploadId,
      MultipartUpload: {
        Parts: parts.map(part => ({
          PartNumber: part.PartNumber,
          ETag: part.ETag
        }))
      }
    }));
    
    // Update the file upload record
    const fileUrl = `${R2_PUBLIC_URL}/${fileUpload.uploadPath}`;
    fileUpload.status = 'completed';
    fileUpload.progress = 100;
    fileUpload.url = fileUrl;
    await fileUpload.save();
    
    // Notify client via socket
    socketService.emitUploadComplete(user._id.toString(), fileId, fileUrl);
    
    return c.json({
      success: true,
      url: fileUrl,
      fileId: fileUpload._id
    });
  } catch (error) {
    console.error('Error completing upload:', error);
    return c.json({
      success: false,
      message: `Failed to complete upload: ${error.message}`
    }, 500);
  }
};

// Abort multipart upload
export const abortUpload = async (c) => {
  try {
    const user = c.get('user');
    const { fileId } = c.req.param();
    
    // Get the file upload record
    const fileUpload = await FileUpload.findById(fileId);
    if (!fileUpload) {
      return c.json({
        success: false,
        message: 'Upload not found'
      }, 404);
    }
    
    // Verify ownership
    if (fileUpload.userId.toString() !== user._id.toString()) {
      return c.json({
        success: false,
        message: 'You do not have permission to abort this upload'
      }, 403);
    }
    
    // Abort the multipart upload if it exists
    if (fileUpload.uploadId) {
      const s3Client = getS3Client();
      await s3Client.send(new AbortMultipartUploadCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: fileUpload.uploadPath,
        UploadId: fileUpload.uploadId
      }));
    }
    
    // Update the file upload record
    fileUpload.status = 'failed';
    fileUpload.error = 'Upload aborted by user';
    await fileUpload.save();
    
    // Notify client via socket
    socketService.emitUploadError(user._id.toString(), fileId, 'Upload aborted by user');
    
    return c.json({
      success: true,
      message: 'Upload aborted successfully'
    });
  } catch (error) {
    console.error('Error aborting upload:', error);
    return c.json({
      success: false,
      message: `Failed to abort upload: ${error.message}`
    }, 500);
  }
};