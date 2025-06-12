import ffmpeg from 'fluent-ffmpeg'
import { OrientationType } from '../models/contentOrientation.model.js'
import ffmpegPath from '@ffmpeg-installer/ffmpeg'
import ffprobePath from '@ffprobe-installer/ffprobe'
import path from 'path'
import fs from 'fs'
import { v4 as uuidv4 } from 'uuid'

// Set FFmpeg paths - prioritize environment variables
if (process.env.FFMPEG_PATH && fs.existsSync(process.env.FFMPEG_PATH)) {
  console.log(`Using FFMPEG_PATH from environment: ${process.env.FFMPEG_PATH}`);
  ffmpeg.setFfmpegPath(process.env.FFMPEG_PATH);
} else {
  console.log(`Using FFMPEG_PATH from package: ${ffmpegPath.path}`);
  ffmpeg.setFfmpegPath(ffmpegPath.path);
}

if (process.env.FFPROBE_PATH && fs.existsSync(process.env.FFPROBE_PATH)) {
  console.log(`Using FFPROBE_PATH from environment: ${process.env.FFPROBE_PATH}`);
  ffmpeg.setFfprobePath(process.env.FFPROBE_PATH);
} else {
  console.log(`Using FFPROBE_PATH from package: ${ffprobePath.path}`);
  ffmpeg.setFfprobePath(ffprobePath.path);
}
export class VideoProcessorService {
  // Detect video orientation based on dimensions
  async detectOrientation(videoPath) {
    return new Promise((resolve, reject) => {
      try {
        // Check if videoPath is a URL or an object with url property
        let actualPath = videoPath;
        if (typeof videoPath === 'object' && videoPath.url) {
          actualPath = videoPath.url;
        }
        
        // If it's a URL, we can't use ffprobe directly
        if (typeof actualPath === 'string' && (actualPath.startsWith('http://') || actualPath.startsWith('https://'))) {
          console.log('Remote URL detected, cannot use ffprobe directly:', actualPath);
          // Return default values for remote URLs, but set orientation based on the requested orientation
          // This is a workaround since we can't analyze remote URLs directly
          return resolve({
            width: 1080,  // Default width for vertical
            height: 1920, // Default height for vertical
            aspectRatio: '0.56',
            orientation: OrientationType.VERTICAL, // Default to VERTICAL for remote URLs
            format: 'mp4',
            duration: 0,
            bitrate: 0,
            isRemoteUrl: true
          });
        }
        
        // Original ffprobe logic for local files
        ffmpeg.ffprobe(actualPath, (err, metadata) => {
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
        console.error('FFmpeg not available:', error);
        // Return default values if FFmpeg is not available
        return resolve({
          width: 1920,
          height: 1080,
          aspectRatio: '1.78',
          orientation: OrientationType.HORIZONTAL,
          format: 'unknown',
          duration: 0,
          bitrate: 0
        });
      }
    });
  }
  
  // Validate if video orientation matches the selected content orientation
  validateOrientation(videoMetadata, selectedOrientation) {
    // Skip validation for remote URLs and trust the selected orientation
    if (videoMetadata.isRemoteUrl) {
      console.log('Remote URL detected, skipping orientation validation and trusting selected orientation:', selectedOrientation);
      return true;
    }
    
    // Original validation logic for local files
    if (videoMetadata.orientation !== selectedOrientation) {
      throw new Error(`Video orientation (${videoMetadata.orientation}) does not match selected orientation (${selectedOrientation}). Please upload a ${selectedOrientation} video.`)
    }
    return true;
  }
  
  // Compress video while maintaining quality
  async compressVideo(inputPath, outputDir) {
    return new Promise((resolve, reject) => {
      try {
        // Create a unique filename for the compressed video
        const originalExt = path.extname(inputPath)
        const filename = `compressed_${uuidv4()}${originalExt}`
        const outputPath = path.join(outputDir, filename)
        
        // Ensure output directory exists
        if (!fs.existsSync(outputDir)) {
          fs.mkdirSync(outputDir, { recursive: true })
        }
        
        console.log(`Compressing video: ${inputPath} -> ${outputPath}`)
        
        // Get video metadata first to make intelligent compression decisions
        ffmpeg.ffprobe(inputPath, (err, metadata) => {
          if (err) {
            console.error('FFprobe error during compression:', err)
            return reject(err)
          }
          
          try {
            const videoStream = metadata.streams.find(stream => stream.codec_type === 'video')
            if (!videoStream) {
              return reject(new Error('No video stream found'))
            }
            
            // Get original bitrate and resolution
            const originalBitrate = parseInt(metadata.format.bit_rate) || 8000000 // default to 8Mbps if not available
            const width = videoStream.width
            const height = videoStream.height
            
            // Calculate target bitrate (40% of original, but not less than 800Kbps)
            const targetBitrate = Math.max(Math.round(originalBitrate * 0.4), 800000)
            
            // Start FFmpeg command
            const command = ffmpeg(inputPath)
              .outputOptions([
                '-c:v libx264',              // Use H.264 codec
                '-preset medium',            // Balance between compression speed and quality
                `-b:v ${targetBitrate}`,     // Target bitrate (reduced to 40% of original)
                '-maxrate 5M',              // Maximum bitrate (reduced from 8M)
                '-bufsize 10M',             // Buffer size (reduced from 16M)
                '-movflags +faststart',     // Optimize for web streaming
                '-profile:v high',          // High profile for better quality
                '-level 4.1',               // Compatibility level
                '-crf 28'                   // Increased CRF for better compression (higher value = smaller file)
              ])
              .outputOptions('-c:a aac')     // Use AAC for audio
              .outputOptions('-b:a 128k')    // Audio bitrate
              .output(outputPath)
            
            // Add progress handler
            command.on('progress', (progress) => {
              console.log(`Compression progress: ${progress.percent ? progress.percent.toFixed(1) : 0}% done`);
            })
            
            // Execute the command
            command.on('end', () => {
              // Get file sizes for comparison
              const originalSize = fs.statSync(inputPath).size
              const compressedSize = fs.statSync(outputPath).size
              const compressionRatio = (originalSize / compressedSize).toFixed(2)
              
              console.log(`Compression complete! Original: ${(originalSize/1024/1024).toFixed(2)}MB, ` +
                          `Compressed: ${(compressedSize/1024/1024).toFixed(2)}MB, ` +
                          `Ratio: ${compressionRatio}x`)
              
              // If compression made the file larger, use the original instead
              if (compressedSize > originalSize) {
                console.log('Compression increased file size. Using original file instead.')
                // Copy original to the output path
                fs.copyFileSync(inputPath, outputPath)
                
                resolve({
                  path: outputPath,
                  originalSize,
                  compressedSize: originalSize,
                  compressionRatio: '1.00',
                  filename
                })
              } else {
                resolve({
                  path: outputPath,
                  originalSize,
                  compressedSize,
                  compressionRatio,
                  filename
                })
              }
            })
            
            command.on('error', (err) => {
              console.error('FFmpeg compression error:', err)
              reject(err)
            })
            
            // Run the command
            command.run()
            
          } catch (error) {
            console.error('Error during compression setup:', error)
            reject(error)
          }
        })
      } catch (error) {
        console.error('FFmpeg not available for compression:', error)
        reject(error)
      }
    })
  }
}

export default new VideoProcessorService()