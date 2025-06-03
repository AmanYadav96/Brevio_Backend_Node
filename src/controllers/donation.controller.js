import Donation from '../models/donation.model.js'
import User from '../models/user.model.js'
import Video from '../models/video.model.js'
import Content from '../models/content.model.js'
import CreatorContent from '../models/creatorContent.model.js'
import { createError } from '../utils/error.js'

// Create a new donation
export const createDonation = async (req, res) => {
  try {
    const userId = req.user._id
    const { contentId, contentType, amount, message, currency = 'USD' } = req.body
    
    // Validate required fields
    if (!contentId || !contentType || !amount) {
      return res.status(400).json(createError(400, 'Missing required fields'))
    }
    
    // Validate content type
    if (!['video', 'short', 'series', 'course'].includes(contentType)) {
      return res.status(400).json(createError(400, 'Invalid content type'))
    }
    
    // Find the content and creator
    let creatorId
    
    switch (contentType) {
      case 'video':
      case 'short':
        const video = await Video.findById(contentId)
        if (!video) {
          return res.status(404).json(createError(404, 'Video not found'))
        }
        creatorId = video.userId
        break
      case 'series':
        const content = await Content.findById(contentId)
        if (!content) {
          return res.status(404).json(createError(404, 'Series not found'))
        }
        creatorId = content.userId
        break
      case 'course':
        const creatorContent = await CreatorContent.findById(contentId)
        if (!creatorContent) {
          return res.status(404).json(createError(404, 'Course not found'))
        }
        creatorId = creatorContent.creatorId
        break
    }
    
    // Create the donation
    const donation = new Donation({
      userId,
      contentId,
      contentType,
      amount,
      currency,
      message,
      creatorId,
      status: 'pending'
    })
    
    await donation.save()
    
    return res.json({
      success: true,
      message: 'Donation created successfully',
      donation
    })
  } catch (error) {
    console.error('Error creating donation:', error)
    return res.status(500).json(createError(500, 'Error creating donation'))
  }
}

// Process donation payment
export const processDonation = async (req, res) => {
  try {
    const { donationId, paymentId } = req.body
    
    const donation = await Donation.findById(donationId)
    if (!donation) {
      return res.status(404).json(createError(404, 'Donation not found'))
    }
    
    // Update donation with payment info
    donation.paymentId = paymentId
    donation.status = 'completed'
    await donation.save()
    
    return res.json({
      success: true,
      message: 'Donation processed successfully',
      donation
    })
  } catch (error) {
    console.error('Error processing donation:', error)
    return res.status(500).json(createError(500, 'Error processing donation'))
  }
}

// Get donations by user
export const getUserDonations = async (req, res) => {
  try {
    const userId = req.user._id
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 10
    
    const donations = await Donation.find({ userId })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('creatorId', 'name email profilePicture')
    
    const total = await Donation.countDocuments({ userId })
    
    return res.json({
      success: true,
      donations,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Error getting user donations:', error)
    return res.status(500).json(createError(500, 'Error getting user donations'))
  }
}

// Get donations for a creator
export const getCreatorDonations = async (req, res) => {
  try {
    const creatorId = req.user._id
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 10
    
    const donations = await Donation.find({ creatorId, status: 'completed' })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('userId', 'name email profilePicture')
    
    const total = await Donation.countDocuments({ creatorId, status: 'completed' })
    const totalAmount = await Donation.aggregate([
      { $match: { creatorId: mongoose.Types.ObjectId(creatorId), status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ])
    
    return res.json({
      success: true,
      donations,
      stats: {
        totalDonations: total,
        totalAmount: totalAmount.length > 0 ? totalAmount[0].total : 0
      },
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Error getting creator donations:', error)
    return res.status(500).json(createError(500, 'Error getting creator donations'))
  }
}

// Get donations for a specific content
export const getContentDonations = async (req, res) => {
  try {
    const { contentId, contentType } = req.params
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 10
    
    const donations = await Donation.find({ 
      contentId, 
      contentType,
      status: 'completed'
    })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('userId', 'name email profilePicture')
    
    const total = await Donation.countDocuments({ 
      contentId, 
      contentType,
      status: 'completed'
    })
    
    const totalAmount = await Donation.aggregate([
      { 
        $match: { 
          contentId: mongoose.Types.ObjectId(contentId), 
          contentType, 
          status: 'completed' 
        } 
      },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ])
    
    return res.json({
      success: true,
      donations,
      stats: {
        totalDonations: total,
        totalAmount: totalAmount.length > 0 ? totalAmount[0].total : 0
      },
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Error getting content donations:', error)
    return res.status(500).json(createError(500, 'Error getting content donations'))
  }
}