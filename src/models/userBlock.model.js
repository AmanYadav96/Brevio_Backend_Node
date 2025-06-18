import mongoose from 'mongoose'

const userBlockSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  blockedUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
})

// Compound index to ensure a user can't block the same user twice
userBlockSchema.index({ user: 1, blockedUser: 1 }, { unique: true })

const UserBlock = mongoose.model('UserBlock', userBlockSchema)

export default UserBlock