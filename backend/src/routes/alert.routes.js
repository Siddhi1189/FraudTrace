import { Router } from 'express';
import * as alertController from '../controllers/alert.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';

const router = Router();

router.use(authenticateToken);

router.get('/', alertController.getAlerts);
router.get('/:id', alertController.getAlertById);
router.patch('/:id', alertController.patchAlert);

export default router;
