import mongoose from 'mongoose'

/**
 * Report status enum to track report lifecycle
 */
export const ReportStatus = {
  PENDING: 'pending',
  UNDER_REVIEW: 'under_review',
  RESOLVED: 'resolved',
  REJECTED: 'rejected'
}

/**
 * Report issue types enum
 */
export const ReportIssueType = {
  COPYRIGHT_INFRINGEMENT: 'copyright_infringement',
  INAPPROPRIATE_CONTENT: 'inappropriate_content',
  HARASSMENT: 'harassment',
  VIOLENCE: 'violence',
  HATE_SPEECH: 'hate_speech',
  MISINFORMATION: 'misinformation',
  SPAM: 'spam',
  OTHER: 'other'
}

/**
 * Content types enum
 */
export const ContentType = {
  VIDEO: 'video',
  SHORT: 'short',
  SERIES: 'series',
  COURSE: 'course',
  COMMENT: 'comment',
  CHANNEL: 'channel',
  USER: 'user'
}

const reportSchema = new mongoose.Schema({
  // User who reported the content
  reporterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Content being reported
  contentId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  
  contentType: {
    type: String,
    enum: Object.values(ContentType),
    required: true
  },
  
  contentName: {
    type: String,
    required: true
  },
  
  contentThumbnail: {
    type: String
  },
  
  // Creator of the reported content
  creatorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Report details
  issueType: {
    type: String,
    enum: Object.values(ReportIssueType),
    required: true
  },
  
  description: {
    type: String,
    required: true,
    minlength: 10,
    maxlength: 1000
  },
  
  // Proof file (uploaded to cloud storage)
  proofFile: {
    url: String,
    fileName: String,
    fileSize: Number,
    mimeType: String
  },
  
  // Report status and admin actions
  status: {
    type: String,
    enum: Object.values(ReportStatus),
    default: ReportStatus.PENDING
  },
  
  adminNotes: {
    type: String
  },
  
  actionTaken: {
    type: String,
    enum: ['none', 'warning', 'content_removed', 'account_suspended', 'account_terminated']
  },
  
  actionDate: {
    type: Date
  },
  
  actionBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
})

// Indexes for faster queries
reportSchema.index({ reporterId: 1 })
reportSchema.index({ contentId: 1, contentType: 1 })
reportSchema.index({ status: 1 })
reportSchema.index({ creatorId: 1 })
reportSchema.index({ createdAt: -1 })

// Virtual for time since report
reportSchema.virtual('timeSinceReport').get(function() {
  return Date.now() - this.createdAt.getTime()
})

const Report = mongoose.model('Report', reportSchema)

export default Report