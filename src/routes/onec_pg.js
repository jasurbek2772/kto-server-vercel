const express = require('express');
const router  = express.Router();
const db      = require('../db');

// POST /api/1c/request
router.post('/request', async (req, res) => {
  const { number_1c, category, date_received, deadline,
          branch, address, contact_person, content, dispatcher } = req.body;

  if (!number_1c || !date_received) {
    return res.status(400).json({ error: 'number_1c и date_received обязательны' });
  }

  try {
    const { rows } = await db.query(
      `INSERT INTO requests
         (number_1c, category, date_received, deadline, branch, address, contact_person, content, dispatcher)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT (number_1c) DO UPDATE SET
         category=EXCLUDED.category,
         deadline=EXCLUDED.deadline,
         address=EXCLUDED.address,
         content=EXCLUDED.content
       RETURNING id`,
      [number_1c, category, date_received, deadline || null,
       branch, address, contact_person, content, dispatcher]
    );
    res.status(201).json({ success: true, id: rows[0].id, number_1c, message: 'Заявка принята' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/1c/status/:number
router.get('/status/:number', async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT r.status, r.taken_at, r.done_at, m.full_name AS master_name
       FROM requests r LEFT JOIN masters m ON r.master_id = m.id
       WHERE r.number_1c = $1`,
      [req.params.number]
    );
    if (!rows.length) return res.status(404).json({ error: 'Не найдена' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;