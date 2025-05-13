/**
 * @swagger
 * components:
 *   schemas:
 *     ChannelSubscription:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: The subscription ID
 *         user:
 *           type: string
 *           description: The user ID who subscribed
 *         channel:
 *           type: string
 *           description: The channel ID being subscribed to
 *         subscription:
 *           type: string
 *           description: The subscription plan ID
 *         subscriptionType:
 *           type: string
 *           enum: [regular, course_purchase]
 *           description: Type of subscription
 *         startDate:
 *           type: string
 *           format: date-time
 *           description: When the subscription started
 *         endDate:
 *           type: string
 *           format: date-time
 *           description: When the subscription ends
 *         isActive:
 *           type: boolean
 *           description: Whether the subscription is currently active
 *         autoRenew:
 *           type: boolean
 *           description: Whether the subscription will automatically renew
 *         paymentHistory:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               paymentId:
 *                 type: string
 *               amount:
 *                 type: number
 *               date:
 *                 type: string
 *                 format: date-time
 *               status:
 *                 type: string
 *                 enum: [pending, completed, failed]
 *         lastWatched:
 *           type: string
 *           format: date-time
 *           description: When the user last watched content from this channel
 *         purchasedCourses:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               course:
 *                 type: string
 *                 description: The course ID
 *               purchaseDate:
 *                 type: string
 *                 format: date-time
 *               price:
 *                 type: number
 *               accessType:
 *                 type: string
 *                 enum: [lifetime, limited]
 *               expiryDate:
 *                 type: string
 *                 format: date-time
 *               paymentId:
 *                 type: string
 *
 * /api/channel-subscriptions:
 *   post:
 *     summary: Subscribe to a channel
 *     tags: [Channel Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - channelId
 *               - subscriptionId
 *             properties:
 *               channelId:
 *                 type: string
 *                 description: ID of the channel to subscribe to
 *               subscriptionId:
 *                 type: string
 *                 description: ID of the subscription plan
 *     responses:
 *       200:
 *         description: Successful subscription
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
 *                   $ref: '#/components/schemas/ChannelSubscription'
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Channel or subscription plan not found
 *       500:
 *         description: Server error
 *
 * /api/channel-subscriptions/my-subscriptions:
 *   get:
 *     summary: Get all channels a user is subscribed to
 *     tags: [Channel Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of user's subscriptions
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
 *                     $ref: '#/components/schemas/ChannelSubscription'
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 *
 * /api/channel-subscriptions/channel/{channelId}/subscribers:
 *   get:
 *     summary: Get all subscribers of a channel (channel owner only)
 *     tags: [Channel Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: channelId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the channel
 *     responses:
 *       200:
 *         description: List of channel subscribers
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
 *                     $ref: '#/components/schemas/ChannelSubscription'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - not channel owner
 *       404:
 *         description: Channel not found
 *       500:
 *         description: Server error
 *
 * /api/channel-subscriptions/{subscriptionId}/cancel:
 *   patch:
 *     summary: Cancel a subscription
 *     tags: [Channel Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: subscriptionId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the subscription to cancel
 *     responses:
 *       200:
 *         description: Subscription cancelled successfully
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
 *                   $ref: '#/components/schemas/ChannelSubscription'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - not subscription owner
 *       404:
 *         description: Subscription not found
 *       500:
 *         description: Server error
 *
 * /api/channel-subscriptions/check/{channelId}:
 *   get:
 *     summary: Check if user is subscribed to a channel
 *     tags: [Channel Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: channelId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the channel to check
 *     responses:
 *       200:
 *         description: Subscription status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 isSubscribed:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/ChannelSubscription'
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 *
 * /api/channel-subscriptions/{channelId}/watch:
 *   patch:
 *     summary: Update last watched time for a channel
 *     tags: [Channel Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: channelId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the channel being watched
 *     responses:
 *       200:
 *         description: Last watched time updated
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
 *                   $ref: '#/components/schemas/ChannelSubscription'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Active subscription not found
 *       500:
 *         description: Server error
 *
 * /api/channel-subscriptions/purchase-course:
 *   post:
 *     summary: Purchase a course
 *     tags: [Channel Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - channelId
 *               - contentId
 *             properties:
 *               channelId:
 *                 type: string
 *                 description: ID of the channel the course belongs to
 *               contentId:
 *                 type: string
 *                 description: ID of the course to purchase
 *     responses:
 *       200:
 *         description: Course purchased successfully
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
 *                   $ref: '#/components/schemas/ChannelSubscription'
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Course or channel not found
 *       500:
 *         description: Server error
 *
 * /api/channel-subscriptions/my-courses:
 *   get:
 *     summary: Get all courses purchased by the user
 *     tags: [Channel Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of purchased courses
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
 *                     type: object
 *                     properties:
 *                       course:
 *                         type: object
 *                       purchaseDate:
 *                         type: string
 *                         format: date-time
 *                       price:
 *                         type: number
 *                       accessType:
 *                         type: string
 *                       channel:
 *                         type: object
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 *
 * /api/channel-subscriptions/check-course/{contentId}:
 *   get:
 *     summary: Check if user has purchased a specific course
 *     tags: [Channel Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: contentId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the course to check
 *     responses:
 *       200:
 *         description: Course purchase status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 hasPurchased:
 *                   type: boolean
 *                 data:
 *                   type: object
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */