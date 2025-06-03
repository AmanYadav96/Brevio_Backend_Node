import express from 'express'
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

const router = express.Router()

// Apply authentication middleware to all routes
router.use(protect)

// Admin routes
router.post('/', restrictTo('admin'), handleUpload('CONTRACT'), createContract)
router.get('/admin', restrictTo('admin'), getAllContracts)
router.patch('/:id', restrictTo('admin'), handleUpload('CONTRACT'), updateContract)
router.post('/:id/send', restrictTo('admin'), sendContract)
router.post('/:id/sign/admin', restrictTo('admin'), handleUpload('CONTRACT'), signContractByAdmin)
router.get('/stats', restrictTo('admin'), getContractStats)

// User routes
router.get('/user', getUserContracts)
router.get('/:id', getContractDetails)
router.post('/:id/sign/user', handleUpload('CONTRACT'), signContractByUser)
router.post('/:id/reject', rejectContract)

export default router