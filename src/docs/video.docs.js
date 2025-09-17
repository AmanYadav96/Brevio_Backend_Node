/**
 * @swagger
 * components:
 *   schemas:
 *     Video:
       type: object
       properties:
         _id:
           type: string
           description: Video ID
         title:
           type: string
           description: Video title
         description:
           type: string
           description: Video description
         contentType:
           type: string
           enum: [TV Series, Movie, Documentary, Short Film, Web Series, Music Video, Other]
           description: Type of video content
         thumbnail:
           type: string
           description: Video thumbnail URL
         videoUrl:
           type: string
           description: Video file URL
         duration:
           type: number
           description: Video duration in seconds
         views:
           type: number
           description: Total view count
         channel:
           $ref: '#/components/schemas/Channel'
         ageRating:
           type: string
           enum: [All Ages, 13+, 16+, 18+]
           description: Age rating for the video content
         genre:
           $ref: '#/components/schemas/Genre'
         cast:
           type: array
           items:
             $ref: '#/components/schemas/CastMember'
           description: List of cast members
         crew:
           type: array
           items:
             $ref: '#/components/schemas/CrewMember'
           description: List of crew members
         mediaAssets:
           $ref: '#/components/schemas/MediaAssets'
         status:
           type: string
           enum: [processing, published, failed]
           description: Video processing status
         isActive:
           type: boolean
           description: Whether video is active
         likesCount:
           type: number
           description: Total likes count
         commentsCount:
           type: number
           description: Total comments count
         viewsCount:
           type: number
           description: Total views count
         userLiked:
           type: boolean
           description: Whether current user liked the video
         userViewed:
           type: boolean
           description: Whether current user viewed the video
         createdAt:
           type: string
           format: date-time
         updatedAt:
           type: string
           format: date-time
 *     Genre:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         name:
 *           type: string
 *         description:
 *           type: string
 *     CastMember:
 *       type: object
 *       properties:
 *         photo:
 *           type: string
 *           description: Cast member photo URL
 *         name:
 *           type: string
 *           description: Cast member name
 *         roleType:
 *           type: string
 *           enum: [Actor, Actress, Voice, Narrator, Host, Other]
 *           description: Type of role in the production
 *     CrewMember:
 *       type: object
 *       properties:
 *         photo:
 *           type: string
 *           description: Crew member photo URL
 *         name:
 *           type: string
 *           description: Crew member name
 *         roleType:
 *           type: string
 *           enum: [Director, Producer, Writer, Cinematographer, Editor, Music Director, Sound Designer, Other]
 *           description: Type of role in the production
 *     MediaAssets:
 *       type: object
 *       properties:
 *         verticalBanner:
 *           type: string
 *           description: Vertical banner image URL
 *         horizontalBanner:
 *           type: string
 *           description: Horizontal banner image URL
 *         trailer:
 *           type: string
 *           description: Trailer video URL
 *     Channel:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         name:
 *           type: string
 *         description:
 *           type: string
 *         owner:
 *           $ref: '#/components/schemas/User'
 *     User:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         name:
 *           type: string
 *         profilePicture:
 *           type: string
 *     VideoStats:
 *       type: object
 *       properties:
 *         likesCount:
 *           type: number
 *         commentsCount:
 *           type: number
 *         viewsCount:
 *           type: number
 *         engagementRate:
 *           type: number
 *           description: Engagement rate percentage
 *         totalInteractions:
 *           type: number
 *           description: Total likes + comments
 */

