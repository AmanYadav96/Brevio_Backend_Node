import Report, { ReportStatus, ReportIssueType, ContentType } from '../models/report.model.js'
import User from '../models/user.model.js'
import Video from '../models/video.model.js'
import { createError } from '../utils/error.js'
import mongoose from 'mongoose'

// Create a new report
export const createReport = async (c) => {
  try {
    const userId = c.get('user')._id
    const uploads = c.get('uploads')
    
    // OPTION 1: Use the body that was set by the upload middleware
    const body = c.get('body')
    
    // Validate required fields
    if (!body.contentId || !body.contentType || !body.issueType || !body.description) {
      return c.json(createError(400, 'Missing required fields'), 400)
    }
    
    // Validate issue type
    if (!Object.values(ReportIssueType).includes(body.issueType)) {
      return c.json(createError(400, 'Invalid issue type'), 400)
    }
    
    // Validate content type
    if (!Object.values(ContentType).includes(body.contentType)) {
      return c.json(createError(400, 'Invalid content type'), 400)
    }
    
    // Get content details based on content type
    let contentName = ''
    let contentThumbnail = ''
    let creatorId = null
    
    switch (body.contentType) {
      case ContentType.VIDEO:
        const video = await Video.findById(body.contentId)
        if (!video) {
          return c.json(createError(404, 'Video not found'), 404)
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
        return c.json(createError(400, 'Content type not supported yet'), 400)
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
    
    return c.json({
      success: true,
      message: 'Report submitted successfully',
      report
    }, 201)
  } catch (error) {
    console.error('Error creating report:', error)
    return c.json(createError(500, 'Error creating report'), 500)
  }
}

// Get user's reports
export const getUserReports = async (c) => {
  try {
    const userId = c.get('user')._id
    const page = parseInt(c.req.query('page')) || 1
    const limit = parseInt(c.req.query('limit')) || 10
    const status = c.req.query('status')
    
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
    
    return c.json({
      success: true,
      reports,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Error getting user reports:', error)
    return c.json(createError(500, 'Error getting user reports'), 500)
  }
}

// Get all reports (admin only)
export const getAllReports = async (c) => {
  try {
    const page = parseInt(c.req.query('page')) || 1
    const limit = parseInt(c.req.query('limit')) || 10
    const status = c.req.query('status')
    const issueType = c.req.query('issueType')
    const contentType = c.req.query('contentType')
    const search = c.req.query('search') || ''
    const sortBy = c.req.query('sortBy') || 'createdAt'
    const sortOrder = c.req.query('sortOrder') || 'desc'
    
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
    
    return c.json({
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
    return c.json(createError(500, 'Error getting all reports'), 500)
  }
}

// Get report details
export const getReportDetails = async (c) => {
  try {
    const reportId = c.req.param('id')
    const userId = c.get('user')._id
    const userRole = c.get('user').role
    
    const report = await Report.findById(reportId)
      .populate('reporterId', 'name email profilePicture')
      .populate('creatorId', 'name email profilePicture')
      .populate('actionBy', 'name email')
    
    if (!report) {
      return c.json(createError(404, 'Report not found'), 404)
    }
    
    // Check if user is authorized to view this report
    if (userRole !== 'admin' && report.reporterId.toString() !== userId.toString()) {
      return c.json(createError(403, 'Not authorized to view this report'), 403)
    }
    
    return c.json({
      success: true,
      report
    })
  } catch (error) {
    console.error('Error getting report details:', error)
    return c.json(createError(500, 'Error getting report details'), 500)
  }
}

// Update report status (admin only)
export const updateReportStatus = async (c) => {
  try {
    const reportId = c.req.param('id')
    const adminId = c.get('user')._id
    const { status, adminNotes, actionTaken } = await c.req.json()
    
    // Validate status
    if (!Object.values(ReportStatus).includes(status)) {
      return c.json(createError(400, 'Invalid status'), 400)
    }
    
    const report = await Report.findById(reportId)
    if (!report) {
      return c.json(createError(404, 'Report not found'), 404)
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
    
    return c.json({
      success: true,
      message: 'Report status updated successfully',
      report
    })
  } catch (error) {
    console.error('Error updating report status:', error)
    return c.json(createError(500, 'Error updating report status'), 500)
  }
}

// Get reports by content
export const getReportsByContent = async (c) => {
  try {
    const contentId = c.req.param('contentId')
    const contentType = c.req.param('contentType')
    
    // Validate content type
    if (!Object.values(ContentType).includes(contentType)) {
      return c.json(createError(400, 'Invalid content type'), 400)
    }
    
    const reports = await Report.find({ contentId, contentType })
      .sort({ createdAt: -1 })
      .populate('reporterId', 'name email profilePicture')
      .populate('actionBy', 'name email')
    
    return c.json({
      success: true,
      reports
    })
  } catch (error) {
    console.error('Error getting reports by content:', error)
    return c.json(createError(500, 'Error getting reports by content'), 500)
  }
}

// Get reports statistics (admin only)
export const getReportsStats = async (c) => {
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
    
    return c.json({
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
    return c.json(createError(500, 'Error getting reports stats'), 500)
  }
}