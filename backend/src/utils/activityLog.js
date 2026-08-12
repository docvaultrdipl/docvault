const pool = require('../db');

// Records one row in activity_log. Looks up the actor's current name fresh
// from the DB (rather than trusting the JWT payload, which could be stale
// if the user changed their name after the token was issued).
// entityType is 'license' (default, backward compatible) or 'vehicle'.
async function logActivity({ actorId, action, entityId, entityName, entityType = 'license' }) {
  try {
    const actorResult = await pool.query('SELECT name FROM users WHERE id = $1', [actorId]);
    const actorName = actorResult.rows[0]?.name || 'Unknown user';

    await pool.query(
      `INSERT INTO activity_log (actor_id, actor_name, action, entity_type, license_id, license_name)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [actorId, actorName, action, entityType, entityId, entityName]
    );
  } catch (err) {
    // Activity logging must never break the main request — just log it.
    console.error('Failed to record activity log entry:', err);
  }
}

module.exports = { logActivity };
