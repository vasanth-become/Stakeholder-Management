/**
 * Authentication Configuration
 *
 * Centralized config for JWT, cookies, security settings
 */

require('dotenv').config();

module.exports = {
  // JWT Configuration
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || 'your-super-secret-access-key-change-in-production',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'your-super-secret-refresh-key-change-in-production',
    accessExpiry: process.env.JWT_ACCESS_EXPIRY || '15m',
    refreshExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
    issuer: 'stakeholder-radar',
    audience: 'stakeholder-radar-users',
  },

  // Cookie Configuration
  cookies: {
    accessTokenName: 'accessToken',
    refreshTokenName: 'refreshToken',
    options: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // HTTPS only in production
      sameSite: 'strict',
      domain: process.env.COOKIE_DOMAIN,
      path: '/',
    },
  },

  // Password Configuration
  password: {
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS) || 12,
    minLength: parseInt(process.env.PASSWORD_MIN_LENGTH) || 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
  },

  // Rate Limiting
  rateLimit: {
    windowMs: (parseInt(process.env.RATE_LIMIT_WINDOW) || 15) * 60 * 1000, // 15 minutes
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 5,
    skipSuccessfulRequests: false,
    message: 'Too many requests from this IP, please try again later.',
  },

  // Brute Force Protection
  bruteForce: {
    maxAttemptsPerIP: 5,
    maxAttemptsPerEmail: 10,
    ipWindowMinutes: 15,
    emailWindowHours: 1,
    lockoutDuration: (parseInt(process.env.LOCKOUT_DURATION) || 30) * 60 * 1000, // 30 minutes
  },

  // Session Management
  session: {
    maxConcurrentSessions: 5,
    absoluteTimeout: 30 * 24 * 60 * 60 * 1000, // 30 days
    idleTimeout: 7 * 24 * 60 * 60 * 1000, // 7 days
  },

  // OAuth Configuration (Google)
  oauth: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3001/auth/google/callback',
      scope: ['profile', 'email'],
    },
  },

  // Email Configuration
  email: {
    from: process.env.EMAIL_FROM || 'noreply@stakeholderradar.com',
    fromName: 'Stakeholder Radar',
    smtp: {
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    },
  },

  // Security
  security: {
    allowedOrigins: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : ['http://localhost:3000'],
    maxSessionAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    passwordResetExpiry: 60 * 60 * 1000, // 1 hour
    emailVerificationExpiry: 24 * 60 * 60 * 1000, // 24 hours
  },
};
