/**
 * @swagger
 * components:
 *   schemas:
 *     SearchResults:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         query:
 *           type: string
 *           example: "action movie"
 *         type:
 *           type: string
 *           enum: [all, content, creators, videos]
 *           example: "all"
 *         results:
 *           type: object
 *           properties:
 *             shortFilms:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   _id:
 *                     type: string
 *                   title:
 *                     type: string
 *                   description:
 *                     type: string
 *                   thumbnail:
 *                     type: string
 *                   contentType:
 *                     type: string
 *                     example: "SHORT_FILM"
 *                   views:
 *                     type: number
 *                   creator:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                       name:
 *                         type: string
 *                       username:
 *                         type: string
 *                       profilePicture:
 *                         type: string
 *                   genre:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                       name:
 *                         type: string
 *             creators:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   _id:
 *                     type: string
 *                   name:
 *                     type: string
 *                   username:
 *                     type: string
 *                   bio:
 *                     type: string
 *                   profilePicture:
 *                     type: string
 *                   createdAt:
 *                     type: string
 *                     format: date-time
 *             videos:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   _id:
 *                     type: string
 *                   title:
 *                     type: string
 *                   description:
 *                     type: string
 *                   thumbnail:
 *                     type: string
 *                   views:
 *                     type: number
 *                   channel:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                       name:
 *                         type: string
 *                       description:
 *                         type: string
 *                       owner:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: string
 *                           name:
 *                             type: string
 *                           profilePicture:
 *                             type: string
 *                   genre:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                       name:
 *                         type: string
 *                       description:
 *                         type: string
 *             totalResults:
 *               type: number
 *               example: 25
 *         pagination:
 *           type: object
 *           properties:
 *             page:
 *               type: number
 *               example: 1
 *             limit:
 *               type: number
 *               example: 10
 *             totalPages:
 *               type: number
 *               example: 3
 *         message:
 *           type: string
 *           example: "Found 25 results for \"action movie\""
 *     
 *     SearchSuggestion:
 *       type: object
 *       properties:
 *         text:
 *           type: string
 *           example: "Action Hero"
 *         type:
 *           type: string
 *           enum: [short_film, creator, video]
 *           example: "short_film"
 *     
 *     SearchSuggestionsResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         suggestions:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/SearchSuggestion'
 */

/**
 * @swagger
 * /api/search:
 *   get:
 *     summary: Universal search across short films, creators, and videos
 *     tags: [Search]
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         description: Search query
 *         example: "action movie"
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of results per page
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [all, content, creators, videos]
 *           default: all
 *         description: Type of content to search (all for mixed results)
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           default: relevance
 *         description: Sort criteria
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order
 *     responses:
 *       200:
 *         description: Search results retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SearchResults'
 *       400:
 *         description: Search query is required
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Search query is required"
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Failed to perform search"
 */

/**
 * @swagger
 * /api/search/suggestions:
 *   get:
 *     summary: Get search suggestions based on partial query
 *     tags: [Search]
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         description: Partial search query (minimum 2 characters)
 *         example: "act"
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 5
 *         description: Maximum number of suggestions to return
 *     responses:
 *       200:
 *         description: Search suggestions retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SearchSuggestionsResponse'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Failed to get search suggestions"
 */