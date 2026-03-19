const express    = require('express');
const router     = express.Router();
const db         = require('../db');
const multer     = require('multer');
const cloudinary = require('../cloudinary');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

function uploadToCloudinary(buffer, requestId) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: `kto/request_${requestId}`, resource_type: 'image' },
      (error, result) => { if (error) reject(error); else resolve(result); }
    );
    stream.end(buffer);
  });
}

// GET /api/requests
router.get('/', async (req, res) => {
  try {
    let sql = `
      SELECT r.*, m.full_name AS master_name, m.phone AS master_phone
      FROM requests r LEFT JOIN masters m ON r.master_id = m.id
    `;
    const params = [];
    if (req.query.status) {
      sql += ' WHERE r.status = $1';
      params.push(req.query.status);
    }
    sql += ' ORDER BY r.date_received DESC';
    const { rows } = await db.query(sql, params);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/requests/:id
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT r.*, m.full_name AS master_name, m.phone AS master_phone
       FROM requests r LEFT JOIN masters m ON r.master_id = m.id
       WHERE r.id = $1`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Заявка не найдена' });
    const request = rows[0];
    const { rows: photos } = await db.query(
      'SELECT id, filename, url, uploaded_at FROM photos WHERE request_id = $1',
      [req.params.id]
    );
    request.photos = photos;
    res.json(request);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/requests/:id/take
router.post('/:id/take', async (req, res) => {
  const { master_id } = req.body;
  if (!master_id) return res.status(400).json({ error: 'master_id обязателен' });
  try {
    const { rows } = await db.query('SELECT status FROM requests WHERE id = $1', [req.params.id]);
    if (!rows.length)             return res.status(404).json({ error: 'Заявка не найдена' });
    if (rows[0].status !== 'free') return res.status(409).json({ error: 'Заявка уже взята' });
    await db.query(
      'UPDATE requests SET status=$1, master_id=$2, taken_at=NOW() WHERE id=$3',
      ['taken', master_id, req.params.id]
    );
    res.json({ success: true, message: 'Заявка взята в работу' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/requests/:id/return
router.post('/:id/return', async (req, res) => {
  try {
    const { rowCount } = await db.query(
      `UPDATE requests SET status='free', master_id=NULL, taken_at=NULL
       WHERE id=$1 AND status='taken'`,
      [req.params.id]
    );
    if (rowCount === 0) return res.status(400).json({ error: 'Нельзя вернуть эту заявку' });
    await db.query('DELETE FROM photos WHERE request_id = $1', [req.params.id]);
    res.json({ success: true, message: 'Заявка возвращена в буфер' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/requests/:id/done
router.post('/:id/done', async (req, res) => {
  try {
    const { rowCount } = await db.query(
      `UPDATE requests SET status='done', done_at=NOW()
       WHERE id=$1 AND status='taken'`,
      [req.params.id]
    );
    if (rowCount === 0) return res.status(400).json({ error: 'Заявка не в работе' });
    res.json({ success: true, message: 'Заявка выполнена!' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/requests/:id
router.put('/:id', async (req, res) => {
  const { category, address, branch, contact_person, deadline, dispatcher, content } = req.body;
  try {
    await db.query(
      `UPDATE requests SET category=$1, address=$2, branch=$3,
       contact_person=$4, deadline=$5, dispatcher=$6, content=$7 WHERE id=$8`,
      [category, address, branch, contact_person, deadline || null, dispatcher, content, req.params.id]
    );
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/requests/:id/photos
router.post('/:id/photos', upload.array('photos', 10), async (req, res) => {
  const files = req.files;
  if (!files || !files.length) return res.status(400).json({ error: 'Файлы не переданы' });
  try {
    const uploaded = [];
    for (const file of files) {
      const result = await uploadToCloudinary(file.buffer, req.params.id);
      uploaded.push({ request_id: req.params.id, filename: result.public_id, url: result.secure_url });
    }
    for (const f of uploaded) {
      await db.query(
        'INSERT INTO photos (request_id, filename, url) VALUES ($1, $2, $3)',
        [f.request_id, f.filename, f.url]
      );
    }
    res.json({ success: true, uploaded: uploaded.length, files: uploaded.map(f => f.url) });
  } catch (e) { res.status(500).json({ error: 'Ошибка Cloudinary: ' + e.message }); }
});

module.exports = router;