const mongoose = require('mongoose');
const Reservation = require('../models/Reservation');
const Table = require('../models/Table');

// Helper: parse YYYY-MM-DD vs today (start-of-day UTC) to ensure we don't allow past dates.
const isFutureOrToday = (dateStr) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [y, m, d] = dateStr.split('-').map(Number);
  const target = new Date(Date.UTC(y, m - 1, d));
  return target.getTime() >= today.getTime();
};

// POST /api/reservations  (customer)
exports.createReservation = async (req, res) => {
  try {
    const { tableId, date, timeSlot, guests } = req.body;
    const guestCount = Number(guests);

    if (!mongoose.Types.ObjectId.isValid(tableId)) {
      return res.status(400).json({ message: 'Invalid table id' });
    }
    if (!isFutureOrToday(date)) {
      return res.status(400).json({ message: 'Date must be today or in the future' });
    }
    if (!Number.isInteger(guestCount) || guestCount < 1) {
      return res.status(400).json({ message: 'Guests must be a positive integer' });
    }

    // 1. Table must exist with capacity >= guests
    const table = await Table.findById(tableId);
    if (!table) {
      return res.status(404).json({ message: 'Table not found' });
    }
    if (table.capacity < guestCount) {
      return res.status(400).json({
        message: `Table ${table.tableNumber} seats up to ${table.capacity}; please pick a larger table`,
      });
    }

    // 2. Conflict check (in addition to DB unique index — give a friendlier 409
    //    before letting Mongoose throw a generic 11000 error).
    const conflict = await Reservation.findOne({
      table: tableId,
      date,
      timeSlot,
      status: 'confirmed',
    });
    if (conflict) {
      return res.status(409).json({
        message: 'That table is already booked for the selected date and time. Please pick a different table or time.',
      });
    }

    // 3. Create — if a race condition slips past the check above, the partial
    //    unique index in the schema will reject the second insert with E11000;
    //    we map that back to 409.
    try {
      const reservation = await Reservation.create({
        user: req.user._id,
        table: tableId,
        date,
        timeSlot,
        guests: guestCount,
      });
      const populated = await reservation.populate('table', 'tableNumber capacity');
      return res.status(201).json({ reservation: populated });
    } catch (err) {
      if (err && err.code === 11000) {
        return res.status(409).json({
          message: 'That table is already booked for the selected date and time.',
        });
      }
      throw err;
    }
  } catch (err) {
    console.error('[reservation] create error:', err);
    res.status(500).json({ message: 'Server error creating reservation' });
  }
};

// GET /api/reservations/me  (customer)
exports.myReservations = async (req, res) => {
  try {
    const list = await Reservation.find({ user: req.user._id })
      .sort({ date: -1, timeSlot: -1 })
      .populate('table', 'tableNumber capacity');
    res.json({ reservations: list });
  } catch (err) {
    console.error('[reservation] list error:', err);
    res.status(500).json({ message: 'Server error fetching reservations' });
  }
};

// DELETE /api/reservations/:id  (customer, own only)
exports.cancelMyReservation = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid reservation id' });
    }
    const reservation = await Reservation.findOne({ _id: id, user: req.user._id });
    if (!reservation) {
      return res.status(404).json({ message: 'Reservation not found' });
    }
    if (reservation.status === 'cancelled') {
      return res.status(200).json({ reservation });
    }
    reservation.status = 'cancelled';
    await reservation.save();
    res.json({ reservation });
  } catch (err) {
    console.error('[reservation] cancel error:', err);
    res.status(500).json({ message: 'Server error cancelling reservation' });
  }
};
