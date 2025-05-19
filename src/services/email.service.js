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
}

export default new EmailService();