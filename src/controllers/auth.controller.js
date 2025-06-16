import jwt from 'jsonwebtoken';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithCredential,
  FacebookAuthProvider,
} from "firebase/auth";
import { auth } from "../config/firebase.js";
import User, { UserRole, UserStatus } from "../models/user.model.js";
import OTP, { OtpPurpose } from "../models/otp.model.js";
import { createStripeCustomer } from "../services/stripe.service.js";
import { AppError } from "../utils/app-error.js";
import authService from "../services/auth.service.js";
import emailService from "../services/email.service.js";

export const googleLogin = async (req, res) => {
  try {
    const { idToken } = req.body;
    
    if (!idToken) {
      return res.status(400).json({ success: false, message: "ID token is required" });
    }

    // Create Google credential
    const credential = GoogleAuthProvider.credential(idToken);

    // Sign in with credential - this verifies the token with Firebase
    const result = await signInWithCredential(auth, credential);
    const firebaseUser = result.user;

    // Check if user exists in our database
    let user = await User.findOne({ email: firebaseUser.email });

    if (!user) {
      // Create Stripe customer
      const stripeCustomer = await createStripeCustomer(firebaseUser.email, firebaseUser.displayName || "Google User");

      // Create new user
      user = await User.create({
        name: firebaseUser.displayName || "Google User",
        email: firebaseUser.email,
        firebaseUid: firebaseUser.uid,
        profilePicture: firebaseUser.photoURL || "",
        isEmailVerified: firebaseUser.emailVerified,
        stripeCustomerId: stripeCustomer.id,
      });
    } else {
      // Update Firebase UID if not already set
      if (!user.firebaseUid) {
        user.firebaseUid = firebaseUser.uid;
        await user.save();
      }
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    return res.json({
      success: true,
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        profilePicture: user.profilePicture,
        isEmailVerified: user.isEmailVerified
      }
    });
  } catch (error) {
    console.error("Google login error:", error);
    return res.status(500).json({ 
      success: false, 
      message: error.message || "Google login failed" 
    });
  }
};
export const facebookLogin = async (req, res) => {
  try {
    const { accessToken } = req.body
    
    if (!accessToken) {
      return res.status(400).json({ success: false, message: "Access token is required" })
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

    return res.json({
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
      return res.status(401).json({ success: false, message: "Invalid Facebook token" })
    }
    return res.status(500).json({ success: false, message: "Facebook login failed" })
  }
}

export const becomeCreator = async (req, res) => {
  try {
    const userId = req.user._id
    const { username } = req.body

    // Validate username
    if (!username) {
      return res.status(400).json({
        success: false,
        message: "Username is required to become a creator"
      })
    }

    // Check if username is already taken
    const existingUsername = await User.findOne({ 
      username, 
      _id: { $ne: userId } // Exclude current user
    })
    
    if (existingUsername) {
      return res.status(400).json({
        success: false,
        message: "Username is already taken"
      })
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

    return res.json({
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
      return res.status(error.statusCode).json({ success: false, message: error.message })
    }
    console.error("Become creator error:", error)
    return res.status(500).json({ success: false, message: "Failed to become a creator" })
  }
}

// Register with email and password
export const register = async (req, res) => {
  try {
    const body = req.body
    const { user, token } = await authService.registerWithEmail(body)
    
    return res.json({
      success: true,
      token,
      user
    })
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: req.translate(error.message)
    })
  }
}

// Login with email and password
export const login = async (req, res) => {
  try {
    const { email, password } = req.body
    const { user, token } = await authService.loginWithEmail(email, password)
    
    return res.json({
      success: true,
      token,
      user
    })
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: req.translate(error.message)
    })
  }
}

// Google authentication
export const googleAuthCreator = async (req, res) => {
  try {
    const { idToken, username } = req.body
    
    if (!idToken) {
      return res.status(400).json({ success: false, message: "ID token is required" })
    }
    
    if (!username) {
      return res.status(400).json({ success: false, message: "Username is required for creators" })
    }
    
    // Check if username is already taken
    const existingUser = await User.findOne({ username })
    if (existingUser) {
      return res.status(400).json({ success: false, message: "Username is already taken" })
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
    
    return res.json({
      success: true,
      token,
      user
    })
  } catch (error) {
    console.error("Google auth creator error:", error)
    return res.status(400).json({
      success: false,
      message: error.message || "Google authentication failed"
    })
  }
}

// Facebook authentication
export const facebookAuth = async (req, res) => {
  try {
    const { accessToken } = req.body
    
    if (!accessToken) {
      return res.status(400).json({ success: false, message: "Access token is required" })
    }
    
    const { user, token } = await authService.facebookAuth(accessToken)
    
    return res.json({
      success: true,
      token,
      user
    })
  } catch (error) {
    console.error("Facebook auth error:", error)
    if (error.code === 'auth/invalid-credential') {
      return res.status(401).json({ success: false, message: "Invalid Facebook token" })
    }
    return res.status(400).json({
      success: false,
      message: error.message || "Facebook authentication failed"
    })
  }
}

// Apple authentication
export const appleAuth = async (req, res) => {
  try {
    const { idToken, userData } = req.body
    
    if (!idToken) {
      return res.status(400).json({ success: false, message: "ID token is required" })
    }
    
    const { user, token } = await authService.appleAuth(idToken, userData || {})
    
    return res.json({
      success: true,
      token,
      user
    })
  } catch (error) {
    console.error("Apple auth error:", error)
    if (error.code === 'auth/invalid-credential') {
      return res.status(401).json({ success: false, message: "Invalid Apple token" })
    }
    return res.status(400).json({
      success: false,
      message: error.message || "Apple authentication failed"
    })
  }
}

// Verify email with OTP
export const verifyEmail = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Email and OTP are required'
      });
    }

    // Verify OTP
    const verificationResult = await OTP.verifyOTP(
      email,
      otp,
      "email_verification"
    );

    if (!verificationResult.valid) {
      return res.status(400).json({
        success: false,
        message: verificationResult.message
      });
    }

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update user status to active
    user.status = UserStatus.ACTIVE;
    user.isEmailVerified = true;
    await user.save();

    // Mark OTP as used
    await verificationResult.otp.markAsUsed();

    // Generate token
    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    return res.status(200).json({
      success: true,
      message: 'Email verified successfully',
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        profilePicture: user.profilePicture,
        isEmailVerified: user.isEmailVerified,
        status: user.status
      }
    });
  } catch (error) {
    console.error('Email verification error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to verify email'
    });
  }
};

// Resend verification OTP
export const resendVerificationOTP = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No user found with this email'
      });
    }

    // Check if user is already verified
    if (user.status === UserStatus.ACTIVE && user.isEmailVerified) {
      return res.status(400).json({
        success: false,
        message: 'Email is already verified'
      });
    }

    // Generate OTP for email verification
    const otp = await OTP.generateOTP(email, "email_verification");

    // Send OTP email
    await emailService.sendOtpEmail({
      to: email,
      name: user.name,
      otp: otp.code,
      purpose: "email_verification"
    });

    return res.status(200).json({
      success: true,
      message: 'Verification OTP resent to your email'
    });
  } catch (error) {
    console.error('Resend verification OTP error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to resend verification OTP'
    });
  }
};
