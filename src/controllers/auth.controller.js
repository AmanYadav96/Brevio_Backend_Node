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
// Add this import at the top of the file
import { isIpFromSpain } from '../utils/geolocation.js';

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

// Then modify the becomeCreator function
export const becomeCreator = async (req, res) => {
  try {
    const userId = req.user._id
    const { username, bio } = req.body

    // Get client IP address
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    
    // Check if user is from Spain
    if (!isIpFromSpain(ip)) {
      return res.status(403).json({
        success: false,
        message: "Creator registration is only available for users from Spain"
      });
    }

    // Username and bio are optional - sanitize if provided
    let sanitizedUsername = null;
    if (username && username.trim()) {
      sanitizedUsername = username.trim();
      
      // Check if username is already taken by another user
      const existingUsername = await User.findOne({ 
        username: sanitizedUsername
      })
      
      // If username exists and it's not the current user, it's taken
       if (existingUsername && existingUsername._id.toString() !== userId.toString()) {
         return res.status(400).json({
           success: false,
           message: "Username is already taken"
         })
       }
    }

    // Find user
    const user = await User.findById(userId)
    if (!user) {
      throw new AppError("User not found", 404)
    }

    // Update user role to creator and set optional fields
    if (sanitizedUsername) {
      user.username = sanitizedUsername;
    }
    if (bio !== undefined) {
      user.bio = bio || ''; // Allow empty string for bio
    }
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
        username: user.username || null,
        bio: user.bio || null,
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
    // Console logs to print all incoming request data
    console.log('=== REGISTER USER REQUEST DATA ===');
    console.log('Request Body:', JSON.stringify(req.body, null, 2));
    console.log('Request Headers:', JSON.stringify(req.headers, null, 2));
    console.log('Request Query Parameters:', JSON.stringify(req.query, null, 2));
    console.log('Request Params:', JSON.stringify(req.params, null, 2));
    console.log('Request Method:', req.method);
    console.log('Request URL:', req.url);
    console.log('Request IP:', req.ip || req.connection.remoteAddress);
    console.log('User Agent:', req.get('User-Agent'));
    console.log('Content-Type:', req.get('Content-Type'));
    console.log('Request Files (if any):', req.files);
    console.log('Request Cookies:', req.cookies);
    console.log('=== END REQUEST DATA ===');
    
    const body = req.body
    const result = await authService.registerWithEmail(body)
    
    if (!result.success) {
      return res.status(400).json({
        success: false,
        isAlreadyRegistered: result.isAlreadyRegistered,
        message: req.translate(result.message)
      })
    }
    
    return res.json({
      success: true,
      isAlreadyRegistered: false,
      token: result.token,
      user: result.user
    })
  } catch (error) {
    console.log('=== REGISTER ERROR ===');
    console.log('Error:', error);
    console.log('Error Message:', error.message);
    console.log('Error Stack:', error.stack);
    console.log('=== END ERROR ===');
    
    return res.status(400).json({
      success: false,
      isAlreadyRegistered: false,
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
// Modify the googleAuthCreator function
export const googleAuthCreator = async (req, res) => {
  try {
    // Get client IP address
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    
    // Check if user is from Spain
    if (!isIpFromSpain(ip)) {
      return res.status(403).json({
        success: false,
        message: "Creator registration is only available for users from Spain"
      });
    }
    
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
    
    const { user, token , isAlreadyRegistered} = await authService.appleAuth(idToken, userData || {})
    
    return res.json({
      success: true,
      token,
      user,
      isAlreadyRegistered
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

/**
 * Resend OTP for various purposes (email verification, password reset, etc.)
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
export const resendOTP = async (req, res) => {
  try {
    const { email, purpose } = req.body;

    // Validate required fields
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    if (!purpose) {
      return res.status(400).json({
        success: false,
        message: 'Purpose is required'
      });
    }

    // Validate purpose
    const validPurposes = ['email_verification', 'password_reset'];
    if (!validPurposes.includes(purpose)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid purpose. Valid purposes are: ' + validPurposes.join(', ')
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

    // Additional validation for email verification
    if (purpose === 'email_verification') {
      if (user.status === UserStatus.ACTIVE && user.isEmailVerified) {
        return res.status(400).json({
          success: false,
          message: 'Email is already verified'
        });
      }
    }

    // Generate OTP
    const otp = await OTP.generateOTP(email, purpose);

    // Send OTP email
    await emailService.sendOtpEmail({
      to: email,
      name: user.name,
      otp: otp.code,
      purpose: purpose
    });

    // Prepare response message based on purpose
    const messages = {
      'email_verification': 'Email verification OTP resent to your email',
      'password_reset': 'Password reset OTP resent to your email'
    };

    return res.status(200).json({
      success: true,
      message: messages[purpose]
    });
  } catch (error) {
    console.error('Resend OTP error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to resend OTP'
    });
  }
};
