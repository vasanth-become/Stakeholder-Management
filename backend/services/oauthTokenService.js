/**
 * OAuth Token Service
 *
 * Manages OAuth tokens with encryption, rotation, and revocation
 */

const db = require('../database/db');
const encryptionService = require('./encryptionService');
const auditService = require('./auditService');

class OAuthTokenService {
  /**
   * Store OAuth tokens securely
   *
   * @param {Object} params
   * @param {string} params.userId - User ID
   * @param {string} params.workspaceId - Workspace ID
   * @param {string} params.provider - Provider name (slack, google, jira)
   * @param {string} params.accessToken - Access token (will be encrypted)
   * @param {string} params.refreshToken - Refresh token (will be encrypted)
   * @param {number} params.expiresIn - Seconds until expiration
   * @param {string[]} params.scopes - OAuth scopes granted
   * @param {Object} params.providerData - Provider-specific data
   * @returns {Object} Connection record
   */
  async storeTokens({
    userId,
    workspaceId,
    provider,
    accessToken,
    refreshToken,
    expiresIn,
    scopes = [],
    providerData = {},
  }) {
    try {
      // Get provider ID
      const providerResult = await db.query(
        'SELECT id FROM oauth_providers WHERE name = $1',
        [provider]
      );

      if (!providerResult.rows.length) {
        throw new Error(`Unknown OAuth provider: ${provider}`);
      }

      const providerId = providerResult.rows[0].id;

      // Encrypt tokens
      const accessTokenEncrypted = encryptionService.encrypt(accessToken);
      const refreshTokenEncrypted = refreshToken
        ? encryptionService.encrypt(refreshToken)
        : null;

      // Calculate expiration
      const expiresAt = expiresIn
        ? new Date(Date.now() + expiresIn * 1000)
        : null;

      // Check if connection already exists
      const existingResult = await db.query(
        `SELECT id FROM oauth_connections
         WHERE user_id = $1 AND provider_id = $2
         AND (provider_workspace_id = $3 OR provider_workspace_id IS NULL)`,
        [userId, providerId, providerData.workspaceId || null]
      );

      let result;

      if (existingResult.rows.length > 0) {
        // Update existing connection
        const connectionId = existingResult.rows[0].id;

        result = await db.query(
          `UPDATE oauth_connections
           SET access_token_encrypted = $1,
               refresh_token_encrypted = $2,
               expires_at = $3,
               scopes = $4,
               provider_user_id = $5,
               provider_user_email = $6,
               provider_workspace_id = $7,
               provider_metadata = $8,
               status = 'active',
               last_refresh_at = NOW(),
               refresh_attempts = 0,
               last_error = NULL,
               last_error_at = NULL,
               updated_at = NOW()
           WHERE id = $9
           RETURNING id, user_id, workspace_id, provider_id, status, expires_at, created_at`,
          [
            accessTokenEncrypted,
            refreshTokenEncrypted,
            expiresAt,
            scopes,
            providerData.userId,
            providerData.email,
            providerData.workspaceId,
            providerData.metadata || {},
            connectionId,
          ]
        );

        console.log(`[OAuth] Updated tokens for user ${userId}, provider ${provider}`);
      } else {
        // Insert new connection
        result = await db.query(
          `INSERT INTO oauth_connections (
            user_id,
            workspace_id,
            provider_id,
            access_token_encrypted,
            refresh_token_encrypted,
            expires_at,
            scopes,
            provider_user_id,
            provider_user_email,
            provider_workspace_id,
            provider_metadata,
            status
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'active')
          RETURNING id, user_id, workspace_id, provider_id, status, expires_at, created_at`,
          [
            userId,
            workspaceId,
            providerId,
            accessTokenEncrypted,
            refreshTokenEncrypted,
            expiresAt,
            scopes,
            providerData.userId,
            providerData.email,
            providerData.workspaceId,
            providerData.metadata || {},
          ]
        );

        console.log(`[OAuth] Stored new tokens for user ${userId}, provider ${provider}`);
      }

      // Audit log
      await auditService.log(
        userId,
        'oauth_connected',
        result.rows[0].id,
        null,
        { provider, scopes }
      );

      return result.rows[0];
    } catch (error) {
      console.error('[OAuth] Failed to store tokens:', error);
      throw new Error('Failed to store OAuth tokens');
    }
  }

