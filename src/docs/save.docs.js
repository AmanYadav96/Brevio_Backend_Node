/**
 * @swagger
 * components:
 *   schemas:
 *     Save:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: The save ID
 *         user:
 *           type: string
 *           description: The user ID who saved the content
 *         contentType:
 *           type: string
 *           enum: [content, creatorContent]
 *           description: Type of content being saved
 *         contentId:
 *           type: object
 *           description: Populated content details
 *           properties:
 *             _id:
 *               type: string
 *             title:
 *               type: string
 *             description:
 *               type: string
 *             thumbnail:
 *               type: string
 *             duration:
 *               type: number
 *         folder:
 *           type: string
 *           description: Folder name for organizing saved content
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: When the content was saved
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: When the saved content was last updated
 *
 * /api/saves:
 *   get:
 *     summary: Get user's saved content
 *     tags: [Saves]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: contentType
 *         schema:
 *           type: string
 *           enum: [content, creatorContent]
 *         description: Filter by content type
 *       - in: query
 *         name: folder
 *         schema:
 *           type: string
 *         description: Filter by folder
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
 *         description: List of user's saved content
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 savedContent:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Save'
 *                 folders:
 *                   type: array
 *                   items:
 *                     type: string
 *                   description: List of user's folders
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     page:
 *                       type: integer
 *                     pages:
 *                       type: integer
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 *
 * /api/saves/toggle:
 *   post:
 *     summary: Toggle save status (save or unsave)
 *     tags: [Saves]
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
 *                 enum: [content, creatorContent]
 *                 description: Type of content
 *               contentId:
 *                 type: string
 *                 description: ID of the content
 *               folder:
 *                 type: string
 *                 default: default
 *                 description: Folder to save content in
 *     responses:
 *       200:
 *         description: Save toggled successfully
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
 *                 saved:
 *                   type: boolean
 *                   description: Current save status after toggle
 *       400:
 *         description: Invalid content type
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 *
 * /api/saves/check:
 *   get:
 *     summary: Check if content is saved
 *     tags: [Saves]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: contentType
 *         required: true
 *         schema:
 *           type: string
 *           enum: [content, creatorContent]
 *         description: Type of content
 *       - in: query
 *         name: contentId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the content
 *     responses:
 *       200:
 *         description: Save status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 saved:
 *                   type: boolean
 *                   description: Whether the content is saved
 *                 folder:
 *                   type: string
 *                   nullable: true
 *                   description: Folder the content is saved in (if saved)
 *       400:
 *         description: Invalid content type
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 *
 * /api/saves/{id}:
 *   patch:
 *     summary: Update saved content folder
 *     tags: [Saves]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Save ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - folder
 *             properties:
 *               folder:
 *                 type: string
 *                 description: New folder name
 *     responses:
 *       200:
 *         description: Saved content updated successfully
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
 *                 save:
 *                   $ref: '#/components/schemas/Save'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Not authorized to update this saved content
 *       404:
 *         description: Saved content not found
 *       500:
 *         description: Server error
 */