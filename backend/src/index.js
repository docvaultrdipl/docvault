require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/auth.routes');
const documentsRoutes = require('./routes/documents.routes');
const profileRoutes = require('./routes/profile.routes');
const activityRoutes = require('./routes/activity.routes');
const vehiclesRoutes = require('./routes/vehicles.routes');
const usersRoutes = require('./routes/users.routes');
const notificationsRoutes = require('./routes/notifications.routes');

const app = express();

const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173').split(',');
app.use(cors({ origin: allowedOrigins }));
app.use(express.json());

// Serve uploaded attachments statically, e.g. GET /uploads/<filename>
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api/auth', authRoutes);
app.use('/api/documents', documentsRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/activity', activityRoutes);
app.use('/api/vehicles', vehiclesRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/notifications', notificationsRoutes);

// Basic error handler as a safety net
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Something went wrong' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`License Tracker backend running on http://localhost:${PORT}`);
});
