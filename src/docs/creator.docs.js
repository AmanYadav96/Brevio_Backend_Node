/**
 * @swagger
 * /api/creators/search:
 *   get:
 *     summary: Search creators by name, username, or bio
 *     tags: [Creators]
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term for creator name, username, or bio
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
 *         description: Items per page
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           default: createdAt
 *         description: Sort field (createdAt, name, username)
 *       - in: query
 *         name: order
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order
 *     responses:
 *       200:
 *         description: List of creators matching search criteria
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 creators:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                         description: Creator ID
 *                       name:
 *                         type: string
 *                         description: Creator's full name
 *                       username:
 *                         type: string
 *                         description: Creator's username
 *                       bio:
 *                         type: string
 *                         description: Creator's biography
 *                       profilePicture:
 *                         type: string
 *                         description: URL to creator's profile picture
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                         description: Account creation date
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                       description: Total number of creators matching criteria
 *                     pages:
 *                       type: integer
 *                       description: Total number of pages
 *                     page:
 *                       type: integer
 *                       description: Current page number
 *                     limit:
 *                       type: integer
 *                       description: Items per page
 *       500:
 *         description: Server error
 */