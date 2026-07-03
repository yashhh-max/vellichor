const mongoose = require('mongoose');
const Table = require('../models/Table');
const Reservation = require('../models/Reservation');

// Public read-only list of tables. Anyone (including unauthenticated users)
// needs this to fill the booking form, but only admins can create / update.
exports.listPublic = async (_req, res) => {
  try {
    const tables = await Table.find().sort({ tableNumber: 1 });
    res.json({ tables });
  } catch (err) {
    console.error('[tables] list public:', err);
    res.status(500).json({ message: 'Server error listing tables' });
  }
};

// GET /api/tables/:id/availability?date=YYYY-MM-DD
exports.getTableAvailability = async (req, res) => {
  try {
    const { id } = req.params;
    const { date } = req.query;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid table id' });
    }
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ message: 'date query parameter is required in YYYY-MM-DD format' });
    }

    // Retrieve confirmed reservations for this table on this date
    const bookings = await Reservation.find({
      table: id,
      date,
      status: 'confirmed',
    }).select('timeSlot');

    const bookedSlots = bookings.map((b) => b.timeSlot);
    res.json({ bookedSlots });
  } catch (err) {
    console.error('[tables] get availability:', err);
    res.status(500).json({ message: 'Server error fetching availability' });
  }
};
