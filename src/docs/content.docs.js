/**
 * @swagger
 * components:
 *   schemas:
 *     Cast:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         name:
 *           type: string
 *           description: Name of the cast member
 *         photo:
 *           type: string
 *           description: URL to the cast member's photo
 *         roleType:
 *           type: string
 *           description: Role of the cast member in the content
 *
 *     Crew:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         name:
 *           type: string
 *           description: Name of the crew member
 *         photo:
 *           type: string
 *           description: URL to the crew member's photo
 *         roleType:
 *           type: string
 *           enum: [Director, Producer, Writer, Cinematographer, Editor, Other]
 *           description: Role of the crew member in the content
 *
 *     MediaAssets:
 *       type: object
 *       properties:
 *         verticalBanner:
 *           type: string
 *           description: URL to the vertical banner image
 *         horizontalBanner:
 *           type: string
 *           description: URL to the horizontal banner image
 *         trailer:
 *           type: string
 *           description: URL to the trailer video
 *         trailerDuration:
 *           type: number
 *           description: Duration of the trailer in seconds
 *
 *     Content:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         contentType:
 *           type: string
 *           enum: [Movie, Series, Documentary, Short Film]
 *         filmTitle:
 *           type: string
 *         ageRating:
 *           type: string
 *           enum: [G, PG, PG-13, R, NC-17, TV-Y, TV-Y7, TV-G, TV-PG, TV-14, TV-MA]
 *         description:
 *           type: string
 *         duration:
 *           type: number
 *           description: Duration in seconds
 *         videoUrl:
 *           type: string
 *         cast:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Cast'
 *         crew:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Crew'
 *         mediaAssets:
 *           $ref: '#/components/schemas/MediaAssets'
 *         channel:
 *           type: string
 *           description: ID of the channel this content belongs to
 *         status:
 *           type: string
 *           enum: [processing, published, failed]
 *         views:
 *           type: number
 *         isActive:
 *           type: boolean
 *         releaseYear:
 *           type: number
 *         genres:
 *           type: array
 *           items:
 *             type: string
 *             description: Genre ID
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *
 * /api/content:
 *   post:
 *     summary: Create new content (Creator/Admin only)
 *     tags: [Content]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [contentType, filmTitle, ageRating, description, videoFile, channel]
 *             properties:
 *               contentType:
 *                 type: string
 *                 enum: [Movie, Series, Documentary, Short Film]
 *               filmTitle:
 *                 type: string
 *               ageRating:
 *                 type: string
 *                 enum: [G, PG, PG-13, R, NC-17, TV-Y, TV-Y7, TV-G, TV-PG, TV-14, TV-MA]
 *               description:
 *                 type: string
 *               videoFile:
 *                 type: string
 *                 format: binary
 *                 description: Main video file (max 500MB)
 *               channel:
 *                 type: string
 *                 description: Channel ID
 *               releaseYear:
 *                 type: number
 *               genres:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of genre IDs
 *               verticalBanner:
 *                 type: string
 *                 format: binary
 *               horizontalBanner:
 *                 type: string
 *                 format: binary
 *               trailerFile:
 *                 type: string
 *                 format: binary
 *                 description: Trailer video file (max 100MB)
 *               cast:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                     roleType:
 *                       type: string
 *               castPhoto_0:
 *                 type: string
 *                 format: binary
 *                 description: Photo for first cast member
 *               castPhoto_1:
 *                 type: string
 *                 format: binary
 *                 description: Photo for second cast member
 *               crew:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                     roleType:
 *                       type: string
 *                       enum: [Director, Producer, Writer, Cinematographer, Editor, Other]
 *               crewPhoto_0:
 *                 type: string
 *                 format: binary
 *                 description: Photo for first crew member
 *               crewPhoto_1:
 *                 type: string
 *                 format: binary
 *                 description: Photo for second crew member
 *     responses:
 *       201:
 *         description: Content created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 content:
 *                   $ref: '#/components/schemas/Content'
 *       400:
 *         description: Invalid input or file size exceeds limit
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - User is not a creator or admin
 *
 *   get:
 *     summary: Get all content with pagination and filters
 *     tags: [Content]
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
 *         name: contentType
 *         schema:
 *           type: string
 *           enum: [Movie, Series, Documentary, Short Film]
 *         description: Filter by content type
 *       - in: query
 *         name: channel
 *         schema:
 *           type: string
 *         description: Filter by channel ID
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
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Content'
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
 * /api/content/{id}:
 *   get:
 *     summary: Get content by ID
 *     tags: [Content]
 *     parameters:
 *       - in: path
 *         name: id
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
 *                   $ref: '#/components/schemas/Content'
 *       404:
 *         description: Content not found
 *
 *   put:
 *     summary: Update content (Creator/Admin only)
 *     tags: [Content]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Content ID
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               contentType:
 *                 type: string
 *                 enum: [Movie, Series, Documentary, Short Film]
 *               filmTitle:
 *                 type: string
 *               ageRating:
 *                 type: string
 *                 enum: [G, PG, PG-13, R, NC-17, TV-Y, TV-Y7, TV-G, TV-PG, TV-14, TV-MA]
 *               description:
 *                 type: string
 *               videoFile:
 *                 type: string
 *                 format: binary
 *                 description: Main video file (max 500MB)
 *               releaseYear:
 *                 type: number
 *               genres:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of genre IDs
 *               verticalBanner:
 *                 type: string
 *                 format: binary
 *               horizontalBanner:
 *                 type: string
 *                 format: binary
 *               trailerFile:
 *                 type: string
 *                 format: binary
 *                 description: Trailer video file (max 100MB)
 *               cast:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                     roleType:
 *                       type: string
 *               castPhoto_0:
 *                 type: string
 *                 format: binary
 *               crew:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                     roleType:
 *                       type: string
 *                       enum: [Director, Producer, Writer, Cinematographer, Editor, Other]
 *               crewPhoto_0:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Content updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 content:
 *                   $ref: '#/components/schemas/Content'
 *       400:
 *         description: Invalid input or file size exceeds limit
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - User is not a creator or admin
 *       404:
 *         description: Content not found
 *
 *   delete:
 *     summary: Delete content (Creator/Admin only)
 *     tags: [Content]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Content ID
 *     responses:
 *       200:
 *         description: Content deleted successfully
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
 *         description: Forbidden - User is not a creator or admin
 *       404:
 *         description: Content not found
 *
 * /api/content/{id}/views:
 *   post:
 *     summary: Increment view count for content
 *     tags: [Content]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Content ID
 *     responses:
 *       200:
 *         description: View count incremented successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 views:
 *                   type: integer
 *       404:
 *         description: Content not found
 */