const express = require('express');
const pool = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

// GET /api/profile
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, email, username, role, permissions FROM users WHERE id = $1',
      [req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Get profile error:', err);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// PUT /api/profile  (name, email, and/or username)
router.put('/', async (req, res) => {
  const { name, email, username } = req.body;
  if (!name && !email && username === undefined) {
    return res.status(400).json({ error: 'Provide at least name, email, or username to update' });
  }

  try {
    if (email) {
      const existingEmail = await pool.query(
        'SELECT id FROM users WHERE email = $1 AND id != $2',
        [email, req.user.id]
      );
      if (existingEmail.rows.length > 0) {
        return res.status(409).json({ error: 'That email is already in use by another account' });
      }
    }

    if (username) {
      const existingUsername = await pool.query(
        'SELECT id FROM users WHERE username = $1 AND id != $2',
        [username, req.user.id]
      );
      if (existingUsername.rows.length > 0) {
        return res.status(409).json({ error: 'That username is already taken' });
      }
    }

    const current = await pool.query('SELECT name, email, username FROM users WHERE id = $1', [req.user.id]);
    if (current.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const nextUsername = username === undefined ? current.rows[0].username : (username || null);

    const result = await pool.query(
      'UPDATE users SET name = $1, email = $2, username = $3 WHERE id = $4 RETURNING id, name, email, username, role, permissions',
      [name || current.rows[0].name, email || current.rows[0].email, nextUsername, req.user.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

module.exports = router;
