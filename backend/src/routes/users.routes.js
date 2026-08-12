const express = require('express');
const pool = require('../db');
const { requireAuth, requireManageUsers } = require('../middleware/auth');
const { sanitizePermissions } = require('../utils/permissions');

const router = express.Router();
router.use(requireAuth);
router.use(requireManageUsers);

// GET /api/users — list every user (requires manage_users permission)
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, email, username, role, permissions, created_at FROM users ORDER BY created_at ASC'
    );
    res.json(result.rows);
  } catch (err) {
    console.error('List users error:', err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// PUT /api/users/:id — update another user's name/email/username/permissions
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { name, email, username, permissions } = req.body;

  try {
    const current = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    if (current.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    const existing = current.rows[0];

    let nextPermissions = existing.permissions;
    if (permissions !== undefined) {
      nextPermissions = sanitizePermissions(permissions);

      // Don't allow removing manage_users from the last remaining user who has it —
      // that would lock everyone out of user management.
      if (existing.permissions.manage_users && !nextPermissions.manage_users) {
        const managersCount = await pool.query(
          "SELECT COUNT(*)::int AS count FROM users WHERE permissions->>'manage_users' = 'true'"
        );
        if (managersCount.rows[0].count <= 1) {
          return res.status(400).json({ error: 'Cannot remove user-management rights from the last remaining manager' });
        }
      }
    }

    if (email) {
      const dupe = await pool.query('SELECT id FROM users WHERE email = $1 AND id != $2', [email, id]);
      if (dupe.rows.length > 0) {
        return res.status(409).json({ error: 'That email is already in use by another account' });
      }
    }
    if (username) {
      const dupe = await pool.query('SELECT id FROM users WHERE username = $1 AND id != $2', [username, id]);
      if (dupe.rows.length > 0) {
        return res.status(409).json({ error: 'That username is already taken' });
      }
    }

    const displayRole = nextPermissions.manage_users ? 'Administrator' : 'Viewer';

    const result = await pool.query(
      `UPDATE users SET name = $1, email = $2, username = $3, role = $4, permissions = $5 WHERE id = $6
       RETURNING id, name, email, username, role, permissions, created_at`,
      [
        name || existing.name,
        email || existing.email,
        username === undefined ? existing.username : (username || null),
        displayRole,
        JSON.stringify(nextPermissions),
        id,
      ]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update user error:', err);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// DELETE /api/users/:id — remove a user
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  if (parseInt(id, 10) === req.user.id) {
    return res.status(400).json({ error: 'You cannot delete your own account while logged in' });
  }

  try {
    const existing = await pool.query('SELECT permissions FROM users WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (existing.rows[0].permissions?.manage_users) {
      const managersCount = await pool.query(
        "SELECT COUNT(*)::int AS count FROM users WHERE permissions->>'manage_users' = 'true'"
      );
      if (managersCount.rows[0].count <= 1) {
        return res.status(400).json({ error: 'Cannot delete the last remaining manager' });
      }
    }

    await pool.query('DELETE FROM users WHERE id = $1', [id]);
    res.status(204).send();
  } catch (err) {
    console.error('Delete user error:', err);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

module.exports = router;
