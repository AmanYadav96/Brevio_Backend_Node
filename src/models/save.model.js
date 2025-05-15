import mongoose from 'mongoose'

const saveSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  contentType: {
    type: String,
    enum: ['content', 'creatorContent'],
    required: true
  },
  contentId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'contentType'
  },
  folder: {
    type: String,
    default: 'default'
  }
}, {
  timestamps: true
})

// Compound index to ensure a user can only save a specific content once
saveSchema.index({ user: 1, contentType: 1, contentId: 1 }, { unique: true })

const Save = mongoose.model('Save', saveSchema)

export default Save