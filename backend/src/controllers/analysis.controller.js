import * as analysisService from '../services/analysis.service.js';

export async function runAnalysis(req, res, next) {
  try {
    const { trigger = 'MANUAL', parameters = {} } = req.body || {};
    const result = await analysisService.runFullAnalysis({ trigger, parameters });
    return res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

export async function getAnalysisRun(req, res, next) {
  try {
    const run = await analysisService.getAnalysisRunById(req.params.id);
    return res.status(200).json({ run });
  } catch (error) {
    next(error);
  }
}

export function getRules(req, res) {
  const rules = analysisService.getActiveRules();
  return res.status(200).json(rules);
}
