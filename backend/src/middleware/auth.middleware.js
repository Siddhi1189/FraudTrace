import jwt from 'jsonwebtoken';
import { getJwtSecret, JWT_ALGORITHM } from '../config/jwt.js';

// PLACEHOLDER(FT-2): Client transmits token in Authorization: Bearer <token>
export function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    return res.status(401).json({ error: 'Authentication token required' });
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return res.status(401).json({ error: 'Invalid authorization header format' });
  }

  const token = parts[1];
  const jwtSecret = getJwtSecret();

  jwt.verify(token, jwtSecret, { algorithms: [JWT_ALGORITHM] }, (err, decoded) => {
    if (err) {
      return res.status(401).json({ error: 'Invalid or expired authentication token' });
    }
    if (decoded && !decoded.sub && decoded.id) {
      decoded.sub = decoded.id;
    }
    req.user = decoded;
    next();
  });
}

// PLACEHOLDER(FT-6): ANALYST and ADMIN permissions are currently identical across all endpoints
export function requireRole(allowedRoles = ['ANALYST', 'ADMIN']) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden: insufficient role permissions' });
    }
    next();
  };
}
