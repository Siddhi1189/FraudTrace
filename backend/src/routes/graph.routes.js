import { Router } from 'express';
import * as graphController from '../controllers/graph.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';

const router = Router();

router.use(authenticateToken);

router.get('/neighborhood', graphController.getNeighborhood);
router.get('/path', graphController.getPath);

export default router;
