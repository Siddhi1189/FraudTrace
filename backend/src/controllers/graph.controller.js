import * as graphService from '../services/graph/graph.service.js';

export async function getNeighborhood(req, res, next) {
  try {
    const entityId = req.query.entityId || req.query.id;
    const entityType = req.query.entityType ? req.query.entityType.trim().toUpperCase() : null;
    const rawDepth = parseInt(req.query.depth, 10);
    const depth = isNaN(rawDepth) ? 1 : Math.max(1, Math.min(rawDepth, 3));
    const rawLimit = parseInt(req.query.limit, 10);
    const limit = isNaN(rawLimit) ? 50 : Math.max(1, Math.min(rawLimit, 100));

    const result = await graphService.fetchNeighborhood({ entityId, entityType, depth, limit });
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function getPath(req, res, next) {
  try {
    const sourceId = req.query.sourceId || req.query.source;
    const targetId = req.query.targetId || req.query.target;
    const rawMaxDepth = parseInt(req.query.maxDepth, 10);
    // PLACEHOLDER(FT-10): Clamped maxDepth between 1 and 6, default 4
    const maxDepth = isNaN(rawMaxDepth) ? 4 : Math.max(1, Math.min(rawMaxDepth, 6));
    const directed = req.query.directed === 'true';

    const result = await graphService.fetchPath({ sourceId, targetId, maxDepth, directed });
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}
