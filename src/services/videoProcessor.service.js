import ffmpeg from 'fluent-ffmpeg'
import { OrientationType } from '../models/contentOrientation.model.js'
import ffmpegPath from '@ffmpeg-installer/ffmpeg'
import ffprobePath from '@ffprobe-installer/ffprobe'

// Set FFmpeg paths
ffmpeg.setFfmpegPath(ffmpegPath.path)
ffmpeg.setFfprobePath(ffprobePath.path)

export class VideoProcessorService {
  // Detect video orientation based on dimensions
  async detectOrientation(videoPath) {
    return new Promise((resolve, reject) => {
      try {
        ffmpeg.ffprobe(videoPath, (err, metadata) => {
          if (err) {
            console.error('FFprobe error:', err)
            // Return default values if FFprobe fails
            return resolve({
              width: 1920,
              height: 1080,
              aspectRatio: '1.78',
              orientation: OrientationType.HORIZONTAL,
              format: 'unknown',
              duration: 0,
              bitrate: 0
            })
          }
          
          try {
            const videoStream = metadata.streams.find(stream => stream.codec_type === 'video')
            
            if (!videoStream) {
              return reject(new Error('No video stream found'))
            }
            
            // Get dimensions and consider rotation metadata
            let width = videoStream.width
            let height = videoStream.height
            
            // Check for rotation metadata - improved detection
            let rotation = null
            if (videoStream.tags) {
              rotation = videoStream.tags.rotate || videoStream.tags.rotation
            }
            
            // Also check side_data_list for rotation information
            if (!rotation && videoStream.side_data_list && videoStream.side_data_list.length > 0) {
              const rotationData = videoStream.side_data_list.find(data => data.rotation !== undefined)
              if (rotationData) {
                rotation = rotationData.rotation
              }
            }
            
            // Log all metadata for debugging
            console.log('Video metadata:', JSON.stringify({
              dimensions: `${width}x${height}`,
              tags: videoStream.tags,
              side_data: videoStream.side_data_list,
              detected_rotation: rotation,
              duration: metadata.format.duration
            }, null, 2))
            
            // If rotation is 90 or 270 degrees, swap width and height
            if (rotation && (
                rotation === '90' || rotation === '270' || 
                rotation === 90 || rotation === 270 ||
                rotation === '-90' || rotation === '-270' ||
                rotation === -90 || rotation === -270
            )) {
              console.log(`Swapping dimensions due to ${rotation}° rotation`)
              const temp = width
              width = height
              height = temp
            }
            
            const aspectRatio = width / height
            console.log(`Final dimensions: ${width}x${height}, Aspect ratio: ${aspectRatio}, Rotation: ${rotation || 'none'}, Duration: ${metadata.format.duration}s`)
            
            // Simplified orientation detection
            let orientation
            if (aspectRatio < 1) {
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
              duration: metadata.format.duration || 0,
              bitrate: metadata.format.bit_rate,
              rotation: rotation || 'none'
            })
          } catch (error) {
            reject(error)
          }
        })
      } catch (error) {
        console.error('FFmpeg not available:', error)
        // Return default values if FFmpeg is not available
        return resolve({
          width: 1920,
          height: 1080,
          aspectRatio: '1.78',
          orientation: OrientationType.HORIZONTAL,
          format: 'unknown',
          duration: 0,
          bitrate: 0
        })
      }
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