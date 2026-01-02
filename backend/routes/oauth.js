/**
 * OAuth Routes
 *
 * Handles OAuth flows for Slack, Google, and Jira
 */

const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { verifyAuth } = require('../middleware/auth');
const oauthTokenService = require('../services/oauthTokenService');
const slackService = require('../services/integrations/slackService');
const googleService = require('../services/integrations/googleService');
const jiraService = require('../services/integrations/jiraService');

// In-memory store for OAuth states (use Redis in production)
const oauthStates = new Map();

// Cleanup old states every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [state, data] of oauthStates.entries()) {
    if (now - data.timestamp > 10 * 60 * 1000) { // 10 minutes
      oauthStates.delete(state);
    }
  }
}, 10 * 60 * 1000);

/**
 * Generate secure state token for CSRF protection
 */
function generateState(userId, provider) {
  const state = crypto.randomBytes(32).toString('hex');
  oauthStates.set(state, {
    userId,
    provider,
    timestamp: Date.now(),
  });
  return state;
}

/**
 * Verify state token
 */
function verifyState(state) {
  const data = oauthStates.get(state);
  if (!data) {
    return null;
  }

  // Check if expired (10 minutes)
  if (Date.now() - data.timestamp > 10 * 60 * 1000) {
    oauthStates.delete(state);
    return null;
  }

  oauthStates.delete(state);
  return data;
}

// ==================== SLACK ROUTES ====================

/**
 * GET /oauth/slack/authorize
 * Initiate Slack OAuth flow
 */
router.get('/slack/authorize', verifyAuth, (req, res) => {
  try {
    const state = generateState(req.user.userId, 'slack');
    const authUrl = slackService.getAuthorizationUrl(state);

    res.json({
      authUrl,
      message: 'Redirect user to this URL to authorize Slack',
    });
  } catch (error) {
    console.error('[OAuth] Slack authorize failed:', error);
    res.status(500).json({ error: 'Failed to initiate Slack OAuth' });
  }
});

/**
 * GET /oauth/slack/callback
 * Slack OAuth callback
 */
router.get('/slack/callback', async (req, res) => {
  try {
    const { code, state, error } = req.query;

    if (error) {
      return res.redirect(`/integrations?error=${error}`);
    }

    if (!code || !state) {
      return res.status(400).json({ error: 'Missing code or state' });
    }

    // Verify state
    const stateData = verifyState(state);
    if (!stateData) {
      return res.status(400).json({ error: 'Invalid or expired state' });
    }

    // Exchange code for token
    const tokenData = await slackService.exchangeCodeForToken(code);

    // Store tokens
    await oauthTokenService.storeTokens({
      userId: stateData.userId,
      workspaceId: null, // Set if you have workspace concept
      provider: 'slack',
      accessToken: tokenData.authed_user.access_token,
      refreshToken: null, // Slack doesn't use refresh tokens
      expiresIn: null, // Slack tokens don't expire
      scopes: tokenData.authed_user.scope ? tokenData.authed_user.scope.split(',') : [],
      providerData: {
        userId: tokenData.authed_user.id,
        email: null, // Can fetch separately if needed
        workspaceId: tokenData.team.id,
        metadata: {
          team_name: tokenData.team.name,
          bot_user_id: tokenData.bot_user_id,
          app_id: tokenData.app_id,
        },
      },
    });

    console.log(`[OAuth] Slack connected for user ${stateData.userId}`);

    // Redirect to success page
    res.redirect('/integrations?success=slack');
  } catch (error) {
    console.error('[OAuth] Slack callback failed:', error);
    res.redirect('/integrations?error=slack_failed');
  }
});

// ==================== GOOGLE ROUTES ====================

/**
 * GET /oauth/google/authorize
 * Initiate Google OAuth flow
 */
router.get('/google/authorize', verifyAuth, (req, res) => {
  try {
    const state = generateState(req.user.userId, 'google');
    const scopes = req.query.scopes ? req.query.scopes.split(',') : [];
    const authUrl = googleService.getAuthorizationUrl(state, scopes);

    res.json({
      authUrl,
      message: 'Redirect user to this URL to authorize Google',
    });
  } catch (error) {
    console.error('[OAuth] Google authorize failed:', error);
    res.status(500).json({ error: 'Failed to initiate Google OAuth' });
  }
});

/**
 * GET /oauth/google/callback
 * Google OAuth callback
 */
router.get('/google/callback', async (req, res) => {
  try {
    const { code, state, error } = req.query;

    if (error) {
      return res.redirect(`/integrations?error=${error}`);
    }

    if (!code || !state) {
      return res.status(400).json({ error: 'Missing code or state' });
    }

    // Verify state
    const stateData = verifyState(state);
    if (!stateData) {
      return res.status(400).json({ error: 'Invalid or expired state' });
    }

    // Exchange code for token
    const tokenData = await googleService.exchangeCodeForToken(code);

    // Get user info
    const userInfo = await googleService.getUserInfo(stateData.userId);

    // Store tokens
    await oauthTokenService.storeTokens({
      userId: stateData.userId,
      workspaceId: null,
      provider: 'google',
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      expiresIn: tokenData.expires_in,
      scopes: tokenData.scope ? tokenData.scope.split(' ') : [],
      providerData: {
        userId: userInfo.id,
        email: userInfo.email,
        workspaceId: null,
        metadata: {
          name: userInfo.name,
          picture: userInfo.picture,
          verified_email: userInfo.verified_email,
        },
      },
    });

    console.log(`[OAuth] Google connected for user ${stateData.userId}`);

    res.redirect('/integrations?success=google');
  } catch (error) {
    console.error('[OAuth] Google callback failed:', error);
    res.redirect('/integrations?error=google_failed');
  }
});

