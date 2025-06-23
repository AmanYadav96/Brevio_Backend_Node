import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3"
import { v4 as uuidv4 } from 'uuid'
import File from '../models/file.model.js'

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME

const S3 = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
})

export const uploadToR2 = async (file, folder = 'general', userId, modelInfo) => {
  let fileDoc = null
  try {
    const fileExtension = file.name.split('.').pop()
    const fileName = `${folder}/${uuidv4()}.${fileExtension}`
    
    // Create file tracking record
    fileDoc = await File.create({
      originalName: file.name,
      fileName: fileName,
      fileType: file.type,
      fileSize: file.size,
      uploadedBy: userId,
      usedIn: modelInfo,
      status: 'uploading',
      progress: 0
    })

    const chunks = Math.ceil(file.size / (10 * 1024 * 1024)) // 10MB chunks
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    let uploadedSize = 0

    if (file.size > 10 * 1024 * 1024) { // If file is larger than 10MB, use chunked upload
      for (let i = 0; i < chunks; i++) {
        const start = i * (10 * 1024 * 1024)
        const end = Math.min(start + (10 * 1024 * 1024), file.size)
        const chunk = buffer.slice(start, end)

        await S3.send(new PutObjectCommand({
          Bucket: R2_BUCKET_NAME,
          Key: `${fileName}_part${i}`,
          Body: chunk,
          ContentType: file.type,
        }))

        uploadedSize += chunk.length
        const progress = Math.round((uploadedSize / file.size) * 100)
        await File.findByIdAndUpdate(fileDoc._id, { progress })
      }

      // Upload final combined file
      await S3.send(new PutObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: fileName,
        Body: buffer,
        ContentType: file.type,
      }))

      // Cleanup chunks
      for (let i = 0; i < chunks; i++) {
        await S3.send(new DeleteObjectCommand({
          Bucket: R2_BUCKET_NAME,
          Key: `${fileName}_part${i}`
        }))
      }
    } else {
      // Small file, direct upload
      await S3.send(new PutObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: fileName,
        Body: buffer,
        ContentType: file.type,
      }))
    }

    const fileUrl = `https://${R2_BUCKET_NAME}.${R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${fileName}`
    
    // Update file record with URL and status
    await File.findByIdAndUpdate(fileDoc._id, {
      fileUrl,
      status: 'completed',
      progress: 100
    })

    return fileUrl
  } catch (error) {
    if (fileDoc) {
      await File.findByIdAndUpdate(fileDoc._id, {
        status: 'failed',
        error: error.message
      })
    }
    console.error('R2 upload error:', error)
    throw new Error('Failed to upload file to R2')
  }
}

export const deleteFromR2 = async (fileUrl) => {
  try {
    const fileName = fileUrl.split('/').pop()
    await S3.send(new DeleteObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: fileName,
    }))
    
    await File.findOneAndUpdate(
      { fileUrl },
      { status: 'deleted' }
    )
  } catch (error) {
    console.error('R2 delete error:', error)
    throw new Error('Failed to delete file from R2')
  }
}


// Function to replace old CDN URL with new CDN URL at retrieval time
export const transformCdnUrl = (url) => {
  if (!url) return url;
  
  // Check if url is a string before using replace
  if (typeof url !== 'string') return url;
  
  // Replace old CDN URL with new CDN URL
  return url.replace(
    'https://pub-1a008632cfbe443fa4f631d71332310d.r2.dev/', 
    'https://bvideo.b-cdn.net/'
  );
}

// Function to transform all URLs in an object recursively
export const transformAllUrls = (obj) => {
  if (!obj) return obj;
  
  if (typeof obj === 'string') {
    return transformCdnUrl(obj);
  }
  
  // Handle MongoDB ObjectId instances directly
  if (obj && typeof obj.toString === 'function' && obj.constructor && 
      (obj.constructor.name === 'ObjectID' || obj.constructor.name === 'ObjectId')) {
    return obj.toString();
  }
  
  // Handle Buffer objects that might be ObjectIds
  if (obj && obj.buffer && obj.subtype === 7) {
    return obj.toString();
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => transformAllUrls(item));
  }
  
  if (typeof obj === 'object') {
    // Handle Mongoose documents by converting to plain objects first
    const plainObj = obj.toObject ? obj.toObject() : obj;
    
    const transformed = {};
    for (const key in plainObj) {
      if (plainObj.hasOwnProperty(key)) {
        // Skip internal Mongoose properties that might cause circular references
        if (key.startsWith('_') && key !== '_id') continue;
        
        // Handle MongoDB ObjectIDs
        if (plainObj[key] && plainObj[key].toString && 
            ((plainObj[key].constructor && 
              (plainObj[key].constructor.name === 'ObjectID' || 
               plainObj[key].constructor.name === 'ObjectId')) || 
             (plainObj[key].buffer && plainObj[key].subtype === 7))) {
          transformed[key] = plainObj[key].toString();
          continue;
        }
        
        // Handle the specific case in your response where id is an object with a buffer property
        if (key === 'id' && plainObj[key] && plainObj[key].buffer) {
          transformed[key] = plainObj[key].toString();
          continue;
        }
        
        // For specific URL fields, transform directly
        if (['url', 'fileUrl', 'videoUrl', 'thumbnailUrl', 'bannerUrl', 'profilePicture', 'photo', 'contractFile', 'thumbnail', 'verticalBanner', 'horizontalBanner', 'trailer'].includes(key)) {
          transformed[key] = transformCdnUrl(plainObj[key]);
        } else {
          transformed[key] = transformAllUrls(plainObj[key]);
        }
      }
    }
    return transformed;
  }
  
  return obj;
}