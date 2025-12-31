const crypto = require('crypto');
const OAuthToken = require('../models/OAuthToken');
const { getConfig } = require('../config/oauth');

/**
 * OAuth Utility Functions
 * Handles OAuth flow logic, token refresh, and security
 */

/**
 * Generate a secure random state token for CSRF protection
 * @returns {string} Random state token
 */
function generateState() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Verify state token to prevent CSRF attacks
 * @param {string} receivedState - State token from OAuth callback
 * @param {string} storedState - State token stored in session
 * @returns {boolean} True if state is valid
 */
function verifyState(receivedState, storedState) {
  if (!receivedState || !storedState) {
    return false;
  }
  return crypto.timingSafeEqual(
    Buffer.from(receivedState),
    Buffer.from(storedState)
  );
}

/**
 * Build authorization URL for OAuth provider
 * @param {string} provider - OAuth provider name
 * @param {string} state - CSRF state token
 * @returns {string} Authorization URL
 */
function buildAuthUrl(provider, state) {
  const config = getConfig(provider);
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    state: state,
    scope: Array.isArray(config.scopes) ? config.scopes.join(' ') : config.scopes,
    response_type: 'code'
  });

  // Jira-specific parameters
  if (provider === 'jira') {
    params.append('audience', config.audience);
    params.append('prompt', 'consent');
  }

  // Google-specific parameters
  if (provider === 'google') {
    params.append('access_type', 'offline');
    params.append('prompt', 'consent');
  }

  return `${config.authorizationURL}?${params.toString()}`;
}

/**
 * Exchange authorization code for access token
 * @param {string} provider - OAuth provider name
 * @param {string} code - Authorization code from OAuth callback
 * @returns {Promise<Object>} Token response
 */
async function exchangeCodeForToken(provider, code) {
  const config = getConfig(provider);

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code: code,
    redirect_uri: config.redirectUri,
    client_id: config.clientId,
    client_secret: config.clientSecret
  });

  try {
    const response = await fetch(config.tokenURL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: body.toString()
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Token exchange failed for ${provider}:`, errorText);
      throw new Error(`Failed to exchange code for token: ${response.status}`);
    }

    const data = await response.json();

    // Slack uses different field names
    if (provider === 'slack') {
      if (!data.ok) {
        throw new Error(data.error || 'Slack OAuth failed');
      }
      return {
        access_token: data.authed_user?.access_token || data.access_token,
        refresh_token: data.authed_user?.refresh_token || data.refresh_token,
        token_type: data.token_type || 'Bearer',
        expires_in: data.authed_user?.expires_in || data.expires_in,
        scope: data.scope,
        team: data.team,
        user: data.authed_user
      };
    }

    return data;
  } catch (error) {
    console.error(`Error exchanging code for ${provider}:`, error);
    throw error;
  }
}

/**
 * Refresh an expired access token
 * @param {string} userId - User ID
 * @param {string} provider - OAuth provider name
 * @returns {Promise<Object>} New token data
 */
async function refreshAccessToken(userId, provider) {
  const config = getConfig(provider);
  const existingToken = OAuthToken.get(userId, provider);

  if (!existingToken || !existingToken.refreshToken) {
    throw new Error(`No refresh token available for ${provider}`);
  }

  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: existingToken.refreshToken,
    client_id: config.clientId,
    client_secret: config.clientSecret
  });

  try {
    const response = await fetch(config.tokenURL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: body.toString()
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Token refresh failed for ${provider}:`, errorText);
      throw new Error(`Failed to refresh token: ${response.status}`);
    }

    const data = await response.json();

    // Save the new token
    const tokenData = {
      userId,
      provider,
      accessToken: data.access_token,
      refreshToken: data.refresh_token || existingToken.refreshToken, // Some providers don't return new refresh token
      tokenType: data.token_type || 'Bearer',
      expiresIn: data.expires_in,
      scopes: data.scope || existingToken.scopes,
      metadata: {
        ...existingToken.metadata,
        lastRefreshed: new Date().toISOString()
      }
    };

    OAuthToken.save(tokenData);

    console.log(`Token refreshed successfully for ${provider}`);
    return tokenData;
  } catch (error) {
    console.error(`Error refreshing token for ${provider}:`, error);
    throw error;
  }
}

/**
 * Get valid access token, refreshing if necessary
 * @param {string} userId - User ID
 * @param {string} provider - OAuth provider name
 * @returns {Promise<string>} Valid access token
 */
async function getValidAccessToken(userId, provider) {
  const token = OAuthToken.get(userId, provider);

  if (!token) {
    throw new Error(`No OAuth token found for ${provider}`);
  }

  // Check if token is expired or about to expire (5 minutes buffer)
  const expiresAt = new Date(token.expiresAt);
  const now = new Date();
  const bufferTime = 5 * 60 * 1000; // 5 minutes

  if (expiresAt.getTime() - now.getTime() < bufferTime) {
    console.log(`Token expired or expiring soon for ${provider}, refreshing...`);
    const refreshedToken = await refreshAccessToken(userId, provider);
    return refreshedToken.accessToken;
  }

  return token.accessToken;
}

/**
 * Revoke OAuth token with provider
 * @param {string} userId - User ID
 * @param {string} provider - OAuth provider name
 * @returns {Promise<boolean>} Success status
 */
async function revokeToken(userId, provider) {
  const config = getConfig(provider);
  const token = OAuthToken.get(userId, provider);

  if (!token) {
    return true; // Already revoked
  }

  try {
    // Attempt to revoke with provider (if they support it)
    if (config.revokeURL) {
      const body = new URLSearchParams({
        token: token.accessToken,
        client_id: config.clientId,
        client_secret: config.clientSecret
      });

      await fetch(config.revokeURL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: body.toString()
      });
    }

    // Mark as inactive in our database
    OAuthToken.revoke(userId, provider);
    console.log(`Token revoked successfully for ${provider}`);
    return true;
  } catch (error) {
    console.error(`Error revoking token for ${provider}:`, error);
    // Still mark as inactive locally even if provider revocation fails
    OAuthToken.revoke(userId, provider);
    return false;
  }
}

module.exports = {
  generateState,
  verifyState,
  buildAuthUrl,
  exchangeCodeForToken,
  refreshAccessToken,
  getValidAccessToken,
  revokeToken
};
