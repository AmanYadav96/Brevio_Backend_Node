import ffmpeg from 'fluent-ffmpeg'
import { OrientationType } from '../models/contentOrientation.model.js'

export class VideoProcessorService {
  // Detect video orientation based on dimensions
  async detectOrientation(videoPath) {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(videoPath, (err, metadata) => {
        if (err) {
          return reject(err)
        }
        
        try {
          const videoStream = metadata.streams.find(stream => stream.codec_type === 'video')
          
          if (!videoStream) {
            return reject(new Error('No video stream found'))
          }
          
          const width = videoStream.width
          const height = videoStream.height
          const aspectRatio = width / height
          
          // Calculate orientation
          let orientation
          if (aspectRatio < 1 || (width === height && width <= 1080)) {
            // If width < height or it's a square video with mobile dimensions
            orientation = OrientationType.VERTICAL
          } else {
            orientation = OrientationType.HORIZONTAL
          }
          
          resolve({
            width,
            height,
            aspectRatio: aspectRatio.toFixed(2),
            orientation,
            format: videoStream.codec_name,
            duration: metadata.format.duration,
            bitrate: metadata.format.bit_rate
          })
        } catch (error) {
          reject(error)
        }
      })
    })
  }
  
  // Validate if video orientation matches the selected content orientation
  validateOrientation(videoMetadata, selectedOrientation) {
    if (videoMetadata.orientation !== selectedOrientation) {
      throw new Error(`Video orientation (${videoMetadata.orientation}) does not match selected orientation (${selectedOrientation}). Please upload a ${selectedOrientation} video.`)
    }
    return true
  }
}

export default new VideoProcessorService()