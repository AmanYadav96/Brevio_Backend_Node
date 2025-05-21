import { Hono } from 'hono';
import { protect } from '../middlewares/auth.middleware.js';
import * as adminController from '../controllers/admin.controller.js';

const adminRouter = new Hono();

// Protect all admin routes
adminRouter.use('*', protect);

// Dashboard statistics
adminRouter.get('/creators-stats', adminController.getDashboardStats);

// Creator management
adminRouter.get('/creators', adminController.getAllCreators);
adminRouter.get('/creators/:creatorId', adminController.getCreatorById);
adminRouter.patch('/creators/:creatorId/block', adminController.toggleCreatorBlock);
adminRouter.delete('/creators/:creatorId', adminController.deleteCreator);

export default adminRouter;
