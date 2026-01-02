/**
 * Rate Limiting Middleware
 *
 * Protect against brute force attacks and API abuse
 */

const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const authConfig = require('../config/auth');
const authService = require('../services/authService');

/**
 * General API rate limiter
 * 100 requests per 15 minutes per IP
 */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  // Optional: Use Redis for distributed rate limiting
  // store: new RedisStore({
  //   client: redisClient,
  //   prefix: 'rl:api:',
  // }),
});

/**
 * Auth endpoints rate limiter
 * 5 requests per 15 minutes per IP
 */
const authLimiter = rateLimit({
  windowMs: authConfig.rateLimit.windowMs,
  max: authConfig.rateLimit.maxRequests,
  message: authConfig.rateLimit.message,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
});

/**
 * Strict rate limiter for password reset
 * 3 requests per hour per IP
 */
const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  message: 'Too many password reset attempts. Please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Token refresh rate limiter
 * 10 requests per minute per IP
 */
const refreshLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  message: 'Too many token refresh attempts.',
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Brute Force Protection Middleware
 * Check failed login attempts before allowing login
 */
async function bruteForceProtection(req, res, next) {
  try {
    const { email } = req.body;
    const ipAddress = req.clientIP || req.ip;

    // Check IP-based attempts
    const ipAttempts = await authService.getFailedAttemptsForIP(
      ipAddress,
      authConfig.bruteForce.ipWindowMinutes
    );

    if (ipAttempts >= authConfig.bruteForce.maxAttemptsPerIP) {
      return res.status(429).json({
        error: 'Too many failed login attempts from this IP address. Please try again later.',
        retryAfter: authConfig.bruteForce.ipWindowMinutes * 60,
      });
    }

    // Check email-based attempts (if email provided)
    if (email) {
      const emailAttempts = await authService.getFailedAttemptsForEmail(
        email,
        authConfig.bruteForce.emailWindowHours
      );

      if (emailAttempts >= authConfig.bruteForce.maxAttemptsPerEmail) {
        return res.status(429).json({
          error: 'Too many failed login attempts for this account. Please try again later or reset your password.',
          retryAfter: authConfig.bruteForce.emailWindowHours * 60 * 60,
        });
      }
    }

    next();
  } catch (error) {
    console.error('[Brute Force Protection] Error:', error);
    // Don't block on error - fail open
    next();
  }
}

/**
 * Sliding Window Rate Limiter (custom implementation)
 * More accurate than fixed window
 */
class SlidingWindowLimiter {
  constructor(windowMs, maxRequests) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
    this.requests = new Map(); // { key: [{timestamp}] }
  }

  middleware() {
    return (req, res, next) => {
      const key = req.clientIP || req.ip;
      const now = Date.now();

      // Get existing requests for this key
      if (!this.requests.has(key)) {
        this.requests.set(key, []);
      }

      const userRequests = this.requests.get(key);

      // Remove old requests outside the window
      const validRequests = userRequests.filter(
        timestamp => now - timestamp < this.windowMs
      );

      // Check if limit exceeded
      if (validRequests.length >= this.maxRequests) {
        const oldestRequest = Math.min(...validRequests);
        const retryAfter = Math.ceil((this.windowMs - (now - oldestRequest)) / 1000);

        return res.status(429).json({
          error: 'Rate limit exceeded',
          retryAfter,
        });
      }

      // Add current request
      validRequests.push(now);
      this.requests.set(key, validRequests);

      // Cleanup old keys periodically
      if (Math.random() < 0.01) {
        this.cleanup();
      }

      next();
    };
  }

  cleanup() {
    const now = Date.now();
    for (const [key, timestamps] of this.requests.entries()) {
      const validTimestamps = timestamps.filter(
        t => now - t < this.windowMs
      );
      if (validTimestamps.length === 0) {
        this.requests.delete(key);
      } else {
        this.requests.set(key, validTimestamps);
      }
    }
  }
}

module.exports = {
  apiLimiter,
  authLimiter,
  passwordResetLimiter,
  refreshLimiter,
  bruteForceProtection,
  SlidingWindowLimiter,
};
