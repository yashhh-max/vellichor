require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const User = require('./models/User');
const Table = require('./models/Table');
const Reservation = require('./models/Reservation');

const TABLES = [
  { tableNumber: 1, capacity: 2 },
  { tableNumber: 2, capacity: 2 },
  { tableNumber: 3, capacity: 4 },
  { tableNumber: 4, capacity: 4 },
  { tableNumber: 5, capacity: 6 },
];

// Demo accounts. Email-as-key → keeps this idempotent (re-running the
// seed updates an existing user rather than failing on the unique index
// or creating duplicates).
const DEMO_USERS = [
  {
    name: 'Admin',
    email: 'admin@example.com',
    password: 'admin123',
    role: 'admin',
  },
  {
    name: 'Sample Customer',
    email: 'customer@example.com',
    password: 'customer123',
    role: 'customer',
  },
];

function futureDate(daysFromNow) {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Idempotent seed.
 *
 * - Users: upsert by email. If a user with that email already exists,
 *   we reset their password and role so the demo credentials always
 *   work after a seed run.
 * - Tables: upsert by tableNumber.
 * - Sample reservation: created only if the customer has no existing
 *   reservation, so re-running the seed doesn't pile up rows.
 *
 * Caller is responsible for having a Mongoose connection open.
 *
 * @param {{ reset?: boolean, log?: boolean }} [opts]
 *   reset: when true, wipes users/tables/reservations first (matches
 *          the original CLI behavior). Defaults to false so the
 *          function is safe to call on every dev-server boot.
 *   log:   whether to print progress. Defaults to true.
 */
async function runSeed({ reset = false, log = true } = {}) {
  if (reset) {
    await Promise.all([
      User.deleteMany({}),
      Table.deleteMany({}),
      Reservation.deleteMany({}),
    ]);
    if (log) console.log('[seed] cleared users / tables / reservations');
  }

  // Users — upsert so demo creds always work after boot.
  for (const u of DEMO_USERS) {
    await User.findOneAndUpdate(
      { email: u.email.toLowerCase() },
      {
        $set: {
          name: u.name,
          email: u.email.toLowerCase(),
          role: u.role,
        },
        $setOnInsert: { createdAt: new Date() },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).then(async (doc) => {
      // Reset password to the demo password so old/stale hashes don't
      // lock the demo account out after a code change.
      doc.password = u.password;
      doc.markModified('password');
      await doc.save();
    });
  }
  if (log) {
    for (const u of DEMO_USERS) {
      console.log(`[seed] ${u.role.padEnd(8)} → ${u.email} / ${u.password}`);
    }
  }

  // Tables — upsert by tableNumber.
  for (const t of TABLES) {
    await Table.findOneAndUpdate(
      { tableNumber: t.tableNumber },
      { $set: { capacity: t.capacity } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }
  const tableCount = await Table.countDocuments();
  if (log) console.log(`[seed] tables: ${tableCount} ready`);

  // One sample confirmed reservation, only if the demo customer has none.
  const customer = await User.findOne({ email: 'customer@example.com' });
  const existing = await Reservation.findOne({ user: customer._id });
  if (!existing) {
    const table = await Table.findOne({ tableNumber: 3 });
    if (table) {
      await Reservation.create({
        user: customer._id,
        table: table._id,
        date: futureDate(2),
        timeSlot: '19:00',
        guests: 3,
      });
      if (log) console.log('[seed] inserted 1 sample confirmed reservation');
    }
  }

  return { users: DEMO_USERS, tableCount };
}

// CLI mode: connect to MONGO_URI, seed, disconnect.
if (require.main === module) {
  (async () => {
    await connectDB();
    try {
      await runSeed({ reset: true, log: true });
    } catch (err) {
      console.error('[seed] error:', err);
      process.exit(1);
    } finally {
      await mongoose.disconnect();
      process.exit(0);
    }
  })();
}

module.exports = { runSeed, DEMO_USERS };
