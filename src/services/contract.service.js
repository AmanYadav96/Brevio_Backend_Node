import Contract from '../models/contract.model.js';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

// Get R2 public URL from environment variables
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || 'https://pub-xxxxxxxx.r2.dev';

class ContractService {
  /**
   * Generate a creator contract PDF and save it to cloud storage
   * @param {Object} data Contract data
   * @returns {Promise<Object>} Created contract object
   */
  async generateCreatorContract(data) {
    try {
      // Create a new PDF document
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage();
      const { width, height } = page.getSize();
      
      // Get the font
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      
      // Add content to the PDF
      page.drawText('CREATOR AGREEMENT', {
        x: 50,
        y: height - 50,
        size: 24,
        font: boldFont,
        color: rgb(0, 0, 0),
      });
      
      page.drawText(`Date: ${new Date().toLocaleDateString()}`, {
        x: 50,
        y: height - 100,
        size: 12,
        font: font,
        color: rgb(0, 0, 0),
      });
      
      page.drawText(`Creator Name: ${data.userName}`, {
        x: 50,
        y: height - 130,
        size: 12,
        font: font,
        color: rgb(0, 0, 0),
      });
      
      page.drawText(`Creator Email: ${data.userEmail}`, {
        x: 50,
        y: height - 160,
        size: 12,
        font: font,
        color: rgb(0, 0, 0),
      });
      
      // Add contract terms
      page.drawText('TERMS AND CONDITIONS', {
        x: 50,
        y: height - 200,
        size: 16,
        font: boldFont,
        color: rgb(0, 0, 0),
      });
      
      const termsText = 
        'This agreement outlines the terms and conditions for content creators on the Brevio platform. ' +
        'By accepting this agreement, you agree to abide by our content guidelines, revenue sharing model, ' +
        'and intellectual property policies. Brevio reserves the right to modify these terms at any time.';
      
      page.drawText(termsText, {
        x: 50,
        y: height - 230,
        size: 10,
        font: font,
        color: rgb(0, 0, 0),
        maxWidth: width - 100,
        lineHeight: 15,
      });
      
      // Add signature line
      page.drawText('Creator Signature: _______________________', {
        x: 50,
        y: height - 350,
        size: 12,
        font: font,
        color: rgb(0, 0, 0),
      });
      
      page.drawText('Date: _______________________', {
        x: 50,
        y: height - 380,
        size: 12,
        font: font,
        color: rgb(0, 0, 0),
      });
      
      // Save the PDF to a buffer
      const pdfBytes = await pdfDoc.save();
      
      // Upload to cloud storage
      const fileName = `contracts/${data.userId}/${uuidv4()}.pdf`;
      
      // Create S3 client
      const s3Client = new S3Client({
        region: 'auto',
        endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId: process.env.R2_ACCESS_KEY_ID,
          secretAccessKey: process.env.R2_SECRET_ACCESS_KEY
        }
      });
      
      // Upload PDF to R2
      const command = new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: fileName,
        Body: pdfBytes,
        ContentType: 'application/pdf'
      });
      
      await s3Client.send(command);
      
      // Create contract record in database
      const contract = await Contract.create({
        userId: data.userId,
        contractType: 'creator',
        contractFile: `${R2_PUBLIC_URL}/${fileName}`,
        status: 'pending',
        createdAt: new Date()
      });
      
      return contract;
    } catch (error) {
      console.error('Error generating creator contract:', error);
      throw error;
    }
  }
}

export default new ContractService();