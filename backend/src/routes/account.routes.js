import { Router } from 'express';
import * as accountController from '../controllers/account.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';

const router = Router();

router.use(authenticateToken);

router.get('/:id', accountController.getAccount);
router.get('/:id/transactions', accountController.getAccountTransactions);

export default router;