// ==================== JIRA ROUTES ====================

/**
 * GET /oauth/jira/authorize
 * Initiate Jira OAuth flow
 */
router.get('/jira/authorize', verifyAuth, (req, res) => {
  try {
    const state = generateState(req.user.userId, 'jira');
    const scopes = req.query.scopes ? req.query.scopes.split(',') : [];
    const authUrl = jiraService.getAuthorizationUrl(state, scopes);

    res.json({
      authUrl,
      message: 'Redirect user to this URL to authorize Jira',
    });
  } catch (error) {
    console.error('[OAuth] Jira authorize failed:', error);
    res.status(500).json({ error: 'Failed to initiate Jira OAuth' });
  }
});

/**
 * GET /oauth/jira/callback
 * Jira OAuth callback
 */
router.get('/jira/callback', async (req, res) => {
  try {
    const { code, state, error } = req.query;

    if (error) {
      return res.redirect(`/integrations?error=${error}`);
    }

    if (!code || !state) {
      return res.status(400).json({ error: 'Missing code or state' });
    }

    // Verify state
    const stateData = verifyState(state);
    if (!stateData) {
      return res.status(400).json({ error: 'Invalid or expired state' });
    }

    // Exchange code for token
    const tokenData = await jiraService.exchangeCodeForToken(code);

    // Get accessible resources
    const resources = await jiraService.getAccessibleResources(stateData.userId);
    const primaryResource = resources[0]; // Use first resource

    if (primaryResource) {
      // Get user info
      const userInfo = await jiraService.getUserInfo(stateData.userId, primaryResource.id);

      // Store tokens
      await oauthTokenService.storeTokens({
        userId: stateData.userId,
        workspaceId: null,
        provider: 'jira',
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        expiresIn: tokenData.expires_in,
        scopes: tokenData.scope ? tokenData.scope.split(' ') : [],
        providerData: {
          userId: userInfo.accountId,
          email: userInfo.emailAddress,
          workspaceId: primaryResource.id,
          metadata: {
            cloud_id: primaryResource.id,
            cloud_name: primaryResource.name,
            cloud_url: primaryResource.url,
            display_name: userInfo.displayName,
            resources: resources,
          },
        },
      });

      console.log(`[OAuth] Jira connected for user ${stateData.userId}`);
    }

    res.redirect('/integrations?success=jira');
  } catch (error) {
    console.error('[OAuth] Jira callback failed:', error);
    res.redirect('/integrations?error=jira_failed');
  }
});

// ==================== COMMON ROUTES ====================

/**
 * GET /oauth/connections
 * Get all OAuth connections for current user
 */
router.get('/connections', verifyAuth, async (req, res) => {
  try {
    const connections = await oauthTokenService.getUserConnections(req.user.userId);

    res.json({
      connections: connections.map(conn => ({
        id: conn.id,
        provider: conn.provider_name,
        providerDisplayName: conn.provider_display_name,
        status: conn.status,
        scopes: conn.scopes,
        expiresAt: conn.expires_at,
        lastUsedAt: conn.last_used_at,
        createdAt: conn.created_at,
        providerEmail: conn.provider_user_email,
        providerWorkspace: conn.provider_workspace_id,
      })),
    });
  } catch (error) {
    console.error('[OAuth] Get connections failed:', error);
    res.status(500).json({ error: 'Failed to get OAuth connections' });
  }
});

/**
 * DELETE /oauth/connections/:connectionId
 * Revoke OAuth connection
 */
router.delete('/connections/:connectionId', verifyAuth, async (req, res) => {
  try {
    const { connectionId } = req.params;
    const { reason } = req.body;

    // Get connection to determine provider
    const connections = await oauthTokenService.getUserConnections(req.user.userId);
    const connection = connections.find(c => c.id === connectionId);

    if (!connection) {
      return res.status(404).json({ error: 'Connection not found' });
    }

    // Get provider-specific revoke function
    let revokeFunction = null;
    if (connection.provider_name === 'slack') {
      revokeFunction = slackService.revokeAccessToken.bind(slackService);
    } else if (connection.provider_name === 'google') {
      revokeFunction = googleService.revokeAccessToken.bind(googleService);
    } else if (connection.provider_name === 'jira') {
      revokeFunction = jiraService.revokeAccessToken.bind(jiraService);
    }

    // Revoke connection
    await oauthTokenService.revokeConnection(
      connectionId,
      req.user.userId,
      reason || 'User requested revocation',
      revokeFunction
    );

    res.json({
      message: 'Connection revoked successfully',
      connectionId,
    });
  } catch (error) {
    console.error('[OAuth] Revoke connection failed:', error);
    res.status(500).json({ error: 'Failed to revoke connection' });
  }
});

/**
 * POST /oauth/connections/:connectionId/test
 * Test OAuth connection
 */
router.post('/connections/:connectionId/test', verifyAuth, async (req, res) => {
  try {
    const { connectionId } = req.params;

    const connections = await oauthTokenService.getUserConnections(req.user.userId);
    const connection = connections.find(c => c.id === connectionId);

    if (!connection) {
      return res.status(404).json({ error: 'Connection not found' });
    }

    let isValid = false;

    if (connection.provider_name === 'slack') {
      isValid = await slackService.testConnection(req.user.userId);
    } else if (connection.provider_name === 'google') {
      isValid = await googleService.testConnection(req.user.userId);
    } else if (connection.provider_name === 'jira') {
      isValid = await jiraService.testConnection(req.user.userId);
    }

    res.json({
      connectionId,
      provider: connection.provider_name,
      isValid,
      testedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[OAuth] Test connection failed:', error);
    res.status(500).json({ error: 'Failed to test connection' });
  }
});

module.exports = router;
