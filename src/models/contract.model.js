import mongoose from 'mongoose'

/**
 * Contract status enum
 */
export const ContractStatus = {
  DRAFT: 'draft',
  SENT: 'sent',
  SIGNED_BY_USER: 'signed_by_user',
  SIGNED_BY_ADMIN: 'signed_by_admin',
  COMPLETED: 'completed',
  REJECTED: 'rejected',
  EXPIRED: 'expired'
}

/**
 * Contract type enum
 */
export const ContractType = {
  CONTENT_UPLOAD: 'content_upload',
  CREATOR_AGREEMENT: 'creator_agreement',
  REVENUE_SHARING: 'revenue_sharing',
  CUSTOM: 'custom'
}

const contractSchema = new mongoose.Schema({
  // Contract details
  title: {
    type: String,
    required: true,
    trim: true
  },
  
  description: {
    type: String,
    required: true
  },
  
  type: {
    type: String,
    enum: Object.values(ContractType),
    required: true
  },
  
  content: {
    type: String,
    required: true
  },
  
  // Contract file
  contractFile: {
    type: String,
    default: null
  },
  
  // Contract terms
  terms: [{
    title: String,
    description: String,
    required: Boolean
  }],
  
  // Contract status
  status: {
    type: String,
    enum: Object.values(ContractStatus),
    default: ContractStatus.DRAFT
  },
  
  // Contract parties
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Signatures
  userSignature: {
    signature: String,
    signedAt: Date,
    ipAddress: String
  },
  
  adminSignature: {
    signature: String,
    signedAt: Date,
    ipAddress: String,
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  
  // Contract attachments
  attachments: [{
    name: String,
    url: String,
    uploadedAt: Date
  }],
  
  // Contract validity
  validFrom: {
    type: Date,
    required: true
  },
  
  validUntil: {
    type: Date,
    required: true
  },
  
  // Contract history
  history: [{
    action: {
      type: String,
      enum: ['created', 'updated', 'sent', 'signed_by_user', 'signed_by_admin', 'completed', 'rejected', 'expired']
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    notes: String
  }],
  
  // Additional metadata
  metadata: {
    type: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true
})

// Indexes for faster queries
contractSchema.index({ userId: 1, status: 1 })
contractSchema.index({ createdBy: 1 })
contractSchema.index({ status: 1 })
contractSchema.index({ type: 1 })
contractSchema.index({ validUntil: 1 })

// Virtual for time remaining
contractSchema.virtual('timeRemaining').get(function() {
  if (this.status === ContractStatus.COMPLETED || 
      this.status === ContractStatus.REJECTED || 
      this.status === ContractStatus.EXPIRED) {
    return 0
  }
  
  const now = new Date()
  const validUntil = new Date(this.validUntil)
  
  if (now > validUntil) {
    return 0
  }
  
  return validUntil - now
})

// Method to check if contract is valid
contractSchema.methods.isValid = function() {
  const now = new Date()
  return (
    this.status !== ContractStatus.EXPIRED &&
    this.status !== ContractStatus.REJECTED &&
    now >= new Date(this.validFrom) &&
    now <= new Date(this.validUntil)
  )
}

// Method to sign contract by user
contractSchema.methods.signByUser = function(signature, ipAddress) {
  if (this.status !== ContractStatus.SENT && this.status !== ContractStatus.SIGNED_BY_ADMIN) {
    throw new Error('Contract cannot be signed in its current state')
  }
  
  this.userSignature = {
    signature,
    signedAt: new Date(),
    ipAddress
  }
  
  this.status = this.status === ContractStatus.SIGNED_BY_ADMIN ? 
    ContractStatus.COMPLETED : ContractStatus.SIGNED_BY_USER
    
  this.history.push({
    action: 'signed_by_user',
    performedBy: this.userId,
    timestamp: new Date(),
    notes: 'Contract signed by user'
  })
  
  if (this.status === ContractStatus.COMPLETED) {
    this.history.push({
      action: 'completed',
      performedBy: this.userId,
      timestamp: new Date(),
      notes: 'Contract completed with signatures from both parties'
    })
  }
  
  return this
}

// Method to sign contract by admin
contractSchema.methods.signByAdmin = function(adminId, signature, ipAddress) {
  if (this.status !== ContractStatus.SENT && this.status !== ContractStatus.SIGNED_BY_USER) {
    throw new Error('Contract cannot be signed in its current state')
  }
  
  this.adminSignature = {
    signature,
    signedAt: new Date(),
    ipAddress,
    adminId
  }
  
  this.status = this.status === ContractStatus.SIGNED_BY_USER ? 
    ContractStatus.COMPLETED : ContractStatus.SIGNED_BY_ADMIN
    
  this.history.push({
    action: 'signed_by_admin',
    performedBy: adminId,
    timestamp: new Date(),
    notes: 'Contract signed by admin'
  })
  
  if (this.status === ContractStatus.COMPLETED) {
    this.history.push({
      action: 'completed',
      performedBy: adminId,
      timestamp: new Date(),
      notes: 'Contract completed with signatures from both parties'
    })
  }
  
  return this
}

// Pre-save middleware to check for expired contracts
contractSchema.pre('save', function(next) {
  const now = new Date()
  if (this.validUntil < now && this.status !== ContractStatus.EXPIRED) {
    this.status = ContractStatus.EXPIRED
    this.history.push({
      action: 'expired',
      timestamp: now,
      notes: 'Contract expired automatically'
    })
  }
  next()
})

const Contract = mongoose.model('Contract', contractSchema)

export default Contract