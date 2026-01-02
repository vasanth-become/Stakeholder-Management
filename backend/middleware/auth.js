/**
 * Authentication Middleware
 *
 * Protect routes and verify JWT tokens
 */

const tokenService = require('../services/tokenService');
const authService = require('../services/authService');
const authConfig = require('../config/auth');

/**
 * Verify Access Token Middleware
 * Protects routes that require authentication
 */
async function verifyAuth(req, res, next) {
  try {
    // Get token from cookie
    const accessToken = req.cookies[authConfig.cookies.accessTokenName];

    if (!accessToken) {
      return res.status(401).json({
        error: 'Authentication required',
        code: 'NO_TOKEN',
      });
    }

    // Verify token
    try {
      const decoded = tokenService.verifyAccessToken(accessToken);

      // Attach user info to request
      req.user = {
        userId: decoded.userId,
        email: decoded.email,
        role: decoded.role,
      };

      next();
    } catch (error) {
      if (error.message === 'Access token expired') {
        return res.status(401).json({
          error: 'Token expired',
          code: 'TOKEN_EXPIRED',
        });
      }

      return res.status(401).json({
        error: 'Invalid token',
        code: 'INVALID_TOKEN',
      });
    }
  } catch (error) {
    console.error('[Auth Middleware] Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Verify Refresh Token Middleware
 * Used for token refresh endpoint
 */
async function verifyRefreshToken(req, res, next) {
  try {
    // Get refresh token from cookie
    const refreshToken = req.cookies[authConfig.cookies.refreshTokenName];

    if (!refreshToken) {
      return res.status(401).json({
        error: 'Refresh token required',
        code: 'NO_REFRESH_TOKEN',
      });
    }

    // Verify refresh token
    try {
      const tokenData = await tokenService.verifyRefreshToken(refreshToken);

      // Attach token data to request
      req.refreshTokenData = tokenData;
      req.refreshToken = refreshToken;

      next();
    } catch (error) {
      return res.status(401).json({
        error: 'Invalid or expired refresh token',
        code: 'INVALID_REFRESH_TOKEN',
      });
    }
  } catch (error) {
    console.error('[Refresh Token Middleware] Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Role-Based Access Control Middleware
 * Restrict access based on user role
 */
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        required: allowedRoles,
        current: req.user.role,
      });
    }

    next();
  };
}

/**
 * Optional Auth Middleware
 * Adds user info if token exists, but doesn't require it
 */
async function optionalAuth(req, res, next) {
  try {
    const accessToken = req.cookies[authConfig.cookies.accessTokenName];

    if (accessToken) {
      try {
        const decoded = tokenService.verifyAccessToken(accessToken);
        req.user = {
          userId: decoded.userId,
          email: decoded.email,
          role: decoded.role,
        };
      } catch (error) {
        // Ignore errors for optional auth
      }
    }

    next();
  } catch (error) {
    next();
  }
}

/**
 * Extract IP address from request
 */
function getClientIP(req) {
  return (
    req.headers['x-forwarded-for']?.split(',')[0].trim() ||
    req.headers['x-real-ip'] ||
    req.connection?.remoteAddress ||
    req.socket?.remoteAddress ||
    'unknown'
  );
}

/**
 * Extract user agent from request
 */
function getUserAgent(req) {
  return req.headers['user-agent'] || 'unknown';
}

/**
 * Attach request metadata middleware
 */
function attachRequestMetadata(req, res, next) {
  req.clientIP = getClientIP(req);
  req.userAgent = getUserAgent(req);
  next();
}

module.exports = {
  verifyAuth,
  verifyRefreshToken,
  requireRole,
  optionalAuth,
  attachRequestMetadata,
  getClientIP,
  getUserAgent,
};
