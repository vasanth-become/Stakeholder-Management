const { getValidAccessToken } = require('../utils/oauth');
const OAuthToken = require('../models/OAuthToken');

/**
 * OAuth Middleware
 * Provides middleware functions for OAuth authentication and credential injection
 */

/**
 * Inject OAuth credentials into request for a specific provider
 * Usage: router.get('/endpoint', injectOAuthCredentials('slack'), handler)
 *
 * @param {string} provider - OAuth provider name (slack, google, jira)
 * @param {Object} options - Middleware options
 * @param {boolean} options.required - Whether OAuth is required (default: true)
 * @returns {Function} Express middleware
 */
function injectOAuthCredentials(provider, options = {}) {
  const { required = true } = options;

  return async (req, res, next) => {
    try {
      // In a real app, get userId from authenticated session
      // For now, using a default user or from query param for testing
      const userId = req.user?.id || req.query.userId || 'default-user';

      // Try to get valid access token (will auto-refresh if needed)
      try {
        const accessToken = await getValidAccessToken(userId, provider);

        // Inject credentials into request object
        req.oauth = {
          provider,
          accessToken,
          userId
        };

        next();
      } catch (error) {
        if (required) {
          return res.status(401).json({
            error: 'OAuth authorization required',
            message: `Please connect your ${provider} account`,
            provider,
            authUrl: `/auth/${provider}`
          });
        }

        // If not required, continue without credentials
        req.oauth = null;
        next();
      }
    } catch (error) {
      console.error(`OAuth middleware error for ${provider}:`, error);

      if (required) {
        return res.status(500).json({
          error: 'OAuth error',
          message: 'Failed to retrieve OAuth credentials'
        });
      }

      req.oauth = null;
      next();
    }
  };
}

/**
 * Check if user has OAuth connection for a provider
 * Usage: router.get('/status', requireOAuthConnection('slack'), handler)
 *
 * @param {string} provider - OAuth provider name
 * @returns {Function} Express middleware
 */
function requireOAuthConnection(provider) {
  return (req, res, next) => {
    const userId = req.user?.id || req.query.userId || 'default-user';

    try {
      const token = OAuthToken.get(userId, provider);

      if (!token || !token.accessToken) {
        return res.status(401).json({
          error: 'Not connected',
          message: `No active ${provider} connection found`,
          provider,
          authUrl: `/auth/${provider}`
        });
      }

      // Check if token is expired
      if (OAuthToken.isExpired(userId, provider)) {
        return res.status(401).json({
          error: 'Token expired',
          message: `Your ${provider} connection has expired`,
          provider,
          authUrl: `/auth/${provider}`
        });
      }

      next();
    } catch (error) {
      console.error(`Error checking OAuth connection for ${provider}:`, error);
      return res.status(500).json({
        error: 'OAuth error',
        message: 'Failed to check OAuth connection'
      });
    }
  };
}

/**
 * Get OAuth connection status for user
 * Doesn't block the request, just adds connection info
 * Usage: router.get('/status', getOAuthStatus(['slack', 'google']), handler)
 *
 * @param {Array<string>} providers - List of providers to check
 * @returns {Function} Express middleware
 */
function getOAuthStatus(providers) {
  return (req, res, next) => {
    const userId = req.user?.id || req.query.userId || 'default-user';

    try {
      const connections = {};

      for (const provider of providers) {
        const token = OAuthToken.get(userId, provider);
        connections[provider] = {
          connected: !!token,
          expired: token ? OAuthToken.isExpired(userId, provider) : false,
          scopes: token?.scopes || null,
          connectedAt: token?.createdAt || null
        };
      }

      req.oauthStatus = connections;
      next();
    } catch (error) {
      console.error('Error getting OAuth status:', error);
      req.oauthStatus = {};
      next();
    }
  };
}

/**
 * Validate OAuth state parameter for CSRF protection
 * Should be used in OAuth callback routes
 *
 * @returns {Function} Express middleware
 */
function validateOAuthState() {
  return (req, res, next) => {
    const { state } = req.query;
    const storedState = req.session?.oauthState;

    if (!state || !storedState) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'Missing state parameter'
      });
    }

    if (state !== storedState) {
      return res.status(403).json({
        error: 'Invalid state',
        message: 'CSRF state validation failed'
      });
    }

    // Clear the state from session
    delete req.session.oauthState;

    next();
  };
}

/**
 * Error handler for OAuth-specific errors
 * Should be used after OAuth routes
 *
 * @returns {Function} Express error middleware
 */
function oauthErrorHandler() {
  return (err, req, res, next) => {
    // OAuth-specific error handling
    if (err.name === 'OAuthError' || err.message?.includes('OAuth')) {
      console.error('OAuth Error:', err);

      return res.status(err.status || 500).json({
        error: 'OAuth Error',
        message: err.message || 'An OAuth error occurred',
        provider: err.provider || null
      });
    }

    // Pass to next error handler
    next(err);
  };
}

module.exports = {
  injectOAuthCredentials,
  requireOAuthConnection,
  getOAuthStatus,
  validateOAuthState,
  oauthErrorHandler
};
