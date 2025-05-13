/**
 * @swagger
 * components:
 *   schemas:
 *     Report:
 *       type: object
 *       required:
 *         - reporterId
 *         - contentId
 *         - contentType
 *         - contentName
 *         - issueType
 *         - description
 *       properties:
 *         _id:
 *           type: string
 *           description: The auto-generated ID of the report
 *         reporterId:
 *           type: string
 *           description: ID of the user who submitted the report
 *         contentId:
 *           type: string
 *           description: ID of the reported content
 *         contentType:
 *           type: string
 *           enum: [video, short, series, course, comment, channel, user]
 *           description: Type of content being reported
 *         contentName:
 *           type: string
 *           description: Name or title of the reported content
 *         contentThumbnail:
 *           type: string
 *           description: Thumbnail URL of the reported content
 *         creatorId:
 *           type: string
 *           description: ID of the creator of the reported content
 *         issueType:
 *           type: string
 *           enum: [copyright_infringement, inappropriate_content, harassment, violence, hate_speech, misinformation, spam, other]
 *           description: Type of issue being reported
 *         description:
 *           type: string
 *           description: Detailed description of the issue
 *         proofFile:
 *           type: string
 *           description: URL to uploaded proof file
 *         status:
 *           type: string
 *           enum: [pending, under_review, resolved, rejected]
 *           default: pending
 *           description: Current status of the report
 *         adminNotes:
 *           type: string
 *           description: Notes added by admin during review
 *         actionTaken:
 *           type: string
 *           enum: [none, warning, content_removed, account_suspended, account_terminated]
 *           description: Action taken on the report
 *         actionDate:
 *           type: string
 *           format: date-time
 *           description: When action was taken
 *         actionBy:
 *           type: string
 *           description: ID of admin who took action
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: When the report was created
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: When the report was last updated
 * 
 * tags:
 *   - name: Reports
 *     description: API for content reporting system
 *
 * /api/reports:
 *   post:
 *     summary: Create a new content report
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - contentId
 *               - contentType
 *               - issueType
 *               - description
 *             properties:
 *               contentId:
 *                 type: string
 *                 description: ID of the content being reported
 *               contentType:
 *                 type: string
 *                 enum: [video, short, series, course, comment, channel, user]
 *                 description: Type of content being reported
 *               issueType:
 *                 type: string
 *                 enum: [copyright_infringement, inappropriate_content, harassment, violence, hate_speech, misinformation, spam, other]
 *                 description: Type of issue being reported
 *               description:
 *                 type: string
 *                 description: Detailed description of the issue
 *               proofFile:
 *                 type: string
 *                 format: binary
 *                 description: File providing proof of the issue
 *     responses:
 *       201:
 *         description: Report created successfully
 *       400:
 *         description: Invalid input
 *       404:
 *         description: Content not found
 *       500:
 *         description: Server error
 *
 *   get:
 *     summary: Get all reports (admin only)
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
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
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, under_review, resolved, rejected]
 *         description: Filter by report status
 *       - in: query
 *         name: issueType
 *         schema:
 *           type: string
 *           enum: [copyright_infringement, inappropriate_content, harassment, violence, hate_speech, misinformation, spam, other]
 *         description: Filter by issue type
 *       - in: query
 *         name: contentType
 *         schema:
 *           type: string
 *           enum: [video, short, series, course, comment, channel, user]
 *         description: Filter by content type
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in content name or description
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           default: createdAt
 *         description: Field to sort by
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order
 *     responses:
 *       200:
 *         description: List of reports
 *       403:
 *         description: Not authorized
 *       500:
 *         description: Server error
 *
 * /api/reports/user:
 *   get:
 *     summary: Get user's submitted reports
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
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
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, under_review, resolved, rejected]
 *         description: Filter by report status
 *     responses:
 *       200:
 *         description: List of user's reports
 *       500:
 *         description: Server error
 *
 * /api/reports/{id}:
 *   get:
 *     summary: Get report details
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Report ID
 *     responses:
 *       200:
 *         description: Report details
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Report not found
 *       500:
 *         description: Server error
 *
 *   patch:
 *     summary: Update report status (admin only)
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Report ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [pending, under_review, resolved, rejected]
 *                 description: New status for the report
 *               adminNotes:
 *                 type: string
 *                 description: Admin notes about the report
 *               actionTaken:
 *                 type: string
 *                 enum: [none, warning, content_removed, account_suspended, account_terminated]
 *                 description: Action taken on the report
 *     responses:
 *       200:
 *         description: Report status updated successfully
 *       400:
 *         description: Invalid input
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Report not found
 *       500:
 *         description: Server error
 *
 * /api/reports/content/{contentId}/{contentType}:
 *   get:
 *     summary: Get reports for a specific content (admin only)
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: contentId
 *         required: true
 *         schema:
 *           type: string
 *         description: Content ID
 *       - in: path
 *         name: contentType
 *         required: true
 *         schema:
 *           type: string
 *           enum: [video, short, series, course, comment, channel, user]
 *         description: Content type
 *     responses:
 *       200:
 *         description: List of reports for the content
 *       400:
 *         description: Invalid content type
 *       403:
 *         description: Not authorized
 *       500:
 *         description: Server error
 *
 * /api/reports/stats/overview:
 *   get:
 *     summary: Get reports statistics (admin only)
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Reports statistics
 *       403:
 *         description: Not authorized
 *       500:
 *         description: Server error
 */