  /**
   * Get decrypted access token for a user and provider
   *
   * @param {string} userId - User ID
   * @param {string} provider - Provider name
   * @param {string} workspaceId - Optional workspace ID
   * @returns {Object} { accessToken, expiresAt, connection }
   */
  async getAccessToken(userId, provider, workspaceId = null) {
    try {
      const result = await db.query(
        `SELECT
          oc.id,
          oc.access_token_encrypted,
          oc.expires_at,
          oc.status,
          oc.last_used_at,
          op.name as provider_name
         FROM oauth_connections oc
         JOIN oauth_providers op ON oc.provider_id = op.id
         WHERE oc.user_id = $1
         AND op.name = $2
         AND (oc.workspace_id = $3 OR $3 IS NULL)
         AND oc.status = 'active'
         ORDER BY oc.created_at DESC
         LIMIT 1`,
        [userId, provider, workspaceId]
      );

      if (!result.rows.length) {
        return null;
      }

      const connection = result.rows[0];

      // Check if token is expired
      if (connection.expires_at && new Date(connection.expires_at) < new Date()) {
        console.log(`[OAuth] Token expired for user ${userId}, provider ${provider}`);
        return null;
      }

      // Decrypt access token
      const accessToken = encryptionService.decrypt(connection.access_token_encrypted);

      // Update last used timestamp
      await db.query(
        'UPDATE oauth_connections SET last_used_at = NOW() WHERE id = $1',
        [connection.id]
      );

      return {
        accessToken,
        expiresAt: connection.expires_at,
        connection: {
          id: connection.id,
          status: connection.status,
          lastUsedAt: connection.last_used_at,
        },
      };
    } catch (error) {
      console.error('[OAuth] Failed to get access token:', error);
      throw new Error('Failed to retrieve access token');
    }
  }

