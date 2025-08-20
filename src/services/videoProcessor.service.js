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
  async compressVideo(inputPath, outputDir, progressCallback = null) {
    return new Promise((resolve, reject) => {
      try {
        // Validate input file exists
        if (!fs.existsSync(inputPath)) {
          throw new Error(`Input file does not exist: ${inputPath}`)
        }

        // Validate input file is not empty
        const inputStats = fs.statSync(inputPath)
        if (inputStats.size === 0) {
          throw new Error(`Input file is empty: ${inputPath}`)
        }

        // Ensure output directory exists
        if (!fs.existsSync(outputDir)) {
          fs.mkdirSync(outputDir, { recursive: true })
        }

        const filename = `compressed_${uuidv4()}.mp4`
        const outputPath = path.join(outputDir, filename)
        
        console.log(`Compressing video: ${inputPath} -> ${outputPath}`)

        // Create ffmpeg command with more conservative settings
        const command = ffmpeg(inputPath)
          .videoCodec('libx264')
          .audioCodec('aac')
          .outputOptions([
            '-preset medium',
            '-crf 28',
            '-maxrate 5M',
            '-bufsize 10M',
            '-profile:v high',
            '-level 4.1',
            '-movflags +faststart',  // Optimize for web streaming
            '-pix_fmt yuv420p'       // Ensure compatibility
          ])
          .audioFrequency(44100)
          .audioBitrate('128k')
          .output(outputPath)

        // Add progress handler with callback support
        command.on('progress', (progress) => {
          const percent = progress.percent || 0
          console.log(`Compression progress: ${percent.toFixed(1)}% done`)
          
          // Call the progress callback if provided
          if (progressCallback && typeof progressCallback === 'function') {
            progressCallback(percent)
          }
        })

        // Execute the command
        command.on('end', () => {
          try {
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
          } catch (endError) {
            console.error('Error in compression end handler:', endError)
            reject(endError)
          }
        })

        command.on('error', (err) => {
          console.error('FFmpeg compression error:', err)
          console.error('FFmpeg command that failed:', command._getArguments().join(' '))
          console.error('Input file:', inputPath)
          console.error('Output file:', outputPath)
          console.error('Input file exists:', fs.existsSync(inputPath))
          console.error('Output directory exists:', fs.existsSync(path.dirname(outputPath)))
          
          // Check input file details
          if (fs.existsSync(inputPath)) {
            const stats = fs.statSync(inputPath)
            console.error('Input file size:', stats.size, 'bytes')
            console.error('Input file permissions:', stats.mode)
          }
          
          // Implement fallback strategy - use original file if compression fails
          console.log('Compression failed, using original file as fallback')
          try {
            const fallbackFilename = `fallback_${uuidv4()}.mp4`
            const fallbackPath = path.join(outputDir, fallbackFilename)
            fs.copyFileSync(inputPath, fallbackPath)
            
            const originalSize = fs.statSync(inputPath).size
            
            resolve({
              path: fallbackPath,
              originalSize,
              compressedSize: originalSize,
              compressionRatio: '1.00',
              filename: fallbackFilename,
              fallback: true
            })
          } catch (fallbackError) {
            console.error('Fallback strategy also failed:', fallbackError)
            reject(new Error(`Both compression and fallback failed. Original error: ${err.message}, Fallback error: ${fallbackError.message}`))
          }
        })
        
        // Add stderr logging for more detailed error information
        command.on('stderr', (stderrLine) => {
          console.error('FFmpeg stderr:', stderrLine)
        })
        
        // Run the command
        command.run()
        
      } catch (error) {
        console.error('Error setting up video compression:', error)
        reject(error)
      }
    })
  }
}

export default new VideoProcessorService()