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
app.get('/api/health', async (req, res) => {
  try {
    const mongoose = require('mongoose');
    await connectDB();
    const state = mongoose.connection.readyState;
    // 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
    res.json({ 
      mongoConnectionState: state,
      stateLabel: ['disconnected', 'connected', 'connecting', 'disconnecting'][state],
      mongoUriPresent: !!process.env.MONGO_URI,
      jwtSecretPresent: !!process.env.JWT_SECRET
    });
  } catch (err) {
    res.status(500).json({ 
      message: 'Health check database connection failed',
      error: err.message 
    });
  }
});
// Database connection middleware to ensure connection is ready before route execution
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    res.status(500).json({
      message: 'Database connection failed. Please ensure Atlas whitelisting and URI credentials are correct.',
      error: err.message,
    });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/reservations', reservationRoutes);
app.use('/api/tables', tablesRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/restaurant', restaurantRoutes);

// 404 for unknown API routes
app.use('/api/*', (_req, res) => res.status(404).json({ message: 'Not found' }));

app.use(errorHandler);

// Connect to database (Mongoose buffers operations automatically)
connectDB().catch((err) => {
  console.error('[db] connection error:', err);
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`[server] listening on http://localhost:${PORT}`);
    console.log(`[cors]   mode: ${isProd ? 'production (strict)' : 'development (any localhost)'}, client: ${CLIENT_ORIGIN}`);
  });
}

module.exports = app;
