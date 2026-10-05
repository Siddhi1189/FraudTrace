import express from 'express';
import { authenticateToken } from '../middleware/auth.middleware.js';
import * as caseController from '../controllers/case.controller.js';

const router = express.Router();

router.use(authenticateToken);

router.get('/', caseController.getCases);
router.post('/', caseController.createCase);
router.get('/:id', caseController.getCaseById);
router.patch('/:id', caseController.updateCase);
router.post('/:id/notes', caseController.addCaseNote);
router.post('/:id/alerts', caseController.attachAlert);
router.get('/:id/events', caseController.getCaseEvents);

export default router;
