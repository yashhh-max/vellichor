// Local-only runner: boots an in-memory MongoDB, seeds it, and starts the API.
// Used for development verification. Real deployments use the real MONGO_URI.
//
//   node dev-run.js
//
// Press Ctrl-C to stop. The in-memory DB is destroyed on exit.

require('dotenv').config();
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const { runSeed, DEMO_USERS } = require('./seed');

// Defer-require server.js so the order of operations is: spin up in-memory
// Mongo → connect mongoose → seed users → THEN require server (which calls
// connectDB and starts listening). This guarantees the demo accounts exist
// in the same in-memory DB the API is reading from.
let mongoServer;
let mongoUri;

(async () => {
  try {
    mongoServer = await MongoMemoryServer.create();
    mongoUri = mongoServer.getUri('restaurant_reservations');
    process.env.MONGO_URI = mongoUri;
    console.log(`[dev-run] in-memory MongoDB at ${mongoUri}`);

    await mongoose.connect(mongoUri);
    console.log(`[dev-run] mongoose connected`);

    await runSeed({ reset: false, log: true });

    require('./server');

    console.log('');
    console.log('─────────────────────────────────────────────────────────');
    console.log('  DEMO LOGIN CREDENTIALS (auto-seeded on every boot)');
    console.log('─────────────────────────────────────────────────────────');
    for (const u of DEMO_USERS) {
      console.log(`  ${u.role.padEnd(8)} →  ${u.email}  /  ${u.password}`);
    }
    console.log('─────────────────────────────────────────────────────────');
    console.log('');
  } catch (e) {
    console.error('[dev-run] fatal:', e);
    process.exit(1);
  }
})();

const shutdown = async () => {
  console.log('\n[dev-run] shutting down…');
  try {
    await mongoose.disconnect();
  } catch (e) {
    /* ignore */
  }
  try {
    if (mongoServer) await mongoServer.stop();
  } catch (e) {
    /* ignore */
  }
  process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
