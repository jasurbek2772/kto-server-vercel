const { Pool } = require('pg');
require('dotenv').config();

const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

db.connect()
  .then(() => console.log('✓ Neon PostgreSQL подключён'))
  .catch(err => console.error('❌ Ошибка БД:', err.message));

module.exports = db;