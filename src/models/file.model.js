import mongoose from "mongoose"

const fileSchema = new mongoose.Schema(
  {
    originalName: {
      type: String,
      required: true
    },
    fileName: {
      type: String,
      required: true,
      unique: true
    },
    fileUrl: {
      type: String,
      required: true
    },
    fileType: {
      type: String,
      required: true
    },
    fileSize: {
      type: Number,
      required: true
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'uploaded', 'failed'],
      default: 'pending'
    },
    usedIn: {
      model: {
        type: String,
        required: true,
        enum: ['Channel', 'Advertisement', 'Video']
      },
      documentId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
      }
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  },
  { timestamps: true }
)

export default mongoose.model("File", fileSchema)