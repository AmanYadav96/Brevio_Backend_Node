import express from 'express';
import { protect } from '../middlewares/auth.middleware.js';
import * as adminController from '../controllers/admin.controller.js';

const router = express.Router();

// Protect all admin routes
router.use(protect);

// Dashboard statistics
router.get('/creators-stats', adminController.getDashboardStats);

// Creator management
router.get('/creators', adminController.getAllCreators);
router.get('/creators/:creatorId', adminController.getCreatorById);
router.patch('/creators/:creatorId/block', adminController.toggleCreatorBlock);
router.delete('/creators/:creatorId', adminController.deleteCreator);
router.get('/content-review', adminController.getContentForReview);

export default router;
