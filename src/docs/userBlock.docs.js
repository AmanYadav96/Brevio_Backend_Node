/**
 * @swagger
 * components:
 *   schemas:
 *     UserBlock:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: The block record ID
 *         user:
 *           type: string
 *           description: The user ID who initiated the block
 *         blockedUser:
 *           type: string
 *           description: The user ID who has been blocked
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: When the block was created
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: When the block was last updated
 *
 * /api/user-blocks:
 *   post:
 *     summary: Block a user
 *     description: Block a user to prevent their content from appearing in your feed
 *     tags: [User Blocks]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - blockedUserId
 *             properties:
 *               blockedUserId:
 *                 type: string
 *                 description: ID of the user to block
 *     responses:
 *       200:
 *         description: User blocked successfully
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
 *                   example: User blocked successfully
 *                 userBlock:
 *                   $ref: '#/components/schemas/UserBlock'
 *       400:
 *         description: Invalid request - user already blocked, invalid user ID, or attempting to block yourself
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: Invalid user ID
 *       401:
 *         description: Unauthorized - User not logged in
 *       404:
 *         description: User to block not found
 *       500:
 *         description: Server error
 *
 *   get:
 *     summary: Get all blocked users
 *     description: Retrieve a list of all users that the current user has blocked
 *     tags: [User Blocks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: List of blocked users retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 blockedUsers:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                         description: User ID
 *                       name:
 *                         type: string
 *                         description: User's name
 *                       username:
 *                         type: string
 *                         description: User's username
 *                       profilePicture:
 *                         type: string
 *                         description: URL to user's profile picture
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                       description: Total number of blocked users
 *                     pages:
 *                       type: integer
 *                       description: Total number of pages
 *                     page:
 *                       type: integer
 *                       description: Current page number
 *                     limit:
 *                       type: integer
 *                       description: Number of items per page
 *       401:
 *         description: Unauthorized - User not logged in
 *       500:
 *         description: Server error
 *
 * /api/user-blocks/{blockedUserId}:
 *   delete:
 *     summary: Unblock a user
 *     description: Remove a user from your block list
 *     tags: [User Blocks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: blockedUserId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the user to unblock
 *     responses:
 *       200:
 *         description: User unblocked successfully
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
 *                   example: User unblocked successfully
 *       400:
 *         description: Invalid user ID
 *       401:
 *         description: Unauthorized - User not logged in
 *       404:
 *         description: Block record not found
 *       500:
 *         description: Server error
 */