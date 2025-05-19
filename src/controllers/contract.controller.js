import Contract, { ContractStatus, ContractType } from '../models/contract.model.js'
import User from '../models/user.model.js'
import { AppError } from '../utils/app-error.js'

// Create a new contract
export const createContract = async (c) => {
  try {
    const adminId = c.get('user')._id
    const body = c.get('body') || {}
    const uploads = c.get('uploads') || {}
    
    // Validate required fields
    if (!body.title || !body.content || !body.userId || !body.type) {
      throw new AppError('Missing required fields', 400)
    }
    
    // Validate contract type
    if (!Object.values(ContractType).includes(body.type)) {
      throw new AppError('Invalid contract type', 400)
    }
    
    // Check if user exists
    const user = await User.findById(body.userId).select('name email')
    if (!user) {
      throw new AppError('User not found', 404)
    }
    
    // Set default validity period if not provided
    if (!body.validFrom) {
      body.validFrom = new Date()
    }
    
    if (!body.validUntil) {
      const validUntil = new Date()
      validUntil.setFullYear(validUntil.getFullYear() + 1) // Default 1 year validity
      body.validUntil = validUntil
    }
    
    // Create contract
    const contract = new Contract({
      title: body.title,
      description: body.description || `Contract for ${user.name}`,
      type: body.type,
      content: body.content,
      contractFile: uploads.contractFile || null,
      terms: body.terms || [],
      status: body.status || ContractStatus.DRAFT,
      createdBy: adminId,
      userId: body.userId,
      validFrom: new Date(body.validFrom),
      validUntil: new Date(body.validUntil),
      metadata: body.metadata || {}
    })
    
    // Add attachment if uploaded
    if (uploads.attachment) {
      contract.attachments.push({
        name: body.attachmentName || 'Contract Attachment',
        url: uploads.attachment,
        uploadedAt: new Date()
      })
    }
    
    // Add initial history entry
    contract.history.push({
      action: 'created',
      performedBy: adminId,
      timestamp: new Date(),
      notes: body.notes || 'Contract created'
    })
    
    // If status is SENT, add sent history entry
    if (contract.status === ContractStatus.SENT) {
      contract.history.push({
        action: 'sent',
        performedBy: adminId,
        timestamp: new Date(),
        notes: 'Contract sent to user'
      })
    }
    
    await contract.save()
    
    // If contract is being sent immediately, send email to user
    if (contract.status === ContractStatus.SENT && contract.contractFile) {
      try {
        const { default: emailService } = await import('../services/email.service.js');
        
        await emailService.sendContractEmail({
          to: user.email,
          userName: user.name,
          contractId: contract._id,
          contractTitle: contract.title,
          contractUrl: contract.contractFile,
          contractType: contract.type
        });
        
        console.log(`Contract email sent to ${user.email}`);
      } catch (emailError) {
        // Log error but don't fail the request
        console.error("Error sending contract email:", emailError);
      }
    }
    
    return c.json({
      success: true,
      message: 'Contract created successfully',
      contract
    }, 201)
  } catch (error) {
    console.error('Error creating contract:', error)
    return c.json({
      success: false,
      message: error.message || 'Error creating contract'
    }, error.statusCode || 500)
  }
}

// Get all contracts (admin)
export const getAllContracts = async (c) => {
  try {
    const page = parseInt(c.req.query('page')) || 1
    const limit = parseInt(c.req.query('limit')) || 10
    const status = c.req.query('status')
    const type = c.req.query('type')
    const search = c.req.query('search') || ''
    
    // Build query
    const query = {}
    
    if (status && Object.values(ContractStatus).includes(status)) {
      query.status = status
    }
    
    if (type && Object.values(ContractType).includes(type)) {
      query.type = type
    }
    
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ]
    }
    
    const contracts = await Contract.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('userId', 'name email profilePicture')
      .populate('createdBy', 'name email')
      .populate('adminSignature.adminId', 'name email')
    
    const total = await Contract.countDocuments(query)
    
    return c.json({
      success: true,
      contracts,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Error getting contracts:', error)
    return c.json({
      success: false,
      message: error.message || 'Error getting contracts'
    }, error.statusCode || 500)
  }
}

