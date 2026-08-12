const express = require('express');
const path = require('path');
const multer = require('multer');
const pool = require('../db');
const { requireAuth, requirePermission } = require('../middleware/auth');
const { logActivity } = require('../utils/activityLog');

const router = express.Router();

const ALLOWED_CATEGORIES = ['rc', 'tax', 'od', 'tp', 'pollution'];
const SOON_DAYS = 10; // matches the original Flask app's threshold

// Status computed in SQL from validity, same pattern as licenses.
const STATUS_CASE_SQL = `
  CASE
    WHEN validity < CURRENT_DATE THEN 'Expired'
    WHEN validity <= CURRENT_DATE + INTERVAL '${SOON_DAYS} days' THEN 'Expiring Soon'
    ELSE 'Active'
  END
`;

// --- File upload setup (same pattern as documents.routes.js) ---
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '..', '..', 'uploads')),
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${uniqueSuffix}-${file.originalname}`);
  },
});
const upload = multer({ storage });

router.use(requireAuth);

function validateCategory(category) {
  return ALLOWED_CATEGORIES.includes(category);
}

// GET /api/vehicles?category=rc&search=&status=
// Shared company-wide data: every logged-in user sees every vehicle record.
router.get('/', requirePermission('vehicles', 'view'), async (req, res) => {
  const { category, search, status } = req.query;

  const conditions = [];
  const params = [];

  if (category && category !== 'all') {
    if (!validateCategory(category)) {
      return res.status(400).json({ error: 'Invalid category' });
    }
    params.push(category);
    conditions.push(`category = $${params.length}`);
  }

  if (search) {
    params.push(`%${search}%`);
    const idx = params.length;
    conditions.push(`(user_name ILIKE $${idx} OR place ILIKE $${idx} OR vehicle_type ILIKE $${idx} OR vehicle_number ILIKE $${idx})`);
  }

  const whereSql = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  try {
    let sql = `
      SELECT id, category, user_name, place, vehicle_type, vehicle_number, validity,
             attachment_path, attachment_name,
             ${STATUS_CASE_SQL} AS status
      FROM vehicles
      ${whereSql}
      ORDER BY user_name ASC
    `;

    let rows = (await pool.query(sql, params)).rows;

    // Status filter applied after computing status (keeps the SQL simple/readable).
    if (status && status !== 'all') {
      rows = rows.filter((r) => r.status === status);
    }

    res.json(rows);
  } catch (err) {
    console.error('List vehicles error:', err);
    res.status(500).json({ error: 'Failed to fetch vehicles' });
  }
});

// GET /api/vehicles/stats — counts per category + overall, for the dashboard.
router.get('/stats', requirePermission('vehicles', 'view'), async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT category, ${STATUS_CASE_SQL} AS status
      FROM vehicles
    `);

    const perCategory = {};
    ALLOWED_CATEGORIES.forEach((c) => {
      perCategory[c] = { total: 0, active: 0, expiringSoon: 0, expired: 0 };
    });
    const overall = { total: 0, active: 0, expiringSoon: 0, expired: 0 };

    result.rows.forEach((row) => {
      const bucket = perCategory[row.category];
      if (!bucket) return;
      bucket.total += 1;
      overall.total += 1;
      if (row.status === 'Active') { bucket.active += 1; overall.active += 1; }
      else if (row.status === 'Expiring Soon') { bucket.expiringSoon += 1; overall.expiringSoon += 1; }
      else if (row.status === 'Expired') { bucket.expired += 1; overall.expired += 1; }
    });

    res.json({ overall, perCategory });
  } catch (err) {
    console.error('Vehicle stats error:', err);
    res.status(500).json({ error: 'Failed to fetch vehicle stats' });
  }
});