/**
 * @swagger
 * /api/videos:
 *   get:
 *     summary: Get all videos with filtering and pagination
 *     tags: [Videos]
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
 *         description: Number of videos per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term for title and description
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [processing, published, failed]
 *         description: Filter by video status
 *       - in: query
 *         name: channelId
 *         schema:
 *           type: string
 *         description: Filter by channel ID
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [createdAt, views, title]
 *           default: createdAt
 *         description: Sort field
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter videos from this date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter videos until this date
 *     responses:
 *       200:
 *         description: Videos retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 videos:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Video'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: number
 *                     page:
 *                       type: number
 *                     pages:
 *                       type: number
 *                     hasNext:
 *                       type: boolean
 *                     hasPrev:
 *                       type: boolean
 *       500:
 *         description: Server error
 *   post:
 *     summary: Create new video
 *     tags: [Videos]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
       required: true
       content:
         application/json:
           schema:
             type: object
             required: [title, description, contentType, thumbnail, videoUrl, channelId, ageRating, genreId]
             properties:
               title:
                 type: string
                 description: Video title
               description:
                 type: string
                 description: Video description
               contentType:
                 type: string
                 enum: [TV Series, Movie, Documentary, Short Film, Web Series, Music Video, Other]
                 description: Type of video content
               thumbnail:
                 type: string
                 description: Video thumbnail URL
               videoUrl:
                 type: string
                 description: Video file URL
               channelId:
                 type: string
                 description: Channel ID where video will be published
               ageRating:
                 type: string
                 enum: [All Ages, 13+, 16+, 18+]
                 description: Age rating for the video content
               genreId:
                 type: string
                 description: Genre ID for the video
               cast:
                 type: array
                 items:
                   type: object
                   required: [name, roleType]
                   properties:
                     photo:
                       type: string
                       description: Cast member photo URL
                     name:
                       type: string
                       description: Cast member name
                     roleType:
                       type: string
                       enum: [Actor, Actress, Voice, Narrator, Host, Other]
                       description: Type of role in the production
                 description: List of cast members
               crew:
                 type: array
                 items:
                   type: object
                   required: [name, roleType]
                   properties:
                     photo:
                       type: string
                       description: Crew member photo URL
                     name:
                       type: string
                       description: Crew member name
                     roleType:
                       type: string
                       enum: [Director, Producer, Writer, Cinematographer, Editor, Music Director, Sound Designer, Other]
                       description: Type of role in the production
                 description: List of crew members
               mediaAssets:
                 type: object
                 properties:
                   verticalBanner:
                     type: string
                     description: Vertical banner image URL
                   horizontalBanner:
                     type: string
                     description: Horizontal banner image URL
                   trailer:
                     type: string
                     description: Trailer video URL
                 description: Media assets for the video
               duration:
                 type: number
                 description: Video duration in seconds
 *     responses:
 *       201:
 *         description: Video created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 video:
 *                   $ref: '#/components/schemas/Video'
 *       400:
 *         description: Invalid input or channel not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Not channel owner
 *       500:
         description: Server error
 */

