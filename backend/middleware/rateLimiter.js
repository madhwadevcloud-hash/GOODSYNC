const rateLimit = require('express-rate-limit');

/**
 * Rate limiter for login endpoints.
 * Limits to 5 attempts per 15 minutes per IP.
 * Returns standardized JSON error responses.
 */
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,                    // 5 attempts per window
  standardHeaders: true,     // Return rate limit info in RateLimit-* headers
  legacyHeaders: false,      // Disable X-RateLimit-* headers
  skipSuccessfulRequests: true, // Only count failed attempts (non-2xx responses)
  message: {
    success: false,
    message: 'Too many login attempts. Please try again after 15 minutes.',
    retryAfterMinutes: 15
  },
  validate: { default: false },
  keyGenerator: (req) => {
    // Use IP + identifier to scope per-account per-IP
    // Fallback to a default string if IP is unavailable to prevent ERR_ERL_KEY_GEN_IPV6
    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown-ip';
    const identifier = req.body?.email || req.body?.identifier || '';
    return `${ip}:${identifier.toLowerCase().trim()}`;
  },
  handler: (req, res, next, options) => {
    console.warn(`🚫 [RATE LIMIT] Login blocked for IP: ${req.ip}, identifier: ${req.body?.email || req.body?.identifier || 'unknown'}`);
    res.status(429).json(options.message);
  }
});

/**
 * General API rate limiter.
 * Limits to 100 requests per minute per IP.
 * Generous enough for normal usage, blocks automated scraping.
 */
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { default: false },
  message: {
    success: false,
    message: 'Too many requests. Please slow down.',
    retryAfterSeconds: 60
  },
  handler: (req, res, next, options) => {
    console.warn(`🚫 [RATE LIMIT] API rate limit hit for IP: ${req.ip} on ${req.method} ${req.originalUrl}`);
    res.status(429).json(options.message);
  }
});

/**
 * Stricter rate limiter for password reset endpoints.
 * Limits to 3 attempts per 30 minutes per IP.
 */
const passwordResetLimiter = rateLimit({
  windowMs: 30 * 60 * 1000, // 30 minutes
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { default: false },
  message: {
    success: false,
    message: 'Too many password reset attempts. Please try again later.',
    retryAfterMinutes: 30
  }
});

module.exports = {
  loginLimiter,
  apiLimiter,
  passwordResetLimiter
};