// Get user's contracts
export const getUserContracts = async (c) => {
  try {
    const userId = c.get('user')._id
    const page = parseInt(c.req.query('page')) || 1
    const limit = parseInt(c.req.query('limit')) || 10
    const status = c.req.query('status')
    const type = c.req.query('type')
    
    // Build query
    const query = { userId }
    
    if (status && Object.values(ContractStatus).includes(status)) {
      query.status = status
    }
    
    if (type && Object.values(ContractType).includes(type)) {
      query.type = type
    }
    
    const contracts = await Contract.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('createdBy', 'name email')
      .populate('adminSignature.adminId', 'name email')
    
    const total = await Contract.countDocuments(query)
    
    return c.json({
      success: true,
      contracts,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Error getting user contracts:', error)
    return c.json({
      success: false,
      message: error.message || 'Error getting user contracts'
    }, error.statusCode || 500)
  }
}

// Get contract details
export const getContractDetails = async (c) => {
  try {
    const contractId = c.req.param('id')
    const userId = c.get('user')._id
    const userRole = c.get('user').role
    
    const contract = await Contract.findById(contractId)
      .populate('userId', 'name email profilePicture')
      .populate('createdBy', 'name email')
      .populate('adminSignature.adminId', 'name email')
      .populate('history.performedBy', 'name email')
    
    if (!contract) {
      throw new AppError('Contract not found', 404)
    }
    
    // Check if user is authorized to view this contract
    if (userRole !== 'admin' && contract.userId.toString() !== userId.toString()) {
      throw new AppError('Not authorized to view this contract', 403)
    }
    
    return c.json({
      success: true,
      contract
    })
  } catch (error) {
    console.error('Error getting contract details:', error)
    return c.json({
      success: false,
      message: error.message || 'Error getting contract details'
    }, error.statusCode || 500)
  }
}

// Update contract (admin only)
export const updateContract = async (c) => {
  try {
    const contractId = c.req.param('id')
    const adminId = c.get('user')._id
    const body = c.get('body') || {}
    const uploads = c.get('uploads') || {}
    
    const contract = await Contract.findById(contractId)
    if (!contract) {
      throw new AppError('Contract not found', 404)
    }
    
    // Only allow updates to draft contracts
    if (contract.status !== ContractStatus.DRAFT) {
      throw new AppError('Only draft contracts can be updated', 400)
    }
    
    // Update fields
    if (body.title) contract.title = body.title
    if (body.description) contract.description = body.description
    if (body.content) contract.content = body.content
    if (body.terms) contract.terms = body.terms
    if (body.validFrom) contract.validFrom = new Date(body.validFrom)
    if (body.validUntil) contract.validUntil = new Date(body.validUntil)
    if (body.metadata) contract.metadata = body.metadata
    
    // Update contract file if uploaded
    if (uploads.contractFile) {
      contract.contractFile = uploads.contractFile
    }
    
    // Add attachment if uploaded
    if (uploads.attachment) {
      contract.attachments.push({
        name: body.attachmentName || 'Contract Attachment',
        url: uploads.attachment,
        uploadedAt: new Date()
      })
    }
    
    // Add history entry
    contract.history.push({
      action: 'updated',
      performedBy: adminId,
      timestamp: new Date(),
      notes: body.notes || 'Contract updated'
    })
    
    // If status is changing to SENT, add sent history entry
    if (body.status === ContractStatus.SENT && contract.status !== ContractStatus.SENT) {
      contract.status = ContractStatus.SENT
      contract.history.push({
        action: 'sent',
        performedBy: adminId,
        timestamp: new Date(),
        notes: 'Contract sent to user'
      })
    }
    
    await contract.save()
    
    return c.json({
      success: true,
      message: 'Contract updated successfully',
      contract
    })
  } catch (error) {
    console.error('Error updating contract:', error)
    return c.json({
      success: false,
      message: error.message || 'Error updating contract'
    }, error.statusCode || 500)
  }
}

// Send contract to user (admin only)
export const sendContract = async (c) => {
  try {
    const contractId = c.req.param('id')
    const adminId = c.get('user')._id
    const body = await c.req.json()
    
    const contract = await Contract.findById(contractId)
      .populate('userId', 'name email')
    
    if (!contract) {
      throw new AppError('Contract not found', 404)
    }
    
    // Only allow sending draft contracts
    if (contract.status !== ContractStatus.DRAFT) {
      throw new AppError('Only draft contracts can be sent', 400)
    }
    
    // Update status
    contract.status = ContractStatus.SENT
    
    // Add history entry
    contract.history.push({
      action: 'sent',
      performedBy: adminId,
      timestamp: new Date(),
      notes: body.notes || 'Contract sent to user'
    })
    
    await contract.save()
    
    // Send email to user with contract
    try {
      const { default: emailService } = await import('../services/email.service.js');
      
      await emailService.sendContractEmail({
        to: contract.userId.email,
        userName: contract.userId.name,
        contractId: contract._id,
        contractTitle: contract.title,
        contractUrl: contract.contractFile,
        contractType: contract.type
      });
      
      console.log(`Contract email sent to ${contract.userId.email}`);
    } catch (emailError) {
      // Log error but don't fail the request
      console.error("Error sending contract email:", emailError);
    }
    
    return c.json({
      success: true,
      message: 'Contract sent to user successfully',
      contract
    })
  } catch (error) {
    console.error('Error sending contract:', error)
    return c.json({
      success: false,
      message: error.message || 'Error sending contract'
    }, error.statusCode || 500)
  }
}

// Sign contract (user)
export const signContractByUser = async (c) => {
  try {
    const contractId = c.req.param('id')
    const userId = c.get('user')._id
    const uploads = c.get('uploads') || {}
    
    if (!uploads.signature) {
      throw new AppError('Signature is required', 400)
    }
    
    const contract = await Contract.findById(contractId)
    if (!contract) {
      throw new AppError('Contract not found', 404)
    }
    
    // Check if user is authorized to sign this contract
    if (contract.userId.toString() !== userId.toString()) {
      throw new AppError('Not authorized to sign this contract', 403)
    }
    
    // Check if contract is in a signable state
    if (contract.status !== ContractStatus.SENT && contract.status !== ContractStatus.SIGNED_BY_ADMIN) {
      throw new AppError('Contract cannot be signed in its current state', 400)
    }
    
    // Sign contract
    try {
      contract.signByUser(uploads.signature, c.req.header('x-forwarded-for') || c.req.ip)
      await contract.save()
      
      // TODO: Send notification to admin
      
      return c.json({
        success: true,
        message: 'Contract signed successfully',
        contract
      })
    } catch (error) {
      throw new AppError(error.message, 400)
    }
  } catch (error) {
    console.error('Error signing contract:', error)
    return c.json({
      success: false,
      message: error.message || 'Error signing contract'
    }, error.statusCode || 500)
  }
}

// Sign contract (admin)
export const signContractByAdmin = async (c) => {
  try {
    const contractId = c.req.param('id')
    const adminId = c.get('user')._id
    const uploads = c.get('uploads') || {}
    
    if (!uploads.signature) {
      throw new AppError('Signature is required', 400)
    }
    
    const contract = await Contract.findById(contractId)
    if (!contract) {
      throw new AppError('Contract not found', 404)
    }
    
    // Check if contract is in a signable state
    if (contract.status !== ContractStatus.SENT && contract.status !== ContractStatus.SIGNED_BY_USER) {
      throw new AppError('Contract cannot be signed in its current state', 400)
    }
    
    // Sign contract
    try {
      contract.signByAdmin(adminId, uploads.signature, c.req.header('x-forwarded-for') || c.req.ip)
      await contract.save()
      
      // TODO: Send notification to user
      
      return c.json({
        success: true,
        message: 'Contract signed successfully',
        contract
      })
    } catch (error) {
      throw new AppError(error.message, 400)
    }
  } catch (error) {
    console.error('Error signing contract:', error)
    return c.json({
      success: false,
      message: error.message || 'Error signing contract'
    }, error.statusCode || 500)
  }
}

// Reject contract
export const rejectContract = async (c) => {
  try {
    const contractId = c.req.param('id')
    const userId = c.get('user')._id
    const userRole = c.get('user').role
    const body = await c.req.json()
    
    const contract = await Contract.findById(contractId)
    if (!contract) {
      throw new AppError('Contract not found', 404)
    }
    
    // Check if user is authorized to reject this contract
    if (userRole !== 'admin' && contract.userId.toString() !== userId.toString()) {
      throw new AppError('Not authorized to reject this contract', 403)
    }
    
    // Only allow rejecting contracts that are not already completed, rejected, or expired
    if ([ContractStatus.COMPLETED, ContractStatus.REJECTED, ContractStatus.EXPIRED].includes(contract.status)) {
      throw new AppError('Contract cannot be rejected in its current state', 400)
    }
    
    // Update status
    contract.status = ContractStatus.REJECTED
    
    // Add history entry
    contract.history.push({
      action: 'rejected',
      performedBy: userId,
      timestamp: new Date(),
      notes: body.reason || 'Contract rejected'
    })
    
    await contract.save()
    
    // TODO: Send notification to other party
    
    return c.json({
      success: true,
      message: 'Contract rejected successfully',
      contract
    })
  } catch (error) {
    console.error('Error rejecting contract:', error)
    return c.json({
      success: false,
      message: error.message || 'Error rejecting contract'
    }, error.statusCode || 500)
  }
}

// Get contract statistics (admin only)
export const getContractStats = async (c) => {
  try {
    // Get contracts by status
    const statusStats = await Contract.aggregate([
      { $group: { 
        _id: '$status', 
        count: { $sum: 1 } 
      }}
    ])
    
    // Get contracts by type
    const typeStats = await Contract.aggregate([
      { $group: { 
        _id: '$type', 
        count: { $sum: 1 } 
      }}
    ])
    
    // Get contracts count by month for the last 12 months
    const twelveMonthsAgo = new Date()
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12)
    
    const monthlyContracts = await Contract.aggregate([
      { 
        $match: { 
          createdAt: { $gte: twelveMonthsAgo } 
        } 
      },
      {
        $group: {
          _id: { 
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ])
    
    // Get completion rate
    const totalContracts = await Contract.countDocuments()
    const completedContracts = await Contract.countDocuments({ status: ContractStatus.COMPLETED })
    const rejectedContracts = await Contract.countDocuments({ status: ContractStatus.REJECTED })
    const expiredContracts = await Contract.countDocuments({ status: ContractStatus.EXPIRED })
    
    const completionRate = totalContracts > 0 ? (completedContracts / totalContracts) * 100 : 0
    const rejectionRate = totalContracts > 0 ? (rejectedContracts / totalContracts) * 100 : 0
    const expirationRate = totalContracts > 0 ? (expiredContracts / totalContracts) * 100 : 0
    
    return c.json({
      success: true,
      stats: {
        statusStats,
        typeStats,
        monthlyContracts,
        totalContracts,
        completedContracts,
        rejectedContracts,
        expiredContracts,
        completionRate,
        rejectionRate,
        expirationRate
      }
    })
  } catch (error) {
    console.error('Error getting contract stats:', error)
    return c.json({
      success: false,
      message: error.message || 'Error getting contract stats'
    }, error.statusCode || 500)
  }
}