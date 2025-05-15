import mongoose from 'mongoose'

const likeSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  contentType: {
    type: String,
    enum: ['content', 'creatorContent', 'comment'],
    required: true
  },
  contentId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'contentType'
  }
}, {
  timestamps: true
})

// Compound index to ensure a user can only like a specific content once
likeSchema.index({ user: 1, contentType: 1, contentId: 1 }, { unique: true })

const Like = mongoose.model('Like', likeSchema)

export default Like