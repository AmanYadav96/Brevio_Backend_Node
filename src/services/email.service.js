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
        from: `"Equipo Brevio" <${process.env.EMAIL_FROM || 'noreply@brevio.com'}>`,
        to,
        subject: 'Tu Cuenta de Brevio Ha Sido Suspendida',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Cuenta Suspendida</h2>
            <p>Hola ${userName},</p>
            <p>Lamentamos informarte que tu cuenta de creador de Brevio ha sido temporalmente suspendida.</p>
            <p>Esta acción se ha tomado debido a una violación de los términos de servicio o las directrices de nuestra comunidad.</p>
            <p>Si crees que esto es un error o deseas apelar esta decisión, por favor contacta a nuestro equipo de soporte.</p>
            <p>Saludos cordiales,<br>El Equipo de Brevio</p>
          </div>
        `
      });
      
      console.log('Correo de cuenta bloqueada enviado:', info.messageId);
      return info;
    } catch (error) {
      console.error('Error al enviar correo de cuenta bloqueada:', error);
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
      const { to, name } = options;
      
      // Get current year for footer
      const currentYear = new Date().getFullYear();
      
      // Send mail with defined transport object
      const info = await this.transporter.sendMail({
        from: `"Equipo Brevio" <${process.env.EMAIL_FROM || 'noreply@brevio.com'}>`,
        to,
        subject: 'Tu cuenta ha sido eliminada',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <title>Cuenta eliminada</title>
            <style>
              body {
                font-family: Arial, sans-serif;
                margin: 0;
                padding: 0;
                color: #333333;
              }
              .container {
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
              }
              .header {
                background: linear-gradient(135deg, #6e8efb, #a777e3);
                color: white;
                padding: 20px;
                text-align: center;
                border-radius: 8px 8px 0 0;
              }
              .content {
                background-color: #ffffff;
                padding: 20px;
                border-left: 1px solid #dddddd;
                border-right: 1px solid #dddddd;
              }
              .footer {
                background-color: #f5f5f5;
                padding: 15px;
                text-align: center;
                font-size: 12px;
                color: #777777;
                border-radius: 0 0 8px 8px;
                border: 1px solid #dddddd;
              }
              p {
                line-height: 1.6;
                margin: 10px 0;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h2>Cuenta eliminada</h2>
              </div>
              <div class="content">
                <p>Hola ${name},</p>
                <p>Tu cuenta ha sido eliminada con éxito.</p>
                <p>No vamos a mentir: nos dolió un poco.</p>
                <p>Si cambias de opinión, aquí estaremos.</p>
                <p>Mientras tanto, las historias siguen.</p>
                <p>Tú decides cuándo volver.</p>
                <p>El equipo de Brevio</p>
              </div>
              <div class="footer">
                &copy; ${currentYear} Brevio. Todos los derechos reservados.
              </div>
            </div>
          </body>
          </html>
        `
      });
      
      console.log('Correo de cuenta eliminada enviado:', info.messageId);
      return info;
    } catch (error) {
      console.error('Error al enviar correo de cuenta eliminada:', error);
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
        subject = 'Código para Restablecer Contraseña';
        title = 'Restablecimiento de Contraseña';
        actionText = 'Aquí está tu código para restablecer tu contraseña:';
        instructionText = 'Este código es de un solo uso y expira en unos minutos. Si no solicitaste un restablecimiento de contraseña, por favor ignora este mensaje o contáctanos.';
      } else { // Default to email_verification
        subject = 'Código de Verificación';
        title = 'Verificación de Código';
        actionText = 'Aquí está tu código para acceder a Brevio:';
        instructionText = 'Este código es de un solo uso y expira en unos minutos, así que por favor actúa rápidamente. Si no solicitaste este código, por favor ignora este mensaje o contáctanos.';
      }
      
      // Send mail with defined transport object
      const info = await this.transporter.sendMail({
        from: `"Equipo Brevio" <${process.env.EMAIL_FROM || 'noreply@brevio.com'}>`,
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
                <p>Hola, ${name}</p>
                <p>${actionText}</p>
                <div class="otp-code">${otp}</div>
                <p>${instructionText}</p>
              </div>
              <div class="footer">
                <p>Este correo fue enviado por Brevio</p>
                <p>&copy;${currentYear} Brevio. Todos los derechos reservados.</p>
              </div>
            </div>
          </body>
          </html>
        `
      });
      
      console.log(`Correo de ${purpose === "password_reset" ? "restablecimiento de contraseña" : "verificación"} enviado:`, info.messageId);
      return info;
    } catch (error) {
      console.error(`Error al enviar correo de ${options.purpose === "password_reset" ? "restablecimiento de contraseña" : "verificación"}:`, error);
      throw error;
    }
  }

  /**
   * Send welcome email to newly registered users
   * @param {Object} options Email options
   * @param {string} options.to Recipient email
   * @param {string} options.name Recipient name
   * @returns {Promise<Object>} Email send result
   */
  async sendWelcomeEmail(options) {
    try {
      const { to, name } = options;
      
      // Get current year for footer
      const currentYear = new Date().getFullYear();
      
      // Send mail with defined transport object
      const info = await this.transporter.sendMail({
        from: `"Equipo Brevio" <${process.env.EMAIL_FROM || 'noreply@brevio.com'}>`,
        to,
        subject: '🎉 ¡Cuenta creada!',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <title>Bienvenido a Brevio</title>
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
                <h2>¡Bienvenido a Brevio!</h2>
              </div>
              <div class="content">
                <p>Ey ${name},</p>
                <p>Ya tienes cuenta en Brevio.</p>
                <p>¿Has venido a ver historias? Prepárate para no parar.</p>
                <p>¿Has venido a contarlas? Mejor aún.</p>
                <p>🎥 Sube tu corto si te atreves.</p>
                <p>📲 O desliza y descúbrelos.</p>
                <p>Aquí no hay comités, ni formularios eternos.</p>
                <p>Solo creadores, historias… y mucho scroll.</p>
                <p>Bienvenid@ al nuevo Hollywood (sin filtros ni permisos)</p>
                <p>❤️ Gracias por sumarte</p>
                <p>-El equipo de Brevio</p>
              </div>
              <div class="footer">
                <p>Este correo fue enviado por Brevio</p>
                <p>&copy;${currentYear} Brevio. Todos los derechos reservados.</p>
              </div>
            </div>
          </body>
          </html>
        `
      });
      
      console.log('Correo de bienvenida enviado:', info.messageId);
      return info;
    } catch (error) {
      console.error('Error al enviar correo de bienvenida:', error);
      throw error;
    }
  }
}

export default new EmailService();