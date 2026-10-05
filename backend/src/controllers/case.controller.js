import * as caseService from '../services/case.service.js';

export async function getCases(req, res, next) {
  try {
    const { status, disposition } = req.query;
    const result = await caseService.getCases({ status, disposition });
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function createCase(req, res, next) {
  try {
    const { title, initialAlertId } = req.body;
    const userId = req.user?.sub || req.user?.userId || req.user?._id;
    const newCase = await caseService.createCase({ title, initialAlertId, userId });
    return res.status(201).json({ case: newCase });
  } catch (error) {
    next(error);
  }
}

export async function getCaseById(req, res, next) {
  try {
    const result = await caseService.getCaseById(req.params.id);
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function updateCase(req, res, next) {
  try {
    const { title, status, disposition } = req.body;
    const userId = req.user?.sub || req.user?.userId || req.user?._id;
    const updatedCase = await caseService.updateCase(req.params.id, { title, status, disposition }, userId);
    return res.status(200).json({ case: updatedCase });
  } catch (error) {
    next(error);
  }
}

export async function addCaseNote(req, res, next) {
  try {
    const { content } = req.body;
    const userId = req.user?.sub || req.user?.userId || req.user?._id;
    const note = await caseService.addCaseNote(req.params.id, content, userId);
    return res.status(201).json({ note });
  } catch (error) {
    next(error);
  }
}

export async function attachAlert(req, res, next) {
  try {
    const { alertId } = req.body;
    const userId = req.user?.sub || req.user?.userId || req.user?._id;
    const caseAlert = await caseService.attachAlertToCase(req.params.id, alertId, userId);
    return res.status(201).json({ caseAlert });
  } catch (error) {
    next(error);
  }
}

export async function getCaseEvents(req, res, next) {
  try {
    const events = await caseService.getCaseEvents(req.params.id);
    return res.status(200).json({ events });
  } catch (error) {
    next(error);
  }
}
