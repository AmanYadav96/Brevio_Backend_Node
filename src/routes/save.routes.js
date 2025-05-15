import { Hono } from 'hono'
import { 
  toggleSave, 
  checkSaved, 
  getSavedContent, 
  updateSavedFolder 
} from '../controllers/save.controller.js'
import { protect } from '../middlewares/auth.middleware.js'

const app = new Hono()

// All routes require authentication
app.use('*', protect)
app.post('/toggle', toggleSave)
app.get('/check', checkSaved)
app.get('/', getSavedContent)
app.patch('/:id', updateSavedFolder)

export default app