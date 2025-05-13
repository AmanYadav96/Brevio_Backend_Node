// Add this check to your video processing code
const isVercelEnvironment = process.env.VERCEL === '1'

// Then use it to conditionally skip ffprobe operations
const getVideoMetadata = async (videoPath) => {
  if (isVercelEnvironment) {
    // Return default/fallback metadata or skip the operation
    console.log('Running on Vercel, skipping ffprobe operation')
    return { duration: 0, width: 0, height: 0 }
  }
  
  // Regular ffprobe code for non-Vercel environments
  // ...
}