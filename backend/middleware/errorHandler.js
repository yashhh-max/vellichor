// Centralized error handler — last middleware in the chain.
// eslint-disable-next-line no-unused-vars
module.exports = (err, req, res, _next) => {
  // express-validator already short-circuits, but defensively handle cast errors
  if (err && err.name === 'CastError') {
    return res.status(400).json({ message: `Invalid ${err.path}` });
  }
  if (err && err.name === 'ValidationError') {
    return res.status(400).json({
      message: 'Validation failed',
      errors: Object.values(err.errors).map((e) => ({ field: e.path, msg: e.message })),
    });
  }
  console.error('[error]', err);
  res.status(err.status || 500).json({
    message: err.message || 'Internal server error',
  });
};
