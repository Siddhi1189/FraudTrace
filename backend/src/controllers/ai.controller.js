import * as aiService from '../services/ai.service.js';

export async function createBrief(req, res, next) {
  try {
    const { caseId } = req.body;
    const userId = req.user?.id;

    if (!caseId) {
      return res.status(400).json({ error: 'caseId is required' });
    }

    const brief = await aiService.createBrief({ caseId, userId });
    return res.status(201).json(brief);
  } catch (error) {
    next(error);
  }
}

export async function getBriefById(req, res, next) {
  try {
    const { id } = req.params;
    const brief = await aiService.getBriefById(id);
    return res.status(200).json(brief);
  } catch (error) {
    next(error);
  }
}

export async function updateBrief(req, res, next) {
  try {
    const { id } = req.params;
    const { analystDecision, editedText } = req.body;
    const userId = req.user?.id;

    const updated = await aiService.updateBrief(id, { analystDecision, editedText }, userId);
    return res.status(200).json(updated);
  } catch (error) {
    next(error);
  }
}

export async function askCaseQuestion(req, res, next) {
  try {
    const { id } = req.params;
    const { question } = req.body;
    const userId = req.user?.id;

    if (!question || typeof question !== 'string' || !question.trim()) {
      return res.status(400).json({ error: 'question is required' });
    }

    const brief = await aiService.askCaseQuestion(id, { question, userId });
    return res.status(200).json(brief);
  } catch (error) {
    next(error);
  }
}
