export const validateFileSize = (options) => async (req, res, next) => {
  try {
    // Express doesn't have built-in formData parsing like Hono
    // The form data will be available through multer or formidable middleware
    // We'll check the files that have been attached to the request by previous middleware
    
    // Video file validation (500MB limit)
    if (options.video && req.files && req.files.videoFile) {
      const videoFile = req.files.videoFile;
      if (videoFile) {
        const videoSizeInMB = videoFile.size / (1024 * 1024);
        if (videoSizeInMB > 500) {
          return res.status(400).json({ 
            success: false, 
            message: "Video file size must be less than 500MB" 
          });
        }
      }
    }
    
    // Trailer file validation (100MB limit)
    if (options.trailer && req.files && req.files.trailerFile) {
      const trailerFile = req.files.trailerFile;
      if (trailerFile) {
        const trailerSizeInMB = trailerFile.size / (1024 * 1024);
        if (trailerSizeInMB > 100) {
          return res.status(400).json({ 
            success: false, 
            message: "Trailer file size must be less than 100MB" 
          });
        }
      }
    }
    
    next();
  } catch (error) {
    return res.status(500).json({ 
      success: false, 
      message: "Error processing file upload" 
    });
  }
}