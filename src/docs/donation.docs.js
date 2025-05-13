/**
 * @swagger
 * components:
 *   schemas:
 *     Donation:
 *       type: object
 *       required:
 *         - userId
 *         - contentId
 *         - contentType
 *         - amount
 *         - creatorId
 *       properties:
 *         _id:
 *           type: string
 *           description: The auto-generated ID of the donation
 *         userId:
 *           type: string
 *           description: ID of the user making the donation
 *         contentId:
 *           type: string
 *           description: ID of the content being donated to
 *         contentType:
 *           type: string
 *           enum: [video, short, series, course]
 *           description: Type of content being donated to
 *         amount:
 *           type: number
 *           description: Donation amount
 *         currency:
 *           type: string
 *           default: USD
 *           description: Currency of the donation
 *         message:
 *           type: string
 *           description: Optional message from the donor
 *         paymentId:
 *           type: string
 *           description: ID of the payment transaction
 *         status:
 *           type: string
 *           enum: [pending, completed, failed]
 *           default: pending
 *           description: Status of the donation
 *         creatorId:
 *           type: string
 *           description: ID of the content creator receiving the donation
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: When the donation was created
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: When the donation was last updated
 * 
 * tags:
 *   - name: Donations
 *     description: API for managing donations to content creators
 *
 * /api/donations:
 *   post:
 *     summary: Create a new donation
 *     tags: [Donations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - contentId
 *               - contentType
 *               - amount
 *             properties:
 *               contentId:
 *                 type: string
 *                 description: ID of the content being donated to
 *               contentType:
 *                 type: string
 *                 enum: [video, short, series, course]
 *                 description: Type of content being donated to
 *               amount:
 *                 type: number
 *                 description: Donation amount
 *               currency:
 *                 type: string
 *                 default: USD
 *                 description: Currency of the donation
 *               message:
 *                 type: string
 *                 description: Optional message from the donor
 *     responses:
 *       201:
 *         description: Donation created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 donation:
 *                   $ref: '#/components/schemas/Donation'
 *       400:
 *         description: Invalid input
 *       404:
 *         description: Content not found
 *       500:
 *         description: Server error
 *
 * /api/donations/process:
 *   post:
 *     summary: Process a donation payment
 *     tags: [Donations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - donationId
 *               - paymentId
 *             properties:
 *               donationId:
 *                 type: string
 *                 description: ID of the donation to process
 *               paymentId:
 *                 type: string
 *                 description: ID of the payment transaction
 *     responses:
 *       200:
 *         description: Donation processed successfully
 *       404:
 *         description: Donation not found
 *       500:
 *         description: Server error
 *
 * /api/donations/user:
 *   get:
 *     summary: Get all donations made by the current user
 *     tags: [Donations]
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
 *     responses:
 *       200:
 *         description: List of user's donations
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 donations:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Donation'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     page:
 *                       type: integer
 *                     pages:
 *                       type: integer
 *       500:
 *         description: Server error
 *
 * /api/donations/creator:
 *   get:
 *     summary: Get all donations received by the current creator
 *     tags: [Donations]
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
 *     responses:
 *       200:
 *         description: List of donations received by the creator
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 donations:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Donation'
 *                 stats:
 *                   type: object
 *                   properties:
 *                     totalDonations:
 *                       type: integer
 *                     totalAmount:
 *                       type: number
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     page:
 *                       type: integer
 *                     pages:
 *                       type: integer
 *       500:
 *         description: Server error
 *
 * /api/donations/content/{contentId}/{contentType}:
 *   get:
 *     summary: Get all donations for a specific content
 *     tags: [Donations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: contentId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the content
 *       - in: path
 *         name: contentType
 *         required: true
 *         schema:
 *           type: string
 *           enum: [video, short, series, course]
 *         description: Type of content
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
 *         description: List of donations for the content
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 donations:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Donation'
 *                 stats:
 *                   type: object
 *                   properties:
 *                     totalDonations:
 *                       type: integer
 *                     totalAmount:
 *                       type: number
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     page:
 *                       type: integer
 *                     pages:
 *                       type: integer
 *       500:
 *         description: Server error
 */