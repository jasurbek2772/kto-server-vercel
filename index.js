const express = require('express');
const cors    = require('cors');
const path    = require('path');
require('dotenv').config();
require('./src/db_neon');

const mastersRouter  = require('./src/routes/masters_pg');
const requestsRouter = require('./src/routes/requests_pg');
const onecRouter     = require('./src/routes/onec_pg');
const authRouter     = require('./src/routes/auth_pg');
const authMiddleware = require('./src/routes/middleware/auth_middleware');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // ← добавь эту строку

// Страница логина — публичная
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/login/login.html'));
});
app.use('/login', express.static(path.join(__dirname, 'public/login')));

// Защищённая админка
app.use('/admin', express.static(path.join(__dirname, 'public')));

// API — авторизация публичная
app.use('/api/auth', authRouter);

// API — мастера, заявки, 1С (без авторизации — мобильное приложение)
app.use('/api/masters',  mastersRouter);
app.use('/api/requests', requestsRouter);
app.use('/api/1c',       onecRouter);

// Корневой роут
app.get('/', (req, res) => res.json({ status: 'ok', message: 'КТО API работает' }));

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`✓ НСервер: http://localhost:${PORT}`));