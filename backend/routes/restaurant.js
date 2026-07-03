const express = require('express');
const router = express.Router();
const config = require('../config/restaurant');

router.get('/', (req, res) => {
  res.json(config);
});

module.exports = router;
