/**
 * @swagger
 * components:
 *   schemas:
 *     Slider:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: The slider ID
 *         title:
 *           type: string
 *           description: The slider title
 *         image:
 *           type: string
 *           description: URL to the slider image
 *         associatedContent:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               content:
 *                 type: string
 *                 description: ID of the associated content
 *               order:
 *                 type: number
 *                 description: Display order of the content
 *         status:
 *           type: string
 *           enum: [active, inactive]
 *           description: Current status of the slider
 *         createdBy:
 *           type: string
 *           description: ID of the admin who created the slider
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Creation timestamp
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Last update timestamp
 *
 * /api/sliders:
 *   post:
 *     summary: Create a new slider (Admin only)
 *     tags: [Sliders]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - image
 *             properties:
 *               title:
 *                 type: string
 *                 description: Slider title
 *               image:
 *                 type: string
 *                 description: URL to slider image
 *               associatedContent:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     content:
 *                       type: string
 *                       description: ID of the content
 *                     order:
 *                       type: number
 *                       description: Display order
 *               status:
 *                 type: string
 *                 enum: [active, inactive]
 *                 default: active
 *     responses:
 *       200:
 *         description: Slider created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/Slider'
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - not an admin
 *       500:
 *         description: Server error
 *
 *   get:
 *     summary: Get all sliders (Admin only)
 *     tags: [Sliders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, inactive]
 *         description: Filter by status
 *     responses:
 *       200:
 *         description: List of sliders
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 count:
 *                   type: integer
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Slider'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - not an admin
 *       500:
 *         description: Server error
 *
 * /api/sliders/{sliderId}:
 *   get:
 *     summary: Get slider by ID (Admin only)
 *     tags: [Sliders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sliderId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the slider
 *     responses:
 *       200:
 *         description: Slider details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Slider'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - not an admin
 *       404:
 *         description: Slider not found
 *       500:
 *         description: Server error
 *
 *   put:
 *     summary: Update a slider (Admin only)
 *     tags: [Sliders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sliderId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the slider
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               image:
 *                 type: string
 *               associatedContent:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     content:
 *                       type: string
 *                     order:
 *                       type: number
 *               status:
 *                 type: string
 *                 enum: [active, inactive]
 *     responses:
 *       200:
 *         description: Slider updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/Slider'
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - not an admin
 *       404:
 *         description: Slider not found
 *       500:
 *         description: Server error
 *
 *   delete:
 *     summary: Delete a slider (Admin only)
 *     tags: [Sliders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sliderId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the slider
 *     responses:
 *       200:
 *         description: Slider deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - not an admin
 *       404:
 *         description: Slider not found
 *       500:
 *         description: Server error
 *
 * /api/sliders/active:
 *   get:
 *     summary: Get all active sliders (Public)
 *     tags: [Sliders]
 *     responses:
 *       200:
 *         description: List of active sliders
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 count:
 *                   type: integer
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Slider'
 *       500:
 *         description: Server error
 */