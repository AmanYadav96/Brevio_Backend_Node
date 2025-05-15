/**
 * @swagger
 * components:
 *   schemas:
 *     Like:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: The like ID
 *         user:
 *           type: string
 *           description: The user ID who liked the content
 *         contentType:
 *           type: string
 *           enum: [content, creatorContent, comment]
 *           description: Type of content being liked
 *         contentId:
 *           type: string
 *           description: ID of the content being liked
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: When the like was created
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: When the like was last updated
 *
 * /api/likes:
 *   get:
 *     summary: Get likes for content
 *     tags: [Likes]
 *     parameters:
 *       - in: query
 *         name: contentType
 *         required: true
 *         schema:
 *           type: string
 *           enum: [content, creatorContent, comment]
 *         description: Type of content
 *       - in: query
 *         name: contentId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the content
 *     responses:
 *       200:
 *         description: Like information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 likesCount:
 *                   type: integer
 *                   description: Number of likes
 *                 userLiked:
 *                   type: boolean
 *                   description: Whether the current user has liked this content
 *       400:
 *         description: Invalid content type
 *       500:
 *         description: Server error
 *
 * /api/likes/toggle:
 *   post:
 *     summary: Toggle like status (like or unlike)
 *     tags: [Likes]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - contentType
 *               - contentId
 *             properties:
 *               contentType:
 *                 type: string
 *                 enum: [content, creatorContent, comment]
 *                 description: Type of content
 *               contentId:
 *                 type: string
 *                 description: ID of the content
 *     responses:
 *       200:
 *         description: Like toggled successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                 liked:
 *                   type: boolean
 *                   description: Current like status after toggle
 *       400:
 *         description: Invalid content type
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 *
 * /api/likes/user:
 *   get:
 *     summary: Get user's liked content
 *     tags: [Likes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: contentType
 *         schema:
 *           type: string
 *           enum: [content, creatorContent, comment]
 *         description: Filter by content type
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: List of user's liked content
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 likes:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                       contentType:
 *                         type: string
 *                       contentId:
 *                         type: object
 *                         description: Populated content details
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     page:
 *                       type: integer
 *                     pages:
 *                       type: integer
 *       400:
 *         description: Invalid content type
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */