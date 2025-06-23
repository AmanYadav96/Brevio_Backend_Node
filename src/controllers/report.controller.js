import Report, { ReportStatus, ReportIssueType, ContentType } from '../models/report.model.js'
import User from '../models/user.model.js'
import Video from '../models/video.model.js'
import { createError } from '../utils/error.js'
import mongoose from 'mongoose'

// Create a new report
export const createReport = async (req, res) => {
  try {
    const userId = req.user._id
    const uploads = req.uploads
    
    // Get the body from the request
    const body = req.body
    
    // Enhanced logging
    console.log('Request body:', JSON.stringify(body))
    console.log('Content type received:', body.contentType)
    console.log('Content type type:', typeof body.contentType)
    console.log('Valid content types:', Object.values(ContentType))
    console.log('Is content type valid?', Object.values(ContentType).includes(body.contentType))
    console.log('Issue type received:', body.issueType)
    console.log('Is issue type valid?', Object.values(ReportIssueType).includes(body.issueType))
    console.log('Uploads:', uploads)
    
    // Validate required fields
    if (!body.contentId || !body.contentType || !body.issueType || !body.description) {
      console.log('Missing fields check failed:', {
        contentId: !!body.contentId,
        contentType: !!body.contentType,
        issueType: !!body.issueType,
        description: !!body.description
      })
      return res.status(400).json(createError(400, 'Missing required fields'))
    }
    
    // Validate issue type
    if (!Object.values(ReportIssueType).includes(body.issueType)) {
      console.log('Invalid issue type:', body.issueType)
      return res.status(400).json(createError(400, 'Invalid issue type'))
    }
    
    // Validate content type
    if (!Object.values(ContentType).includes(body.contentType)) {
      console.log('Invalid content type:', body.contentType)
      return res.status(400).json(createError(400, 'Invalid content type'))
    }
    
    // Get content details based on content type
    let contentName = ''
    let contentThumbnail = ''
    let creatorId = null
    
    switch (body.contentType) {
      case ContentType.VIDEO:
        const video = await Video.findById(body.contentId)
        if (!video) {
          return res.status(404).json(createError(404, 'Video not found'))
        }
        contentName = video.title
        contentThumbnail = video.thumbnail
        creatorId = video.userId
        break
      
      // Add case for SHORT content type
      case ContentType.SHORT:
        // Add logic to handle short content type
        // For now, just use the content ID as the name
        contentName = `Short content ${body.contentId}`
        break
      
      // Add other cases as needed
      
      default:
        return res.status(400).json(createError(400, 'Content type not supported yet'))
    }
    
    // Create report object
    const reportData = {
      reporterId: userId,
      contentId: body.contentId,
      contentType: body.contentType,
      contentName,
      contentThumbnail,
      creatorId,
      issueType: body.issueType,
      description: body.description,
      status: ReportStatus.PENDING
    }
    
    // Add proof file if uploaded
    if (uploads && uploads.proofFile) {
      reportData.proofFile = uploads.proofFile
    }
    
    // Create and save the report
    const report = new Report(reportData)
    await report.save()
    
    return res.status(201).json({
      success: true,
      message: 'Report submitted successfully',
      report
    })
  } catch (error) {
    console.error('Error creating report:', error)
    return res.status(500).json(createError(500, 'Error creating report'))
  }
}

