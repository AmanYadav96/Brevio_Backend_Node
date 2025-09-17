import jwt from 'jsonwebtoken';
import User from "../models/user.model.js";
import { auth } from "../config/firebase.js";
import { AppError } from "../utils/app-error.js";

export const protect = async (req, res, next) => {
  const requestId = Math.random().toString(36).substr(2, 9);
  console.log(`🔐 [${requestId}] AUTH MIDDLEWARE - ${req.method} ${req.path}`);
  console.log(`🔐 [${requestId}] Request IP:`, req.ip || req.connection.remoteAddress);
  console.log(`🔐 [${requestId}] User Agent:`, req.get('User-Agent'));
  
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    
    // Debug the received header
    console.log(`🔐 [${requestId}] Auth header received:`, authHeader ? `${authHeader.substring(0, 20)}...` : 'null');
    
    let token;
    
    if (!authHeader) {
      console.log(`🔐 [${requestId}] No auth header, checking body/query for token`);
      // Check if token is passed directly in the request body or query
      token = req.body.token || req.query.token;
      
      if (!token) {
        console.error(`❌ [${requestId}] No token found in header, body, or query`);
        throw new AppError("Not authorized, no token", 401);
      }
      console.log(`🔐 [${requestId}] Token found in body/query`);
    } else {
      // Handle the case where header might have "Bearer Bearer token"
      if (authHeader.startsWith("Bearer Bearer ")) {
        token = authHeader.substring("Bearer Bearer ".length);
        console.log(`🔐 [${requestId}] Extracted token from 'Bearer Bearer' format`);
      } else if (authHeader.startsWith("Bearer ")) {
        token = authHeader.substring("Bearer ".length);
        console.log(`🔐 [${requestId}] Extracted token from 'Bearer' format`);
      } else {
        token = authHeader;
        console.log(`🔐 [${requestId}] Using raw auth header as token`);
      }
    }
    
    console.log(`🔐 [${requestId}] Token being verified:`, token ? `${token.substring(0, 10)}...` : 'null');

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log(`✅ [${requestId}] Token verified successfully for user:`, decoded.id);
      console.log(`🔐 [${requestId}] Token payload:`, {
        id: decoded.id,
        iat: decoded.iat,
        exp: decoded.exp,
        expiresAt: new Date(decoded.exp * 1000).toISOString()
      });
    } catch (jwtError) {
      console.error(`❌ [${requestId}] JWT verification failed:`, {
        error: jwtError.message,
        type: jwtError.name,
        token: token ? `${token.substring(0, 10)}...` : 'null'
      });
      throw jwtError;
    }

    // Check if user exists
    console.log(`🔍 [${requestId}] Looking up user in database:`, decoded.id);
    const user = await User.findById(decoded.id);
    if (!user) {
      console.error(`❌ [${requestId}] User not found in database:`, decoded.id);
      throw new AppError("User not found", 404);
    }
    
    console.log(`✅ [${requestId}] User found:`, {
      id: user._id,
      email: user.email,
      name: user.name,
      role: user.role,
      isActive: user.isActive
    });

    // Set user ID and user object in request
    req.userId = user._id.toString();
    req.user = user;
    
    console.log(`✅ [${requestId}] Authentication successful, proceeding to next middleware`);
    next();
  } catch (error) {
    console.error(`❌ [${requestId}] Authentication failed:`, {
      error: error.message,
      type: error.name,
      stack: error.stack,
      path: req.path,
      method: req.method,
      timestamp: new Date().toISOString()
    });
    
    // Determine appropriate status code
    let statusCode = 401;
    if (error.name === 'JsonWebTokenError') {
      statusCode = 401;
    } else if (error.name === 'TokenExpiredError') {
      statusCode = 401;
    } else if (error.message === 'User not found') {
      statusCode = 404;
    }
    
    return res.status(statusCode).json({ 
      success: false, 
      message: error.message || "Not authorized",
      ...(process.env.NODE_ENV === 'development' && { 
        error: error.name,
        requestId: requestId 
      })
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
