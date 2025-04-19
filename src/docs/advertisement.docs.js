/**
 * @swagger
 * /api/advertisements:
 *   post:
 *     summary: Create new advertisement (Admin only)
 *     tags: [Advertisements]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [name, startDate, endDate, thumbnail, videoFile, targetUrl]
 *             properties:
 *               name:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [active, inactive, scheduled]
 *                 default: active
 *               startDate:
 *                 type: string
 *                 format: date-time
 *               endDate:
 *                 type: string
 *                 format: date-time
 *               thumbnail:
 *                 type: string
 *                 format: binary
 *                 description: Advertisement thumbnail image
 *               videoFile:
 *                 type: string
 *                 format: binary
 *                 description: Advertisement video file
 *               targetUrl:
 *                 type: string
 *               deviceType:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [web, app, both]
 *     responses:
 *       201:
 *         description: Advertisement created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 advertisement:
 *                   $ref: '#/components/schemas/Advertisement'
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 * 
 *   get:
 *     summary: Get all advertisements
 *     tags: [Advertisements]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, inactive, scheduled]
 *         description: Filter by status
 *       - in: query
 *         name: deviceType
 *         schema:
 *           type: string
 *           enum: [web, app, both]
 *         description: Filter by device type
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
 *                 advertisements:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Advertisement'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     pages:
 *                       type: integer
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 * 
 * /api/advertisements/{id}:
 *   get:
 *     summary: Get advertisement by ID
 *     tags: [Advertisements]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Advertisement ID
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
 *                 advertisement:
 *                   $ref: '#/components/schemas/Advertisement'
 *       404:
 *         description: Advertisement not found
 * 
 *   put:
 *     summary: Update advertisement (Admin only)
 *     tags: [Advertisements]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Advertisement ID
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [active, inactive, scheduled]
 *               startDate:
 *                 type: string
 *                 format: date-time
 *               endDate:
 *                 type: string
 *                 format: date-time
 *               thumbnail:
 *                 type: string
 *                 format: binary
 *               videoFile:
 *                 type: string
 *                 format: binary
 *               targetUrl:
 *                 type: string
 *               deviceType:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [web, app, both]
 *     responses:
 *       200:
 *         description: Advertisement updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 advertisement:
 *                   $ref: '#/components/schemas/Advertisement'
 *       404:
 *         description: Advertisement not found
 *       401:
 *         description: Unauthorized
 * 
 *   delete:
 *     summary: Delete advertisement (Admin only)
 *     tags: [Advertisements]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Advertisement ID
 *     responses:
 *       200:
 *         description: Advertisement deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       404:
 *         description: Advertisement not found
 *       401:
 *         description: Unauthorized
 *
 * /api/advertisements/{id}/impressions:
 *   post:
 *     summary: Increment advertisement impressions
 *     tags: [Advertisements]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Advertisement ID
 *     responses:
 *       200:
 *         description: Impression recorded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 impressions:
 *                   type: integer
 *       404:
 *         description: Advertisement not found
 *
 * components:
 *   schemas:
 *     Advertisement:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         name:
 *           type: string
 *         status:
 *           type: string
 *           enum: [active, inactive, scheduled]
 *         startDate:
 *           type: string
 *           format: date-time
 *         endDate:
 *           type: string
 *           format: date-time
 *         thumbnail:
 *           type: string
 *         videoUrl:
 *           type: string
 *         duration:
 *           type: number
 *           description: Video duration in seconds
 *         targetUrl:
 *           type: string
 *         deviceType:
 *           type: array
 *           items:
 *             type: string
 *             enum: [web, app, both]
 *         impressions:
 *           type: integer
 *           default: 0
 *           description: Number of times the advertisement was viewed
 *         isActive:
 *           type: boolean
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */