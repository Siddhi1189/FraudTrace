import { getDBStatus } from '../config/db.js';

export function getHealth(req, res) {
  const dbStatus = getDBStatus();
  const isHealthy = dbStatus === 'connected';

  return res.status(200).json({
    status: isHealthy ? 'healthy' : 'degraded',
    database: dbStatus,
    timestamp: new Date().toISOString(),
  });
}
