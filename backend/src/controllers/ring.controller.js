import * as ringService from '../services/ring.service.js';

export async function getRings(req, res, next) {
  try {
    const rings = await ringService.getRings(req.query);
    return res.status(200).json({ rings, count: rings.length });
  } catch (error) {
    next(error);
  }
}

export async function getRingById(req, res, next) {
  try {
    const ring = await ringService.getRingById(req.params.id);
    return res.status(200).json({ ring });
  } catch (error) {
    next(error);
  }
}
