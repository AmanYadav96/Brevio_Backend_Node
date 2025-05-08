import User, { AuthProvider, UserStatus } from "../models/user.model.js"
import jwt from "jsonwebtoken"
import { OAuth2Client } from "google-auth-library"
import axios from "axios"
import { verifyAppleToken } from "../utils/appleAuth.js"

// Initialize Google OAuth client
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID)

export class AuthService {
  // Generate JWT token
  generateToken(userId) {
    return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN
    })
  }

  // Register with email and password
  async registerWithEmail(userData) {
    const { email, password, name } = userData

    // Check if user already exists
    const existingUser = await User.findOne({ email })
    if (existingUser) {
      throw new Error("User already exists with this email")
    }

    // Create new user
    const user = await User.create({
      email,
      password,
      name,
      authProvider: AuthProvider.LOCAL
    })

    // Generate token
    const token = this.generateToken(user._id)

    return { user, token }
  }

  // Login with email and password
  async loginWithEmail(email, password) {
    // Find user and include password for verification
    const user = await User.findOne({ email }).select("+password")
    
    if (!user || !(await user.comparePassword(password))) {
      throw new Error("Invalid email or password")
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new Error(`Your account is ${user.status}`)
    }

    // Generate token
    const token = this.generateToken(user._id)

    // Remove password from response
    user.password = undefined

    return { user, token }
  }

  // Google authentication
  async googleAuth(idToken) {
    try {
      // Verify the token
      const ticket = await googleClient.verifyIdToken({
        idToken,
        audience: process.env.GOOGLE_CLIENT_ID
      })

      const payload = ticket.getPayload()
      const { email, name, picture, sub: googleId } = payload

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
        
        await user.save()
      } else {
        // Create new user if doesn't exist
        user = await User.create({
          email,
          name,
          profilePicture: picture || "",
          authProvider: AuthProvider.GOOGLE,
          isEmailVerified: true,
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
      throw new Error("Google authentication failed: " + error.message)
    }
  }

  // Facebook authentication
  async facebookAuth(accessToken) {
    try {
      // Get user data from Facebook
      const response = await axios.get(
        `https://graph.facebook.com/me?fields=id,name,email,picture&access_token=${accessToken}`
      )

      const { id: facebookId, email, name, picture } = response.data
      
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
          picture: picture?.data?.url
        }
        
        if (!user.profilePicture && picture?.data?.url) {
          user.profilePicture = picture.data.url
        }
        
        await user.save()
      } else {
        // Create new user if doesn't exist
        user = await User.create({
          email,
          name,
          profilePicture: picture?.data?.url || "",
          authProvider: AuthProvider.FACEBOOK,
          isEmailVerified: true,
          socialProfiles: {
            facebook: {
              id: facebookId,
              email,
              name,
              picture: picture?.data?.url
            }
          }
        })
      }

      // Generate token
      const token = this.generateToken(user._id)

      return { user, token }
    } catch (error) {
      throw new Error("Facebook authentication failed: " + error.message)
    }
  }

  // Apple authentication
  async appleAuth(idToken, userData) {
    try {
      // Verify Apple ID token
      const appleUserData = await verifyAppleToken(idToken)
      const { sub: appleId, email } = appleUserData
      
      // Apple might not return email on subsequent logins
      if (!email && !userData.email) {
        throw new Error("Email not provided by Apple")
      }

      const userEmail = email || userData.email
      const userName = userData.name || email.split('@')[0]

      // Check if user exists
      let user = await User.findOne({ email: userEmail })

      if (user) {
        // Update Apple profile if user exists
        user.socialProfiles = user.socialProfiles || {}
        user.socialProfiles.apple = {
          id: appleId,
          email: userEmail,
          name: userName
        }
        
        await user.save()
      } else {
        // Create new user if doesn't exist
        user = await User.create({
          email: userEmail,
          name: userName,
          authProvider: AuthProvider.APPLE,
          isEmailVerified: true,
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

      return { user, token }
    } catch (error) {
      throw new Error("Apple authentication failed: " + error.message)
    }
  }
}

export default new AuthService()