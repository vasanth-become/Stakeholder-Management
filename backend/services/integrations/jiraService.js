/**
 * Jira Integration Service
 *
 * Handles Jira OAuth and API interactions
 */

const axios = require('axios');
const oauthTokenService = require('../oauthTokenService');

const JIRA_CLIENT_ID = process.env.JIRA_CLIENT_ID;
const JIRA_CLIENT_SECRET = process.env.JIRA_CLIENT_SECRET;
const JIRA_REDIRECT_URI = process.env.JIRA_REDIRECT_URI || 'http://localhost:3001/oauth/jira/callback';

class JiraService {
  /**
   * Get Jira OAuth authorization URL
   *
   * @param {string} state - CSRF protection state token
   * @param {string[]} scopes - Additional scopes (optional)
   * @returns {string} Authorization URL
   */
  getAuthorizationUrl(state, scopes = []) {
    const defaultScopes = [
      'read:jira-user',
      'read:jira-work',
      'write:jira-work',
      'offline_access', // Required for refresh token
    ];

    const allScopes = [...new Set([...defaultScopes, ...scopes])];

    const params = new URLSearchParams({
      audience: 'api.atlassian.com',
      client_id: JIRA_CLIENT_ID,
      scope: allScopes.join(' '),
      redirect_uri: JIRA_REDIRECT_URI,
      state: state,
      response_type: 'code',
      prompt: 'consent',
    });

    return `https://auth.atlassian.com/authorize?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access token
   *
   * @param {string} code - Authorization code from callback
   * @returns {Object} Token data
   */
  async exchangeCodeForToken(code) {
    try {
      const response = await axios.post(
        'https://auth.atlassian.com/oauth/token',
        {
          grant_type: 'authorization_code',
          client_id: JIRA_CLIENT_ID,
          client_secret: JIRA_CLIENT_SECRET,
          code: code,
          redirect_uri: JIRA_REDIRECT_URI,
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      return {
        access_token: response.data.access_token,
        refresh_token: response.data.refresh_token,
        expires_in: response.data.expires_in,
        scope: response.data.scope,
        token_type: response.data.token_type,
      };
    } catch (error) {
      console.error('[Jira] Token exchange failed:', error.response?.data || error.message);
      throw new Error('Failed to exchange Jira authorization code');
    }
  }

  /**
   * Refresh Jira access token
   *
   * @param {string} refreshToken - Refresh token
   * @returns {Object} New tokens
   */
  async refreshAccessToken(refreshToken) {
    try {
      const response = await axios.post(
        'https://auth.atlassian.com/oauth/token',
        {
          grant_type: 'refresh_token',
          client_id: JIRA_CLIENT_ID,
          client_secret: JIRA_CLIENT_SECRET,
          refresh_token: refreshToken,
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      return {
        access_token: response.data.access_token,
        refresh_token: response.data.refresh_token,
        expires_in: response.data.expires_in,
        scope: response.data.scope,
        token_type: response.data.token_type,
      };
    } catch (error) {
      console.error('[Jira] Token refresh failed:', error.response?.data || error.message);
      throw new Error('Failed to refresh Jira access token');
    }
  }

  /**
   * Revoke Jira access token
   * Note: Jira doesn't provide a revoke endpoint, so we just remove it locally
   *
   * @param {string} accessToken - Access token to revoke
   */
  async revokeAccessToken(accessToken) {
    // Jira doesn't have a public revoke endpoint
    // Token will expire naturally or can be revoked through Atlassian admin
    console.log('[Jira] Token marked for revocation (Jira has no revoke endpoint)');
    return true;
  }

  /**
   * Get accessible resources (Jira sites)
   *
   * @param {string} userId - User ID
   * @returns {Array} List of accessible resources
   */
  async getAccessibleResources(userId) {
    try {
      const tokenData = await oauthTokenService.getAccessToken(userId, 'jira');

      if (!tokenData) {
        throw new Error('No Jira connection found');
      }

      const response = await axios.get(
        'https://api.atlassian.com/oauth/token/accessible-resources',
        {
          headers: {
            Authorization: `Bearer ${tokenData.accessToken}`,
            Accept: 'application/json',
          },
        }
      );

      return response.data;
    } catch (error) {
      console.error('[Jira] Get accessible resources failed:', error.message);
      throw new Error('Failed to get Jira accessible resources');
    }
  }

  /**
   * Get current user info
   *
   * @param {string} userId - User ID
   * @param {string} cloudId - Jira cloud ID
   * @returns {Object} User data from Jira
   */
  async getUserInfo(userId, cloudId) {
    try {
      const tokenData = await oauthTokenService.getAccessToken(userId, 'jira');

      if (!tokenData) {
        throw new Error('No Jira connection found');
      }

      // Refresh if needed
      if (await oauthTokenService.needsRefresh(tokenData.connection.id)) {
        console.log('[Jira] Token needs refresh, refreshing...');
        await oauthTokenService.refreshAccessToken(
          tokenData.connection.id,
          this.refreshAccessToken.bind(this)
        );
        const newTokenData = await oauthTokenService.getAccessToken(userId, 'jira');
        tokenData.accessToken = newTokenData.accessToken;
      }

      const response = await axios.get(
        `https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3/myself`,
        {
          headers: {
            Authorization: `Bearer ${tokenData.accessToken}`,
            Accept: 'application/json',
          },
        }
      );

      return response.data;
    } catch (error) {
      console.error('[Jira] Get user info failed:', error.message);
      throw new Error('Failed to get Jira user info');
    }
  }

  /**
   * List Jira projects
   *
   * @param {string} userId - User ID
   * @param {string} cloudId - Jira cloud ID
   * @returns {Array} List of projects
   */
  async listProjects(userId, cloudId) {
    try {
      const tokenData = await oauthTokenService.getAccessToken(userId, 'jira');

      if (!tokenData) {
        throw new Error('No Jira connection found');
      }

      // Refresh if needed
      if (await oauthTokenService.needsRefresh(tokenData.connection.id)) {
        await oauthTokenService.refreshAccessToken(
          tokenData.connection.id,
          this.refreshAccessToken.bind(this)
        );
        const newTokenData = await oauthTokenService.getAccessToken(userId, 'jira');
        tokenData.accessToken = newTokenData.accessToken;
      }

      const response = await axios.get(
        `https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3/project`,
        {
          headers: {
            Authorization: `Bearer ${tokenData.accessToken}`,
            Accept: 'application/json',
          },
        }
      );

      return response.data;
    } catch (error) {
      console.error('[Jira] List projects failed:', error.message);
      throw new Error('Failed to list Jira projects');
    }
  }

  /**
   * Create Jira issue
   *
   * @param {string} userId - User ID
   * @param {string} cloudId - Jira cloud ID
   * @param {Object} issue - Issue data
   * @returns {Object} Created issue
   */
  async createIssue(userId, cloudId, issue) {
    try {
      const tokenData = await oauthTokenService.getAccessToken(userId, 'jira');

      if (!tokenData) {
        throw new Error('No Jira connection found');
      }

      // Refresh if needed
      if (await oauthTokenService.needsRefresh(tokenData.connection.id)) {
        await oauthTokenService.refreshAccessToken(
          tokenData.connection.id,
          this.refreshAccessToken.bind(this)
        );
        const newTokenData = await oauthTokenService.getAccessToken(userId, 'jira');
        tokenData.accessToken = newTokenData.accessToken;
      }

      const response = await axios.post(
        `https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3/issue`,
        {
          fields: {
            project: {
              key: issue.projectKey,
            },
            summary: issue.summary,
            description: {
              type: 'doc',
              version: 1,
              content: [
                {
                  type: 'paragraph',
                  content: [
                    {
                      type: 'text',
                      text: issue.description,
                    },
                  ],
                },
              ],
            },
            issuetype: {
              name: issue.issueType || 'Task',
            },
          },
        },
        {
          headers: {
            Authorization: `Bearer ${tokenData.accessToken}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
        }
      );

      return response.data;
    } catch (error) {
      console.error('[Jira] Create issue failed:', error.response?.data || error.message);
      throw new Error('Failed to create Jira issue');
    }
  }

  /**
   * Search Jira issues
   *
   * @param {string} userId - User ID
   * @param {string} cloudId - Jira cloud ID
   * @param {string} jql - JQL query
   * @param {Object} options - Search options
   * @returns {Object} Search results
   */
  async searchIssues(userId, cloudId, jql, options = {}) {
    try {
      const tokenData = await oauthTokenService.getAccessToken(userId, 'jira');

      if (!tokenData) {
        throw new Error('No Jira connection found');
      }

      // Refresh if needed
      if (await oauthTokenService.needsRefresh(tokenData.connection.id)) {
        await oauthTokenService.refreshAccessToken(
          tokenData.connection.id,
          this.refreshAccessToken.bind(this)
        );
        const newTokenData = await oauthTokenService.getAccessToken(userId, 'jira');
        tokenData.accessToken = newTokenData.accessToken;
      }

      const response = await axios.post(
        `https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3/search`,
        {
          jql: jql,
          maxResults: options.maxResults || 50,
          startAt: options.startAt || 0,
          fields: options.fields || ['summary', 'status', 'assignee', 'created'],
        },
        {
          headers: {
            Authorization: `Bearer ${tokenData.accessToken}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
        }
      );

      return response.data;
    } catch (error) {
      console.error('[Jira] Search issues failed:', error.response?.data || error.message);
      throw new Error('Failed to search Jira issues');
    }
  }

  /**
   * Test connection
   *
   * @param {string} userId - User ID
   * @returns {boolean} Connection status
   */
  async testConnection(userId) {
    try {
      const resources = await this.getAccessibleResources(userId);
      return resources && resources.length > 0;
    } catch (error) {
      console.error('[Jira] Connection test failed:', error.message);
      return false;
    }
  }
}

module.exports = new JiraService();
