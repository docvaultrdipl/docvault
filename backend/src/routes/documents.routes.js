const express = require('express');
const path = require('path');
const multer = require('multer');
const pool = require('../db');
const { requireAuth, requirePermission } = require('../middleware/auth');
const { logActivity } = require('../utils/activityLog');

const router = express.Router();

// --- File upload setup ---
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '..', '..', 'uploads')),
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${uniqueSuffix}-${file.originalname}`);
  },
});
const upload = multer({ storage });

// Status is computed in SQL from validity_end, exactly like the frontend's
// computeStatus(): No Expiry / Expired / Expiring Soon (<=30 days) / Active.
const STATUS_CASE_SQL = `
  CASE
    WHEN validity_end IS NULL THEN 'No Expiry'
    WHEN validity_end < CURRENT_DATE THEN 'Expired'
    WHEN validity_end <= CURRENT_DATE + INTERVAL '30 days' THEN 'Expiring Soon'
    ELSE 'Active'
  END
`;

router.use(requireAuth);

// GET /api/documents
// Shared company-wide data: every logged-in user sees every license,
// sorted alphabetically by name (A → Z) by default.
router.get('/', requirePermission('licenses', 'view'), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, license_key, type, validity_start, validity_end,
              remarks, attachment_path, attachment_name,
              ${STATUS_CASE_SQL} AS status
       FROM licenses
       ORDER BY name ASC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('List documents error:', err);
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

// POST /api/documents  (multipart/form-data if attaching a file)
router.post('/', requirePermission('licenses', 'add'), upload.single('attachment'), async (req, res) => {
  const { name, license_key, type, validity_start, validity_end, remarks } = req.body;

  if (!name || !license_key) {
    return res.status(400).json({ error: 'name and license_key are required' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO licenses
         (user_id, name, license_key, type, validity_start, validity_end, remarks, attachment_path, attachment_name)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, name, license_key, type, validity_start, validity_end,
                 remarks, attachment_path, attachment_name,
                 ${STATUS_CASE_SQL} AS status`,
      [
        req.user.id,
        name,
        license_key,
        type || null,
        validity_start || null,
        validity_end || null,
        remarks || null,
        req.file ? req.file.filename : null,
        req.file ? req.file.originalname : null,
      ]
    );
    const created = result.rows[0];

    await logActivity({ actorId: req.user.id, action: 'created', entityId: created.id, entityName: created.name, entityType: 'license' });

    res.status(201).json(created);
  } catch (err) {
    console.error('Create document error:', err);
    res.status(500).json({ error: 'Failed to create document' });
  }
});

// POST /api/documents/bulk — bulk import from a parsed Excel sheet.
// Body: { rows: [{ name, license_key, type, validity_start, validity_end, remarks }, ...] }
router.post('/bulk', requirePermission('licenses', 'add'), async (req, res) => {
  const { rows } = req.body;

  if (!Array.isArray(rows) || rows.length === 0) {
    return res.status(400).json({ error: 'No rows to import' });
  }

  let successCount = 0;
  const rowErrors = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i] || {};
    const rowNum = i + 1;

    if (!row.name || !row.license_key) {
      rowErrors.push(`Row ${rowNum}: name and license_key are required`);
      continue;
    }

    try {
      const result = await pool.query(
        `INSERT INTO licenses (user_id, name, license_key, type, validity_start, validity_end, remarks)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, name`,
        [
          req.user.id,
          row.name,
          row.license_key,
          row.type || null,
          row.validity_start || null,
          row.validity_end || null,
          row.remarks || null,
        ]
      );
      const created = result.rows[0];
      successCount += 1;
      await logActivity({ actorId: req.user.id, action: 'created', entityId: created.id, entityName: created.name, entityType: 'license' });
    } catch (err) {
      console.error('Bulk import document row error:', err);
      rowErrors.push(`Row ${rowNum}: failed to save (${err.message})`);
    }
  }

  res.status(201).json({ successCount, totalRows: rows.length, errors: rowErrors });
});

// PUT /api/documents/:id  (multipart/form-data if replacing the attachment)
// Any logged-in user can edit any license (shared company-wide data).
router.put('/:id', requirePermission('licenses', 'edit'), upload.single('attachment'), async (req, res) => {
  const { id } = req.params;
  const { name, license_key, type, validity_start, validity_end, remarks } = req.body;

  try {
    const existing = await pool.query('SELECT * FROM licenses WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const current = existing.rows[0];
    const attachment_path = req.file ? req.file.filename : current.attachment_path;
    const attachment_name = req.file ? req.file.originalname : current.attachment_name;

    const result = await pool.query(
      `UPDATE licenses SET
         name = $1, license_key = $2, type = $3,
         validity_start = $4, validity_end = $5, remarks = $6,
         attachment_path = $7, attachment_name = $8,
         updated_at = NOW()
       WHERE id = $9
       RETURNING id, name, license_key, type, validity_start, validity_end,
                 remarks, attachment_path, attachment_name,
                 ${STATUS_CASE_SQL} AS status`,
      [
        name ?? current.name,
        license_key ?? current.license_key,
        type ?? current.type,
        validity_start ?? current.validity_start,
        validity_end ?? current.validity_end,
        remarks ?? current.remarks,
        attachment_path,
        attachment_name,
        id,
      ]
    );
    const updated = result.rows[0];

    await logActivity({ actorId: req.user.id, action: 'updated', entityId: updated.id, entityName: updated.name, entityType: 'license' });

    res.json(updated);
  } catch (err) {
    console.error('Update document error:', err);
    res.status(500).json({ error: 'Failed to update document' });
  }
});

// DELETE /api/documents/:id
// Any logged-in user can delete any license (shared company-wide data).
router.delete('/:id', requirePermission('licenses', 'delete'), async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      'DELETE FROM licenses WHERE id = $1 RETURNING id, name',
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const deleted = result.rows[0];
    await logActivity({ actorId: req.user.id, action: 'deleted', entityId: deleted.id, entityName: deleted.name, entityType: 'license' });

    res.status(204).send();
  } catch (err) {
    console.error('Delete document error:', err);
    res.status(500).json({ error: 'Failed to delete document' });
  }
});

module.exports = router;
