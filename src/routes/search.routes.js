import express from 'express'
import { universalSearch, getSearchSuggestions } from '../controllers/search.controller.js'

const router = express.Router()

// Public routes - no authentication required
router.get('/', universalSearch)
router.get('/suggestions', getSearchSuggestions)

export default router