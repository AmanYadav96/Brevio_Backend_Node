export const validateFileSize = (options) => async (c, next) => {
  try {
    const formData = await c.req.formData()
    
    // Video file validation (500MB limit)
    if (options.video && formData.has('videoFile')) {
      const videoFile = formData.get('videoFile')
      if (videoFile && videoFile instanceof Blob) {
        const videoSizeInMB = videoFile.size / (1024 * 1024)
        if (videoSizeInMB > 500) {
          return c.json({ 
            success: false, 
            message: "Video file size must be less than 500MB" 
          }, 400)
        }
      }
    }
    
    // Trailer file validation (100MB limit)
    if (options.trailer && formData.has('trailerFile')) {
      const trailerFile = formData.get('trailerFile')
      if (trailerFile && trailerFile instanceof Blob) {
        const trailerSizeInMB = trailerFile.size / (1024 * 1024)
        if (trailerSizeInMB > 100) {
          return c.json({ 
            success: false, 
            message: "Trailer file size must be less than 100MB" 
          }, 400)
        }
      }
    }
    
    // Reattach the form data to the request
    c.req.formData = () => Promise.resolve(formData)
    
    await next()
  } catch (error) {
    return c.json({ 
      success: false, 
      message: "Error processing file upload" 
    }, 500)
  }
}