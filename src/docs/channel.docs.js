/**
 * @swagger
 * /api/channels/dashboard:
 *   get:
 *     summary: Get channel dashboard statistics (Admin only)
 *     tags: [Channels]
 *     security:
 *       - bearerAuth: []
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
 *                 stats:
 *                   type: object
 *                   properties:
 *                     totalChannels:
 *                       type: number
 *                     activeChannels:
 *                       type: number
 *                     inactiveChannels:
 *                       type: number
 *                     suspendedChannels:
 *                       type: number
 * 
 * /api/channels:
 *   get:
 *     summary: Get all channels with pagination and search
 *     tags: [Channels]
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
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by channel name or owner name
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, inactive, suspended]
 *         description: Filter by channel status
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [free, paid]
 *         description: Filter by channel type
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
 *                 channels:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Channel'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: number
 *                     pages:
 *                       type: number
 *                     page:
 *                       type: number
 *                     limit:
 *                       type: number
 * 
 *   post:
 *     summary: Create new channel (Admin only)
 *     tags: [Channels]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [name, type, thumbnail]
 *             properties:
 *               name:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [free, paid]
 *               price:
 *                 type: number
 *               thumbnail:
 *                 type: string
 *                 format: binary
 *                 description: Channel thumbnail image
 *               owner:
 *                 type: object
 *                 properties:
 *                   name:
 *                     type: string
 *                   email:
 *                     type: string
 *                   stripeAccountId:
 *                     type: string
 *     responses:
 *       201:
 *         description: Channel created successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 * 
 * /api/channels/{id}:
 *   get:
 *     summary: Get channel by ID
 *     tags: [Channels]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
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
 *                 channel:
 *                   $ref: '#/components/schemas/Channel'
 * 
 *   put:
 *     summary: Update channel (Admin only)
 *     tags: [Channels]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Channel'
 *     responses:
 *       200:
 *         description: Channel updated successfully
 *       404:
 *         description: Channel not found
 * 
 *   delete:
 *     summary: Delete channel (Admin only)
 *     tags: [Channels]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Channel deleted successfully
 *       404:
 *         description: Channel not found
 * 
 * /api/channels/{id}/stats:
 *   get:
 *     summary: Get channel statistics (Admin only)
 *     tags: [Channels]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
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
 *                 stats:
 *                   type: object
 *                   properties:
 *                     totalSubscribers:
 *                       type: number
 *                     totalRevenue:
 *                       type: number
 * 
 * components:
 *   schemas:
 *     Channel:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         name:
 *           type: string
 *         thumbnail:
 *           type: string
 *         status:
 *           type: string
 *           enum: [active, inactive, suspended]
 *         type:
 *           type: string
 *           enum: [free, paid]
 *         price:
 *           type: number
 *         owner:
 *           type: object
 *           properties:
 *             name:
 *               type: string
 *             stripeAccountId:
 *               type: string
 *             email:
 *               type: string
 *         isActive:
 *           type: boolean
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */