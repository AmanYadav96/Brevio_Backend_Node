import { verify } from "hono/jwt"
import User from "../models/user.model.js"
import { auth } from "../config/firebase.js"
import { AppError } from "../utils/app-error.js"

export const protect = async (c, next) => {
  try {
    // Get token from header
    const authHeader = c.req.header("Authorization")
    
    // Debug the received header
    console.log("Auth header received:", authHeader)
    
    let token;
    
    if (!authHeader) {
      // Check if token is passed directly in the request body or query
      const body = await c.req.json().catch(() => ({}));
      token = body.token || c.req.query('token');
      
      if (!token) {
        throw new AppError("Not authorized, no token", 401)
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
    const decoded = await verify(token, process.env.JWT_SECRET)
    console.log("Decoded token:", decoded);

    // Check if user exists
    const user = await User.findById(decoded.id)
    if (!user) {
      throw new AppError("User not found", 404)
    }

    // Set user ID and user object in context
    c.set("userId", user._id.toString())
    c.set("user", user)
    
    // Log additional debug information
    console.log("User set in context:", {
      id: user._id.toString(),
      role: user.role,
      email: user.email
    });
    console.log("Request path:", c.req.path);

    // Skip role check for profile routes
    if (c.req.path.includes('/profile')) {
      console.log("Profile route detected - skipping role check");
    }

    await next()
  } catch (error) {
    console.error("Auth middleware error:", error)
    if (error instanceof AppError) {
      return c.json({ success: false, message: error.message }, error.statusCode)
    }
    return c.json({ success: false, message: "Not authorized: " + error.message }, 401)
  }
}

export const restrictTo = (...roles) => {
  return async (c, next) => {
    try {
      // Skip role check for profile routes
      if (c.req.path.includes('/profile')) {
        console.log("Profile route in restrictTo - bypassing role check");
        return await next();
      }
      
      const userId = c.get("userId")

      // Find user
      const user = await User.findById(userId)
      if (!user) {
        throw new AppError("User not found", 404)
      }

      // Check if user has required role
      if (!roles.includes(user.role)) {
        throw new AppError("Not authorized to access this route", 403)
      }

      await next()
    } catch (error) {
      if (error instanceof AppError) {
        return c.json({ success: false, message: error.message }, error.statusCode)
      }
      return c.json({ success: false, message: "Not authorized" }, 403)
    }
  }
}

// Add this export
export const adminAuthMiddleware = async (c, next) => {
  try {
    const token = c.req.header("Authorization")?.replace("Bearer ", "")
    
    if (!token) {
      throw new AppError("No token provided", 401)
    }

    try {
      const decodedToken = await auth.verifyIdToken(token)
      if (!decodedToken.admin) {
        throw new AppError("Admin access required", 403)
      }
      c.set("user", decodedToken)
    } catch (error) {
      throw new AppError("Invalid token", 401)
    }

    await next()
  } catch (error) {
    if (error instanceof AppError) {
      throw error
    }
    throw new AppError(error.message, 401)
  }
}
