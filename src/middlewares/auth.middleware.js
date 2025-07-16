import jwt from 'jsonwebtoken';
import User from "../models/user.model.js";
import { auth } from "../config/firebase.js";
import { AppError } from "../utils/app-error.js";

export const protect = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    
    // Debug the received header
    console.log("Auth header received:", authHeader);
    
    let token;
    
    if (!authHeader) {
      // Check if token is passed directly in the request body or query
      token = req.body.token || req.query.token;
      
      if (!token) {
        throw new AppError("Not authorized, no token", 401);
      }
    } else {
      // Handle the case where header might have "Bearer Bearer token"
      if (authHeader.startsWith("Bearer Bearer ")) {
        token = authHeader.substring("Bearer Bearer ".length);
      } else if (authHeader.startsWith("Bearer ")) {
        token = authHeader.substring("Bearer ".length);
      } else {
        token = authHeader;
      }
    }
    
    console.log("Token being verified:", token);

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("Decoded token:", decoded);

    // Check if user exists
    const user = await User.findById(decoded.id);
    if (!user) {
      throw new AppError("User not found", 404);
    }

    // Set user ID and user object in request
    req.userId = user._id.toString();
    req.user = user;
    
    next();
  } catch (error) {
    console.error("Auth error:", error);
    return res.status(401).json({ 
      success: false, 
      message: error.message || "Not authorized" 
    });
  }
};

export const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Not authorized, no user found"
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Not authorized, insufficient permissions"
      });
    }

    next();
  };
};

export const optionalProtect = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return next(); // Continue without authentication
    }
    
    let token;
    
    // Handle the case where header might have "Bearer Bearer token"
    if (authHeader.startsWith("Bearer Bearer ")) {
      token = authHeader.substring("Bearer Bearer ".length);
    } else if (authHeader.startsWith("Bearer ")) {
      token = authHeader.substring("Bearer ".length);
    } else {
      token = authHeader;
    }
    
    if (!token) {
      return next(); // Continue without authentication
    }
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if user exists
    const user = await User.findById(decoded.id);
    if (!user) {
      return next(); // Continue without authentication if user not found
    }
    
    // Set user ID and user object in request
    req.userId = user._id.toString();
    req.user = user;
    
    next();
  } catch (error) {
    // Just continue without authentication on error
    next();
  }
};
