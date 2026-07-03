const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const ctrl = require('../controllers/authController');
const validate = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');

router.post(
  '/register',
  [
    body('name').isString().trim().isLength({ min: 2, max: 60 }).withMessage('Name must be 2-60 chars'),
    body('email').isEmail().withMessage('Valid email required').normalizeEmail(),
    body('password').isString().isLength({ min: 6 }).withMessage('Password must be at least 6 chars'),
  ],
  validate,
  ctrl.register
);

router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Valid email required').normalizeEmail(),
    body('password').isString().notEmpty().withMessage('Password required'),
  ],
  validate,
  ctrl.login
);

router.get('/me', requireAuth, ctrl.me);

module.exports = router;
