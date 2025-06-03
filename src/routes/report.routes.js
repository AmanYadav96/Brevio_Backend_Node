import express from 'express'
import { 
  createReport,
  getUserReports,
  getAllReports,
  getReportDetails,
  updateReportStatus,
  getReportsByContent,
  getReportsStats
} from '../controllers/report.controller.js'
import { protect, restrictTo } from '../middlewares/auth.middleware.js'
import { handleUpload } from '../middlewares/upload.middleware.js'

const router = express.Router()

// Apply authentication middleware to all routes
router.use(protect)

// Create a new report (with file upload)
router.post('/', handleUpload('REPORT'), createReport)

// Get user's reports
router.get('/user', getUserReports)

// Get all reports (admin only)
router.get('/', restrictTo('admin'), getAllReports)

// Get report details
router.get('/:id', getReportDetails)

// Update report status (admin only)
router.patch('/:id', restrictTo('admin'), updateReportStatus)

// Get reports by content
router.get('/content/:contentId/:contentType', restrictTo('admin'), getReportsByContent)

// Get reports statistics (admin only)
router.get('/stats/overview', restrictTo('admin'), getReportsStats)

export default router