/**
 * @swagger
 * components:
 *   schemas:
 *     Payment:
 *       type: object
 *       required:
 *         - amount
 *         - paymentType
 *         - paymentMethod
 *       properties:
 *         _id:
 *           type: string
 *           description: The auto-generated ID of the payment
 *         amount:
 *           type: number
 *           description: Payment amount
 *         currency:
 *           type: string
 *           default: USD
 *           description: Currency of the payment
 *         paymentType:
 *           type: string
 *           enum: [subscription, course_purchase, donation, channel_subscription, creator_payout]
 *           description: Type of payment
 *         status:
 *           type: string
 *           enum: [pending, completed, failed, refunded, partially_refunded, cancelled]
 *           default: pending
 *           description: Status of the payment
 *         paymentMethod:
 *           type: string
 *           enum: [credit_card, debit_card, paypal, bank_transfer, wallet, platform_credit, other]
 *           description: Method used for payment
 *         userId:
 *           type: string
 *           description: ID of the user making the payment
 *         creatorId:
 *           type: string
 *           description: ID of the creator receiving the payment
 *         subscriptionPlanId:
 *           type: string
 *           description: ID of the subscription plan (for subscription payments)
 *         courseId:
 *           type: string
 *           description: ID of the course (for course purchase payments)
 *         donationId:
 *           type: string
 *           description: ID of the donation (for donation payments)
 *         channelSubscriptionId:
 *           type: string
 *           description: ID of the channel subscription (for channel subscription payments)
 *         paymentProviderId:
 *           type: string
 *           description: ID from payment provider (e.g., Stripe payment ID)
 *         paymentProviderFee:
 *           type: number
 *           description: Fee charged by payment provider
 *         platformFee:
 *           type: number
 *           description: Fee charged by the platform
 *         platformFeePercentage:
 *           type: number
 *           description: Percentage of platform fee
 *         netAmount:
 *           type: number
 *           description: Net amount after fees
 *         refundAmount:
 *           type: number
 *           description: Amount refunded
 *         refundReason:
 *           type: string
 *           description: Reason for refund
 *         refundedAt:
 *           type: string
 *           format: date-time
 *           description: When the refund was processed
 *         isRecurring:
 *           type: boolean
 *           description: Whether this is a recurring payment
 *         recurringInterval:
 *           type: string
 *           enum: [daily, weekly, monthly, yearly]
 *           description: Interval for recurring payments
 *         nextBillingDate:
 *           type: string
 *           format: date-time
 *           description: Next billing date for recurring payments
 *         payoutMethod:
 *           type: string
 *           enum: [bank_transfer, paypal, check, other]
 *           description: Method used for creator payout
 *         processedBy:
 *           type: string
 *           description: ID of admin who processed the payment (for creator payouts)
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: When the payment was created
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: When the payment was last updated
 * 
 * tags:
 *   - name: Payments
 *     description: API for managing payments and transactions
 *
 * /api/payments:
 *   post:
 *     summary: Create a new payment
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *               - paymentType
 *               - paymentMethod
 *             properties:
 *               amount:
 *                 type: number
 *                 description: Payment amount
 *               currency:
 *                 type: string
 *                 default: USD
 *                 description: Currency of the payment
 *               paymentType:
 *                 type: string
 *                 enum: [subscription, course_purchase, donation, channel_subscription]
 *                 description: Type of payment
 *               paymentMethod:
 *                 type: string
 *                 enum: [credit_card, debit_card, paypal, bank_transfer, wallet, platform_credit, other]
 *                 description: Method used for payment
 *               creatorId:
 *                 type: string
 *                 description: ID of the creator (required for donation, course_purchase, channel_subscription)
 *               subscriptionPlanId:
 *                 type: string
 *                 description: ID of the subscription plan (required for subscription)
 *               courseId:
 *                 type: string
 *                 description: ID of the course (required for course_purchase)
 *               donationId:
 *                 type: string
 *                 description: ID of the donation (required for donation)
 *               channelSubscriptionId:
 *                 type: string
 *                 description: ID of the channel subscription (required for channel_subscription)
 *               metadata:
 *                 type: object
 *                 description: Additional payment metadata
 *     responses:
 *       201:
 *         description: Payment created successfully
 *       400:
 *         description: Invalid input
 *       500:
 *         description: Server error
 *
 * /api/payments/process-stripe:
 *   post:
 *     summary: Process a payment with Stripe
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - paymentId
 *               - paymentMethodId
 *             properties:
 *               paymentId:
 *                 type: string
 *                 description: ID of the payment to process
 *               paymentMethodId:
 *                 type: string
 *                 description: Stripe payment method ID
 *     responses:
 *       200:
 *         description: Payment processed successfully
 *       404:
 *         description: Payment not found
 *       500:
 *         description: Server error
 *
 * /api/payments/donation-intent:
 *   post:
 *     summary: Create donation payment intent (combines donation creation with Stripe payment intent)
 *     tags: [Payments]
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
 *               - paymentMethodId
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
 *                 minimum: 1
 *                 description: Donation amount (minimum 1)
 *               currency:
 *                 type: string
 *                 default: USD
 *                 description: Currency of the donation
 *               message:
 *                 type: string
 *                 maxLength: 500
 *                 description: Optional message from the donor
 *               paymentMethodId:
 *                 type: string
 *                 description: Stripe payment method ID
 *     responses:
 *       201:
 *         description: Donation payment intent created successfully
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
 *                 payment:
 *                   $ref: '#/components/schemas/Payment'
 *                 paymentIntent:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       description: Stripe payment intent ID
 *                     status:
 *                       type: string
 *                       description: Payment intent status
 *                     client_secret:
 *                       type: string
 *                       description: Client secret for confirming payment
 *                     requires_action:
 *                       type: boolean
 *                       description: Whether additional authentication is required
 *                     next_action:
 *                       type: object
 *                       description: Next action required for payment completion
 *       400:
 *         description: Invalid input or missing required fields
 *       404:
 *         description: Content not found
 *       500:
 *         description: Server error
 *
 * /api/payments/user:
 *   get:
 *     summary: Get user's payment history
 *     tags: [Payments]
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
 *         name: type
 *         schema:
 *           type: string
 *           enum: [subscription, course_purchase, donation, channel_subscription]
 *         description: Filter by payment type
 *     responses:
 *       200:
 *         description: List of user's payments
 *       500:
 *         description: Server error
 *
 * /api/payments/creator:
 *   get:
 *     summary: Get creator's received payments
 *     tags: [Payments]
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
 *         name: type
 *         schema:
 *           type: string
 *           enum: [course_purchase, donation, channel_subscription, creator_payout]
 *         description: Filter by payment type
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter by start date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter by end date
 *     responses:
 *       200:
 *         description: List of creator's received payments
 *       500:
 *         description: Server error
 *
 * /api/payments/creator-payout:
 *   post:
 *     summary: Process creator payout (admin only)
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - creatorId
 *               - amount
 *               - payoutMethod
 *             properties:
 *               creatorId:
 *                 type: string
 *                 description: ID of the creator to pay
 *               amount:
 *                 type: number
 *                 description: Payout amount
 *               currency:
 *                 type: string
 *                 default: USD
 *                 description: Currency of the payout
 *               payoutMethod:
 *                 type: string
 *                 enum: [bank_transfer, paypal, check, other]
 *                 description: Method used for payout
 *               notes:
 *                 type: string
 *                 description: Notes about the payout
 *     responses:
 *       200:
 *         description: Creator payout processed successfully
 *       403:
 *         description: Not authorized
 *       500:
 *         description: Server error
 *
 * /api/payments/{id}:
 *   get:
 *     summary: Get payment details
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Payment ID
 *     responses:
 *       200:
 *         description: Payment details
 *       404:
 *         description: Payment not found
 *       500:
 *         description: Server error
 *
 * /api/payments/refund:
 *   post:
 *     summary: Process refund (admin only)
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - paymentId
 *               - amount
 *             properties:
 *               paymentId:
 *                 type: string
 *                 description: ID of the payment to refund
 *               amount:
 *                 type: number
 *                 description: Amount to refund
 *               reason:
 *                 type: string
 *                 description: Reason for refund
 *     responses:
 *       200:
 *         description: Refund processed successfully
 *       400:
 *         description: Invalid request
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Payment not found
 *       500:
 *         description: Server error
 */