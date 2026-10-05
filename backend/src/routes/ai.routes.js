import express from 'express';
import { authenticateToken } from '../middleware/auth.middleware.js';
import * as aiController from '../controllers/ai.controller.js';

const router = express.Router();

// All AI endpoints require authentication
router.use(authenticateToken);

// Documented Phase 8 API Surface
router.post('/briefs', aiController.createBrief);
router.get('/briefs/:id', aiController.getBriefById);
router.patch('/briefs/:id', aiController.updateBrief);
router.post('/cases/:id/ask', aiController.askCaseQuestion);

export default router;
