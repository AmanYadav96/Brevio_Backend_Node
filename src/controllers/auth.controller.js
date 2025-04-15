import { sign } from "hono/jwt"
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithCredential,
  FacebookAuthProvider,
} from "firebase/auth"
import { auth } from "../config/firebase.js"
import User, { UserRole } from "../models/user.model.js"
import { createStripeCustomer } from "../services/stripe.service.js"
import { AppError } from "../utils/app-error.js"

export const register = async (c) => {
  try {
    const { name, email, password } = await c.req.json()

    // Check if user already exists
    const existingUser = await User.findOne({ email })
    if (existingUser) {
      throw new AppError("User already exists with this email", 400)
    }

    // Create user in Firebase
    const firebaseUser = await createUserWithEmailAndPassword(auth, email, password)

    // Create Stripe customer
    // const stripeCustomer = await createStripeCustomer(email, name)

    // Create user in MongoDB
    const user = await User.create({
      name,
      email,
      password,
      firebaseUid: firebaseUser.user.uid,
      // stripeCustomerId: stripeCustomer.id,
      isEmailVerified: firebaseUser.user.emailVerified,
    })

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
    if (error instanceof AppError) {
      return c.json({ success: false, message: error.message }, error.statusCode)
    }
    console.error("Registration error:", error)
    return c.json({ success: false, message: "Registration failed" }, 500)
  }
}

export const login = async (c) => {
  try {
    const { email, password } = await c.req.json()

    // Find user in MongoDB
    const user = await User.findOne({ email }).select("+password")
    if (!user) {
      throw new AppError("Invalid credentials", 401)
    }

    // If user has password (not social login only), verify it
    if (user.password) {
      const isMatch = await user.comparePassword(password)
      if (!isMatch) {
        throw new AppError("Invalid credentials", 401)
      }
    } else {
      // If user doesn't have a password, they must use social login
      throw new AppError("Please use social login for this account", 400)
    }

    // Sign in with Firebase
    await signInWithEmailAndPassword(auth, email, password)

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
    if (error instanceof AppError) {
      return c.json({ success: false, message: error.message }, error.statusCode)
    }
    console.error("Login error:", error)
    return c.json({ success: false, message: "Login failed" }, 500)
  }
}

export const googleLogin = async (c) => {
  try {
    const { idToken } = await c.req.json()

    // Create Google credential
    const credential = GoogleAuthProvider.credential(idToken)

    // Sign in with credential
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
    return c.json({ success: false, message: "Google login failed" }, 500)
  }
}

export const facebookLogin = async (c) => {
  try {
    const { accessToken } = await c.req.json()

    // Create Facebook credential
    const credential = FacebookAuthProvider.credential(accessToken)

    // Sign in with credential
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
    return c.json({ success: false, message: "Facebook login failed" }, 500)
  }
}

export const becomeCreator = async (c) => {
  try {
    const userId = c.get("userId")

    // Find user
    const user = await User.findById(userId)
    if (!user) {
      throw new AppError("User not found", 404)
    }

    // Update user role to creator
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
