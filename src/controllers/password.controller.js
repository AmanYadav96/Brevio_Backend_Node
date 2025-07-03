import User from '../models/user.model.js';
import OTP, { OtpPurpose } from '../models/otp.model.js';
import emailService from '../services/email.service.js';
import { AppError } from '../utils/app-error.js';

/**
 * Request password reset by sending OTP to email
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
export const forgotPassword = async (req, res) => {
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

    // Generate OTP for password reset
    const otp = await OTP.generateOTP(email, "password_reset");

    // Send OTP email
    await emailService.sendOtpEmail({
      to: email,
      name: user.name,
      otp: otp.code,
      purpose: "password_reset"
    });

    return res.status(200).json({
      success: true,
      message: 'Password reset OTP sent to your email'
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to process password reset request'
    });
  }
};

/**
 * Reset password using OTP verification
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
export const resetPassword = async (req, res) => {
  console.log('Password reset API called with email:', req.body.email);
  try {
    const { email, otp, newPassword } = req.body;

    console.log('Reset password request parameters:', { 
      email, 
      otpProvided: !!otp, 
      passwordLength: newPassword?.length 
    });

    if (!email || !otp || !newPassword) {
      console.log('Missing required fields:', { 
        emailProvided: !!email, 
        otpProvided: !!otp, 
        passwordProvided: !!newPassword 
      });
      return res.status(400).json({
        success: false,
        message: 'Email, OTP, and new password are required'
      });
    }

    // Validate password
    if (newPassword.length < 8) {
      console.log('Password validation failed: too short', { length: newPassword.length });
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters long'
      });
    }

    console.log('Attempting to verify OTP for email:', email);
    // Verify OTP
    const verificationResult = await OTP.verifyOTP(
      email,
      otp,
      "password_reset"
    );

    console.log('OTP verification result:', { 
      valid: verificationResult.valid, 
      message: verificationResult.message,
      otpDetails: verificationResult.valid ? {
        id: verificationResult.otp._id,
        createdAt: verificationResult.otp.createdAt,
        expiresAt: verificationResult.otp.expiresAt,
        isExpired: verificationResult.otp.expiresAt < new Date()
      } : null
    });

    if (!verificationResult.valid) {
      return res.status(400).json({
        success: false,
        message: verificationResult.message
      });
    }

    // Find user
    console.log('Looking up user with email:', email);
    const user = await User.findOne({ email }).select('+password');
    
    if (!user) {
      console.log('User not found with email:', email);
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    console.log('User found:', { 
      userId: user._id, 
      name: user.name, 
      hasPassword: !!user.password 
    });

    // Update password
    console.log('Updating password for user:', user._id);
    user.password = newPassword;
    await user.save();
    console.log('Password updated successfully');

    // Mark OTP as used
    console.log('Marking OTP as used');
    await verificationResult.otp.markAsUsed();
    console.log('OTP marked as used successfully');

    return res.status(200).json({
      success: true,
      message: 'Password has been reset successfully'
    });
  } catch (error) {
    console.error('Reset password error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      code: error.code
    });
    return res.status(500).json({
      success: false,
      message: 'Failed to reset password',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};