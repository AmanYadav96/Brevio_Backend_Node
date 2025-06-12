import express from 'express';
import { forgotPassword, resetPassword } from '../controllers/password.controller.js';

const router = express.Router();

// Password reset routes
router.post('/forgot', forgotPassword);
router.post('/reset', resetPassword);

export default router;