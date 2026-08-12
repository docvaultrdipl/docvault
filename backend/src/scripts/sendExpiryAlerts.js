// Standalone script — does NOT start the Express server. Run this on a
// schedule (Windows Task Scheduler, cron, etc.) to email an expiry digest.
//
// Usage:
//   node src/scripts/sendExpiryAlerts.js
//
// Recipients are read from the DB (Profile → notification bell → recipients),
// falling back to ALERT_RECIPIENTS in .env if none have been saved yet.

require('dotenv').config();
const { sendExpiryDigest } = require('../utils/mailer');
const { getAlertRecipients } = require('../utils/settings');

(async () => {
  try {
    const recipients = await getAlertRecipients();

    if (recipients.length === 0) {
      console.error('No recipients configured — set one in the app (notification bell) or ALERT_RECIPIENTS in .env.');
      process.exit(1);
    }

    const result = await sendExpiryDigest(recipients);
    console.log(`Sent expiry digest (${result.itemCount} item(s)) to: ${recipients.join(', ')}`);
    process.exit(0);
  } catch (err) {
    console.error('Failed to send expiry digest:', err.message);
    process.exit(1);
  }
})();
