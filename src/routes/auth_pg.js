const express = require('express');
const router  = express.Router();
const jwt     = require('jsonwebtoken');
const db      = require('../db');

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Введите логин и пароль' });

  try {
    const { rows } = await db.query('SELECT * FROM admins WHERE username = $1', [username]);
    if (!rows.length) return res.status(401).json({ error: 'Неверный логин или пароль' });

    const admin = rows[0];
    if (password !== admin.password_hash) {
      return res.status(401).json({ error: 'Неверный логин или пароль' });
    }

    const token = jwt.sign(
      { id: admin.id, username: admin.username },
      process.env.JWT_SECRET || 'kto_secret_key',
      { expiresIn: '7d' }
    );
    res.json({ token, username: admin.username });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { username, password } = req.body;
  try {
    await db.query(
      'INSERT INTO admins (username, password_hash) VALUES ($1, $2)',
      [username, password]
    );
    res.status(201).json({ status: 'создан' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;