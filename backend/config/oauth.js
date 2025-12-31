/**
 * OAuth Provider Configurations
 * Centralized configuration for all OAuth providers
 */

const oauthConfig = {
  slack: {
    authorizationURL: 'https://slack.com/oauth/v2/authorize',
    tokenURL: 'https://slack.com/api/oauth.v2.access',
    revokeURL: 'https://slack.com/api/auth.revoke',
    scopes: [
      'channels:read',
      'channels:write',
      'chat:write',
      'users:read',
      'team:read'
    ],
    clientId: process.env.SLACK_CLIENT_ID,
    clientSecret: process.env.SLACK_CLIENT_SECRET,
    redirectUri: process.env.SLACK_REDIRECT_URI
  },

  google: {
    authorizationURL: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenURL: 'https://oauth2.googleapis.com/token',
    revokeURL: 'https://oauth2.googleapis.com/revoke',
    scopes: [
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/spreadsheets'
    ],
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    redirectUri: process.env.GOOGLE_REDIRECT_URI
  },

  jira: {
    authorizationURL: 'https://auth.atlassian.com/authorize',
    tokenURL: 'https://auth.atlassian.com/oauth/token',
    accessibleResourcesURL: 'https://api.atlassian.com/oauth/token/accessible-resources',
    scopes: [
      'read:jira-user',
      'read:jira-work',
      'write:jira-work',
      'offline_access'
    ],
    audience: 'api.atlassian.com',
    clientId: process.env.JIRA_CLIENT_ID,
    clientSecret: process.env.JIRA_CLIENT_SECRET,
    redirectUri: process.env.JIRA_REDIRECT_URI
  }
};

/**
 * Validate OAuth configuration
 * @param {string} provider - OAuth provider name
 * @throws {Error} If configuration is missing or invalid
 */
function validateConfig(provider) {
  const config = oauthConfig[provider];

  if (!config) {
    throw new Error(`Unknown OAuth provider: ${provider}`);
  }

  if (!config.clientId || !config.clientSecret) {
    throw new Error(`Missing OAuth credentials for ${provider}. Check environment variables.`);
  }

  if (!config.redirectUri) {
    throw new Error(`Missing redirect URI for ${provider}. Check environment variables.`);
  }

  return true;
}

/**
 * Get OAuth configuration for a provider
 * @param {string} provider - OAuth provider name
 * @returns {Object} Provider configuration
 */
function getConfig(provider) {
  validateConfig(provider);
  return oauthConfig[provider];
}

module.exports = {
  oauthConfig,
  getConfig,
  validateConfig
};
