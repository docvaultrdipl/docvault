const express = require('express');
const { requireAuth, requireManageUsers } = require('../middleware/auth');
const { sendExpiryDigest } = require('../utils/mailer');
const { getAlertRecipients, setAlertRecipients } = require('../utils/settings');

const router = express.Router();
router.use(requireAuth);

// GET /api/notifications/recipients — current alert recipient email(s)
router.get('/recipients', requireManageUsers, async (req, res) => {
  try {
    const recipients = await getAlertRecipients();
    res.json({ recipients });
  } catch (err) {
    console.error('Get recipients error:', err);
    res.status(500).json({ error: 'Failed to fetch recipients' });
  }
});

// PUT /api/notifications/recipients — update who receives the expiry digest.
// Body: { recipients: ["a@x.com", "b@x.com"] } or { recipients: "a@x.com,b@x.com" }
router.put('/recipients', requireManageUsers, async (req, res) => {
  const { recipients } = req.body;
  if (!recipients) {
    return res.status(400).json({ error: 'recipients is required' });
  }
  try {
    await setAlertRecipients(recipients);
    const updated = await getAlertRecipients();
    res.json({ recipients: updated });
  } catch (err) {
    console.error('Update recipients error:', err);
    res.status(500).json({ error: 'Failed to update recipients' });
  }
});

// POST /api/notifications/send-digest — manually trigger the expiry email
// digest right now (requires manage_users permission). Uses whichever
// recipients are currently saved (DB setting, falling back to .env).
router.post('/send-digest', requireManageUsers, async (req, res) => {
  try {
    const recipients = await getAlertRecipients();
    if (recipients.length === 0) {
      return res.status(400).json({ error: 'No recipients configured yet — add one below first.' });
    }
    const result = await sendExpiryDigest(recipients);
    res.json({ message: `Digest sent to ${recipients.length} recipient(s)`, ...result });
  } catch (err) {
    console.error('Send digest error:', err);
    res.status(500).json({ error: err.message || 'Failed to send digest email' });
  }
});

module.exports = router;
