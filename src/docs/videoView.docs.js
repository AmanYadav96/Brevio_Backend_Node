/**
 * @swagger
 * components:
 *   schemas:
 *     VideoView:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: The view record ID
 *         content:
 *           type: string
 *           description: The content ID that was viewed
 *         viewer:
 *           type: string
 *           description: The user ID who viewed the content (if authenticated)
 *         ipAddress:
 *           type: string
 *           description: IP address of the viewer
 *         userAgent:
 *           type: string
 *           description: Browser/device information
 *         viewDuration:
 *           type: number
 *           description: Duration viewed in seconds
 *         completionPercentage:
 *           type: number
 *           description: Percentage of content viewed (0-100)
 *         viewDate:
 *           type: string
 *           format: date-time
 *           description: When the view occurred
 *         isUnique:
 *           type: boolean
 *           description: Whether this is a unique view (first view from this IP/user)
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/views/content/{contentId}:
 *   post:
 *     summary: Record a view for content
 *     tags: [Views]
 *     parameters:
 *       - in: path
 *         name: contentId
 *         required: true
 *         schema:
 *           type: string
 *         description: Content ID
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               viewDuration:
 *                 type: number
 *                 description: Duration viewed in seconds
 *               completionPercentage:
 *                 type: number
 *                 description: Percentage of content viewed (0-100)
 *     responses:
 *       201:
 *         description: View recorded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 view:
 *                   $ref: '#/components/schemas/VideoView'
 *                 isUnique:
 *                   type: boolean
 *       404:
 *         description: Content not found
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/views/update/{viewId}:
 *   put:
 *     summary: Update view duration/completion
 *     tags: [Views]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: viewId
 *         required: true
 *         schema:
 *           type: string
 *         description: View record ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               viewDuration:
 *                 type: number
 *                 description: Duration viewed in seconds
 *               completionPercentage:
 *                 type: number
 *                 description: Percentage of content viewed (0-100)
 *     responses:
 *       200:
 *         description: View updated successfully
 *       404:
 *         description: View record not found
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/views/content/{contentId}/count:
 *   get:
 *     summary: Get view count for content
 *     tags: [Views]
 *     parameters:
 *       - in: path
 *         name: contentId
 *         required: true
 *         schema:
 *           type: string
 *         description: Content ID
 *     responses:
 *       200:
 *         description: Success
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 content:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                     title:
 *                       type: string
 *                     views:
 *                       type: number
 *       404:
 *         description: Content not found
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/views/content/{contentId}/stats:
 *   get:
 *     summary: Get detailed view statistics for content
 *     tags: [Views]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: contentId
 *         required: true
 *         schema:
 *           type: string
 *         description: Content ID
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter by start date (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter by end date (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Success
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 content:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                     title:
 *                       type: string
 *                 totalViews:
 *                   type: number
 *                 viewStats:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                         description: Date (YYYY-MM-DD)
 *                       totalViews:
 *                         type: number
 *                       uniqueViews:
 *                         type: number
 *                       avgViewDuration:
 *                         type: number
 *                       avgCompletionPercentage:
 *                         type: number
 *       404:
 *         description: Content not found
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/views/top:
 *   get:
 *     summary: Get top viewed content
 *     tags: [Views]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of results to return
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [day, week, month, all]
 *           default: all
 *         description: Time period for top content
 *     responses:
 *       200:
 *         description: Success
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 topContent:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                       title:
 *                         type: string
 *                       description:
 *                         type: string
 *                       views:
 *                         type: number
 *                       contentType:
 *                         type: string
 *                       creator:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: string
 *                           name:
 *                             type: string
 *                           profilePicture:
 *                             type: string
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/views/creator/stats:
 *   get:
 *     summary: Get view statistics for creator's content
 *     tags: [Views]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter by start date (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter by end date (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Success
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 totalViews:
 *                   type: number
 *                 contentViewStats:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                       title:
 *                         type: string
 *                       totalViews:
 *                         type: number
 *                 dailyViewStats:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                         description: Date (YYYY-MM-DD)
 *                       totalViews:
 *                         type: number
 *                       uniqueViews:
 *                         type: number
 *       403:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/views/admin/stats:
 *   get:
 *     summary: Get global view statistics (Admin only)
 *     tags: [Views]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter by start date (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter by end date (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Success
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 totalViews:
 *                   type: number
 *                 viewStats:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                         description: Date (YYYY-MM-DD)
 *                       totalViews:
 *                         type: number
 *                       uniqueViews:
 *                         type: number
 *       403:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */