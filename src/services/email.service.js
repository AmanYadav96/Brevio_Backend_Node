import nodemailer from 'nodemailer';

class EmailService {
  constructor() {
    // Create reusable transporter
    this.transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: process.env.EMAIL_PORT || 587,
      secure: process.env.EMAIL_SECURE === 'true',
      auth: {
        user: process.env.EMAIL_USER || "info@brevio.online",
        pass: process.env.EMAIL_PASSWORD || "zneu phvd wpdq tzhm"
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
        from: `"Equipo Brevio" <${process.env.EMAIL_FROM || 'noreply@brevio.com'}>`,
        to,
        subject: 'Tu Contrato de Creador de Brevio',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>¡Bienvenido al Programa de Creadores de Brevio!</h2>
            <p>Hola ${userName},</p>
            <p>¡Felicidades por convertirte en un creador de Brevio! Estamos emocionados de que te unas a nuestra plataforma.</p>
            <p>Adjunto encontrarás tu contrato de creador. Revísalo cuidadosamente y guárdalo para tus registros.</p>
            <p>También puedes ver tu contrato en línea haciendo clic en el botón de abajo:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${contractUrl}" style="background-color: #4CAF50; color: white; padding: 12px 20px; text-decoration: none; border-radius: 4px; font-weight: bold;">
                Ver Contrato
              </a>
            </div>
            <p>Si tienes alguna pregunta sobre tu contrato o cuenta de creador, por favor contacta a nuestro equipo de soporte.</p>
            <p>Saludos cordiales,<br>El Equipo de Brevio</p>
          </div>
        `,
        attachments: [
          {
            filename: 'contrato-creador.pdf',
            path: contractUrl
          }
        ]
      });
      
      console.log('Correo de contrato de creador enviado:', info.messageId);
      return info;
    } catch (error) {
      console.error('Error al enviar correo de contrato de creador:', error);
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
        from: `"Equipo Brevio" <${process.env.EMAIL_FROM || 'noreply@brevio.com'}>`,
        to,
        subject: `Tu ${formattedContentType} Ha Sido Aprobado`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Contenido Aprobado</h2>
            <p>Hola ${userName},</p>
            <p>¡Buenas noticias! Tu ${formattedContentType} titulado "${contentTitle}" ha sido aprobado y ahora está publicado en la plataforma Brevio.</p>
            <p>Tu contenido ya está disponible para los espectadores.</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL}/creator/content/${contentId}" style="background-color: #4CAF50; color: white; padding: 12px 20px; text-decoration: none; border-radius: 4px; font-weight: bold;">
                Ver Contenido
              </a>
            </div>
            <p>¡Gracias por contribuir a la plataforma Brevio!</p>
            <p>Saludos cordiales,<br>El Equipo de Brevio</p>
          </div>
        `
      });
      
