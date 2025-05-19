import nodemailer from 'nodemailer';

class EmailService {
  constructor() {
    // Create reusable transporter
    this.transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: process.env.EMAIL_PORT || 587,
      secure: process.env.EMAIL_SECURE === 'true',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      }
    });
  }
  
  /**
   * Send creator contract email
   * @param {Object} options Email options
   * @returns {Promise<Object>} Email send result
   */
  async sendCreatorContractEmail(options) {
    try {
      const { to, userName, contractId, contractUrl } = options;
      
      // Send mail with defined transport object
      const info = await this.transporter.sendMail({
        from: `"Brevio Team" <${process.env.EMAIL_FROM || 'noreply@brevio.com'}>`,
        to,
        subject: 'Your Brevio Creator Contract',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Welcome to Brevio Creator Program!</h2>
            <p>Hello ${userName},</p>
            <p>Congratulations on becoming a Brevio creator! We're excited to have you join our platform.</p>
            <p>Please find attached your creator contract. Review it carefully and keep it for your records.</p>
            <p>You can also view your contract online by clicking the button below:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${contractUrl}" style="background-color: #4CAF50; color: white; padding: 12px 20px; text-decoration: none; border-radius: 4px; font-weight: bold;">
                View Contract
              </a>
            </div>
            <p>If you have any questions about your contract or creator account, please contact our support team.</p>
            <p>Best regards,<br>The Brevio Team</p>
          </div>
        `,
        attachments: [
          {
            filename: 'creator-contract.pdf',
            path: contractUrl
          }
        ]
      });
      
      console.log('Creator contract email sent:', info.messageId);
      return info;
    } catch (error) {
      console.error('Error sending creator contract email:', error);
      throw error;
    }
  }
  
  /**
   * Send contract email
   * @param {Object} options Email options
   * @returns {Promise<Object>} Email send result
   */
  async sendContractEmail(options) {
    try {
      const { to, userName, contractId, contractTitle, contractUrl, contractType } = options;
      
      // Format contract type for display
      const formattedContractType = contractType.charAt(0).toUpperCase() + contractType.slice(1);
      
      // Send mail with defined transport object
      const info = await this.transporter.sendMail({
        from: `"Brevio Team" <${process.env.EMAIL_FROM || 'noreply@brevio.com'}>`,
        to,
        subject: `Your Brevio ${formattedContractType} Contract: ${contractTitle}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Brevio Contract Agreement</h2>
            <p>Hello ${userName},</p>
            <p>A new contract has been created for you on the Brevio platform.</p>
            <p><strong>Contract Title:</strong> ${contractTitle}</p>
            <p><strong>Contract Type:</strong> ${formattedContractType}</p>
            <p>Please review the attached contract carefully. You can also view and sign your contract online by clicking the button below:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL}/contracts/${contractId}" style="background-color: #4CAF50; color: white; padding: 12px 20px; text-decoration: none; border-radius: 4px; font-weight: bold;">
                View Contract
              </a>
            </div>
            <p>If you have any questions about this contract, please contact our support team.</p>
            <p>Best regards,<br>The Brevio Team</p>
          </div>
        `,
        attachments: contractUrl ? [
          {
            filename: `${formattedContractType}_Contract_${contractId}.pdf`,
            path: contractUrl
          }
        ] : []
      });
      
      console.log('Contract email sent:', info.messageId);
      return info;
    } catch (error) {
      console.error('Error sending contract email:', error);
      throw error;
    }
  }
  
  /**
   * Send content uploaded email to creator
   * @param {Object} options Email options
   * @returns {Promise<Object>} Email send result
   */
  async sendContentUploadedEmail(options) {
    try {
      const { to, userName, contentTitle, contentType, contentId, isAutoApproved } = options;
      
      // Format content type for display
      const formattedContentType = contentType
        .replace(/([A-Z])/g, ' $1')
        .trim()
        .toLowerCase()
        .replace(/^./, str => str.toUpperCase());
      
      // Send mail with defined transport object
      const info = await this.transporter.sendMail({
        from: `"Brevio Team" <${process.env.EMAIL_FROM || 'noreply@brevio.com'}>`,
        to,
        subject: `Your ${formattedContentType} Has Been ${isAutoApproved ? 'Published' : 'Submitted'}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Content ${isAutoApproved ? 'Published' : 'Submitted'} Successfully</h2>
            <p>Hello ${userName},</p>
            <p>Your ${formattedContentType} titled "${contentTitle}" has been ${isAutoApproved ? 'published' : 'submitted for review'}.</p>
            ${isAutoApproved ? 
              `<p>Your content is now live on the platform and available to viewers.</p>` : 
              `<p>Our team will review your submission and get back to you shortly. You'll receive another email once the review is complete.</p>`
            }
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL}/creator/content/${contentId}" style="background-color: #4CAF50; color: white; padding: 12px 20px; text-decoration: none; border-radius: 4px; font-weight: bold;">
                View Content
              </a>
            </div>
            <p>Thank you for contributing to the Brevio platform!</p>
            <p>Best regards,<br>The Brevio Team</p>
          </div>
        `
      });
      
      console.log('Content uploaded email sent:', info.messageId);
      return info;
    } catch (error) {
      console.error('Error sending content uploaded email:', error);
      throw error;
    }
  }
  
  /**
   * Send content review notification email to admins
   * @param {Object} options Email options
   * @returns {Promise<Object>} Email send result
   */
  async sendContentReviewNotificationEmail(options) {
    try {
      const { to, adminName, creatorName, contentTitle, contentType, contentId } = options;
      
      // Format content type for display
      const formattedContentType = contentType
        .replace(/([A-Z])/g, ' $1')
        .trim()
        .toLowerCase()
        .replace(/^./, str => str.toUpperCase());
      
      // Send mail with defined transport object
      const info = await this.transporter.sendMail({
        from: `"Brevio Team" <${process.env.EMAIL_FROM || 'noreply@brevio.com'}>`,
        to,
        subject: `New Content Submission: ${contentTitle}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>New Content Submission</h2>
            <p>Hello ${adminName},</p>
            <p>A new ${formattedContentType} has been submitted for review.</p>
            <p><strong>Title:</strong> ${contentTitle}</p>
            <p><strong>Creator:</strong> ${creatorName}</p>
            <p><strong>Content Type:</strong> ${formattedContentType}</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL}/admin/content/review/${contentId}" style="background-color: #4CAF50; color: white; padding: 12px 20px; text-decoration: none; border-radius: 4px; font-weight: bold;">
                Review Content
              </a>
            </div>
            <p>Please review this submission at your earliest convenience.</p>
            <p>Best regards,<br>The Brevio Team</p>
          </div>
        `
      });
      
      console.log('Content review notification email sent:', info.messageId);
      return info;
    } catch (error) {
      console.error('Error sending content review notification email:', error);
      throw error;
    }
  }

  /**
   * Send content approval email to creator
   * @param {Object} options Email options
   * @returns {Promise<Object>} Email send result
   */
  async sendContentApprovalEmail(options) {
    try {
      const { to, userName, contentTitle, contentType, contentId } = options;
      
      // Format content type for display
      const formattedContentType = contentType
        .replace(/([A-Z])/g, ' $1')
        .trim()
        .toLowerCase()
        .replace(/^./, str => str.toUpperCase());
      
      // Send mail with defined transport object
      const info = await this.transporter.sendMail({
        from: `"Brevio Team" <${process.env.EMAIL_FROM || 'noreply@brevio.com'}>`,
        to,
        subject: `Your ${formattedContentType} Has Been Approved`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Content Approved</h2>
            <p>Hello ${userName},</p>
            <p>Great news! Your ${formattedContentType} titled "${contentTitle}" has been approved and is now published on the Brevio platform.</p>
            <p>Your content is now live and available to viewers.</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL}/creator/content/${contentId}" style="background-color: #4CAF50; color: white; padding: 12px 20px; text-decoration: none; border-radius: 4px; font-weight: bold;">
                View Content
              </a>
            </div>
            <p>Thank you for contributing to the Brevio platform!</p>
            <p>Best regards,<br>The Brevio Team</p>
          </div>
        `
      });
      
      console.log('Content approval email sent:', info.messageId);
      return info;
    } catch (error) {
      console.error('Error sending content approval email:', error);
      throw error;
    }
  }

  /**
   * Send content rejection email to creator
   * @param {Object} options Email options
   * @returns {Promise<Object>} Email send result
   */
  async sendContentRejectionEmail(options) {
    try {
      const { to, userName, contentTitle, contentType, contentId, rejectionReason } = options;
      
      // Format content type for display
      const formattedContentType = contentType
        .replace(/([A-Z])/g, ' $1')
        .trim()
        .toLowerCase()
        .replace(/^./, str => str.toUpperCase());
      
      // Send mail with defined transport object
      const info = await this.transporter.sendMail({
        from: `"Brevio Team" <${process.env.EMAIL_FROM || 'noreply@brevio.com'}>`,
        to,
        subject: `Your ${formattedContentType} Needs Revision`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Content Needs Revision</h2>
            <p>Hello ${userName},</p>
            <p>We've reviewed your ${formattedContentType} titled "${contentTitle}" and unfortunately, it doesn't meet our current guidelines.</p>
            <p><strong>Reason for rejection:</strong> ${rejectionReason}</p>
            <p>You can edit your content and resubmit it for review. Please address the issues mentioned above before resubmitting.</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL}/creator/content/edit/${contentId}" style="background-color: #4CAF50; color: white; padding: 12px 20px; text-decoration: none; border-radius: 4px; font-weight: bold;">
                Edit Content
              </a>
            </div>
            <p>If you have any questions or need clarification, please contact our support team.</p>
            <p>Best regards,<br>The Brevio Team</p>
          </div>
        `
      });
      
      console.log('Content rejection email sent:', info.messageId);
      return info;
    } catch (error) {
      console.error('Error sending content rejection email:', error);
      throw error;
    }
  }

  /**
   * Send account blocked email
   * @param {Object} options Email options
   * @returns {Promise<Object>} Email send result
   */
  async sendAccountBlockedEmail(options) {
    try {
      const { to, userName } = options;
      
      // Send mail with defined transport object
      const info = await this.transporter.sendMail({
        from: `"Brevio Team" <${process.env.EMAIL_FROM || 'noreply@brevio.com'}>`,
        to,
        subject: 'Your Brevio Account Has Been Suspended',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Account Suspended</h2>
            <p>Hello ${userName},</p>
            <p>We regret to inform you that your Brevio creator account has been temporarily suspended.</p>
            <p>This action has been taken due to a violation of our platform's terms of service or community guidelines.</p>
            <p>If you believe this is a mistake or would like to appeal this decision, please contact our support team.</p>
            <p>Best regards,<br>The Brevio Team</p>
          </div>
        `
      });
      
      console.log('Account blocked email sent:', info.messageId);
      return info;
    } catch (error) {
      console.error('Error sending account blocked email:', error);
      throw error;
    }
  }

  /**
   * Send account unblocked email
   * @param {Object} options Email options
   * @returns {Promise<Object>} Email send result
   */
  async sendAccountUnblockedEmail(options) {
    try {
      const { to, userName } = options;
      
      // Send mail with defined transport object
      const info = await this.transporter.sendMail({
        from: `"Brevio Team" <${process.env.EMAIL_FROM || 'noreply@brevio.com'}>`,
        to,
        subject: 'Your Brevio Account Has Been Restored',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Account Restored</h2>
            <p>Hello ${userName},</p>
            <p>Good news! Your Brevio creator account has been restored and is now active again.</p>
            <p>You can now log in and continue creating and sharing content on our platform.</p>
            <p>Thank you for your patience and understanding.</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL}/login" style="background-color: #4CAF50; color: white; padding: 12px 20px; text-decoration: none; border-radius: 4px; font-weight: bold;">
                Log In Now
              </a>
            </div>
            <p>Best regards,<br>The Brevio Team</p>
          </div>
        `
      });
      
      console.log('Account unblocked email sent:', info.messageId);
      return info;
    } catch (error) {
      console.error('Error sending account unblocked email:', error);
      throw error;
    }
  }

  /**
   * Send account deleted email
   * @param {Object} options Email options
   * @returns {Promise<Object>} Email send result
   */
  async sendAccountDeletedEmail(options) {
    try {
      const { to, userName } = options;
      
      // Send mail with defined transport object
      const info = await this.transporter.sendMail({
        from: `"Brevio Team" <${process.env.EMAIL_FROM || 'noreply@brevio.com'}>`,
        to,
        subject: 'Your Brevio Account Has Been Deleted',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Account Deleted</h2>
            <p>Hello ${userName},</p>
            <p>We're sorry to see you go. Your Brevio creator account has been permanently deleted along with all associated content and data.</p>
            <p>If you did not request this action or believe it was done in error, please contact our support team immediately.</p>
            <p>Thank you for being part of the Brevio community.</p>
            <p>Best regards,<br>The Brevio Team</p>
          </div>
        `
      });
      
      console.log('Account deleted email sent:', info.messageId);
      return info;
    } catch (error) {
      console.error('Error sending account deleted email:', error);
      throw error;
    }
  }
}

export default new EmailService();