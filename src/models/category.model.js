import mongoose from 'mongoose'

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Category name is required'],
    trim: true,
    unique: true
  },
  description: {
    type: String,
    trim: true
  },
  associatedContent: [{
    content: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CreatorContent',
      required: true
    },
    order: {
      type: Number,
      default: 0
    }
  }],
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
})

const Category = mongoose.model('Category', categorySchema)

export default Category