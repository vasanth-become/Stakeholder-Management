/**
 * Slack Integration Service
 *
 * Handles Slack OAuth and API interactions
 */

const axios = require('axios');
const oauthTokenService = require('../oauthTokenService');

const SLACK_CLIENT_ID = process.env.SLACK_CLIENT_ID;
const SLACK_CLIENT_SECRET = process.env.SLACK_CLIENT_SECRET;
const SLACK_REDIRECT_URI = process.env.SLACK_REDIRECT_URI || 'http://localhost:3001/oauth/slack/callback';

class SlackService {
  /**
   * Get Slack OAuth authorization URL
   *
   * @param {string} state - CSRF protection state token
   * @param {string[]} scopes - Additional scopes (optional)
   * @returns {string} Authorization URL
   */
  getAuthorizationUrl(state, scopes = []) {
    const defaultScopes = [
      'channels:read',
      'channels:write',
      'chat:write',
      'users:read',
      'users:read.email',
    ];

    const allScopes = [...new Set([...defaultScopes, ...scopes])];

    const params = new URLSearchParams({
      client_id: SLACK_CLIENT_ID,
      scope: allScopes.join(','),
      redirect_uri: SLACK_REDIRECT_URI,
      state: state,
    });

    return `https://slack.com/oauth/v2/authorize?${params.toString()}`;
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
        'https://slack.com/api/oauth.v2.access',
        null,
        {
          params: {
            client_id: SLACK_CLIENT_ID,
            client_secret: SLACK_CLIENT_SECRET,
            code: code,
            redirect_uri: SLACK_REDIRECT_URI,
          },
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      if (!response.data.ok) {
        throw new Error(`Slack OAuth error: ${response.data.error}`);
      }

      const data = response.data;

      return {
        access_token: data.access_token,
        token_type: data.token_type,
        scope: data.scope,
        bot_user_id: data.bot_user_id,
        app_id: data.app_id,
        team: {
          id: data.team.id,
          name: data.team.name,
        },
        authed_user: {
          id: data.authed_user.id,
          scope: data.authed_user.scope,
          access_token: data.authed_user.access_token,
          token_type: data.authed_user.token_type,
        },
      };
    } catch (error) {
      console.error('[Slack] Token exchange failed:', error.response?.data || error.message);
      throw new Error('Failed to exchange Slack authorization code');
    }
  }

  /**
   * Refresh Slack access token
   * Note: Slack tokens don't expire, so this is mainly for demonstration
   *
   * @param {string} refreshToken - Refresh token (if available)
   * @returns {Object} New tokens
   */
  async refreshAccessToken(refreshToken) {
    // Slack doesn't use refresh tokens in the same way
    // Their tokens don't expire unless revoked
    throw new Error('Slack tokens do not support refresh');
  }

  /**
   * Revoke Slack access token
   *
   * @param {string} accessToken - Access token to revoke
   */
  async revokeAccessToken(accessToken) {
    try {
      const response = await axios.post(
        'https://slack.com/api/auth.revoke',
        null,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (!response.data.ok) {
        throw new Error(`Slack revoke error: ${response.data.error}`);
      }

      console.log('[Slack] Token revoked successfully');
      return true;
    } catch (error) {
      console.error('[Slack] Token revocation failed:', error.response?.data || error.message);
      throw new Error('Failed to revoke Slack token');
    }
  }

  /**
   * Get Slack user info
   *
   * @param {string} userId - User ID
   * @returns {Object} User data from Slack
   */
  async getUserInfo(userId) {
    try {
      const tokenData = await oauthTokenService.getAccessToken(userId, 'slack');

      if (!tokenData) {
        throw new Error('No Slack connection found');
      }

      const response = await axios.get('https://slack.com/api/users.identity', {
        headers: {
          Authorization: `Bearer ${tokenData.accessToken}`,
        },
      });

      if (!response.data.ok) {
        throw new Error(`Slack API error: ${response.data.error}`);
      }

      return response.data.user;
    } catch (error) {
      console.error('[Slack] Get user info failed:', error.message);
      throw new Error('Failed to get Slack user info');
    }
  }

  /**
   * Send message to Slack channel
   *
   * @param {string} userId - User ID
   * @param {string} channel - Channel ID
   * @param {string} text - Message text
   * @returns {Object} Response from Slack
   */
  async sendMessage(userId, channel, text) {
    try {
      const tokenData = await oauthTokenService.getAccessToken(userId, 'slack');

      if (!tokenData) {
        throw new Error('No Slack connection found');
      }

      const response = await axios.post(
        'https://slack.com/api/chat.postMessage',
        {
          channel: channel,
          text: text,
        },
        {
          headers: {
            Authorization: `Bearer ${tokenData.accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.data.ok) {
        throw new Error(`Slack API error: ${response.data.error}`);
      }

      return response.data;
    } catch (error) {
      console.error('[Slack] Send message failed:', error.message);
      throw new Error('Failed to send Slack message');
    }
  }

  /**
   * List Slack channels
   *
   * @param {string} userId - User ID
   * @returns {Array} List of channels
   */
  async listChannels(userId) {
    try {
      const tokenData = await oauthTokenService.getAccessToken(userId, 'slack');

      if (!tokenData) {
        throw new Error('No Slack connection found');
      }

      const response = await axios.get('https://slack.com/api/conversations.list', {
        headers: {
          Authorization: `Bearer ${tokenData.accessToken}`,
        },
        params: {
          types: 'public_channel,private_channel',
          exclude_archived: true,
        },
      });

      if (!response.data.ok) {
        throw new Error(`Slack API error: ${response.data.error}`);
      }

      return response.data.channels;
    } catch (error) {
      console.error('[Slack] List channels failed:', error.message);
      throw new Error('Failed to list Slack channels');
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
      const tokenData = await oauthTokenService.getAccessToken(userId, 'slack');

      if (!tokenData) {
        return false;
      }

      const response = await axios.post(
        'https://slack.com/api/auth.test',
        null,
        {
          headers: {
            Authorization: `Bearer ${tokenData.accessToken}`,
          },
        }
      );

      return response.data.ok;
    } catch (error) {
      console.error('[Slack] Connection test failed:', error.message);
      return false;
    }
  }
}

module.exports = new SlackService();
