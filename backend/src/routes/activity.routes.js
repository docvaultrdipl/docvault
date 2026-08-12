const express = require('express');
const pool = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

// GET /api/activity — most recent 20 actions, newest first (dashboard feed)
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, actor_name, action, entity_type, license_id, license_name, created_at
       FROM activity_log
       ORDER BY created_at DESC
       LIMIT 20`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('List activity error:', err);
    res.status(500).json({ error: 'Failed to fetch activity log' });
  }
});

// GET /api/activity/:entityType/:entityId — full timeline for one specific
// license or vehicle record, e.g. /api/activity/license/5 or /api/activity/vehicle/12
router.get('/:entityType/:entityId', async (req, res) => {
  const { entityType, entityId } = req.params;

  if (!['license', 'vehicle'].includes(entityType)) {
    return res.status(400).json({ error: 'entityType must be "license" or "vehicle"' });
  }

  try {
    const result = await pool.query(
      `SELECT id, actor_name, action, entity_type, license_id, license_name, created_at
       FROM activity_log
       WHERE entity_type = $1 AND license_id = $2
       ORDER BY created_at DESC`,
      [entityType, entityId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Record history error:', err);
    res.status(500).json({ error: 'Failed to fetch record history' });
  }
});

module.exports = router;
