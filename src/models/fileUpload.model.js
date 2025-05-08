import mongoose from "mongoose"

const fileUploadSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    fileName: {
      type: String,
      required: true
    },
    fileSize: {
      type: Number, // Size in bytes
      required: true
    },
    fileType: {
      type: String,
      required: true
    },
    uploadPath: {
      type: String,
      required: true
    },
    modelType: {
      type: String,
      enum: ['Content', 'Advertisement', 'Channel', 'Video', 'Other'],
      required: true
    },
    documentId: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'modelType'
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed'],
      default: 'pending'
    }
  },
  { timestamps: true }
)

export default mongoose.model("FileUpload", fileUploadSchema)