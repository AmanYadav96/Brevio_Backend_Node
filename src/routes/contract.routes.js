import { Hono } from 'hono'
import { 
  createContract,
  getAllContracts,
  getUserContracts,
  getContractDetails,
  updateContract,
  sendContract,
  signContractByUser,
  signContractByAdmin,
  rejectContract,
  getContractStats
} from '../controllers/contract.controller.js'
import { protect, restrictTo } from '../middlewares/auth.middleware.js'
import { handleUpload } from '../middlewares/upload.middleware.js'

const app = new Hono()

// Apply authentication middleware to all routes
app.use('*', protect)

// Admin routes
app.post('/', restrictTo('admin'), handleUpload('CONTRACT'), createContract)
app.get('/admin', restrictTo('admin'), getAllContracts)
app.patch('/:id', restrictTo('admin'), handleUpload('CONTRACT'), updateContract)
app.post('/:id/send', restrictTo('admin'), sendContract)
app.post('/:id/sign/admin', restrictTo('admin'), handleUpload('CONTRACT'), signContractByAdmin)
app.get('/stats', restrictTo('admin'), getContractStats)

// User routes
app.get('/user', getUserContracts)
app.get('/:id', getContractDetails)
app.post('/:id/sign/user', handleUpload('CONTRACT'), signContractByUser)
app.post('/:id/reject', rejectContract)

export default app