      console.log('Correo de aprobación de contenido enviado:', info.messageId);
      return info;
    } catch (error) {
      console.error('Error al enviar correo de aprobación de contenido:', error);
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
        from: `"Equipo Brevio" <${process.env.EMAIL_FROM || 'noreply@brevio.com'}>`,
        to,
        subject: `Tu ${formattedContentType} Necesita Revisión`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Contenido Necesita Revisión</h2>
            <p>Hola ${userName},</p>
            <p>Hemos revisado tu ${formattedContentType} titulado "${contentTitle}" y desafortunadamente, no cumple con nuestras directrices actuales.</p>
            <p><strong>Motivo del rechazo:</strong> ${rejectionReason}</p>
            <p>Puedes editar tu contenido y volver a enviarlo para revisión. Por favor, aborda los problemas mencionados anteriormente antes de volver a enviarlo.</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL}/creator/content/edit/${contentId}" style="background-color: #4CAF50; color: white; padding: 12px 20px; text-decoration: none; border-radius: 4px; font-weight: bold;">
                Editar Contenido
              </a>
            </div>
            <p>Si tienes alguna pregunta o necesitas aclaración, por favor contacta a nuestro equipo de soporte.</p>
            <p>Saludos cordiales,<br>El Equipo de Brevio</p>
          </div>
        `
      });
      
      console.log('Correo de rechazo de contenido enviado:', info.messageId);
      return info;
    } catch (error) {
      console.error('Error al enviar correo de rechazo de contenido:', error);
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

  /**
   * Send OTP verification email (legacy method - calls sendOtpEmail)
   * @param {Object} options Email options
   * @returns {Promise<Object>} Email send result
   */
  async sendOtpVerificationEmail(options) {
    return this.sendOtpEmail({
      ...options,
      purpose: "email_verification"
    });
  }

  /**
   * Send OTP email for verification or password reset
   * @param {Object} options Email options
   * @param {string} options.to Recipient email
   * @param {string} options.name Recipient name
   * @param {string} options.otp OTP code
   * @param {string} options.purpose Purpose of OTP (verification or reset)
   * @returns {Promise<Object>} Email send result
   */
  async sendOtpEmail(options) {
    try {
      const { to, name, otp, purpose } = options;
      
      // If this is for email verification, check if user is already registered in Firebase
      if (purpose === "email_verification" && options.firebaseUid) {
        console.log(`User already verified in Firebase (${options.firebaseUid}), skipping OTP email`);
        return { skipped: true, reason: "User already verified in Firebase" };
      }
      
      // Get current year for footer
      const currentYear = new Date().getFullYear();
      
      // Set subject and title based on purpose
      let subject, title, actionText, instructionText;
      
      if (purpose === "password_reset") {
        subject = 'Password Reset Code';
        title = 'Password Reset';
        actionText = 'Here is your code to reset your password:';
        instructionText = 'This code is single-use and expires in a few minutes. If you did not request a password reset, please ignore this message or contact us.';
      } else { // Default to email_verification
        subject = 'Verification Code';
        title = 'Code Verification';
        actionText = 'Here is your code to access Brevio:';
        instructionText = 'This code is single-use and expires in a few minutes, so please act quickly. If you did not request this code, please ignore this message or contact us.';
      }
      
      // Send mail with defined transport object
      const info = await this.transporter.sendMail({
        from: `"Brevio Team" <${process.env.EMAIL_FROM || 'noreply@brevio.com'}>`,
        to,
        subject: subject,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <title>${title}</title>
            <style>
              body {
                font-family: Arial, sans-serif;
                margin: 0;
                padding: 0;
                background: linear-gradient(#1D1B1C, #282828, #D6EF31);
              }

              .container {
                max-width: 600px;
                margin: 20px auto;
                background-color: #1D1B1C;
                border-radius: 8px;
                overflow: hidden;
                color: white;
              }

              .header {
                background-color: #4C2BEE;
                color: white;
                padding: 20px;
                text-align: center;
              }

              .content {
                padding: 20px;
                background-color: #282828;
              }

              .otp-code {
                font-size: 28px;
                font-weight: bold;
                color: #D6EF31;
                text-align: center;
                margin: 20px 0;
              }

              .footer {
                text-align: center;
                padding: 15px;
                background-color: #1D1B1C;
                font-size: 13px;
                color: #CCCCCC;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h2>${title}</h2>
              </div>
              <div class="content">
                <p>Hello, ${name}</p>
                <p>${actionText}</p>
                <div class="otp-code">${otp}</div>
                <p>${instructionText}</p>
              </div>
              <div class="footer">
                <p>This email was sent by Brevio</p>
                <p>&copy;${currentYear} Brevio. All rights reserved.</p>
              </div>
            </div>
          </body>
          </html>
        `
      });
      
      console.log(`${purpose} OTP email sent:`, info.messageId);
      return info;
    } catch (error) {
      console.error(`Error sending ${options.purpose} OTP email:`, error);
      throw error;
    }
  }
}

export default new EmailService();