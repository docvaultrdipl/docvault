const jwt = require('jsonwebtoken');
const { hasPermission, canManageUsers } = require('../utils/permissions');

// Reads "Authorization: Bearer <token>" and attaches { id, email, name, role, permissions } to req.user
function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// Must be used AFTER requireAuth. e.g. requirePermission('licenses', 'edit')
function requirePermission(moduleName, action) {
  return (req, res, next) => {
    if (!hasPermission(req.user, moduleName, action)) {
      return res.status(403).json({ error: `You don't have permission to ${action} ${moduleName}` });
    }
    next();
  };
}

// Must be used AFTER requireAuth. Gates the Manage Users pages/routes.
function requireManageUsers(req, res, next) {
  if (!canManageUsers(req.user)) {
    return res.status(403).json({ error: "You don't have permission to manage users" });
  }
  next();
}

module.exports = { requireAuth, requirePermission, requireManageUsers };
