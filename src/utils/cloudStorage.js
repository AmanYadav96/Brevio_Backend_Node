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