require('dotenv').config();
const { MongoMemoryServer } = require('mongodb-memory-server');
const express = require('express');
const mongoose = require('mongoose');
const authRoutes = require('./routes/auth');
const reservationRoutes = require('./routes/reservations');
const adminRoutes = require('./routes/admin');
const tablesRoutes = require('./routes/tables');
const restaurantRoutes = require('./routes/restaurant');
const errorHandler = require('./middleware/errorHandler');
const { corsMiddleware, isProd } = require('./utils/cors');
const { runSeed, DEMO_USERS } = require('./seed');

let mongoServer;

const startServer = async () => {
  try {
    // Start in-memory MongoDB server
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();

    console.log('[db] Connected to in-memory MongoDB');

    // Connect to MongoDB
    await mongoose.connect(mongoUri);
    console.log(`[db] MongoDB connected: ${mongoose.connection.host}/${mongoose.connection.name}`);

    // Auto-seed the demo users (admin + customer) into the same in-memory
    // DB the API is using. Without this, login always fails because the
    // collection is empty. Idempotent — safe to run on every boot.
    await runSeed({ reset: false, log: true });

    const app = express();
    // In-memory dev server always uses 5001, regardless of .env's PORT,
    // so the Vite dev proxy (which points at 5001) keeps matching even
    // when .env sets PORT=5000 for the real-Mongo npm start path.
    const PORT = 5001;
    const CLIENT_ORIGIN = process.env.CLIENT_URL || process.env.CLIENT_ORIGIN || 'http://localhost:5173';

    // Shared CORS — strict in prod (CLIENT_URL only), permissive in dev
    // (any localhost port). See utils/cors.js.
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

    app.listen(PORT, () => {
      console.log(`[server] listening on http://localhost:${PORT}`);
      console.log(`[cors]   mode: ${isProd ? 'production (strict)' : 'development (any localhost)'}, client: ${CLIENT_ORIGIN}`);
      console.log('');
      console.log('─────────────────────────────────────────────────────────');
      console.log('  DEMO LOGIN CREDENTIALS (auto-seeded on every boot)');
      console.log('─────────────────────────────────────────────────────────');
      for (const u of DEMO_USERS) {
        console.log(`  ${u.role.padEnd(8)} →  ${u.email}  /  ${u.password}`);
      }
      console.log('─────────────────────────────────────────────────────────');
      console.log('');
    });

    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      console.log('\nShutting down server...');
      if (mongoServer) {
        await mongoServer.stop();
        console.log('[db] In-memory MongoDB server stopped');
      }
      process.exit(0);
    });

  } catch (err) {
    console.error('[server] fatal startup error:', err);
    process.exit(1);
  }
};

startServer().catch(console.error);