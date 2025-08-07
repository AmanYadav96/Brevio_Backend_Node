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
  deleteVideo
} from "../controllers/video.controller.js"

const router = express.Router()

// Video retrieval routes with caching
router.get("/", 
  dbOptimizationMiddleware({ cacheType: 'api', ttl: 600 }), // 10 minutes cache
  getAllVideos
)
router.get("/:id", 
  videoCacheMiddleware, // 30 minutes cache for individual videos
  getVideo
)

// Video mutation routes with cache invalidation
router.post("/", 
  protect, 
  cacheInvalidationMiddleware({ patterns: ['video'], cacheTypes: ['videos', 'api'] }),
  handleUpload('VIDEO'), 
  createVideo
)
router.put("/:id", 
  protect, 
  cacheInvalidationMiddleware({ patterns: ['video'], cacheTypes: ['videos', 'api'] }),
  handleUpload('VIDEO'), 
  updateVideo
)
router.delete("/:id", 
  protect, 
  cacheInvalidationMiddleware({ patterns: ['video'], cacheTypes: ['videos', 'api'] }),
  deleteVideo
)

export default router