/**
 * @swagger
 * /api/videos/basic:
 *   post:
 *     summary: Create basic video information (draft)
 *     tags: [Videos]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, description, contentType, ageRating, genreId]
 *             properties:
 *               title:
 *                 type: string
 *                 description: Video title
 *               description:
 *                 type: string
 *                 description: Video description
 *               contentType:
 *                 type: string
 *                 enum: [TV Series, Movie, Documentary, Short Film, Web Series, Music Video, Other]
 *                 description: Type of video content
 *               ageRating:
 *                 type: string
 *                 enum: [All Ages, 13+, 16+, 18+]
 *                 description: Age rating for the video content
 *               genreId:
 *                 type: string
 *                 description: Genre ID for the video
 *               cast:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [name, roleType]
 *                   properties:
 *                     photo:
 *                       type: string
 *                       description: Cast member photo URL
 *                     name:
 *                       type: string
 *                       description: Cast member name
 *                     roleType:
 *                       type: string
 *                       enum: [Actor, Actress, Voice, Narrator, Host, Other]
 *                       description: Type of role in the production
 *               crew:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [name, roleType]
 *                   properties:
 *                     photo:
 *                       type: string
 *                       description: Crew member photo URL
 *                     name:
 *                       type: string
 *                       description: Crew member name
 *                     roleType:
 *                       type: string
 *                       enum: [Director, Producer, Writer, Cinematographer, Editor, Music Director, Sound Designer, Other]
 *                       description: Type of role in the production
 *     responses:
 *       201:
 *         description: Video draft created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 video:
 *                   $ref: '#/components/schemas/Video'
 *       400:
 *         description: Invalid input data
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Not a channel owner
 *       404:
 *         description: Genre not found
 *       500:
 *         description: Server error
 *
 * /api/videos/{videoId}/upload-video:
 *   post:
 *     summary: Upload main video file
 *     tags: [Videos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: videoId
 *         required: true
 *         schema:
 *           type: string
 *         description: Video ID
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [video]
 *             properties:
 *               video:
 *                 type: string
 *                 format: binary
 *                 description: Main video file
 *     responses:
 *       200:
 *         description: Video uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 video:
 *                   $ref: '#/components/schemas/Video'
 *                 uploadProgress:
 *                   type: object
 *                   properties:
 *                     percentage:
 *                       type: number
 *                       description: Upload progress percentage
 *                     status:
 *                       type: string
 *                       enum: [uploading, processing, completed]
 *                       description: Upload status
 *       400:
 *         description: Invalid input or video file
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Not video owner
 *       404:
 *         description: Video not found
 *       500:
 *         description: Server error
 *
 * /api/videos/{videoId}/upload-media-assets:
 *   post:
 *     summary: Upload media assets (banners and trailer)
 *     tags: [Videos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: videoId
 *         required: true
 *         schema:
 *           type: string
 *         description: Video ID
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               verticalBanner:
 *                 type: string
 *                 format: binary
 *                 description: Vertical banner image file
 *               horizontalBanner:
 *                 type: string
 *                 format: binary
 *                 description: Horizontal banner image file
 *               trailer:
 *                 type: string
 *                 format: binary
 *                 description: Trailer video file
 *     responses:
 *       200:
 *         description: Media assets uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 video:
 *                   $ref: '#/components/schemas/Video'
 *                 uploadProgress:
 *                   type: object
 *                   properties:
 *                     verticalBanner:
 *                       type: object
 *                       properties:
 *                         percentage:
 *                           type: number
 *                         status:
 *                           type: string
 *                           enum: [uploading, completed, failed]
 *                     horizontalBanner:
 *                       type: object
 *                       properties:
 *                         percentage:
 *                           type: number
 *                         status:
 *                           type: string
 *                           enum: [uploading, completed, failed]
 *                     trailer:
 *                       type: object
 *                       properties:
 *                         percentage:
 *                           type: number
 *                         status:
 *                           type: string
 *                           enum: [uploading, processing, completed, failed]
 *       400:
 *         description: Invalid input or media files
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Not video owner
 *       404:
 *         description: Video not found
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/videos/search:
 *   get:
 *     summary: Search videos with advanced filtering
 *     tags: [Videos]
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: Search query for title and description
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
 *         description: Number of videos per page
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [processing, published, failed]
 *           default: published
 *         description: Filter by video status
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [relevance, views, duration, createdAt]
 *           default: relevance
 *         description: Sort field
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order
 *       - in: query
 *         name: minDuration
 *         schema:
 *           type: integer
 *         description: Minimum video duration in seconds
 *       - in: query
 *         name: maxDuration
 *         schema:
 *           type: integer
 *         description: Maximum video duration in seconds
 *       - in: query
 *         name: channelId
 *         schema:
 *           type: string
 *         description: Filter by specific channel
 *     responses:
 *       200:
 *         description: Search results retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 searchQuery:
 *                   type: string
 *                 videos:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Video'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: number
 *                     page:
 *                       type: number
 *                     pages:
 *                       type: number
 *                     hasNext:
 *                       type: boolean
 *                     hasPrev:
 *                       type: boolean
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/videos/my-videos:
 *   get:
 *     summary: Get current user's videos
 *     tags: [Videos]
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
 *         description: Number of videos per page
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [processing, published, failed]
 *         description: Filter by video status
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [createdAt, views, title]
 *           default: createdAt
 *         description: Sort field
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order
 *     responses:
 *       200:
 *         description: User videos retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 videos:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Video'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: number
 *                     page:
 *                       type: number
 *                     pages:
 *                       type: number
 *                     hasNext:
 *                       type: boolean
 *                     hasPrev:
 *                       type: boolean
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/videos/channel/{channelId}:
 *   get:
 *     summary: Get videos by channel
 *     tags: [Videos]
 *     parameters:
 *       - in: path
 *         name: channelId
 *         required: true
 *         schema:
 *           type: string
 *         description: Channel ID
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
 *         description: Number of videos per page
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [processing, published, failed]
 *           default: published
 *         description: Filter by video status
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [createdAt, views, title]
 *           default: createdAt
 *         description: Sort field
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order
 *     responses:
 *       200:
 *         description: Channel videos retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 videos:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Video'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: number
 *                     page:
 *                       type: number
 *                     pages:
 *                       type: number
 *                     hasNext:
 *                       type: boolean
 *                     hasPrev:
 *                       type: boolean
 *       400:
 *         description: Invalid channel ID
 *       404:
 *         description: Channel not found
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/videos/{id}:
 *   get:
 *     summary: Get video by ID
 *     tags: [Videos]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Video ID
 *     responses:
 *       200:
 *         description: Video retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 video:
 *                   $ref: '#/components/schemas/Video'
 *       400:
 *         description: Invalid video ID
 *       404:
 *         description: Video not found
 *       500:
 *         description: Server error
 *   put:
 *     summary: Update video
 *     tags: [Videos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Video ID
 *     requestBody:
       required: true
       content:
         application/json:
           schema:
             type: object
             properties:
               title:
                 type: string
                 description: Video title
               description:
                 type: string
                 description: Video description
               thumbnail:
                 type: string
                 description: Video thumbnail URL
               duration:
                 type: number
                 description: Video duration in seconds
               contentType:
                 type: string
                 enum: [TV Series, Movie, Documentary, Short Film, Web Series, Music Video, Other]
                 description: Type of video content
               ageRating:
                 type: string
                 enum: [All Ages, 13+, 16+, 18+]
                 description: Age rating for the video
               genre:
                 type: string
                 description: Genre ID reference
               cast:
                 type: array
                 items:
                   $ref: '#/components/schemas/CastMember'
                 description: Cast members
               crew:
                 type: array
                 items:
                   $ref: '#/components/schemas/CrewMember'
                 description: Crew members
               mediaAssets:
                 $ref: '#/components/schemas/MediaAssets'
                 description: Media assets for the video
 *     responses:
 *       200:
 *         description: Video updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 video:
 *                   $ref: '#/components/schemas/Video'
 *       400:
 *         description: Invalid input or video ID
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Not channel owner
 *       404:
 *         description: Video not found
 *       500:
 *         description: Server error
 *   delete:
 *     summary: Delete video (soft delete)
 *     tags: [Videos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Video ID
 *     responses:
 *       200:
 *         description: Video deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       400:
 *         description: Invalid video ID
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Not channel owner
 *       404:
 *         description: Video not found
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/videos/{id}/stats:
 *   get:
 *     summary: Get video statistics
 *     tags: [Videos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Video ID
 *     responses:
 *       200:
 *         description: Video statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 stats:
 *                   $ref: '#/components/schemas/VideoStats'
 *       400:
 *         description: Invalid video ID
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Not channel owner
 *       404:
 *         description: Video not found
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/videos/{id}/toggle-status:
 *   patch:
 *     summary: Toggle video publish status
 *     tags: [Videos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Video ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [published, processing]
 *                 description: New video status
 *     responses:
 *       200:
 *         description: Video status updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 video:
 *                   $ref: '#/components/schemas/Video'
 *       400:
 *         description: Invalid input or video ID
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Not channel owner
 *       404:
 *         description: Video not found
 *       500:
 *         description: Server error
 */