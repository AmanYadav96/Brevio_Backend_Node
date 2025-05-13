import { Hono } from 'hono'
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
import { handleUpload } from '../middlewares/upload.middleware.js'  // Changed from uploadFiles to handleUpload

const app = new Hono()

// Apply authentication middleware to all routes
app.use('*', protect)

// Create a new report (with file upload)
app.post('/', handleUpload('REPORT'), createReport)  // Updated to use handleUpload

// Get user's reports
app.get('/user', getUserReports)

// Get all reports (admin only)
app.get('/', restrictTo('admin'), getAllReports)

// Get report details
app.get('/:id', getReportDetails)

// Update report status (admin only)
app.patch('/:id', restrictTo('admin'), updateReportStatus)

// Get reports by content
app.get('/content/:contentId/:contentType', restrictTo('admin'), getReportsByContent)

// Get reports statistics (admin only)
app.get('/stats/overview', restrictTo('admin'), getReportsStats)

export default app