const db = require('../database/db');
const crypto = require('crypto');

/**
 * OAuth Token Model
 * Handles secure storage and retrieval of OAuth tokens with encryption
 */
class OAuthToken {
  /**
   * Encrypt sensitive token data
   * @param {string} text - Text to encrypt
   * @returns {string} Encrypted text in format: iv:encryptedData
   */
  static encrypt(text) {
    if (!process.env.ENCRYPTION_KEY) {
      throw new Error('ENCRYPTION_KEY must be set in environment variables');
    }

    const key = Buffer.from(process.env.ENCRYPTION_KEY, 'hex');
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    return `${iv.toString('hex')}:${encrypted}`;
  }

  /**
   * Decrypt sensitive token data
   * @param {string} text - Encrypted text in format: iv:encryptedData
   * @returns {string} Decrypted text
   */
  static decrypt(text) {
    if (!process.env.ENCRYPTION_KEY) {
      throw new Error('ENCRYPTION_KEY must be set in environment variables');
    }

    const key = Buffer.from(process.env.ENCRYPTION_KEY, 'hex');
    const [ivHex, encryptedData] = text.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);

    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  /**
   * Store or update OAuth token
   * @param {Object} tokenData - Token data to store
   * @returns {Object} Stored token (without sensitive data)
   */
  static save(tokenData) {
    const {
      userId,
      provider,
      accessToken,
      refreshToken,
      tokenType = 'Bearer',
      expiresIn,
      scopes,
      metadata
    } = tokenData;

    // Calculate expiration timestamp
    const expiresAt = expiresIn
      ? new Date(Date.now() + expiresIn * 1000).toISOString()
      : null;

    // Encrypt sensitive tokens
    const encryptedAccessToken = this.encrypt(accessToken);
    const encryptedRefreshToken = refreshToken ? this.encrypt(refreshToken) : null;

    // Serialize scopes and metadata
    const scopesJson = Array.isArray(scopes) ? JSON.stringify(scopes) : scopes;
    const metadataJson = metadata ? JSON.stringify(metadata) : null;

    try {
      // Use INSERT OR REPLACE to handle both creation and updates
      const stmt = db.prepare(`
        INSERT OR REPLACE INTO oauth_tokens
        (user_id, provider, access_token, refresh_token, token_type, expires_at, scopes, metadata, is_active, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP)
      `);

      stmt.run(
        userId,
        provider,
        encryptedAccessToken,
        encryptedRefreshToken,
        tokenType,
        expiresAt,
        scopesJson,
        metadataJson
      );

      return {
        userId,
        provider,
        tokenType,
        expiresAt,
        scopes: scopesJson ? JSON.parse(scopesJson) : null,
        hasRefreshToken: !!refreshToken
      };
    } catch (error) {
      console.error('Error saving OAuth token:', error);
      throw new Error('Failed to save OAuth token');
    }
  }

  /**
   * Get OAuth token for a user and provider
   * @param {string} userId - User ID
   * @param {string} provider - OAuth provider (slack, google, jira)
   * @returns {Object|null} Decrypted token data or null if not found
   */
  static get(userId, provider) {
    try {
      const stmt = db.prepare(`
        SELECT * FROM oauth_tokens
        WHERE user_id = ? AND provider = ? AND is_active = 1
      `);

      const row = stmt.get(userId, provider);

      if (!row) {
        return null;
      }

      // Decrypt tokens
      const accessToken = this.decrypt(row.access_token);
      const refreshToken = row.refresh_token ? this.decrypt(row.refresh_token) : null;

      return {
        id: row.id,
        userId: row.user_id,
        provider: row.provider,
        accessToken,
        refreshToken,
        tokenType: row.token_type,
        expiresAt: row.expires_at,
        scopes: row.scopes ? JSON.parse(row.scopes) : null,
        metadata: row.metadata ? JSON.parse(row.metadata) : null,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      };
    } catch (error) {
      console.error('Error getting OAuth token:', error);
      throw new Error('Failed to retrieve OAuth token');
    }
  }

  /**
   * Get all active OAuth connections for a user
   * @param {string} userId - User ID
   * @returns {Array} List of active connections (without sensitive data)
   */
  static getAllForUser(userId) {
    try {
      const stmt = db.prepare(`
        SELECT provider, token_type, expires_at, scopes, created_at, updated_at
        FROM oauth_tokens
        WHERE user_id = ? AND is_active = 1
      `);

      const rows = stmt.all(userId);

      return rows.map(row => ({
        provider: row.provider,
        tokenType: row.token_type,
        expiresAt: row.expires_at,
        scopes: row.scopes ? JSON.parse(row.scopes) : null,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        isExpired: row.expires_at ? new Date(row.expires_at) < new Date() : false
      }));
    } catch (error) {
      console.error('Error getting user OAuth tokens:', error);
      throw new Error('Failed to retrieve OAuth tokens');
    }
  }

  /**
   * Revoke (deactivate) an OAuth token
   * @param {string} userId - User ID
   * @param {string} provider - OAuth provider
   * @returns {boolean} Success status
   */
  static revoke(userId, provider) {
    try {
      const stmt = db.prepare(`
        UPDATE oauth_tokens
        SET is_active = 0, updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ? AND provider = ?
      `);

      const result = stmt.run(userId, provider);
      return result.changes > 0;
    } catch (error) {
      console.error('Error revoking OAuth token:', error);
      throw new Error('Failed to revoke OAuth token');
    }
  }

  /**
   * Check if token is expired
   * @param {string} userId - User ID
   * @param {string} provider - OAuth provider
   * @returns {boolean} True if expired or not found
   */
  static isExpired(userId, provider) {
    try {
      const stmt = db.prepare(`
        SELECT expires_at FROM oauth_tokens
        WHERE user_id = ? AND provider = ? AND is_active = 1
      `);

      const row = stmt.get(userId, provider);

      if (!row || !row.expires_at) {
        return true;
      }

      return new Date(row.expires_at) < new Date();
    } catch (error) {
      console.error('Error checking token expiration:', error);
      return true;
    }
  }
}

module.exports = OAuthToken;
