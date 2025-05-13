import mongoose from 'mongoose'

const sliderSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Slider title is required'],
    trim: true
  },
  image: {
    type: String,
    required: [true, 'Slider image is required']
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

const Slider = mongoose.model('Slider', sliderSchema)

export default Slider