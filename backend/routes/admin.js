const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/adminController');
const { requireAuth, requireRole } = require('../middleware/auth');

router.use(requireAuth, requireRole('admin'));

// Tables
router.get('/tables', ctrl.listTables);
router.post('/tables', ctrl.createTable);
router.delete('/tables/:id', ctrl.deleteTable);
router.patch('/tables/:id', ctrl.updateTable);

// Reservations
router.get('/reservations', ctrl.listReservations);
router.patch('/reservations/:id', ctrl.updateReservation);

module.exports = router;
