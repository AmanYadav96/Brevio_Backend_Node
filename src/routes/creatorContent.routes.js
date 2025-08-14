import express from "express"
import { protect, restrictTo } from "../middlewares/auth.middleware.js"
import { UserRole } from "../models/user.model.js"
import { handleUpload } from "../middlewares/upload.middleware.js"
import { 
  dbOptimizationMiddleware,
  creatorContentCacheMiddleware,
  cacheInvalidationMiddleware 
} from "../middlewares/dbOptimization.middleware.js"
import {
  createContentBasic,
  uploadMainVideo,
  uploadMediaAssets,
  addEpisode,
  addLesson,
  approveContent,
  rejectContent,
  bulkApproveContent,  // Add this
  bulkRejectContent,   // Add this
  getContentById,
  getAllContent,
  purchaseEducationalContent,
  updateContent,
  deleteContent,
  markContentAsReviewed,
  bulkMarkContentAsReviewed
} from "../controllers/creatorContent.controller.js"

const router = express.Router()

// Content creation routes - new workflow with cache invalidation
router.post("/basic", 
  protect, 
  cacheInvalidationMiddleware({ patterns: ['content', 'creator'], cacheTypes: ['api'] }),
  createContentBasic
)
router.post("/:contentId/video", 
  protect, 
  cacheInvalidationMiddleware({ patterns: ['content'], cacheTypes: ['api'] }),
  handleUpload('CREATOR_CONTENT'), 
  uploadMainVideo
)
router.post("/:contentId/media", 
  protect, 
  cacheInvalidationMiddleware({ patterns: ['content'], cacheTypes: ['api'] }),
  handleUpload('CREATOR_CONTENT'), 
  uploadMediaAssets
)

// Existing routes with cache invalidation
router.post("/:contentId/seasons/:seasonId/episodes", 
  protect, 
  cacheInvalidationMiddleware({ patterns: ['content'], cacheTypes: ['api'] }),
  handleUpload('episode'), 
  addEpisode
)
router.post("/:contentId/lessons", 
  protect, 
  cacheInvalidationMiddleware({ patterns: ['content'], cacheTypes: ['api'] }),
  handleUpload('lesson'), 
  addLesson
)

// Admin routes with cache invalidation
router.patch("/:contentId/approve", 
  protect, 
  restrictTo(UserRole.ADMIN), 
  cacheInvalidationMiddleware({ patterns: ['content'], cacheTypes: ['api'] }),
  approveContent
)
router.patch("/:contentId/reject", 
  protect, 
  restrictTo(UserRole.ADMIN), 
  cacheInvalidationMiddleware({ patterns: ['content'], cacheTypes: ['api'] }),
  rejectContent
)
router.patch("/:contentId/review", 
  protect, 
  restrictTo(UserRole.ADMIN), 
  cacheInvalidationMiddleware({ patterns: ['content'], cacheTypes: ['api'] }),
  markContentAsReviewed
)
router.post("/bulk/review", 
  protect, 
  restrictTo(UserRole.ADMIN), 
  cacheInvalidationMiddleware({ patterns: ['content'], cacheTypes: ['api'] }),
  bulkMarkContentAsReviewed
)

// Content retrieval routes with caching
router.get("/:contentId", 
  dbOptimizationMiddleware({ cacheType: 'api', ttl: 1800 }), // 30 minutes cache
  getContentById
)
router.get("/", 
  creatorContentCacheMiddleware({ cacheType: 'api', ttl: 120 }), // 2 minutes cache with shuffle - reduced for fresh content
  getAllContent
)

// Purchase route with cache invalidation
router.post("/:contentId/purchase", 
  protect, 
  cacheInvalidationMiddleware({ patterns: ['content', 'user'], cacheTypes: ['api'] }),
  purchaseEducationalContent
)

// Content editing and deletion with cache invalidation
router.patch("/:contentId", 
  protect, 
  cacheInvalidationMiddleware({ patterns: ['content'], cacheTypes: ['api'] }),
  handleUpload('CREATOR_CONTENT'), 
  updateContent
)
router.delete("/:contentId", 
  protect, 
  cacheInvalidationMiddleware({ patterns: ['content'], cacheTypes: ['api'] }),
  deleteContent
)

// Bulk operations with cache invalidation
router.post("/bulk/approve", 
  protect, 
  restrictTo(UserRole.ADMIN), 
  cacheInvalidationMiddleware({ patterns: ['content'], cacheTypes: ['api'] }),
  bulkApproveContent
)
router.post("/bulk/reject", 
  protect, 
  restrictTo(UserRole.ADMIN), 
  cacheInvalidationMiddleware({ patterns: ['content'], cacheTypes: ['api'] }),
  bulkRejectContent
)

export default router