const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'workshop-ragnarok-secret';

function authMiddleware(req, res, next) {
  // Allow login route to bypass auth
  const cleanPath = req.path;
  if (cleanPath === '/auth/login' || 
      cleanPath === '/api/auth/login' ||
      cleanPath.startsWith('/api/image') ||
      cleanPath.startsWith('/image')) {
    return next();
  }

  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    return res.status(401).json({ error: 'Authorization header missing' });
  }

  const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : authHeader;
  if (!token) {
    return res.status(401).json({ error: 'Token missing' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // { id, username, role }
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function adminOnly(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied: Admin only' });
  }
  next();
}

module.exports = {
  authMiddleware,
  adminOnly
};
