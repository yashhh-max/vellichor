const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');

let mongoServer;

/**
 * Create a fresh in-memory MongoDB and connect mongoose to it.
 *
 * If a mongoose connection is already open (e.g. the caller spun up
 * the in-memory server itself and connected first, to share the DB
 * with a pre-seed step), we skip the create/connect and just return
 * the existing connection.
 */
const connectDB = async () => {
  try {
    if (mongoose.connection.readyState === 1) {
      console.log(
        `[db] Reusing active mongoose connection: ${mongoose.connection.host}/${mongoose.connection.name}`
      );
      return mongoose.connection;
    }

    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();

    console.log('[db] Connected to in-memory MongoDB');

    const conn = await mongoose.connect(mongoUri);
    console.log(`[db] MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);

    return conn;
  } catch (err) {
    console.error(`[db] Connection error: ${err.message}`);
    process.exit(1);
  }
};

const closeDB = async () => {
  if (mongoServer) {
    await mongoServer.stop();
    mongoServer = undefined;
    console.log('[db] In-memory MongoDB server stopped');
  }
};

module.exports = { connectDB, closeDB };
