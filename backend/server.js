require('dotenv').config();
const express = require('express');
const connectDB = require('./config/db'); // Use real MongoDB
const { corsMiddleware, isProd } = require('./utils/cors');

const authRoutes = require('./routes/auth');
const reservationRoutes = require('./routes/reservations');
const adminRoutes = require('./routes/admin');
const tablesRoutes = require('./routes/tables');
const restaurantRoutes = require('./routes/restaurant');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 5001;
const CLIENT_ORIGIN = process.env.CLIENT_URL || process.env.CLIENT_ORIGIN || 'http://localhost:5173';

// Shared CORS — strict in prod (CLIENT_URL only), permissive in dev (any
// localhost port). See utils/cors.js.
app.use(corsMiddleware);

app.use(express.json({ limit: '1mb' }));

app.get('/', (_req, res) => res.json({ ok: true, service: 'restaurant-reservation-api' }));
app.get('/api/health', (_req, res) =>
  res.json({ ok: true, time: new Date().toISOString() })
);

app.use('/api/auth', authRoutes);
app.use('/api/reservations', reservationRoutes);
app.use('/api/tables', tablesRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/restaurant', restaurantRoutes);

// 404 for unknown API routes
app.use('/api/*', (_req, res) => res.status(404).json({ message: 'Not found' }));

app.use(errorHandler);

const start = async () => {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`[server] listening on http://localhost:${PORT}`);
    console.log(`[cors]   mode: ${isProd ? 'production (strict)' : 'development (any localhost)'}, client: ${CLIENT_ORIGIN}`);
  });
};

start().catch((err) => {
  console.error('[server] fatal startup error:', err);
  process.exit(1);
});
