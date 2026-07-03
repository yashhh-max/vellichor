const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const uri = process.env.MONGO_URI;
    console.log('[db] MONGO_URI env var is defined:', !!uri);
    if (!uri) {
      throw new Error('MONGO_URI is not set. Copy .env.example to .env and configure.');
    }
    const conn = await mongoose.connect(uri);
    console.log(`[db] MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);
  } catch (err) {
    console.error(`[db] Connection error: ${err.message}`);
    // Never exit the process in serverless environments
    if (process.env.NODE_ENV !== 'production') {
      process.exit(1);
    }
  }
};

module.exports = connectDB;
