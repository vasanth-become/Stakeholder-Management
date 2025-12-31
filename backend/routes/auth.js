const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const OAuthToken = require('../models/OAuthToken');
const {
  generateState,
  buildAuthUrl,
  exchangeCodeForToken,
  revokeToken
} = require('../utils/oauth');
const { getOAuthStatus } = require('../middleware/oauth');

/**
 * OAuth Authentication Routes
 * Handles OAuth flows for Slack, Google, and Jira
 */

// Store OAuth states in memory (in production, use Redis or database)
const oauthStates = new Map();

/**
 * GET /auth/:provider
 * Initiate OAuth flow for a provider
 */
router.get('/:provider', (req, res) => {
  const { provider } = req.params;
  const validProviders = ['slack', 'google', 'jira'];

  if (!validProviders.includes(provider)) {
    return res.status(400).json({
      error: 'Invalid provider',
      message: `Provider must be one of: ${validProviders.join(', ')}`
    });
  }

  try {
    // Generate and store state for CSRF protection
    const state = generateState();
    const userId = req.query.userId || 'default-user'; // In production, get from session

    // Store state with user ID and expiration (5 minutes)
    oauthStates.set(state, {
      userId,
      provider,
      createdAt: Date.now(),
      expiresAt: Date.now() + 5 * 60 * 1000
    });

    // Clean up expired states
    cleanExpiredStates();

    // Build authorization URL
    const authUrl = buildAuthUrl(provider, state);

    // Log OAuth initiation
    console.log(`OAuth initiated for ${provider} by user ${userId}`);

    // Redirect to provider's authorization page
    res.redirect(authUrl);
  } catch (error) {
    console.error(`Error initiating OAuth for ${provider}:`, error);
    res.status(500).json({
      error: 'OAuth initialization failed',
      message: error.message
    });
  }
});

/**
 * GET /auth/callback/:provider
 * Handle OAuth callback from provider
 */
router.get('/callback/:provider', async (req, res) => {
  const { provider } = req.params;
  const { code, state, error } = req.query;

  // Check for OAuth errors from provider
  if (error) {
    console.error(`OAuth error from ${provider}:`, error);
    return res.redirect(
      `${process.env.FRONTEND_URL}/integrations?error=${encodeURIComponent(error)}&provider=${provider}`
    );
  }

  // Validate required parameters
  if (!code || !state) {
    return res.status(400).json({
      error: 'Invalid callback',
      message: 'Missing code or state parameter'
    });
  }

  try {
    // Verify state to prevent CSRF
    const storedState = oauthStates.get(state);

    if (!storedState) {
      throw new Error('Invalid or expired state parameter');
    }

    if (storedState.provider !== provider) {
      throw new Error('Provider mismatch');
    }

    if (Date.now() > storedState.expiresAt) {
      oauthStates.delete(state);
      throw new Error('State parameter expired');
    }

    const userId = storedState.userId;

    // Exchange code for tokens
    const tokenResponse = await exchangeCodeForToken(provider, code);

    // Extract metadata based on provider
    let metadata = {};
    if (provider === 'slack') {
      metadata = {
        teamId: tokenResponse.team?.id,
        teamName: tokenResponse.team?.name,
        userId: tokenResponse.user?.id,
        userName: tokenResponse.user?.name
      };
    } else if (provider === 'google') {
      metadata = {
        scope: tokenResponse.scope
      };
    } else if (provider === 'jira') {
      metadata = {
        scope: tokenResponse.scope
      };
    }

    // Save token to database
    const tokenData = {
      userId,
      provider,
      accessToken: tokenResponse.access_token,
      refreshToken: tokenResponse.refresh_token,
      tokenType: tokenResponse.token_type,
      expiresIn: tokenResponse.expires_in,
      scopes: tokenResponse.scope,
      metadata
    };

    OAuthToken.save(tokenData);

    // Clean up state
    oauthStates.delete(state);

    // Log successful connection
    console.log(`OAuth successful for ${provider} by user ${userId}`);

    // Redirect to frontend with success
    res.redirect(
      `${process.env.FRONTEND_URL}/integrations?success=true&provider=${provider}`
    );
  } catch (error) {
    console.error(`Error in OAuth callback for ${provider}:`, error);

    // Clean up state if it exists
    if (state) {
      oauthStates.delete(state);
    }

    res.redirect(
      `${process.env.FRONTEND_URL}/integrations?error=${encodeURIComponent(error.message)}&provider=${provider}`
    );
  }
});

/**
 * GET /auth/status
 * Get OAuth connection status for current user
 */
router.get('/status', getOAuthStatus(['slack', 'google', 'jira']), (req, res) => {
  res.json({
    connections: req.oauthStatus
  });
});

/**
 * POST /auth/disconnect/:provider
 * Disconnect OAuth provider for current user
 */
router.post('/disconnect/:provider', async (req, res) => {
  const { provider } = req.params;
  const userId = req.query.userId || 'default-user'; // In production, get from session

  const validProviders = ['slack', 'google', 'jira'];

  if (!validProviders.includes(provider)) {
    return res.status(400).json({
      error: 'Invalid provider',
      message: `Provider must be one of: ${validProviders.join(', ')}`
    });
  }

  try {
    // Revoke token with provider and mark as inactive
    await revokeToken(userId, provider);

    console.log(`OAuth disconnected for ${provider} by user ${userId}`);

    res.json({
      success: true,
      message: `Successfully disconnected from ${provider}`,
      provider
    });
  } catch (error) {
    console.error(`Error disconnecting ${provider}:`, error);
    res.status(500).json({
      error: 'Disconnect failed',
      message: error.message,
      provider
    });
  }
});

/**
 * GET /auth/connections
 * Get all active OAuth connections for current user
 */
router.get('/connections', (req, res) => {
  const userId = req.query.userId || 'default-user'; // In production, get from session

  try {
    const connections = OAuthToken.getAllForUser(userId);

    res.json({
      userId,
      connections,
      count: connections.length
    });
  } catch (error) {
    console.error('Error getting OAuth connections:', error);
    res.status(500).json({
      error: 'Failed to retrieve connections',
      message: error.message
    });
  }
});

/**
 * Clean up expired OAuth states
 * Prevents memory leaks from abandoned OAuth flows
 */
function cleanExpiredStates() {
  const now = Date.now();
  for (const [state, data] of oauthStates.entries()) {
    if (now > data.expiresAt) {
      oauthStates.delete(state);
    }
  }
}

// Run cleanup every 5 minutes
setInterval(cleanExpiredStates, 5 * 60 * 1000);

module.exports = router;
