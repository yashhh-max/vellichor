const mongoose = require('mongoose');

const TIME_SLOT_REGEX = /^\d{2}:\d{2}$/;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const reservationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User is required'],
      index: true,
    },
    table: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Table',
      required: [true, 'Table is required'],
    },
    date: {
      type: String,
      required: [true, 'Date is required'],
      match: [DATE_REGEX, 'Date must be YYYY-MM-DD'],
    },
    timeSlot: {
      type: String,
      required: [true, 'Time slot is required'],
      match: [TIME_SLOT_REGEX, 'Time slot must be HH:MM'],
    },
    guests: {
      type: Number,
      required: [true, 'Guest count is required'],
      min: [1, 'At least 1 guest'],
      max: [20, 'Too many guests'],
    },
    status: {
      type: String,
      enum: ['confirmed', 'cancelled'],
      default: 'confirmed',
      index: true,
    },
  },
  { timestamps: true }
);

// CRITICAL: prevent double-booking the same table at the same date/timeSlot
// when the reservation is still 'confirmed'. Cancelled reservations are
// excluded by the partialFilterExpression, so re-booking after a cancel works.
reservationSchema.index(
  { table: 1, date: 1, timeSlot: 1 },
  {
    unique: true,
    partialFilterExpression: { status: 'confirmed' },
  }
);

module.exports = mongoose.model('Reservation', reservationSchema);