  /**
   * Refresh access token using refresh token
   *
   * @param {string} connectionId - Connection ID
   * @param {Function} refreshFunction - Provider-specific refresh function
   * @returns {Object} New tokens
   */
  async refreshAccessToken(connectionId, refreshFunction) {
    const MAX_RETRY_ATTEMPTS = 3;
    let attempt = 0;
    let lastError = null;

    while (attempt < MAX_RETRY_ATTEMPTS) {
      try {
        attempt++;
        console.log(`[OAuth] Refreshing token (attempt ${attempt}/${MAX_RETRY_ATTEMPTS})`);

        // Get connection with encrypted refresh token
        const result = await db.query(
          `SELECT
            oc.id,
            oc.user_id,
            oc.workspace_id,
            oc.refresh_token_encrypted,
            oc.provider_metadata,
            op.name as provider_name
           FROM oauth_connections oc
           JOIN oauth_providers op ON oc.provider_id = op.id
           WHERE oc.id = $1`,
          [connectionId]
        );

        if (!result.rows.length) {
          throw new Error('Connection not found');
        }

        const connection = result.rows[0];

        if (!connection.refresh_token_encrypted) {
          throw new Error('No refresh token available');
        }

        // Decrypt refresh token
        const refreshToken = encryptionService.decrypt(connection.refresh_token_encrypted);

        // Call provider-specific refresh function
        const newTokens = await refreshFunction(refreshToken);

        // Store new tokens
        await this.storeTokens({
          userId: connection.user_id,
          workspaceId: connection.workspace_id,
          provider: connection.provider_name,
          accessToken: newTokens.access_token,
          refreshToken: newTokens.refresh_token || refreshToken, // Use new or keep old
          expiresIn: newTokens.expires_in,
          scopes: newTokens.scope ? newTokens.scope.split(' ') : [],
          providerData: connection.provider_metadata,
        });

        // Log successful rotation
        await this.logTokenRotation(connectionId, 'refresh', true, 'system');

        console.log(`[OAuth] Successfully refreshed token for connection ${connectionId}`);

        return newTokens;
      } catch (error) {
        lastError = error;
        console.error(`[OAuth] Token refresh attempt ${attempt} failed:`, error.message);

        // Update error in database
        await db.query(
          `UPDATE oauth_connections
           SET refresh_attempts = refresh_attempts + 1,
               last_error = $1,
               last_error_at = NOW()
           WHERE id = $2`,
          [error.message, connectionId]
        );

        // Log failed rotation
        await this.logTokenRotation(connectionId, 'refresh', false, 'system', error.message);

        // Exponential backoff
        if (attempt < MAX_RETRY_ATTEMPTS) {
          const delay = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
          console.log(`[OAuth] Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    // All attempts failed - mark as error
    await db.query(
      `UPDATE oauth_connections
       SET status = 'error'
       WHERE id = $1`,
      [connectionId]
    );

    throw new Error(`Failed to refresh token after ${MAX_RETRY_ATTEMPTS} attempts: ${lastError?.message}`);
  }

  /**
   * Revoke OAuth connection
   *
   * @param {string} connectionId - Connection ID
   * @param {string} revokedBy - User ID who revoked
   * @param {string} reason - Revocation reason
   * @param {Function} revokeFunction - Optional provider revoke function
   */
  async revokeConnection(connectionId, revokedBy, reason, revokeFunction = null) {
    try {
      // Get connection
      const result = await db.query(
        `SELECT
          oc.id,
          oc.access_token_encrypted,
          oc.user_id,
          op.name as provider_name
         FROM oauth_connections oc
         JOIN oauth_providers op ON oc.provider_id = op.id
         WHERE oc.id = $1`,
        [connectionId]
      );

      if (!result.rows.length) {
        throw new Error('Connection not found');
      }

      const connection = result.rows[0];

      // Call provider revoke function if available
      if (revokeFunction) {
        try {
          const accessToken = encryptionService.decrypt(connection.access_token_encrypted);
          await revokeFunction(accessToken);
          console.log(`[OAuth] Revoked token at provider for connection ${connectionId}`);
        } catch (error) {
          console.error('[OAuth] Failed to revoke at provider:', error);
          // Continue with local revocation even if provider revocation fails
        }
      }

      // Revoke in database
      await db.query(
        `UPDATE oauth_connections
         SET status = 'revoked',
             revoked_at = NOW(),
             revoked_by = $1,
             revoke_reason = $2,
             -- Clear encrypted tokens for security
             access_token_encrypted = NULL,
             refresh_token_encrypted = NULL
         WHERE id = $3`,
        [revokedBy, reason, connectionId]
      );

      // Log revocation
      await this.logTokenRotation(connectionId, 'revoke', true, 'user');

      // Audit log
      await auditService.log(
        revokedBy,
        'oauth_revoked',
        connectionId,
        null,
        { provider: connection.provider_name, reason }
      );

      console.log(`[OAuth] Revoked connection ${connectionId}`);

      return true;
    } catch (error) {
      console.error('[OAuth] Failed to revoke connection:', error);
      throw new Error('Failed to revoke OAuth connection');
    }
  }

  /**
   * Get all OAuth connections for a user
   *
   * @param {string} userId - User ID
   * @returns {Array} List of connections (without decrypted tokens)
   */
  async getUserConnections(userId) {
    try {
      const result = await db.query(
        `SELECT
          oc.id,
          op.name as provider_name,
          op.display_name as provider_display_name,
          oc.scopes,
          oc.status,
          oc.expires_at,
          oc.last_used_at,
          oc.created_at,
          oc.provider_user_email,
          oc.provider_workspace_id
         FROM oauth_connections oc
         JOIN oauth_providers op ON oc.provider_id = op.id
         WHERE oc.user_id = $1
         ORDER BY oc.created_at DESC`,
        [userId]
      );

      return result.rows;
    } catch (error) {
      console.error('[OAuth] Failed to get user connections:', error);
      throw new Error('Failed to retrieve OAuth connections');
    }
  }

  /**
   * Check if token needs refresh
   *
   * @param {string} connectionId - Connection ID
   * @param {number} bufferSeconds - Refresh if expires within this time (default: 300s = 5min)
   * @returns {boolean}
   */
  async needsRefresh(connectionId, bufferSeconds = 300) {
    try {
      const result = await db.query(
        'SELECT expires_at FROM oauth_connections WHERE id = $1',
        [connectionId]
      );

      if (!result.rows.length || !result.rows[0].expires_at) {
        return false;
      }

      const expiresAt = new Date(result.rows[0].expires_at);
      const now = new Date();
      const bufferTime = new Date(now.getTime() + bufferSeconds * 1000);

      return expiresAt <= bufferTime;
    } catch (error) {
      console.error('[OAuth] Failed to check refresh need:', error);
      return false;
    }
  }

  /**
   * Log token rotation event
   */
  async logTokenRotation(connectionId, action, success, triggeredBy, errorMessage = null) {
    try {
      await db.query(
        `INSERT INTO oauth_token_rotations (
          connection_id,
          action,
          success,
          triggered_by,
          error_message
        ) VALUES ($1, $2, $3, $4, $5)`,
        [connectionId, action, success, triggeredBy, errorMessage]
      );
    } catch (error) {
      console.error('[OAuth] Failed to log token rotation:', error);
      // Don't throw - logging failure shouldn't break the operation
    }
  }

  /**
   * Clean up expired or revoked connections
   *
   * @param {number} daysOld - Delete connections older than this (default: 90 days)
   */
  async cleanup(daysOld = 90) {
    try {
      const result = await db.query(
        `DELETE FROM oauth_connections
         WHERE status IN ('revoked', 'expired')
         AND (revoked_at < NOW() - INTERVAL '${daysOld} days'
              OR updated_at < NOW() - INTERVAL '${daysOld} days')
         RETURNING id`
      );

      console.log(`[OAuth] Cleaned up ${result.rowCount} old connections`);

      return result.rowCount;
    } catch (error) {
      console.error('[OAuth] Cleanup failed:', error);
      throw new Error('Failed to cleanup OAuth connections');
    }
  }
}

module.exports = new OAuthTokenService();
