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
  
  // Handle Mongoose validation errors
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(val => val.message);
    return res.status(400).json({
      success: false,
      message: 'Validation Error',
      errors
    });
  }
  
  // Handle Mongoose duplicate key errors
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(400).json({
      success: false,
      message: `Duplicate value for ${field}`,
      field
    });
  }
  
  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid token. Please log in again.'
    });
  }
  
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Your token has expired. Please log in again.'
    });
  }
  
  // Handle TypeError for undefined properties
  if (err instanceof TypeError && err.message.includes('Cannot read properties of undefined')) {
    return res.status(400).json({
      success: false,
      message: 'Invalid request data structure',
      error: err.message
    });
  }
  
  // Handle function not defined errors
  if (err instanceof TypeError && err.message.includes('is not a function')) {
    return res.status(500).json({
      success: false,
      message: 'Server implementation error',
      error: err.message
    });
  }
  
  // Handle other types of errors
  return res.status(500).json({
    success: false,
    message: err.message || 'Internal server error'
  });
};
