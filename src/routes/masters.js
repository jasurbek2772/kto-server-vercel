const express    = require('express');
const router     = express.Router();
const db         = require('../db');
const multer     = require('multer');
const cloudinary = require('../cloudinary');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

function uploadToCloudinary(buffer, folder) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: `kto/${folder}`, resource_type: 'image' },
      (error, result) => { if (error) reject(error); else resolve(result); }
    );
    stream.end(buffer);
  });
}

// GET /api/masters
router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT id, full_name, code, phone, photo_url FROM masters WHERE is_active = 1 ORDER BY full_name'
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/masters/all
router.get('/all', async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT id, full_name, code, phone, photo_url, is_active FROM masters ORDER BY full_name'
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/masters — добавить мастера
router.post('/', upload.single('photo'), async (req, res) => {
  console.log('POST body:', req.body); 
  const { full_name, code, phone } = req.body;

  if (!full_name) return res.status(400).json({ error: 'full_name обязателен' });

  try {
    let photoUrl = null;

    // Если при создании мастера сразу передали файл фото
    if (req.file) {
      const cloudinaryResult = await uploadToCloudinary(req.file.buffer, 'masters');
      photoUrl = cloudinaryResult.secure_url;
    }

    // Сохраняем в базу (с фото или без него)
    // Обратите внимание: добавлено поле photo_url в запрос
    db.query(
      'INSERT INTO masters (full_name, code, phone, photo_url) VALUES (?, ?, ?, ?)',
      [full_name, code || null, phone || null, photoUrl],
      (err, result) => {
        if (err) {
          console.error('DB error:', err);
          return res.status(500).json({ error: err.message });
        }
        res.status(201).json({ 
          id: result.insertId, 
          full_name, 
          code, 
          phone, 
          photo_url: photoUrl 
        });
      }
    );
  } catch (e) {
    console.error('Cloudinary upload error:', e);
    res.status(500).json({ error: 'Ошибка загрузки фото: ' + e.message });
  }
});

// POST /api/masters/:id/photo
router.post('/:id/photo', upload.single('photo'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Файл не передан' });
  try {
    const result = await uploadToCloudinary(req.file.buffer, 'masters');
    await db.query('UPDATE masters SET photo_url = $1 WHERE id = $2', [result.secure_url, req.params.id]);
    res.json({ success: true, photo_url: result.secure_url });
  } catch (e) { res.status(500).json({ error: 'Ошибка Cloudinary: ' + e.message }); }
});

// PUT /api/masters/:id
router.put('/:id', async (req, res) => {
  const { full_name, phone, code, is_active } = req.body;
  try {
    await db.query(
      'UPDATE masters SET full_name=$1, phone=$2, code=$3, is_active=$4 WHERE id=$5',
      [full_name, phone, code, is_active, req.params.id]
    );
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;