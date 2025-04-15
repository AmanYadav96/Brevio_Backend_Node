/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         name:
 *           type: string
 *         email:
 *           type: string
 *           format: email
 *         role:
 *           type: string
 *           enum: [user, admin, creator]
 *         status:
 *           type: string
 *           enum: [active, suspended, inactive, pending]
 *         subscriptionStatus:
 *           type: string
 *           enum: [active, canceled, past_due, unpaid, trialing, none]
 *         profilePicture:
 *           type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 * 
 *     Genre:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         name:
 *           type: string
 *         type:
 *           type: string
 *           enum: [movie, series, both]
 *         description:
 *           type: string
 *         isActive:
 *           type: boolean
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 * 
 *     Video:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         title:
 *           type: string
 *         description:
 *           type: string
 *         creator:
 *           type: string
 *           description: Reference to Creator ID
 *         genres:
 *           type: array
 *           items:
 *             type: string
 *             description: Reference to Genre ID
 *         videoUrl:
 *           type: string
 *         thumbnailUrl:
 *           type: string
 *         duration:
 *           type: number
 *         views:
 *           type: number
 *         status:
 *           type: string
 *           enum: [draft, published, private]
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 * 
 *     Creator:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         userId:
 *           type: string
 *           description: Reference to User ID
 *         channelName:
 *           type: string
 *         description:
 *           type: string
 *         subscribers:
 *           type: number
 *         status:
 *           type: string
 *           enum: [active, suspended, inactive]
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 * 
 *     Payment:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         userId:
 *           type: string
 *           description: Reference to User ID
 *         amount:
 *           type: number
 *         currency:
 *           type: string
 *         status:
 *           type: string
 *           enum: [pending, completed, failed]
 *         paymentMethod:
 *           type: string
 *         transactionId:
 *           type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */