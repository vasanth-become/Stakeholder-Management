/**
 * Authentication Routes
 *
 * All auth-related endpoints
 */

const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');
const { verifyAuth, verifyRefreshToken, attachRequestMetadata } = require('../middleware/auth');
const {
  authLimiter,
  passwordResetLimiter,
  refreshLimiter,
  bruteForceProtection,
} = require('../middleware/rateLimiter');

// Attach request metadata to all routes
router.use(attachRequestMetadata);

/**
 * Public Routes
 */

// POST /auth/signup - Register new user
router.post(
  '/signup',
  authLimiter,
  authController.signup.bind(authController)
);

// POST /auth/login - Login user
router.post(
  '/login',
  authLimiter,
  bruteForceProtection,
  authController.login.bind(authController)
);

// POST /auth/logout - Logout current session
router.post(
  '/logout',
  authController.logout.bind(authController)
);

// POST /auth/refresh - Refresh access token
router.post(
  '/refresh',
  refreshLimiter,
  verifyRefreshToken,
  authController.refresh.bind(authController)
);

// POST /auth/password/forgot - Request password reset
router.post(
  '/password/forgot',
  passwordResetLimiter,
  authController.forgotPassword.bind(authController)
);

// POST /auth/password/reset - Reset password with token
router.post(
  '/password/reset',
  passwordResetLimiter,
  authController.resetPassword.bind(authController)
);

/**
 * Protected Routes (require authentication)
 */

// GET /auth/me - Get current user info
router.get(
  '/me',
  verifyAuth,
  authController.me.bind(authController)
);

// POST /auth/logout-all - Logout from all devices
router.post(
  '/logout-all',
  verifyAuth,
  authController.logoutAll.bind(authController)
);

// POST /auth/password/change - Change password
router.post(
  '/password/change',
  verifyAuth,
  authController.changePassword.bind(authController)
);

// GET /auth/sessions - Get active sessions
router.get(
  '/sessions',
  verifyAuth,
  authController.getSessions.bind(authController)
);

// DELETE /auth/sessions/:sessionId - Revoke specific session
router.delete(
  '/sessions/:sessionId',
  verifyAuth,
  authController.revokeSession.bind(authController)
);

module.exports = router;
