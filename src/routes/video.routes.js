import { Hono } from "hono"
import { protect } from "../middlewares/auth.middleware.js"
import { handleUpload } from "../middlewares/upload.middleware.js"
import {
  createVideo,
  getAllVideos,
  getVideo,
  updateVideo,
  deleteVideo
} from "../controllers/video.controller.js"

const router = new Hono()

router.get("/", getAllVideos)
router.get("/:id", getVideo)
router.post("/", protect, handleUpload('VIDEO'), createVideo)
router.put("/:id", protect, handleUpload('VIDEO'), updateVideo)
router.delete("/:id", protect, deleteVideo)

export default router