// POST /api/vehicles — add a single vehicle record to one category (with optional attachment)
router.post('/', requirePermission('vehicles', 'add'), upload.single('attachment'), async (req, res) => {
  const { category, user_name, place, vehicle_type, vehicle_number, validity } = req.body;

  if (!category || !validateCategory(category)) {
    return res.status(400).json({ error: 'A valid category is required' });
  }
  if (!user_name || !vehicle_number || !validity) {
    return res.status(400).json({ error: 'user_name, vehicle_number and validity are required' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO vehicles (category, user_name, place, vehicle_type, vehicle_number, validity, attachment_path, attachment_name, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, category, user_name, place, vehicle_type, vehicle_number, validity,
                 attachment_path, attachment_name,
                 ${STATUS_CASE_SQL} AS status`,
      [
        category,
        user_name,
        place || null,
        vehicle_type || null,
        (vehicle_number || '').toUpperCase(),
        validity,
        req.file ? req.file.filename : null,
        req.file ? req.file.originalname : null,
        req.user.id,
      ]
    );
    const created = result.rows[0];

    await logActivity({
      actorId: req.user.id,
      action: 'created',
      entityType: 'vehicle',
      entityId: created.id,
      entityName: `${created.vehicle_number} (${created.category.toUpperCase()})`,
    });

    res.status(201).json(created);
  } catch (err) {
    console.error('Create vehicle error:', err);
    res.status(500).json({ error: 'Failed to create vehicle record' });
  }
});

// POST /api/vehicles/multi — add the same vehicle to several categories at once,
// each with its own validity date. Body: { user_name, place, vehicle_type, vehicle_number,
// entries: [{ category, validity }, ...] }
router.post('/multi', requirePermission('vehicles', 'add'), async (req, res) => {
  const { user_name, place, vehicle_type, vehicle_number, entries } = req.body;

  if (!user_name || !vehicle_number) {
    return res.status(400).json({ error: 'user_name and vehicle_number are required' });
  }
  if (!Array.isArray(entries) || entries.length === 0) {
    return res.status(400).json({ error: 'At least one category with a validity date is required' });
  }

  const created = [];
  const errors = [];

  for (const entry of entries) {
    const { category, validity } = entry || {};
    if (!validateCategory(category)) {
      errors.push(`Invalid category: ${category}`);
      continue;
    }
    if (!validity) {
      errors.push(`${category.toUpperCase()}: validity date is missing`);
      continue;
    }
    try {
      const result = await pool.query(
        `INSERT INTO vehicles (category, user_name, place, vehicle_type, vehicle_number, validity, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, category, user_name, place, vehicle_type, vehicle_number, validity,
                   ${STATUS_CASE_SQL} AS status`,
        [category, user_name, place || null, vehicle_type || null, vehicle_number.toUpperCase(), validity, req.user.id]
      );
      const row = result.rows[0];
      created.push(row);
      await logActivity({
        actorId: req.user.id,
        action: 'created',
        entityType: 'vehicle',
        entityId: row.id,
        entityName: `${row.vehicle_number} (${row.category.toUpperCase()})`,
      });
    } catch (err) {
      console.error('Multi-add vehicle error:', err);
      errors.push(`${category.toUpperCase()}: failed to save`);
    }
  }

  if (created.length === 0) {
    return res.status(400).json({ error: errors.join(' | ') || 'Failed to create records' });
  }

  res.status(201).json({ created, errors });
});

// POST /api/vehicles/bulk — bulk import from a parsed Excel sheet.
// Body: { rows: [{ category, user_name, place, vehicle_type, vehicle_number, validity }, ...] }
router.post('/bulk', requirePermission('vehicles', 'add'), async (req, res) => {
  const { rows } = req.body;

  if (!Array.isArray(rows) || rows.length === 0) {
    return res.status(400).json({ error: 'No rows to import' });
  }

  let successCount = 0;
  const rowErrors = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i] || {};
    const rowNum = i + 1;
    const category = (row.category || '').toLowerCase().trim();

    if (!validateCategory(category)) {
      rowErrors.push(`Row ${rowNum}: invalid category "${row.category}"`);
      continue;
    }
    if (!row.user_name || !row.vehicle_number || !row.validity) {
      rowErrors.push(`Row ${rowNum}: user_name, vehicle_number and validity are required`);
      continue;
    }

    try {
      const result = await pool.query(
        `INSERT INTO vehicles (category, user_name, place, vehicle_type, vehicle_number, validity, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, vehicle_number, category`,
        [category, row.user_name, row.place || null, row.vehicle_type || null, String(row.vehicle_number).toUpperCase(), row.validity, req.user.id]
      );
      const created = result.rows[0];
      successCount += 1;
      await logActivity({
        actorId: req.user.id,
        action: 'created',
        entityType: 'vehicle',
        entityId: created.id,
        entityName: `${created.vehicle_number} (${created.category.toUpperCase()})`,
      });
    } catch (err) {
      console.error('Bulk import vehicle row error:', err);
      rowErrors.push(`Row ${rowNum}: failed to save (${err.message})`);
    }
  }

  res.status(201).json({ successCount, totalRows: rows.length, errors: rowErrors });
});

// PUT /api/vehicles/:id (with optional attachment replacement)
router.put('/:id', requirePermission('vehicles', 'edit'), upload.single('attachment'), async (req, res) => {
  const { id } = req.params;
  const { user_name, place, vehicle_type, vehicle_number, validity } = req.body;

  try {
    const existing = await pool.query('SELECT * FROM vehicles WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Vehicle record not found' });
    }
    const current = existing.rows[0];

    const attachment_path = req.file ? req.file.filename : current.attachment_path;
    const attachment_name = req.file ? req.file.originalname : current.attachment_name;

    const result = await pool.query(
      `UPDATE vehicles SET
         user_name = $1, place = $2, vehicle_type = $3, vehicle_number = $4,
         validity = $5, attachment_path = $6, attachment_name = $7, updated_at = NOW()
       WHERE id = $8
       RETURNING id, category, user_name, place, vehicle_type, vehicle_number, validity,
                 attachment_path, attachment_name,
                 ${STATUS_CASE_SQL} AS status`,
      [
        user_name ?? current.user_name,
        place ?? current.place,
        vehicle_type ?? current.vehicle_type,
        (vehicle_number ?? current.vehicle_number ?? '').toUpperCase(),
        validity ?? current.validity,
        attachment_path,
        attachment_name,
        id,
      ]
    );
    const updated = result.rows[0];

    await logActivity({
      actorId: req.user.id,
      action: 'updated',
      entityType: 'vehicle',
      entityId: updated.id,
      entityName: `${updated.vehicle_number} (${updated.category.toUpperCase()})`,
    });

    res.json(updated);
  } catch (err) {
    console.error('Update vehicle error:', err);
    res.status(500).json({ error: 'Failed to update vehicle record' });
  }
});

// DELETE /api/vehicles/:id
router.delete('/:id', requirePermission('vehicles', 'delete'), async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      'DELETE FROM vehicles WHERE id = $1 RETURNING id, vehicle_number, category',
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Vehicle record not found' });
    }
    const deleted = result.rows[0];

    await logActivity({
      actorId: req.user.id,
      action: 'deleted',
      entityType: 'vehicle',
      entityId: deleted.id,
      entityName: `${deleted.vehicle_number} (${deleted.category.toUpperCase()})`,
    });

    res.status(204).send();
  } catch (err) {
    console.error('Delete vehicle error:', err);
    res.status(500).json({ error: 'Failed to delete vehicle record' });
  }
});

module.exports = router;
