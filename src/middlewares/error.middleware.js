import { AppError } from "../utils/app-error.js";

export const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);
  
  // Check if it's an AppError
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      errors: err.errors
    });
  }
  
  // Handle other types of errors
  return res.status(500).json({
    success: false,
    message: err.message || 'Internal server error'
  });
};
