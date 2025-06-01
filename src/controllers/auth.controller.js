import { sign } from "hono/jwt"
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithCredential,
  FacebookAuthProvider,
} from "firebase/auth"
// Change the import to match the export
import { auth } from "../config/firebase.js"
import User, { UserRole } from "../models/user.model.js"
import { createStripeCustomer } from "../services/stripe.service.js"
import { AppError } from "../utils/app-error.js"
import authService from "../services/auth.service.js"



export const googleLogin = async (c) => {
  try {
    const { idToken } = await c.req.json()
    
    if (!idToken) {
      return c.json({ success: false, message: "ID token is required" }, 400)
    }

    // Create Google credential
    const credential = GoogleAuthProvider.credential(idToken)

    // Sign in with credential - this verifies the token with Firebase
    const result = await signInWithCredential(auth, credential)
    const firebaseUser = result.user

    // Check if user exists in our database
    let user = await User.findOne({ email: firebaseUser.email })

    if (!user) {
      // Create Stripe customer
      const stripeCustomer = await createStripeCustomer(firebaseUser.email, firebaseUser.displayName || "Google User")

      // Create new user
      user = await User.create({
        name: firebaseUser.displayName || "Google User",
        email: firebaseUser.email,
        firebaseUid: firebaseUser.uid,
        profilePicture: firebaseUser.photoURL || "",
        isEmailVerified: firebaseUser.emailVerified,
        stripeCustomerId: stripeCustomer.id,
      })
    } else {
      // Update Firebase UID if not already set
      if (!user.firebaseUid) {
        user.firebaseUid = firebaseUser.uid
        await user.save()
      }
    }

    // Generate JWT token
    const token = await sign({ id: user._id }, process.env.JWT_SECRET)

    return c.json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        profilePicture: user.profilePicture,
      },
    })
  } catch (error) {
    console.error("Google login error:", error)
    if (error.code === 'auth/invalid-credential') {
      return c.json({ success: false, message: "Invalid Google token" }, 401)
    }
    return c.json({ success: false, message: "Google login failed" }, 500)
  }
}

export const facebookLogin = async (c) => {
  try {
    const { accessToken } = await c.req.json()
    
    if (!accessToken) {
      return c.json({ success: false, message: "Access token is required" }, 400)
    }

    // Create Facebook credential
    const credential = FacebookAuthProvider.credential(accessToken)

    // Sign in with credential - this verifies the token with Firebase
    const result = await signInWithCredential(auth, credential)
    const firebaseUser = result.user

    // Check if user exists in our database
    let user = await User.findOne({ email: firebaseUser.email })

    if (!user) {
      // Create Stripe customer
      const stripeCustomer = await createStripeCustomer(firebaseUser.email, firebaseUser.displayName || "Facebook User")

      // Create new user
      user = await User.create({
        name: firebaseUser.displayName || "Facebook User",
        email: firebaseUser.email,
        firebaseUid: firebaseUser.uid,
        profilePicture: firebaseUser.photoURL || "",
        isEmailVerified: firebaseUser.emailVerified,
        stripeCustomerId: stripeCustomer.id,
      })
    } else {
      // Update Firebase UID if not already set
      if (!user.firebaseUid) {
        user.firebaseUid = firebaseUser.uid
        await user.save()
      }
    }

    // Generate JWT token
    const token = await sign({ id: user._id }, process.env.JWT_SECRET)

    return c.json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        profilePicture: user.profilePicture,
      },
    })
  } catch (error) {
    console.error("Facebook login error:", error)
    if (error.code === 'auth/invalid-credential') {
      return c.json({ success: false, message: "Invalid Facebook token" }, 401)
    }
    return c.json({ success: false, message: "Facebook login failed" }, 500)
  }
}

