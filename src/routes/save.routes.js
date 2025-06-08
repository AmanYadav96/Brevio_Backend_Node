import express from 'express'
import { 
  toggleSave, 
  checkSaved, 
  getSavedContent, 
  updateSaveFolder 
} from '../controllers/save.controller.js'
import { protect } from '../middlewares/auth.middleware.js'

const router = express.Router()

// All routes require authentication
router.use(protect)
router.post('/toggle', toggleSave)
router.get('/check', checkSaved)
router.get('/', getSavedContent)
router.patch('/:id', updateSaveFolder)

export default router