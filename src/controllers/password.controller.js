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
    const otp = await OTP.generateOTP(email, OtpPurpose.PASSWORD_RESET);

    // Send OTP email
    await emailService.sendOtpVerificationEmail({
      to: email,
      name: user.name,
      otp: otp.code
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
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Email, OTP, and new password are required'
      });
    }

    // Validate password
    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters long'
      });
    }

    // Verify OTP
    const verificationResult = await OTP.verifyOTP(
      email,
      otp,
      OtpPurpose.PASSWORD_RESET
    );

    if (!verificationResult.valid) {
      return res.status(400).json({
        success: false,
        message: verificationResult.message
      });
    }

    // Find user
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    // Mark OTP as used
    await verificationResult.otp.markAsUsed();

    return res.status(200).json({
      success: true,
      message: 'Password has been reset successfully'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to reset password'
    });
  }
};