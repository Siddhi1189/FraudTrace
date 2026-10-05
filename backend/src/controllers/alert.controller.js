import * as alertService from '../services/alert.service.js';

export async function getAlerts(req, res, next) {
  try {
    const { severity, pattern, triageStatus, ringId, analysisRunId } = req.query;
    const alerts = await alertService.getAlerts({ severity, pattern, triageStatus, ringId, analysisRunId });
    return res.status(200).json({ alerts, count: alerts.length });
  } catch (error) {
    next(error);
  }
}

export async function getAlertById(req, res, next) {
  try {
    const alert = await alertService.getAlertById(req.params.id);
    return res.status(200).json({ alert });
  } catch (error) {
    next(error);
  }
}

export async function patchAlert(req, res, next) {
  try {
    const { triageStatus } = req.body;
    if (!triageStatus) {
      return res.status(400).json({ error: 'triageStatus is required' });
    }
    const alert = await alertService.updateAlertTriage(req.params.id, triageStatus);
    return res.status(200).json({ alert });
  } catch (error) {
    next(error);
  }
}
