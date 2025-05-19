import mongoose from 'mongoose';

// Add these enum exports
export const ContractStatus = {
  PENDING: 'pending',
  SIGNED: 'signed',
  REJECTED: 'rejected',
  EXPIRED: 'expired'
};

export const ContractType = {
  CREATOR: 'creator',
  ADVERTISER: 'advertiser',
  PARTNER: 'partner',
  OTHER: 'other'
};

const contractSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  contractType: {
    type: String,
    enum: Object.values(ContractType),
    required: true
  },
  contractFile: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: Object.values(ContractStatus),
    default: ContractStatus.PENDING
  },
  signedDate: {
    type: Date
  },
  signature: {
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt field on save
contractSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

const Contract = mongoose.model('Contract', contractSchema);

export default Contract;