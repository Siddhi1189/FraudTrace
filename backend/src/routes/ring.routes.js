import { Router } from 'express';
import * as ringController from '../controllers/ring.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';

const router = Router();

router.use(authenticateToken);

router.get('/', ringController.getRings);
router.get('/:id', ringController.getRingById);

export default router;