// Get user reports
export const getUserReports = async (req, res) => {
  try {
    const userId = req.user._id
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 10
    const status = req.query.status
    
    const query = { reporterId: userId }
    
    if (status && Object.values(ReportStatus).includes(status)) {
      query.status = status
    }
    
    const reports = await Report.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('reporterId', 'name email profilePicture')
      .populate('creatorId', 'name email profilePicture')
      .populate('actionBy', 'name email')
    
    const total = await Report.countDocuments(query)
    
    return res.json({
      success: true,
      reports,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Get user reports error:', error)
    return res.status(500).json({
      success: false,
      message: error.message || 'Error getting user reports'
    })
  }
}

// Get all reports (admin only)
export const getAllReports = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 10
    const status = req.query.status
    const issueType = req.query.issueType
    const contentType = req.query.contentType
    const search = req.query.search || ''
    const sortBy = req.query.sortBy || 'createdAt'
    const sortOrder = req.query.sortOrder || 'desc'
    
    // Build query
    const query = {}
    
    if (status && Object.values(ReportStatus).includes(status)) {
      query.status = status
    }
    
    if (issueType && Object.values(ReportIssueType).includes(issueType)) {
      query.issueType = issueType
    }
    
    if (contentType && Object.values(ContentType).includes(contentType)) {
      query.contentType = contentType
    }
    
    if (search) {
      query.$or = [
        { contentName: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ]
    }
    
    // Create sort object
    const sort = {}
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1
    
    const reports = await Report.find(query)
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('reporterId', 'name email profilePicture')
      .populate('creatorId', 'name email profilePicture')
      .populate('actionBy', 'name email')
    
    const total = await Report.countDocuments(query)
    
    // Get statistics
    const stats = await Report.aggregate([
      { $group: { 
        _id: '$status', 
        count: { $sum: 1 } 
      }}
    ])
    
    const statusStats = {}
    stats.forEach(stat => {
      statusStats[stat._id] = stat.count
    })
    
    return res.json({
      success: true,
      reports,
      stats: {
        statusStats,
        total
      },
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Error getting all reports:', error)
    return res.status(500).json(createError(500, 'Error getting all reports'))
  }
}

// Get report details
export const getReportDetails = async (req, res) => {
  try {
    const reportId = req.params.id
    const userId = req.user._id
    const userRole = req.user.role
    
    const report = await Report.findById(reportId)
      .populate('reporterId', 'name email profilePicture')
      .populate('creatorId', 'name email profilePicture')
      .populate('actionBy', 'name email')
    
    if (!report) {
      return res.status(404).json(createError(404, 'Report not found'))
    }
    
    // Check if user is authorized to view this report
    if (userRole !== 'admin' && report.reporterId.toString() !== userId.toString()) {
      return res.status(403).json(createError(403, 'Not authorized to view this report'))
    }
    
    return res.json({
      success: true,
      report
    })
  } catch (error) {
    console.error('Error getting report details:', error)
    return res.status(500).json(createError(500, 'Error getting report details'))
  }
}

// Update report status (admin only)
export const updateReportStatus = async (req, res) => {
  try {
    const reportId = req.params.id
    const adminId = req.user._id
    const { status, adminNotes, actionTaken } = req.body
    
    // Validate status
    if (!Object.values(ReportStatus).includes(status)) {
      return res.status(400).json(createError(400, 'Invalid status'))
    }
    
    const report = await Report.findById(reportId)
    if (!report) {
      return res.status(404).json(createError(404, 'Report not found'))
    }
    
    // Update report
    report.status = status
    
    if (adminNotes) {
      report.adminNotes = adminNotes
    }
    
    if (actionTaken) {
      report.actionTaken = actionTaken
      report.actionDate = new Date()
      report.actionBy = adminId
    }
    
    await report.save()
    
    return res.json({
      success: true,
      message: 'Report status updated successfully',
      report
    })
  } catch (error) {
    console.error('Error updating report status:', error)
    return res.status(500).json(createError(500, 'Error updating report status'))
  }
}

// Get reports by content
export const getReportsByContent = async (req, res) => {
  try {
    const contentId = req.params.contentId
    const contentType = req.params.contentType
    
    // Validate content type
    if (!Object.values(ContentType).includes(contentType)) {
      return res.status(400).json(createError(400, 'Invalid content type'))
    }
    
    const reports = await Report.find({ contentId, contentType })
      .sort({ createdAt: -1 })
      .populate('reporterId', 'name email profilePicture')
      .populate('actionBy', 'name email')
    
    return res.json({
      success: true,
      reports
    })
  } catch (error) {
    console.error('Error getting reports by content:', error)
    return res.status(500).json(createError(500, 'Error getting reports by content'))
  }
}

// Get reports statistics (admin only)
export const getReportsStats = async (req, res) => {
  try {
    // Get reports by status
    const statusStats = await Report.aggregate([
      { $group: { 
        _id: '$status', 
        count: { $sum: 1 } 
      }}
    ])
    
    // Get reports by issue type
    const issueTypeStats = await Report.aggregate([
      { $group: { 
        _id: '$issueType', 
        count: { $sum: 1 } 
      }}
    ])
    
    // Get reports by content type
    const contentTypeStats = await Report.aggregate([
      { $group: { 
        _id: '$contentType', 
        count: { $sum: 1 } 
      }}
    ])
    
    // Get reports count by day for the last 30 days
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    
    const dailyReports = await Report.aggregate([
      { 
        $match: { 
          createdAt: { $gte: thirtyDaysAgo } 
        } 
      },
      {
        $group: {
          _id: { 
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } 
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ])
    
    return res.json({
      success: true,
      stats: {
        statusStats,
        issueTypeStats,
        contentTypeStats,
        dailyReports
      }
    })
  } catch (error) {
    console.error('Error getting reports stats:', error)
    return res.status(500).json(createError(500, 'Error getting reports stats'))
  }
}