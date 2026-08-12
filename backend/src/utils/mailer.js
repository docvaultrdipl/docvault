const nodemailer = require('nodemailer');
const pool = require('../db');

const SOON_DAYS_VEHICLE = 10;

const LICENSE_STATUS_SQL = `
  CASE
    WHEN validity_end IS NULL THEN 'No Expiry'
    WHEN validity_end < CURRENT_DATE THEN 'Expired'
    WHEN validity_end <= CURRENT_DATE + INTERVAL '30 days' THEN 'Expiring Soon'
    ELSE 'Active'
  END
`;

const VEHICLE_STATUS_SQL = `
  CASE
    WHEN validity < CURRENT_DATE THEN 'Expired'
    WHEN validity <= CURRENT_DATE + INTERVAL '${SOON_DAYS_VEHICLE} days' THEN 'Expiring Soon'
    ELSE 'Active'
  END
`;

function buildTransporter() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASSWORD) {
    throw new Error('Email is not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD in .env');
  }
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT) || 587,
    secure: Number(SMTP_PORT) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASSWORD },
  });
}

// Fetches every license/vehicle currently Expired or Expiring Soon, kept as
// two separate lists so the email can show them as two distinct tables.
// `days` is positive when the expiry is still ahead (Expiring Soon) and
// negative when it's already passed (Expired) — computed directly in SQL
// via date subtraction so it's always accurate as of "today".
async function getExpiringItems() {
  const licenseResult = await pool.query(
    `SELECT name, type, license_key, validity_end AS date,
            (validity_end - CURRENT_DATE) AS days,
            ${LICENSE_STATUS_SQL} AS status
     FROM licenses`
  );
  const vehicleResult = await pool.query(
    `SELECT category, user_name, place, vehicle_type, vehicle_number, validity AS date,
            (validity - CURRENT_DATE) AS days,
            ${VEHICLE_STATUS_SQL} AS status
     FROM vehicles`
  );

  const licenseItems = licenseResult.rows
    .filter((r) => r.status === 'Expired' || r.status === 'Expiring Soon')
    .map((r) => ({
      documentType: r.type || '—',
      documentName: r.name,
      licenseNumber: r.license_key,
      date: r.date,
      days: r.days,
      status: r.status,
    }))
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  const vehicleItems = vehicleResult.rows
    .filter((r) => r.status === 'Expired' || r.status === 'Expiring Soon')
    .map((r) => ({
      insuranceType: (r.category || '').toUpperCase(),
      userName: r.user_name,
      location: r.place || '—',
      vehicleType: r.vehicle_type || '—',
      vehicleNumber: r.vehicle_number,
      date: r.date,
      days: r.days,
      status: r.status,
    }))
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  return { licenseItems, vehicleItems };
}

const STATUS_COLOR = { Expired: '#c0392b', 'Expiring Soon': '#ad7a00' };

function formatDate(date) {
  return new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function td(content, color) {
  const style = `padding:6px 8px;border:1px solid #ddd;${color ? `color:${color};font-weight:bold;` : ''}`;
  return `<td style="${style}">${content}</td>`;
}

function buildLicenseTable(items) {
  const rows = items.length === 0
    ? '<tr><td colspan="7" style="padding:10px;">Nothing expiring right now.</td></tr>'
    : items.map((item, i) => `
        <tr>
          ${td(i + 1)}
          ${td(item.documentType)}
          ${td(item.documentName)}
          ${td(item.licenseNumber)}
          ${td(formatDate(item.date))}
          ${td(item.days, STATUS_COLOR[item.status])}
          ${td(item.status, STATUS_COLOR[item.status])}
        </tr>
      `).join('');

  return `
    <h3 style="color:#1F3864;margin-bottom:6px;">Licenses (${items.length})</h3>
    <table style="border-collapse:collapse;width:100%;margin-bottom:24px;">
      <thead>
        <tr style="background:#1F3864;color:#fff;">
          <th style="padding:6px 8px;text-align:left;">S.No</th>
          <th style="padding:6px 8px;text-align:left;">Document Type</th>
          <th style="padding:6px 8px;text-align:left;">Document Name</th>
          <th style="padding:6px 8px;text-align:left;">License Number</th>
          <th style="padding:6px 8px;text-align:left;">Expiry Date</th>
          <th style="padding:6px 8px;text-align:left;">Days</th>
          <th style="padding:6px 8px;text-align:left;">Status</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function buildVehicleTable(items) {
  const rows = items.length === 0
    ? '<tr><td colspan="9" style="padding:10px;">Nothing expiring right now.</td></tr>'
    : items.map((item, i) => `
        <tr>
          ${td(i + 1)}
          ${td(item.insuranceType)}
          ${td(item.userName)}
          ${td(item.location)}
          ${td(item.vehicleType)}
          ${td(item.vehicleNumber)}
          ${td(formatDate(item.date))}
          ${td(item.days, STATUS_COLOR[item.status])}
          ${td(item.status, STATUS_COLOR[item.status])}
        </tr>
      `).join('');

  return `
    <h3 style="color:#1F3864;margin-bottom:6px;">Vehicles (${items.length})</h3>
    <table style="border-collapse:collapse;width:100%;">
      <thead>
        <tr style="background:#1F3864;color:#fff;">
          <th style="padding:6px 8px;text-align:left;">S.No</th>
          <th style="padding:6px 8px;text-align:left;">Insurance Type</th>
          <th style="padding:6px 8px;text-align:left;">User Name</th>
          <th style="padding:6px 8px;text-align:left;">Location</th>
          <th style="padding:6px 8px;text-align:left;">Vehicle Type</th>
          <th style="padding:6px 8px;text-align:left;">Vehicle Number</th>
          <th style="padding:6px 8px;text-align:left;">Expiry Date</th>
          <th style="padding:6px 8px;text-align:left;">Days</th>
          <th style="padding:6px 8px;text-align:left;">Status</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function buildDigestHtml({ licenseItems, vehicleItems }) {
  const totalCount = licenseItems.length + vehicleItems.length;
  return `
    <div style="font-family:Arial,sans-serif;">
      <h2 style="color:#1F3864;margin-bottom:4px;">DocVault — Expiry Reminder</h2>
      <p style="margin-top:0;">${totalCount} item(s) are expired or expiring soon.</p>
      ${buildLicenseTable(licenseItems)}
      ${buildVehicleTable(vehicleItems)}
    </div>
  `;
}

// Sends the digest email to the given recipients (comma-separated string or array).
async function sendExpiryDigest(recipients) {
  const toList = Array.isArray(recipients) ? recipients.join(',') : recipients;
  if (!toList) {
    throw new Error('No recipient email address(es) provided');
  }

  const { licenseItems, vehicleItems } = await getExpiringItems();
  const totalCount = licenseItems.length + vehicleItems.length;
  const transporter = buildTransporter();

  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: toList,
    subject: `DocVault — ${totalCount} item(s) expiring or expired`,
    html: buildDigestHtml({ licenseItems, vehicleItems }),
  });

  return { itemCount: totalCount, licenseCount: licenseItems.length, vehicleCount: vehicleItems.length };
}

module.exports = { getExpiringItems, sendExpiryDigest };
