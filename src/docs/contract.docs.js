/**
 * @swagger
 * components:
 *   schemas:
 *     ContractTerm:
 *       type: object
 *       properties:
 *         title:
 *           type: string
 *           description: Title of the term
 *         description:
 *           type: string
 *           description: Description of the term
 *         required:
 *           type: boolean
 *           description: Whether this term is required to be accepted
 *     
 *     ContractAttachment:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *           description: Name of the attachment
 *         url:
 *           type: string
 *           description: URL to the attachment file
 *         uploadedAt:
 *           type: string
 *           format: date-time
 *           description: When the attachment was uploaded
 *     
 *     ContractHistory:
 *       type: object
 *       properties:
 *         action:
 *           type: string
 *           enum: [created, updated, sent, signed_by_user, signed_by_admin, completed, rejected, expired]
 *           description: The action performed
 *         performedBy:
 *           type: string
 *           description: ID of the user who performed the action
 *         timestamp:
 *           type: string
 *           format: date-time
 *           description: When the action was performed
 *         notes:
 *           type: string
 *           description: Additional notes about the action
 *     
 *     Contract:
 *       type: object
 *       required:
 *         - title
 *         - description
 *         - type
 *         - content
 *         - userId
 *         - validFrom
 *         - validUntil
 *       properties:
 *         _id:
 *           type: string
 *           description: The auto-generated ID of the contract
 *         title:
 *           type: string
 *           description: Title of the contract
 *         description:
 *           type: string
 *           description: Description of the contract
 *         type:
 *           type: string
 *           enum: [content_upload, creator_agreement, revenue_sharing, custom]
 *           description: Type of contract
 *         content:
 *           type: string
 *           description: Full content of the contract
 *         contractFile:
 *           type: string
 *           description: URL to the contract file
 *         terms:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/ContractTerm'
 *           description: Terms of the contract
 *         status:
 *           type: string
 *           enum: [draft, sent, signed_by_user, signed_by_admin, completed, rejected, expired]
 *           description: Current status of the contract
 *         createdBy:
 *           type: string
 *           description: ID of the admin who created the contract
 *         userId:
 *           type: string
 *           description: ID of the user this contract is for
 *         userSignature:
 *           type: object
 *           properties:
 *             signature:
 *               type: string
 *               description: URL to the user's signature image
 *             signedAt:
 *               type: string
 *               format: date-time
 *               description: When the user signed
 *             ipAddress:
 *               type: string
 *               description: IP address of the user when signing
 *         adminSignature:
 *           type: object
 *           properties:
 *             signature:
 *               type: string
 *               description: URL to the admin's signature image
 *             signedAt:
 *               type: string
 *               format: date-time
 *               description: When the admin signed
 *             ipAddress:
 *               type: string
 *               description: IP address of the admin when signing
 *             adminId:
 *               type: string
 *               description: ID of the admin who signed
 *         attachments:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/ContractAttachment'
 *           description: Attachments to the contract
 *         validFrom:
 *           type: string
 *           format: date-time
 *           description: When the contract becomes valid
 *         validUntil:
 *           type: string
 *           format: date-time
 *           description: When the contract expires
 *         history:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/ContractHistory'
 *           description: History of actions on this contract
 *         metadata:
 *           type: object
 *           description: Additional metadata for the contract
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: When the contract was created
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: When the contract was last updated
 *
 * tags:
 *   - name: Contracts
 *     description: Contract management API
 *
 * /api/contracts:
 *   post:
 *     summary: Create a new contract
 *     tags: [Contracts]
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
 *               - content
 *               - userId
 *               - type
 *             properties:
 *               title:
 *                 type: string
 *                 description: Title of the contract
 *               description:
 *                 type: string
 *                 description: Description of the contract
 *               type:
 *                 type: string
 *                 enum: [content_upload, creator_agreement, revenue_sharing, custom]
 *                 description: Type of contract
 *               content:
 *                 type: string
 *                 description: Full content of the contract
 *               userId:
 *                 type: string
 *                 description: ID of the user this contract is for
 *               terms:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     title:
 *                       type: string
 *                     description:
 *                       type: string
 *                     required:
 *                       type: boolean
 *               status:
 *                 type: string
 *                 enum: [draft, sent]
 *                 default: draft
 *               validFrom:
 *                 type: string
 *                 format: date-time
 *               validUntil:
 *                 type: string
 *                 format: date-time
 *               metadata:
 *                 type: object
 *               notes:
 *                 type: string
 *               contractFile:
 *                 type: string
 *                 format: binary
 *               attachment:
 *                 type: string
 *                 format: binary
 *               attachmentName:
 *                 type: string
 *     responses:
 *       201:
 *         description: Contract created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Contract created successfully
 *                 contract:
 *                   $ref: '#/components/schemas/Contract'
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Not an admin
 *
 *   get:
 *     summary: Get user's contracts
 *     tags: [Contracts]
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
 *         name: status
 *         schema:
 *           type: string
 *           enum: [draft, sent, signed_by_user, signed_by_admin, completed, rejected, expired]
 *         description: Filter by status
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [content_upload, creator_agreement, revenue_sharing, custom]
 *         description: Filter by type
 *     responses:
 *       200:
 *         description: List of user's contracts
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 contracts:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Contract'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     page:
 *                       type: integer
 *                     pages:
 *                       type: integer
 *       401:
 *         description: Unauthorized
 *
 * /api/contracts/admin:
 *   get:
 *     summary: Get all contracts (admin only)
 *     tags: [Contracts]
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
 *         name: status
 *         schema:
 *           type: string
 *           enum: [draft, sent, signed_by_user, signed_by_admin, completed, rejected, expired]
 *         description: Filter by status
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [content_upload, creator_agreement, revenue_sharing, custom]
 *         description: Filter by type
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in title and description
 *     responses:
 *       200:
 *         description: List of all contracts
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 contracts:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Contract'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     page:
 *                       type: integer
 *                     pages:
 *                       type: integer
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Not an admin
 *
 * /api/contracts/{id}:
 *   get:
 *     summary: Get contract details
 *     tags: [Contracts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Contract ID
 *     responses:
 *       200:
 *         description: Contract details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 contract:
 *                   $ref: '#/components/schemas/Contract'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Not authorized to view this contract
 *       404:
 *         description: Contract not found
 *
 *   patch:
 *     summary: Update contract (admin only)
 *     tags: [Contracts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Contract ID
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               content:
 *                 type: string
 *               terms:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     title:
 *                       type: string
 *                     description:
 *                       type: string
 *                     required:
 *                       type: boolean
 *               validFrom:
 *                 type: string
 *                 format: date-time
 *               validUntil:
 *                 type: string
 *                 format: date-time
 *               metadata:
 *                 type: object
 *               notes:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [draft, sent]
 *               contractFile:
 *                 type: string
 *                 format: binary
 *               attachment:
 *                 type: string
 *                 format: binary
 *               attachmentName:
 *                 type: string
 *     responses:
 *       200:
 *         description: Contract updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Contract updated successfully
 *                 contract:
 *                   $ref: '#/components/schemas/Contract'
 *       400:
 *         description: Invalid input or contract cannot be updated
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Not an admin
 *       404:
 *         description: Contract not found
 *
 * /api/contracts/{id}/send:
 *   post:
 *     summary: Send contract to user (admin only)
 *     tags: [Contracts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Contract ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               notes:
 *                 type: string
 *                 description: Notes about sending the contract
 *     responses:
 *       200:
 *         description: Contract sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Contract sent to user successfully
 *                 contract:
 *                   $ref: '#/components/schemas/Contract'
 *       400:
 *         description: Contract cannot be sent
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Not an admin
 *       404:
 *         description: Contract not found
 *
 * /api/contracts/{id}/sign/user:
 *   post:
 *     summary: Sign contract (user)
 *     tags: [Contracts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Contract ID
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - signature
 *             properties:
 *               signature:
 *                 type: string
 *                 format: binary
 *                 description: User's signature image
 *     responses:
 *       200:
 *         description: Contract signed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Contract signed successfully
 *                 contract:
 *                   $ref: '#/components/schemas/Contract'
 *       400:
 *         description: Contract cannot be signed or signature missing
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Not authorized to sign this contract
 *       404:
 *         description: Contract not found
 *
 * /api/contracts/{id}/sign/admin:
 *   post:
 *     summary: Sign contract (admin)
 *     tags: [Contracts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Contract ID
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - signature
 *             properties:
 *               signature:
 *                 type: string
 *                 format: binary
 *                 description: Admin's signature image
 *     responses:
 *       200:
 *         description: Contract signed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Contract signed successfully
 *                 contract:
 *                   $ref: '#/components/schemas/Contract'
 *       400:
 *         description: Contract cannot be signed or signature missing
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Not an admin
 *       404:
 *         description: Contract not found
 *
 * /api/contracts/{id}/reject:
 *   post:
 *     summary: Reject contract
 *     tags: [Contracts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Contract ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *                 description: Reason for rejecting the contract
 *     responses:
 *       200:
 *         description: Contract rejected successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Contract rejected successfully
 *                 contract:
 *                   $ref: '#/components/schemas/Contract'
 *       400:
 *         description: Contract cannot be rejected
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Not authorized to reject this contract
 *       404:
 *         description: Contract not found
 *
 * /api/contracts/stats:
 *   get:
 *     summary: Get contract statistics (admin only)
 *     tags: [Contracts]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Contract statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 stats:
 *                   type: object
 *                   properties:
 *                     statusStats:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: string
 *                           count:
 *                             type: integer
 *                     typeStats:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: string
 *                           count:
 *                             type: integer
 *                     monthlyContracts:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: object
 *                             properties:
 *                               year:
 *                                 type: integer
 *                               month:
 *                                 type: integer
 *                           count:
 *                             type: integer
 *                     totalContracts:
 *                       type: integer
 *                     completedContracts:
 *                       type: integer
 *                     rejectedContracts:
 *                       type: integer
 *                     expiredContracts:
 *                       type: integer
 *                     completionRate:
 *                       type: number
 *                     rejectionRate:
 *                       type: number
 *                     expirationRate:
 *                       type: number
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Not an admin
 */