const pool = require('../db');

async function getSetting(key) {
  const result = await pool.query('SELECT value FROM settings WHERE key = $1', [key]);
  return result.rows[0]?.value ?? null;
}

async function setSetting(key, value) {
  await pool.query(
    `INSERT INTO settings (key, value) VALUES ($1, $2)
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
    [key, value]
  );
}

// Returns the list of email addresses that should receive the expiry digest.
// Prefers whatever's saved in the DB (editable from the app); falls back to
// the .env ALERT_RECIPIENTS value if nothing has been saved yet.
async function getAlertRecipients() {
  const saved = await getSetting('alert_recipients');
  const raw = saved || process.env.ALERT_RECIPIENTS || '';
  return raw.split(',').map((s) => s.trim()).filter(Boolean);
}

async function setAlertRecipients(emails) {
  const value = Array.isArray(emails) ? emails.join(',') : emails;
  await setSetting('alert_recipients', value);
}

module.exports = { getSetting, setSetting, getAlertRecipients, setAlertRecipients };
