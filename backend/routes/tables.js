const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/tableController');

// Public read-only endpoint so customers can pick a table when booking.
// Admins use /api/admin/tables for the same data + write access.
router.get('/', ctrl.listPublic);
router.get('/:id/availability', ctrl.getTableAvailability);

module.exports = router;
