import User, { AuthProvider, UserStatus, UserRole } from "../models/user.model.js"
import OTP, { OtpPurpose } from "../models/otp.model.js"
import emailService from "../services/email.service.js"
import jwt from "jsonwebtoken"
import { 
  GoogleAuthProvider, 
  FacebookAuthProvider, 
  OAuthProvider,
  signInWithCredential 
} from "firebase/auth"
import { auth } from "../config/firebase.js"

export class AuthService {
  // Generate JWT token
  generateToken(userId) {
    return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN
    })
  }

  // Register with email and password
  async registerWithEmail(userData) {
    const { email, password, name, username } = userData

    // Check if user already exists
    const existingUser = await User.findOne({ email })
    if (existingUser) {
      return {
        success: false,
        isAlreadyRegistered: true,
        message: "User already exists with this email"
      }
    }

    // Check if email exists in Firebase
    const existsInFirebase = await this.checkIfEmailExistsInFirebase(email);
    
    // Create new user with default role and INACTIVE status
    const user = await User.create({
      email,
      password,
      name,
      username,
      role: UserRole.USER,
      authProvider: AuthProvider.LOCAL,
      status: UserStatus.INACTIVE,
      // If the email exists in Firebase, mark it as verified
      isEmailVerified: existsInFirebase
    })

    // Generate OTP for email verification (only if not verified in Firebase)
    let otp;
    if (!existsInFirebase) {
      otp = await OTP.generateOTP(email, "email_verification")
      
      // Send OTP email
      await emailService.sendOtpEmail({
        to: email,
        name: user.name,
        otp: otp.code,
        purpose: "email_verification"
      });
    } else {
      // If verified in Firebase, update user status to active
      user.status = UserStatus.ACTIVE;
      await user.save();
      
      console.log(`User already verified in Firebase, skipping OTP email for ${email}`);
    }

    // Send welcome email
    await emailService.sendWelcomeEmail({
      to: email,
      name: user.name
    });

    // Generate token
    const token = this.generateToken(user._id)

    return { 
      success: true,
      isAlreadyRegistered: false,
      user, 
      token,
      isVerifiedInFirebase: existsInFirebase
    }
  }

  // Login with email and password
  async loginWithEmail(email, password) {
    // Find user and include password for verification
    const user = await User.findOne({ email }).select("+password")
    
    if (!user || !(await user.comparePassword(password))) {
      throw new Error("Invalid email or password")
    }

    if (user.status === UserStatus.INACTIVE) {
      throw new Error("Please verify your email address before logging in")
    } else if (user.status !== UserStatus.ACTIVE) {
      throw new Error(`Your account is ${user.status}`)
    }

    // Generate token
    const token = this.generateToken(user._id)

    // Remove password from response
    user.password = undefined

    return { user, token }
  }

  // Google authentication with Firebase
  async googleAuth(idToken) {
    try {
      // Create Google credential
      const credential = GoogleAuthProvider.credential(idToken)

      // Sign in with credential
      const result = await signInWithCredential(auth, credential)
      const firebaseUser = result.user

      // Get user data
      const { uid: googleId, email, displayName: name, photoURL: picture } = firebaseUser

      // Check if user exists
      let user = await User.findOne({ email })

      if (user) {
        // Update Google profile if user exists
        user.socialProfiles = user.socialProfiles || {}
        user.socialProfiles.google = {
          id: googleId,
          email,
          name,
          picture
        }
        
        if (!user.profilePicture && picture) {
          user.profilePicture = picture
        }
        
        // Update Firebase UID if not already set
        if (!user.firebaseUid) {
          user.firebaseUid = firebaseUser.uid
        }
        
        await user.save()
      } else {
        // Create new user if doesn't exist
        user = await User.create({
          email,
          name: name || email.split('@')[0],
          username: email.split('@')[0] + Math.floor(Math.random() * 1000), // Generate a default username
          profilePicture: picture || "",
          authProvider: AuthProvider.GOOGLE,
          isEmailVerified: firebaseUser.emailVerified,
          firebaseUid: firebaseUser.uid,
          socialProfiles: {
            google: {
              id: googleId,
              email,
              name,
              picture
            }
          }
        })
      }

      // Generate token
      const token = this.generateToken(user._id)

      return { user, token }
    } catch (error) {
      console.error("Google auth error:", error)
      throw new Error("Google authentication failed: " + error.message)
    }
  }

  // Facebook authentication with Firebase
  async facebookAuth(accessToken) {
    try {
      // Create Facebook credential
      const credential = FacebookAuthProvider.credential(accessToken)

      // Sign in with credential
      const result = await signInWithCredential(auth, credential)
      const firebaseUser = result.user

      // Get user data
      const { uid: facebookId, email, displayName: name, photoURL: picture } = firebaseUser
      
      if (!email) {
        throw new Error("Email not provided by Facebook")
      }

      // Check if user exists
      let user = await User.findOne({ email })

      if (user) {
        // Update Facebook profile if user exists
        user.socialProfiles = user.socialProfiles || {}
        user.socialProfiles.facebook = {
          id: facebookId,
          email,
          name,
          picture
        }
        
        if (!user.profilePicture && picture) {
          user.profilePicture = picture
        }
        
        // Update Firebase UID if not already set
        if (!user.firebaseUid) {
          user.firebaseUid = firebaseUser.uid
        }
        
        await user.save()
      } else {
        // Create new user if doesn't exist
        user = await User.create({
          email,
          name: name || email.split('@')[0],
          profilePicture: picture || "",
          authProvider: AuthProvider.FACEBOOK,
          isEmailVerified: firebaseUser.emailVerified,
          firebaseUid: firebaseUser.uid,
          socialProfiles: {
            facebook: {
              id: facebookId,
              email,
              name,
              picture
            }
          }
        })
      }

      // Generate token
      const token = this.generateToken(user._id)

      return { user, token }
    } catch (error) {
      console.error("Facebook auth error:", error)
      throw new Error("Facebook authentication failed: " + error.message)
    }
  }

  // Apple authentication with Firebase
  async appleAuth(idToken, userData) {
    try {
      // Create Apple credential
      const provider = new OAuthProvider('apple.com')
      const credential = provider.credential({
        idToken: idToken,
        rawNonce: userData.nonce // Include nonce if available
      })

      // Sign in with credential
      const result = await signInWithCredential(auth, credential)
      const firebaseUser = result.user

      // Get user data
      const { uid: appleId, email, displayName } = firebaseUser
      
      // Apple might not return email on subsequent logins
      if (!email && !userData.email) {
        throw new Error("Email not provided by Apple")
      }

      const userEmail = email || userData.email
      const userName = displayName || userData.name || userEmail.split('@')[0]

      // Check if user exists
      let user = await User.findOne({ email: userEmail })
      const isAlreadyRegistered = !!user

      if (user) {
        // Update Apple profile if user exists
        user.socialProfiles = user.socialProfiles || {}
        user.socialProfiles.apple = {
          id: appleId,
          email: userEmail,
          name: userName
        }
        if(!user.username){
          user.username = userName
        }
        // Update Firebase UID if not already set
        if (!user.firebaseUid) {
          user.firebaseUid = firebaseUser.uid
        }
        
        await user.save()
      } else {
        // Create new user if doesn't exist
        user = await User.create({
          email: userEmail,
          name: userName || displayName,
          username: userEmail.split('@')[0] + Math.floor(Math.random() * 1000), // Generate a default username
          authProvider: AuthProvider.APPLE,
          isEmailVerified: firebaseUser.emailVerified,
          firebaseUid: firebaseUser.uid,
          socialProfiles: {
            apple: {
              id: appleId,
              email: userEmail,
              name: userName
            }
          }
        })
      }

      // Generate token
      const token = this.generateToken(user._id)

      return { user, token, isAlreadyRegistered }
    } catch (error) {
      console.error("Apple auth error:", error)
      throw new Error("Apple authentication failed: " + error.message)
    }
  }
  async checkIfEmailExistsInFirebase(email) {
    try {
      const signInMethods = await adminAuth.fetchSignInMethodsForEmail(email);
      return signInMethods.length > 0;
    } catch (error) {
      console.error("Error checking if email exists in Firebase:", error);
      return false; // Default to false if there's an error
    }
  }
}


export default new AuthService()


// Add this function to AuthService class
