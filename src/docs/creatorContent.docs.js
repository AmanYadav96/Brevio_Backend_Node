/**
 * @swagger
 * components:
 *   schemas:
 *     CreatorContent:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: The content ID
 *         title:
 *           type: string
 *           description: Content title
 *         description:
 *           type: string
 *           description: Content description
 *         contentType:
 *           type: string
 *           enum: [shortFilm, series, educational]
 *           description: Type of content
 *         orientation:
 *           type: string
 *           enum: [vertical, horizontal]
 *           description: Video orientation (vertical for reels, horizontal for streaming)
 *         creator:
 *           type: string
 *           description: ID of the creator user
 *         channel:
 *           type: string
 *           description: ID of the channel
 *         videoUrl:
 *           type: string
 *           description: URL to video file (for short films)
 *         duration:
 *           type: number
 *           description: Duration in seconds
 *         seasons:
 *           type: array
 *           description: Seasons (for series)
 *           items:
 *             $ref: '#/components/schemas/Season'
 *         lessons:
 *           type: array
 *           description: Lessons (for educational content)
 *           items:
 *             $ref: '#/components/schemas/Lesson'
 *         pricing:
 *           $ref: '#/components/schemas/Pricing'
 *         mediaAssets:
 *           $ref: '#/components/schemas/MediaAssets'
 *         genres:
 *           type: array
 *           items:
 *             type: string
 *           description: Genre IDs
 *         tags:
 *           type: array
 *           items:
 *             type: string
 *           description: Content tags
 *         ageRating:
 *           type: string
 *           enum: [G, PG, PG-13, R, NC-17, TV-Y, TV-Y7, TV-G, TV-PG, TV-14, TV-MA]
 *           description: Age rating
 *         status:
 *           type: string
 *           enum: [draft, processing, published, rejected, archived]
 *           description: Content status
 *         isActive:
 *           type: boolean
 *           description: Whether content is active
 *         releaseYear:
 *           type: number
 *           description: Year of release
 *         views:
 *           type: number
 *           description: View count
 *         likes:
 *           type: number
 *           description: Like count
 *         videoMetadata:
 *           $ref: '#/components/schemas/VideoMetadata'
 *         adminApproved:
 *           type: boolean
 *           description: Whether content is approved by admin
 *         rejectionReason:
 *           type: string
 *           description: Reason for rejection
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Creation timestamp
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Last update timestamp
 *
 *     Season:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: Season ID
 *         title:
 *           type: string
 *           description: Season title
 *         description:
 *           type: string
 *           description: Season description
 *         seasonNumber:
 *           type: number
 *           description: Season number
 *         episodes:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Episode'
 *         thumbnail:
 *           type: string
 *           description: Season thumbnail URL
 *
 *     Episode:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: Episode ID
 *         title:
 *           type: string
 *           description: Episode title
 *         description:
 *           type: string
 *           description: Episode description
 *         videoUrl:
 *           type: string
 *           description: URL to video file
 *         duration:
 *           type: number
 *           description: Duration in seconds
 *         thumbnail:
 *           type: string
 *           description: Episode thumbnail URL
 *         episodeNumber:
 *           type: number
 *           description: Episode number
 *
 *     Lesson:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: Lesson ID
 *         title:
 *           type: string
 *           description: Lesson title
 *         description:
 *           type: string
 *           description: Lesson description
 *         videoUrl:
 *           type: string
 *           description: URL to video file
 *         duration:
 *           type: number
 *           description: Duration in seconds
 *         thumbnail:
 *           type: string
 *           description: Lesson thumbnail URL
 *         order:
 *           type: number
 *           description: Lesson order
 *         isFree:
 *           type: boolean
 *           description: Whether lesson is free
 *
 *     Pricing:
 *       type: object
 *       properties:
 *         model:
 *           type: string
 *           enum: [free, paid, subscription]
 *           description: Pricing model
 *         price:
 *           type: number
 *           description: Price amount
 *         currency:
 *           type: string
 *           description: Currency code
 *         discountPrice:
 *           type: number
 *           description: Discounted price
 *         discountValidUntil:
 *           type: string
 *           format: date-time
 *           description: Discount expiration date
 *
 *     MediaAssets:
 *       type: object
 *       properties:
 *         thumbnail:
 *           type: string
 *           description: Thumbnail URL
 *         verticalBanner:
 *           type: string
 *           description: Vertical banner URL
 *         horizontalBanner:
 *           type: string
 *           description: Horizontal banner URL
 *         trailer:
 *           type: string
 *           description: Trailer URL
 *         trailerDuration:
 *           type: number
 *           description: Trailer duration in seconds
 *
 *     VideoMetadata:
 *       type: object
 *       properties:
 *         width:
 *           type: number
 *           description: Video width in pixels
 *         height:
 *           type: number
 *           description: Video height in pixels
 *         aspectRatio:
 *           type: string
 *           description: Video aspect ratio
 *         format:
 *           type: string
 *           description: Video format
 *         bitrate:
 *           type: number
 *           description: Video bitrate
 *
 * /api/creator-content:
 *   post:
 *     summary: Create new content
 *     tags: [Creator Content]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - description
 *               - contentType
 *               - orientation
 *               - channel
 *               - ageRating
 *               - thumbnail
 *             properties:
 *               title:
 *                 type: string
 *                 description: Content title
 *               description:
 *                 type: string
 *                 description: Content description
 *               contentType:
 *                 type: string
 *                 enum: [shortFilm, series, educational]
 *                 description: Type of content
 *               orientation:
 *                 type: string
 *                 enum: [vertical, horizontal]
 *                 description: Video orientation
 *               channel:
 *                 type: string
 *                 description: Channel ID
 *               ageRating:
 *                 type: string
 *                 enum: [G, PG, PG-13, R, NC-17, TV-Y, TV-Y7, TV-G, TV-PG, TV-14, TV-MA]
 *                 description: Age rating
 *               genres:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Genre IDs
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Content tags
 *               releaseYear:
 *                 type: number
 *                 description: Year of release
 *               videoFile:
 *                 type: string
 *                 format: binary
 *                 description: Video file (required for short films)
 *               thumbnail:
 *                 type: string
 *                 format: binary
 *                 description: Thumbnail image
 *               verticalBanner:
 *                 type: string
 *                 format: binary
 *                 description: Vertical banner image
 *               horizontalBanner:
 *                 type: string
 *                 format: binary
 *                 description: Horizontal banner image
 *               trailer:
 *                 type: string
 *                 format: binary
 *                 description: Trailer video
 *               pricing:
 *                 type: object
 *                 properties:
 *                   model:
 *                     type: string
 *                     enum: [free, paid, subscription]
 *                     description: Pricing model
 *                   price:
 *                     type: number
 *                     description: Price amount
 *                   currency:
 *                     type: string
 *                     description: Currency code
 *                   discountPrice:
 *                     type: number
 *                     description: Discounted price
 *                   discountValidUntil:
 *                     type: string
 *                     format: date-time
 *                     description: Discount expiration date
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
 *                   example: true
 *                 content:
 *                   $ref: '#/components/schemas/CreatorContent'
 *                 message:
 *                   type: string
 *                   example: Content submitted for review
 *       400:
 *         description: Invalid input or orientation mismatch
 *       403:
 *         description: Unauthorized
 *
 *   get:
 *     summary: Get all content
 *     tags: [Creator Content]
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
 *         description: Items per page
 *       - in: query
 *         name: contentType
 *         schema:
 *           type: string
 *           enum: [shortFilm, series, educational]
 *         description: Filter by content type
 *       - in: query
 *         name: orientation
 *         schema:
 *           type: string
 *           enum: [vertical, horizontal]
 *         description: Filter by orientation
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [draft, processing, published, rejected, archived]
 *         description: Filter by status
 *       - in: query
 *         name: creatorId
 *         schema:
 *           type: string
 *         description: Filter by creator ID
 *       - in: query
 *         name: channelId
 *         schema:
 *           type: string
 *         description: Filter by channel ID
 *       - in: query
 *         name: genre
 *         schema:
 *           type: string
 *         description: Filter by genre ID
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in title, description, and tags
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           default: createdAt
 *         description: Sort field
 *       - in: query
 *         name: order
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order
 *     responses:
 *       200:
 *         description: List of content
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 content:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/CreatorContent'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     pages:
 *                       type: integer
 *
 * /api/creator-content/{contentId}:
 *   get:
 *     summary: Get content by ID
 *     tags: [Creator Content]
 *     parameters:
 *       - in: path
 *         name: contentId
 *         required: true
 *         schema:
 *           type: string
 *         description: Content ID
 *     responses:
 *       200:
 *         description: Content details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 content:
 *                   $ref: '#/components/schemas/CreatorContent'
 *       404:
 *         description: Content not found
 *
 * /api/creator-content/{contentId}/seasons/{seasonId}/episodes:
 *   post:
 *     summary: Add episode to series
 *     tags: [Creator Content]
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
 *         name: seasonId
 *         required: true
 *         schema:
 *           type: string
 *         description: Season ID
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - description
 *               - episodeNumber
 *               - videoFile
 *             properties:
 *               title:
 *                 type: string
 *                 description: Episode title
 *               description:
 *                 type: string
 *                 description: Episode description
 *               episodeNumber:
 *                 type: number
 *                 description: Episode number
 *               videoFile:
 *                 type: string
 *                 format: binary
 *                 description: Video file
 *               thumbnail:
 *                 type: string
 *                 format: binary
 *                 description: Thumbnail image
 *     responses:
 *       200:
 *         description: Episode added successfully
 *       400:
 *         description: Invalid input or orientation mismatch
 *       403:
 *         description: Unauthorized
 *       404:
 *         description: Content or season not found
 *
 * /api/creator-content/{contentId}/lessons:
 *   post:
 *     summary: Add lesson to educational content
 *     tags: [Creator Content]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: contentId
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
 *             required:
 *               - title
 *               - description
 *               - videoFile
 *             properties:
 *               title:
 *                 type: string
 *                 description: Lesson title
 *               description:
 *                 type: string
 *                 description: Lesson description
 *               videoFile:
 *                 type: string
 *                 format: binary
 *                 description: Video file
 *               thumbnail:
 *                 type: string
 *                 format: binary
 *                 description: Thumbnail image
 *               isFree:
 *                 type: boolean
 *                 description: Whether lesson is free
 *     responses:
 *       200:
 *         description: Lesson added successfully
 *       400:
 *         description: Invalid input or orientation mismatch
 *       403:
 *         description: Unauthorized
 *       404:
 *         description: Content not found
 *
 * /api/creator-content/{contentId}/approve:
 *   patch:
 *     summary: Approve content (admin only)
 *     tags: [Creator Content]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: contentId
 *         required: true
 *         schema:
 *           type: string
 *         description: Content ID
 *     responses:
 *       200:
 *         description: Content approved successfully
 *       403:
 *         description: Unauthorized
 *       404:
 *         description: Content not found
 *
 * /api/creator-content/{contentId}/reject:
 *   patch:
 *     summary: Reject content (admin only)
 *     tags: [Creator Content]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: contentId
 *         required: true
 *         schema:
 *           type: string
 *         description: Content ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *                 description: Rejection reason
 *     responses:
 *       200:
 *         description: Content rejected successfully
 *       403:
 *         description: Unauthorized
 *       404:
 *         description: Content not found
 *
 * /api/creator-content/{contentId}/purchase:
 *   post:
 *     summary: Purchase educational content
 *     tags: [Creator Content]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: contentId
 *         required: true
 *         schema:
 *           type: string
 *         description: Content ID
 *     responses:
 *       200:
 *         description: Purchase flow initiated
 *       400:
 *         description: Content not available for purchase
 *       404:
 *         description: Content not found
 */