export const becomeCreator = async (c) => {
  try {
    const userId = c.get("userId")
    const { username } = await c.req.json()

    // Validate username
    if (!username) {
      return c.json({
        success: false,
        message: "Username is required to become a creator"
      }, 400)
    }

    // Check if username is already taken
    const existingUsername = await User.findOne({ 
      username, 
      _id: { $ne: userId } // Exclude current user
    })
    
    if (existingUsername) {
      return c.json({
        success: false,
        message: "Username is already taken"
      }, 400)
    }

    // Find user
    const user = await User.findById(userId)
    if (!user) {
      throw new AppError("User not found", 404)
    }

    // Update user role to creator and set username
    user.username = username
    user.role = UserRole.CREATOR
    await user.save()

    return c.json({
      success: true,
      message: "Successfully upgraded to creator account",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        username: user.username,
        profilePicture: user.profilePicture,
      },
    })
  } catch (error) {
    if (error instanceof AppError) {
      return c.json({ success: false, message: error.message }, error.statusCode)
    }
    console.error("Become creator error:", error)
    return c.json({ success: false, message: "Failed to become a creator" }, 500)
  }
}

// Register with email and password
export const register = async (c) => {
  try {
    const body = await c.req.json()
    const { user, token } = await authService.registerWithEmail(body)
    
    return c.json({
      success: true,
      token,
      user
    })
  } catch (error) {
    return c.json({
      success: false,
      message: error.message
    }, 400)
  }
}

// Login with email and password
export const login = async (c) => {
  try {
    const { email, password } = await c.req.json()
    const { user, token } = await authService.loginWithEmail(email, password)
    
    return c.json({
      success: true,
      token,
      user
    })
  } catch (error) {
    return c.json({
      success: false,
      message: error.message
    }, 401)
  }
}

// Google authentication
export const googleAuthCreator = async (c) => {
  try {
    const { idToken, username } = await c.req.json()
    
    if (!idToken) {
      return c.json({ success: false, message: "ID token is required" }, 400)
    }
    
    if (!username) {
      return c.json({ success: false, message: "Username is required for creators" }, 400)
    }
    
    // Check if username is already taken
    const existingUser = await User.findOne({ username })
    if (existingUser) {
      return c.json({ success: false, message: "Username is already taken" }, 400)
    }
    
    // Use the existing googleAuth but add username
    const result = await signInWithCredential(auth, GoogleAuthProvider.credential(idToken))
    const firebaseUser = result.user
    
    // Check if user exists
    let user = await User.findOne({ email: firebaseUser.email })
    
    if (user) {
      // Update existing user
      user.username = username
      user.role = UserRole.CREATOR
      // Other updates as in googleAuth
      await user.save()
    } else {
      // Create new user with username and creator role
      user = await User.create({
        email: firebaseUser.email,
        name: firebaseUser.displayName || firebaseUser.email.split('@')[0],
        username: username,
        role: UserRole.CREATOR,
        profilePicture: firebaseUser.photoURL || "",
        authProvider: AuthProvider.GOOGLE,
        isEmailVerified: firebaseUser.emailVerified,
        firebaseUid: firebaseUser.uid,
        // Other fields as in googleAuth
      })
    }
    
    const token = await sign({ id: user._id }, process.env.JWT_SECRET)
    
    return c.json({
      success: true,
      token,
      user
    })
  } catch (error) {
    console.error("Google auth creator error:", error)
    return c.json({
      success: false,
      message: error.message || "Google authentication failed"
    }, 400)
  }
}

// Facebook authentication
export const facebookAuth = async (c) => {
  try {
    const { accessToken } = await c.req.json()
    
    if (!accessToken) {
      return c.json({ success: false, message: "Access token is required" }, 400)
    }
    
    const { user, token } = await authService.facebookAuth(accessToken)
    
    return c.json({
      success: true,
      token,
      user
    })
  } catch (error) {
    console.error("Facebook auth error:", error)
    if (error.code === 'auth/invalid-credential') {
      return c.json({ success: false, message: "Invalid Facebook token" }, 401)
    }
    return c.json({
      success: false,
      message: error.message || "Facebook authentication failed"
    }, 400)
  }
}

// Apple authentication
export const appleAuth = async (c) => {
  try {
    const { idToken, userData } = await c.req.json()
    
    if (!idToken) {
      return c.json({ success: false, message: "ID token is required" }, 400)
    }
    
    const { user, token } = await authService.appleAuth(idToken, userData || {})
    
    return c.json({
      success: true,
      token,
      user
    })
  } catch (error) {
    console.error("Apple auth error:", error)
    if (error.code === 'auth/invalid-credential') {
      return c.json({ success: false, message: "Invalid Apple token" }, 401)
    }
    return c.json({
      success: false,
      message: error.message || "Apple authentication failed"
    }, 400)
  }
}
