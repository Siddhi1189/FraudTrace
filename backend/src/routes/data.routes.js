import { Router } from 'express';
import * as dataController from '../controllers/data.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';

const router = Router();

// All data endpoints require authentication
router.use(authenticateToken);

router.post('/upload', dataController.uploadCSV);
router.post('/simulate', dataController.simulate);
router.get('/batches', dataController.getBatches);
router.get('/batches/:id', dataController.getBatchById);

export default router;
