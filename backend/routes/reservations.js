const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const ctrl = require('../controllers/reservationController');
const { requireAuth } = require('../middleware/auth');
const validate = require('../middleware/validate');

router.use(requireAuth);

router.post(
  '/',
  [
    body('tableId').isString().notEmpty().withMessage('tableId required'),
    body('date').matches(/^\d{4}-\d{2}-\d{2}$/).withMessage('date must be YYYY-MM-DD'),
    body('timeSlot').matches(/^\d{2}:\d{2}$/).withMessage('timeSlot must be HH:MM'),
    body('guests').isInt({ min: 1, max: 20 }).withMessage('guests must be 1-20'),
  ],
  validate,
  ctrl.createReservation
);

router.get('/me', ctrl.myReservations);
router.delete('/:id', ctrl.cancelMyReservation);

module.exports = router;
