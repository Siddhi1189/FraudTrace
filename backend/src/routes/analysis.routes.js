import { Router } from 'express';
import * as analysisController from '../controllers/analysis.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';

const router = Router();

router.use(authenticateToken);

router.post('/run', analysisController.runAnalysis);
router.get('/runs/:id', analysisController.getAnalysisRun);
router.get('/rules', analysisController.getRules);

export default router;
