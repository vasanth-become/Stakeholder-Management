/**
 * Google Integration Service
 *
 * Handles Google OAuth and API interactions
 */

const axios = require('axios');
const oauthTokenService = require('../oauthTokenService');

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3001/oauth/google/callback';

class GoogleService {
  /**
   * Get Google OAuth authorization URL
   *
   * @param {string} state - CSRF protection state token
   * @param {string[]} scopes - Additional scopes (optional)
   * @returns {string} Authorization URL
   */
  getAuthorizationUrl(state, scopes = []) {
    const defaultScopes = [
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile',
      'openid',
    ];

    const allScopes = [...new Set([...defaultScopes, ...scopes])];

    const params = new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      redirect_uri: GOOGLE_REDIRECT_URI,
      response_type: 'code',
      scope: allScopes.join(' '),
      state: state,
      access_type: 'offline', // Required for refresh token
      prompt: 'consent', // Force consent screen to get refresh token
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
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
        'https://oauth2.googleapis.com/token',
        {
          client_id: GOOGLE_CLIENT_ID,
          client_secret: GOOGLE_CLIENT_SECRET,
          code: code,
          grant_type: 'authorization_code',
          redirect_uri: GOOGLE_REDIRECT_URI,
        },
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      return {
        access_token: response.data.access_token,
        refresh_token: response.data.refresh_token,
        expires_in: response.data.expires_in,
        scope: response.data.scope,
        token_type: response.data.token_type,
        id_token: response.data.id_token,
      };
    } catch (error) {
      console.error('[Google] Token exchange failed:', error.response?.data || error.message);
      throw new Error('Failed to exchange Google authorization code');
    }
  }

  /**
   * Refresh Google access token
   *
   * @param {string} refreshToken - Refresh token
   * @returns {Object} New tokens
   */
  async refreshAccessToken(refreshToken) {
    try {
      const response = await axios.post(
        'https://oauth2.googleapis.com/token',
        {
          client_id: GOOGLE_CLIENT_ID,
          client_secret: GOOGLE_CLIENT_SECRET,
          refresh_token: refreshToken,
          grant_type: 'refresh_token',
        },
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      return {
        access_token: response.data.access_token,
        expires_in: response.data.expires_in,
        scope: response.data.scope,
        token_type: response.data.token_type,
        // Note: Google doesn't always return a new refresh token
        refresh_token: response.data.refresh_token || refreshToken,
      };
    } catch (error) {
      console.error('[Google] Token refresh failed:', error.response?.data || error.message);
      throw new Error('Failed to refresh Google access token');
    }
  }

  /**
   * Revoke Google access token
   *
   * @param {string} accessToken - Access token to revoke
   */
  async revokeAccessToken(accessToken) {
    try {
      await axios.post(
        'https://oauth2.googleapis.com/revoke',
        null,
        {
          params: {
            token: accessToken,
          },
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      console.log('[Google] Token revoked successfully');
      return true;
    } catch (error) {
      console.error('[Google] Token revocation failed:', error.response?.data || error.message);
      throw new Error('Failed to revoke Google token');
    }
  }

  /**
   * Get Google user info
   *
   * @param {string} userId - User ID
   * @returns {Object} User data from Google
   */
  async getUserInfo(userId) {
    try {
      const tokenData = await oauthTokenService.getAccessToken(userId, 'google');

      if (!tokenData) {
        throw new Error('No Google connection found');
      }

      // Check if token needs refresh
      if (await oauthTokenService.needsRefresh(tokenData.connection.id)) {
        console.log('[Google] Token needs refresh, refreshing...');
        await oauthTokenService.refreshAccessToken(
          tokenData.connection.id,
          this.refreshAccessToken.bind(this)
        );

        // Get new token
        const newTokenData = await oauthTokenService.getAccessToken(userId, 'google');
        tokenData.accessToken = newTokenData.accessToken;
      }

      const response = await axios.get(
        'https://www.googleapis.com/oauth2/v2/userinfo',
        {
          headers: {
            Authorization: `Bearer ${tokenData.accessToken}`,
          },
        }
      );

      return response.data;
    } catch (error) {
      console.error('[Google] Get user info failed:', error.message);
      throw new Error('Failed to get Google user info');
    }
  }

  /**
   * List Google Calendar events
   *
   * @param {string} userId - User ID
   * @param {Object} options - Calendar options
   * @returns {Array} List of events
   */
  async listCalendarEvents(userId, options = {}) {
    try {
      const tokenData = await oauthTokenService.getAccessToken(userId, 'google');

      if (!tokenData) {
        throw new Error('No Google connection found');
      }

      // Refresh if needed
      if (await oauthTokenService.needsRefresh(tokenData.connection.id)) {
        await oauthTokenService.refreshAccessToken(
          tokenData.connection.id,
          this.refreshAccessToken.bind(this)
        );
        const newTokenData = await oauthTokenService.getAccessToken(userId, 'google');
        tokenData.accessToken = newTokenData.accessToken;
      }

      const response = await axios.get(
        'https://www.googleapis.com/calendar/v3/calendars/primary/events',
        {
          headers: {
            Authorization: `Bearer ${tokenData.accessToken}`,
          },
          params: {
            maxResults: options.maxResults || 10,
            orderBy: 'startTime',
            singleEvents: true,
            timeMin: options.timeMin || new Date().toISOString(),
            ...options,
          },
        }
      );

      return response.data.items || [];
    } catch (error) {
      console.error('[Google] List calendar events failed:', error.message);
      throw new Error('Failed to list Google Calendar events');
    }
  }

  /**
   * Send email via Gmail API
   *
   * @param {string} userId - User ID
   * @param {Object} email - Email data
   * @returns {Object} Response from Gmail
   */
  async sendEmail(userId, { to, subject, body }) {
    try {
      const tokenData = await oauthTokenService.getAccessToken(userId, 'google');

      if (!tokenData) {
        throw new Error('No Google connection found');
      }

      // Refresh if needed
      if (await oauthTokenService.needsRefresh(tokenData.connection.id)) {
        await oauthTokenService.refreshAccessToken(
          tokenData.connection.id,
          this.refreshAccessToken.bind(this)
        );
        const newTokenData = await oauthTokenService.getAccessToken(userId, 'google');
        tokenData.accessToken = newTokenData.accessToken;
      }

      // Create email in RFC 2822 format
      const emailLines = [
        `To: ${to}`,
        `Subject: ${subject}`,
        '',
        body,
      ];

      const email = emailLines.join('\n');
      const encodedEmail = Buffer.from(email).toString('base64url');

      const response = await axios.post(
        'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
        {
          raw: encodedEmail,
        },
        {
          headers: {
            Authorization: `Bearer ${tokenData.accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return response.data;
    } catch (error) {
      console.error('[Google] Send email failed:', error.message);
      throw new Error('Failed to send email via Gmail');
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
      const tokenData = await oauthTokenService.getAccessToken(userId, 'google');

      if (!tokenData) {
        return false;
      }

      const response = await axios.get(
        'https://www.googleapis.com/oauth2/v2/userinfo',
        {
          headers: {
            Authorization: `Bearer ${tokenData.accessToken}`,
          },
        }
      );

      return response.status === 200;
    } catch (error) {
      console.error('[Google] Connection test failed:', error.message);
      return false;
    }
  }
}

module.exports = new GoogleService();
