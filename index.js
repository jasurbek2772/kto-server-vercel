const express = require('express');
const cors    = require('cors');
const path    = require('path');
require('dotenv').config();
require('./src/db');

const mastersRouter  = require('./src/routes/masters');
const requestsRouter = require('./src/routes/requests_cloudinary');
const onecRouter     = require('./src/routes/onec');
const authRouter     = require('./src/routes/auth');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Страница логина
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/login/login.html'));
});
app.use('/login', express.static(path.join(__dirname, 'public/login')));

// Админка
app.use('/admin', express.static(path.join(__dirname, 'public')));

// API
app.use('/api/auth',     authRouter);
app.use('/api/masters',  mastersRouter);
app.use('/api/requests', requestsRouter);
app.use('/api/1c',       onecRouter);

// Пинг для cron-job
app.get('/ping', (req, res) => res.json({ status: 'ok', time: new Date() }));

app.get('/', (req, res) => res.json({ status: 'ok', message: 'КТО API работает' }));

// ✅ Для Vercel — экспортируем app вместо listen
if (process.env.VERCEL) {
  module.exports = app;
} else {
  const PORT = process.env.PORT || 4000;
  app.listen(PORT, () => console.log(`✓ Сервер: http://localhost:${PORT}`));
}