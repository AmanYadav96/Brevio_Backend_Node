/**
 * @swagger
 * /api/videos:
 *   post:
 *     summary: Upload new video
 *     tags: [Videos]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [title, description, thumbnail, videoFile, channel]
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               thumbnail:
 *                 type: string
 *                 format: binary
 *                 description: Video thumbnail image
 *               videoFile:
 *                 type: string
 *                 format: binary
 *                 description: Video file (MP4, WebM)
 *               channel:
 *                 type: string
 *                 description: Channel ID
 *     responses:
 *       201:
 *         description: Video uploaded successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 */