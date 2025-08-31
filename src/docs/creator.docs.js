/**
 * @swagger
 * /api/creators/profile:
 *   get:
 *     summary: Get creator's own profile data (authenticated creator)
 *     tags: [Creators]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Creator's own profile data with comprehensive statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 profile:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       example: "507f1f77bcf86cd799439011"
 *                     name:
 *                       type: string
 *                       example: "John Doe"
 *                     username:
 *                       type: string
 *                       example: "johndoe"
 *                     bio:
 *                       type: string
 *                       example: "Content creator and filmmaker"
 *                     email:
 *                       type: string
 *                       example: "john@example.com"
 *                     profilePicture:
 *                       type: string
 *                       example: "https://example.com/profile.jpg"
 *                     socialProfiles:
 *                       type: object
 *                       example: {}
 *                     joinedDate:
 *                       type: string
 *                       format: date-time
 *                     status:
 *                       type: string
 *                       example: "active"
 *                     subscriptionStatus:
 *                       type: string
 *                       example: "premium"
 *                     channel:
 *                       type: object
 *                       nullable: true
 *                       properties:
 *                         id:
 *                           type: string
 *                         name:
 *                           type: string
 *                         description:
 *                           type: string
 *                         thumbnail:
 *                           type: string
 *                         type:
 *                           type: string
 *                         createdAt:
 *                           type: string
 *                           format: date-time
 *                     stats:
 *                       type: object
 *                       properties:
 *                         content:
 *                           type: object
 *                           properties:
 *                             total:
 *                               type: integer
 *                             published:
 *                               type: integer
 *                             pending:
 *                               type: integer
 *                             rejected:
 *                               type: integer
 *                             byType:
 *                               type: object
 *                               properties:
 *                                 shortFilms:
 *                                   type: integer
 *                                 educational:
 *                                   type: integer
 *                                 series:
 *                                   type: integer
 *                         engagement:
 *                           type: object
 *                           properties:
 *                             subscribers:
 *                               type: integer
 *                             totalLikes:
 *                               type: integer
 *                             totalViews:
 *                               type: integer
 *                         monetization:
 *                           type: object
 *                           properties:
 *                             totalDonations:
 *                               type: number
 *                             donationCount:
 *                               type: integer
 *                     recentContent:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           title:
 *                             type: string
 *                           contentType:
 *                             type: string
 *                           status:
 *                             type: string
 *                           thumbnail:
 *                             type: string
 *                           views:
 *                             type: integer
 *                           likes:
 *                             type: integer
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *                           genre:
 *                             type: object
 *                             nullable: true
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       403:
 *         description: Forbidden - User is not a creator
 *       404:
 *         description: Creator not found
 *       500:
 *         description: Internal server error
 */

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