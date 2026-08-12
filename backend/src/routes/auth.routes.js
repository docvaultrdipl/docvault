const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const { DEFAULT_PERMISSIONS_ADMIN, DEFAULT_PERMISSIONS_VIEWER, sanitizePermissions, canManageUsers } = require('../utils/permissions');

const router = express.Router();

// POST /api/auth/register
// Creates a new user. Username is optional but, if given, must be unique.
// If NO users exist yet, this works without auth (bootstraps the first admin
// with full permissions). Once at least one user exists, an authenticated
// user with "manage_users" permission is required, and they choose the new
// user's permissions (view/add/edit/delete per module, plus manage_users).
router.post('/register', async (req, res) => {
  const { name, email, username, password, permissions } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'name, email and password are required' });
  }

  try {
    const countResult = await pool.query('SELECT COUNT(*)::int AS count FROM users');
    const isFirstUser = countResult.rows[0].count === 0;

    let finalPermissions = DEFAULT_PERMISSIONS_VIEWER;

    if (isFirstUser) {
      finalPermissions = DEFAULT_PERMISSIONS_ADMIN;
    } else {
      const header = req.headers.authorization || '';
      const token = header.startsWith('Bearer ') ? header.slice(7) : null;
      if (!token) {
        return res.status(401).json({ error: 'You must be logged in to create new users' });
      }
      let payload;
      try {
        payload = jwt.verify(token, process.env.JWT_SECRET);
      } catch {
        return res.status(401).json({ error: 'Invalid or expired token' });
      }
      if (!canManageUsers(payload)) {
        return res.status(403).json({ error: "You don't have permission to create new users" });
      }
      finalPermissions = sanitizePermissions(permissions);
    }

    const existingEmail = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingEmail.rows.length > 0) {
      return res.status(409).json({ error: 'A user with this email already exists' });
    }

    if (username) {
      const existingUsername = await pool.query('SELECT id FROM users WHERE username = $1', [username]);
      if (existingUsername.rows.length > 0) {
        return res.status(409).json({ error: 'That username is already taken' });
      }
    }

    const passwordHash = await bcrypt.hash(password, 10);
    // "role" is kept only as a friendly display label now; real access control lives in `permissions`.
    const displayRole = finalPermissions.manage_users ? 'Administrator' : 'Viewer';

    const result = await pool.query(
      `INSERT INTO users (name, email, username, password_hash, role, permissions)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, name, email, username, role, permissions`,
      [name, email, username || null, passwordHash, displayRole, JSON.stringify(finalPermissions)]
    );

    const user = result.rows[0];
    const token = signToken(user);

    res.status(201).json({ token, user });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Failed to register user' });
  }
});

// POST /api/auth/login
// Accepts an "identifier" which can be either the account's email OR username.
router.post('/login', async (req, res) => {
  const { identifier, password } = req.body;

  if (!identifier || !password) {
    return res.status(400).json({ error: 'Email/username and password are required' });
  }

  try {
    const result = await pool.query(
      'SELECT id, name, email, username, password_hash, role, permissions FROM users WHERE email = $1 OR username = $1',
      [identifier]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email/username or password' });
    }

    const dbUser = result.rows[0];
    const passwordMatches = await bcrypt.compare(password, dbUser.password_hash);

    if (!passwordMatches) {
      return res.status(401).json({ error: 'Invalid email/username or password' });
    }

    const user = {
      id: dbUser.id,
      name: dbUser.name,
      email: dbUser.email,
      username: dbUser.username,
      role: dbUser.role,
      permissions: dbUser.permissions,
    };
    const token = signToken(user);

    res.json({ token, user });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Failed to log in' });
  }
});

function signToken(user) {
  return jwt.sign(
    { id: user.id, name: user.name, email: user.email, username: user.username, role: user.role, permissions: user.permissions },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

module.exports = router;
