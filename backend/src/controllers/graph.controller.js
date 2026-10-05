import * as graphService from '../services/graph/graph.service.js';

export async function getNeighborhood(req, res, next) {
  try {
    const entityId = req.query.entityId || req.query.id;
    const depth = req.query.depth ? parseInt(req.query.depth, 10) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : 50;

    const result = await graphService.fetchNeighborhood({ entityId, depth, limit });
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function getPath(req, res, next) {
  try {
    const sourceId = req.query.sourceId || req.query.source;
    const targetId = req.query.targetId || req.query.target;
    const maxDepth = req.query.maxDepth ? parseInt(req.query.maxDepth, 10) : 4;
    const directed = req.query.directed === 'true';

    const result = await graphService.fetchPath({ sourceId, targetId, maxDepth, directed });
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}
