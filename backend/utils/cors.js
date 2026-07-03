/**
 * CORS configuration.
 * Since frontend and backend share the same origin in production,
 * CORS is only needed for local development.
 */

const isProd = process.env.NODE_ENV === 'production';

const corsMiddleware = isProd
  ? (_req, _res, next) => next() // No CORS headers needed in production (same-origin)
  : require('cors')({
      origin: [
        /^http:\/\/localhost:\d+$/,
        /^http:\/\/127\.0\.0\.1:\d+$/,
      ],
      credentials: true,
    });

module.exports = {
  corsMiddleware,
  isProd,
};
