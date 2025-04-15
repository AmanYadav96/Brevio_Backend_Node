import { verify } from "hono/jwt"
import User from "../models/user.model.js"
import { auth } from "../config/firebase.js"
import { AppError } from "../utils/app-error.js"

export const protect = async (c, next) => {
  try {
    // Get token from header
    const authHeader = c.req.header("Authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new AppError("Not authorized, no token", 401)
    }

    const token = authHeader.split(" ")[1]

    // Verify token
    const decoded = await verify(token, process.env.JWT_SECRET)

    // Check if user exists
    const user = await User.findById(decoded.id)
    if (!user) {
      throw new AppError("User not found", 404)
    }

    // Set user ID in context
    c.set("userId", user._id.toString())

    await next()
  } catch (error) {
    if (error instanceof AppError) {
      return c.json({ success: false, message: error.message }, error.statusCode)
    }
    return c.json({ success: false, message: "Not authorized" }, 401)
  }
}

export const restrictTo = (...roles) => {
  return async (c, next) => {
    try {
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