/**
 * @swagger
 * /api/creator-content/basic:
 *   post:
 *     summary: Create basic content with metadata only
 *     tags: [Creator Content]
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
 *               - description
 *               - contentType
 *               - orientation
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               contentType:
 *                 type: string
 *                 enum: [shortFilm, series, educational]
 *               orientation:
 *                 type: string
 *                 enum: [horizontal, vertical]
 *               genre:
 *                 type: string
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *               ageRating:
 *                 type: string
 *     responses:
 *       201:
 *         description: Content draft created successfully
 *       400:
 *         description: Invalid input data
 *       403:
 *         description: Not authorized
 *
 * /api/creator-content/{contentId}/video:
 *   post:
 *     summary: Upload main video for content
 *     tags: [Creator Content]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: contentId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               videoFile:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Video uploaded successfully
 *       400:
 *         description: Invalid input data
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Content not found
 *
 * /api/creator-content/{contentId}/media:
 *   post:
 *     summary: Upload media assets for content
 *     tags: [Creator Content]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: contentId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               thumbnail:
 *                 type: string
 *                 format: binary
 *               verticalBanner:
 *                 type: string
 *                 format: binary
 *               horizontalBanner:
 *                 type: string
 *                 format: binary
 *               trailer:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Media assets uploaded successfully
 *       400:
 *         description: Invalid input data
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Content not found
 */