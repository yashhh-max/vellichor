const mongoose = require('mongoose');
const Reservation = require('../models/Reservation');
const Table = require('../models/Table');
const User = require('../models/User');

// GET /api/admin/tables
exports.listTables = async (_req, res) => {
  try {
    const tables = await Table.find().sort({ tableNumber: 1 });
    res.json({ tables });
  } catch (err) {
    console.error('[admin] list tables:', err);
    res.status(500).json({ message: 'Server error listing tables' });
  }
};

// POST /api/admin/tables  { tableNumber, capacity }
exports.createTable = async (req, res) => {
  try {
    const { tableNumber, capacity } = req.body;
    const n = Number(tableNumber);
    const c = Number(capacity);
    if (!Number.isInteger(n) || n < 1) {
      return res.status(400).json({ message: 'tableNumber must be a positive integer' });
    }
    if (!Number.isInteger(c) || c < 1 || c > 20) {
      return res.status(400).json({ message: 'capacity must be an integer 1-20' });
    }
    const table = await Table.create({ tableNumber: n, capacity: c });
    res.status(201).json({ table });
  } catch (err) {
    if (err && err.code === 11000) {
      return res.status(409).json({ message: 'A table with that number already exists' });
    }
    console.error('[admin] create table:', err);
    res.status(500).json({ message: 'Server error creating table' });
  }
};

// GET /api/admin/reservations[?date=YYYY-MM-DD]
exports.listReservations = async (req, res) => {
  try {
    const filter = {};
    if (req.query.date) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(req.query.date)) {
        return res.status(400).json({ message: 'date must be YYYY-MM-DD' });
      }
      filter.date = req.query.date;
    }
    if (req.query.status) {
      if (!['confirmed', 'cancelled'].includes(req.query.status)) {
        return res.status(400).json({ message: 'status must be confirmed or cancelled' });
      }
      filter.status = req.query.status;
    }
    const reservations = await Reservation.find(filter)
      .sort({ date: -1, timeSlot: -1 })
      .populate('user', 'name email')
      .populate('table', 'tableNumber capacity');
    res.json({ reservations });
  } catch (err) {
    console.error('[admin] list reservations:', err);
    res.status(500).json({ message: 'Server error listing reservations' });
  }
};

// PATCH /api/admin/reservations/:id   { status?, guests?, date?, timeSlot? }
exports.updateReservation = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid reservation id' });
    }
    const reservation = await Reservation.findById(id);
    if (!reservation) {
      return res.status(404).json({ message: 'Reservation not found' });
    }

    const { status, guests, date, timeSlot } = req.body;
    if (status) {
      if (!['confirmed', 'cancelled'].includes(status)) {
        return res.status(400).json({ message: 'status must be confirmed or cancelled' });
      }
      reservation.status = status;
    }
    if (guests !== undefined) {
      const g = Number(guests);
      if (!Number.isInteger(g) || g < 1) {
        return res.status(400).json({ message: 'guests must be a positive integer' });
      }
      // capacity check against the table
      const table = await Table.findById(reservation.table);
      if (!table) {
        return res.status(404).json({ message: 'Associated table no longer exists' });
      }
      if (table.capacity < g) {
        return res.status(400).json({
          message: `Table ${table.tableNumber} seats up to ${table.capacity}`,
        });
      }
      reservation.guests = g;
    }
    if (date) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return res.status(400).json({ message: 'date must be YYYY-MM-DD' });
      }
      reservation.date = date;
    }
    if (timeSlot) {
      if (!/^\d{2}:\d{2}$/.test(timeSlot)) {
        return res.status(400).json({ message: 'timeSlot must be HH:MM' });
      }
      reservation.timeSlot = timeSlot;
    }

    try {
      await reservation.save();
    } catch (err) {
      if (err && err.code === 11000) {
        return res.status(409).json({
          message: 'Update would create a double-booking for that table/date/time',
        });
      }
      throw err;
    }

    const populated = await reservation.populate([
      { path: 'user', select: 'name email' },
      { path: 'table', select: 'tableNumber capacity' },
    ]);
    res.json({ reservation: populated });
  } catch (err) {
    console.error('[admin] update reservation:', err);
    res.status(500).json({ message: 'Server error updating reservation' });
  }
};

// User lookup — admin convenience for the table UI (not strictly required, useful for debugging)
exports._listUsers = async (_req, res) => {
  const users = await User.find().select('-password').sort({ createdAt: -1 });
  res.json({ users });
};

// Helper: parse YYYY-MM-DD vs today (start-of-day UTC) to ensure we don't allow past dates.
const isFutureOrToday = (dateStr) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [y, m, d] = dateStr.split('-').map(Number);
  const target = new Date(Date.UTC(y, m - 1, d));
  return target.getTime() >= today.getTime();
};

// DELETE /api/admin/tables/:id
exports.deleteTable = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid table id' });
    }
    const table = await Table.findById(id);
    if (!table) {
      return res.status(404).json({ message: 'Table not found' });
    }

    // Prevent deleting a table that has active confirmed reservations
    const reservations = await Reservation.find({ table: id, status: 'confirmed' });
    const hasActive = reservations.some((r) => isFutureOrToday(r.date));
    if (hasActive) {
      return res.status(400).json({
        message: 'Cannot delete table with active confirmed reservations.',
      });
    }

    await Table.findByIdAndDelete(id);
    res.json({ message: 'Table deleted successfully' });
  } catch (err) {
    console.error('[admin] delete table:', err);
    res.status(500).json({ message: 'Server error deleting table' });
  }
};

// PATCH /api/admin/tables/:id  { capacity }
exports.updateTable = async (req, res) => {
  try {
    const { id } = req.params;
    const { capacity } = req.body;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid table id' });
    }
    const c = Number(capacity);
    if (!Number.isInteger(c) || c < 1 || c > 20) {
      return res.status(400).json({ message: 'Capacity must be an integer between 1 and 20' });
    }

    const table = await Table.findById(id);
    if (!table) {
      return res.status(404).json({ message: 'Table not found' });
    }

    // Check if any active confirmed reservation exceeds the new capacity
    const reservations = await Reservation.find({ table: id, status: 'confirmed' });
    const activeReservations = reservations.filter((r) => isFutureOrToday(r.date));
    const exceedsCapacity = activeReservations.some((r) => r.guests > c);
    if (exceedsCapacity) {
      return res.status(400).json({
        message: `Cannot reduce capacity to ${c} because an active confirmed reservation exceeds this limit.`,
      });
    }

    table.capacity = c;
    await table.save();
    res.json({ table });
  } catch (err) {
    console.error('[admin] update table:', err);
    res.status(500).json({ message: 'Server error updating table' });
  }
};
