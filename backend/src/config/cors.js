// Centralized CORS origins configuration for Express and Socket.IO
export function getAllowedOrigins() {
  if (process.env.CORS_ORIGINS) {
    return process.env.CORS_ORIGINS
      .split(',')
      .map((o) => o.trim().replace(/\/+$/, ''))
      .filter(Boolean);
  }
  return process.env.NODE_ENV !== 'production' ? ['http://localhost:5173'] : [];
}

/**
 * Unified CORS origin delegate function used by both Express and Socket.IO.
 * Trims whitespace and trailing slashes, and allows requests with no Origin header (health checks, server-to-server).
 */
export function corsOriginDelegate(origin, callback) {
  // Allow requests with no Origin header (e.g. Render health checks, curl, mobile clients)
  if (!origin) {
    return callback(null, true);
  }

  const normalized = origin.trim().replace(/\/+$/, '');
  const allowed = getAllowedOrigins();

  if (allowed.includes('*') || allowed.includes(normalized)) {
    return callback(null, true);
  }

  return callback(null, false);
}
