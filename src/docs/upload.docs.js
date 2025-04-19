/**
 * @swagger
 * /api/upload/progress/{fileId}:
 *   get:
 *     summary: Get file upload progress
 *     tags: [Upload]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: fileId
 *         required: true
 *         schema:
 *           type: string
 *         description: File ID to check progress
 *     responses:
 *       200:
 *         description: Upload progress details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 status:
 *                   type: string
 *                   enum: [pending, uploading, completed, failed]
 *                 progress:
 *                   type: number
 *                   description: Upload progress percentage
 *                 error:
 *                   type: string
 *                   description: Error message if upload failed
 *       404:
 *         description: File not found
 *       401:
 *         description: Unauthorized
 */