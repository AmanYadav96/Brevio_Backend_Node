import express from "express"
import { protect } from "../middlewares/auth.middleware.js"
import { handleUpload } from "../middlewares/upload.middleware.js"
import { 
  videoCacheMiddleware,
  dbOptimizationMiddleware,
  cacheInvalidationMiddleware 
} from "../middlewares/dbOptimization.middleware.js"
import {
  createVideo,
  getAllVideos,
  getVideo,
  updateVideo,
  deleteVideo,
  getVideosByChannel,
  getVideoStats,
  toggleVideoStatus,
  getUserVideos,
  searchVideos
} from "../controllers/video.controller.js"

const router = express.Router()

// Video retrieval routes with caching
router.get("/", 
  dbOptimizationMiddleware({ cacheType: 'api', ttl: 600 }), // 10 minutes cache
  getAllVideos
)
router.get("/search", 
  dbOptimizationMiddleware({ cacheType: 'api', ttl: 300 }), // 5 minutes cache
  searchVideos
)
router.get("/my-videos", 
  protect,
  dbOptimizationMiddleware({ cacheType: 'api', ttl: 300 }), // 5 minutes cache
  getUserVideos
)
router.get("/channel/:channelId", 
  dbOptimizationMiddleware({ cacheType: 'api', ttl: 300 }), // 5 minutes cache
  getVideosByChannel
)
router.get("/:id", 
  videoCacheMiddleware, // 30 minutes cache for individual videos
  getVideo
)
router.get("/:id/stats", 
  protect,
  getVideoStats
)

// Video mutation routes with cache invalidation
router.post("/", 
  protect, 
  cacheInvalidationMiddleware({ patterns: ['video'], cacheTypes: ['videos', 'api'] }),
  createVideo
)
router.put("/:id", 
  protect, 
  cacheInvalidationMiddleware({ patterns: ['video'], cacheTypes: ['videos', 'api'] }),
  updateVideo
)
router.patch("/:id/toggle-status", 
  protect, 
  cacheInvalidationMiddleware({ patterns: ['video'], cacheTypes: ['videos', 'api'] }),
  toggleVideoStatus
)
router.delete("/:id", 
  protect, 
  cacheInvalidationMiddleware({ patterns: ['video'], cacheTypes: ['videos', 'api'] }),
  deleteVideo
)

export default router
