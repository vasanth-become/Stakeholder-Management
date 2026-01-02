/**
 * Encryption Service
 *
 * Handles encryption/decryption of sensitive OAuth tokens
 * Uses AES-256-GCM for authenticated encryption
 */

const crypto = require('crypto');
const db = require('../config/database');

// IMPORTANT: Store this in environment variable, never in code
const ENCRYPTION_KEY = process.env.OAUTH_ENCRYPTION_KEY || (() => {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('OAUTH_ENCRYPTION_KEY must be set in production');
  }
  // Development fallback (32 bytes)
  console.warn('[Encryption] Using default key - DO NOT USE IN PRODUCTION');
  return 'dev-key-please-change-in-prod-32b';
})();

// Algorithm configuration
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // 128 bits
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32; // 256 bits

class EncryptionService {
  constructor() {
    this.encryptionKey = this.deriveKey(ENCRYPTION_KEY);
  }

  /**
   * Derive encryption key from master key using PBKDF2
   */
  deriveKey(masterKey) {
    const salt = Buffer.from(process.env.OAUTH_KEY_SALT || 'default-salt-change-me', 'utf8');

    return crypto.pbkdf2Sync(
      masterKey,
      salt,
      100000, // iterations
      KEY_LENGTH,
      'sha256'
    );
  }

  /**
   * Encrypt sensitive data (OAuth tokens)
   *
   * @param {string} plaintext - Data to encrypt
   * @returns {Buffer} Encrypted data with IV and auth tag
   */
  encrypt(plaintext) {
    if (!plaintext) {
      throw new Error('Cannot encrypt empty value');
    }

    try {
      // Generate random IV for each encryption
      const iv = crypto.randomBytes(IV_LENGTH);

      // Create cipher
      const cipher = crypto.createCipheriv(ALGORITHM, this.encryptionKey, iv);

      // Encrypt data
      let encrypted = cipher.update(plaintext, 'utf8');
      encrypted = Buffer.concat([encrypted, cipher.final()]);

      // Get authentication tag
      const tag = cipher.getAuthTag();

      // Combine: IV + encrypted data + tag
      const result = Buffer.concat([iv, encrypted, tag]);

      return result;
    } catch (error) {
      console.error('[Encryption] Encryption failed:', error);
      throw new Error('Failed to encrypt data');
    }
  }

  /**
   * Decrypt encrypted data
   *
   * @param {Buffer} encryptedData - Encrypted data with IV and tag
   * @returns {string} Decrypted plaintext
   */
  decrypt(encryptedData) {
    if (!encryptedData || encryptedData.length === 0) {
      throw new Error('Cannot decrypt empty value');
    }

    try {
      // Extract IV, encrypted data, and tag
      const iv = encryptedData.slice(0, IV_LENGTH);
      const tag = encryptedData.slice(-TAG_LENGTH);
      const encrypted = encryptedData.slice(IV_LENGTH, -TAG_LENGTH);

      // Create decipher
      const decipher = crypto.createDecipheriv(ALGORITHM, this.encryptionKey, iv);
      decipher.setAuthTag(tag);

      // Decrypt
      let decrypted = decipher.update(encrypted);
      decrypted = Buffer.concat([decrypted, decipher.final()]);

      return decrypted.toString('utf8');
    } catch (error) {
      console.error('[Encryption] Decryption failed:', error.message);
      throw new Error('Failed to decrypt data - data may be corrupted or key may be wrong');
    }
  }

  /**
   * Hash sensitive data (for comparison without decryption)
   *
   * @param {string} data - Data to hash
   * @returns {string} Hash hex string
   */
  hash(data) {
    return crypto
      .createHash('sha256')
      .update(data)
      .digest('hex');
  }

  /**
   * Generate secure random token
   *
   * @param {number} bytes - Number of random bytes (default: 32)
   * @returns {string} Random token as hex string
   */
  generateRandomToken(bytes = 32) {
    return crypto.randomBytes(bytes).toString('hex');
  }

  /**
   * Verify encryption key is correct by attempting decryption
   *
   * @returns {boolean}
   */
  async verifyEncryptionKey() {
    try {
      const testData = 'test-encryption-key-verification';
      const encrypted = this.encrypt(testData);
      const decrypted = this.decrypt(encrypted);

      return decrypted === testData;
    } catch (error) {
      console.error('[Encryption] Key verification failed:', error);
      return false;
    }
  }

  /**
   * Rotate encryption key for existing tokens
   * This is a sensitive operation that should be run carefully
   *
   * @param {string} newKey - New encryption key
   */
  async rotateEncryptionKey(newKey) {
    const client = await db.pool.connect();

    try {
      await client.query('BEGIN');

      // Get all encrypted connections
      const result = await client.query(`
        SELECT id, access_token_encrypted, refresh_token_encrypted
        FROM oauth_connections
        WHERE status = 'active'
      `);

      console.log(`[Encryption] Rotating keys for ${result.rows.length} connections`);

      // Create new encryption service with new key
      const newService = new EncryptionService();
      newService.encryptionKey = this.deriveKey(newKey);

      // Re-encrypt all tokens
      for (const row of result.rows) {
        try {
          // Decrypt with old key
          const accessToken = this.decrypt(row.access_token_encrypted);
          const refreshToken = row.refresh_token_encrypted
            ? this.decrypt(row.refresh_token_encrypted)
            : null;

          // Encrypt with new key
          const newAccessToken = newService.encrypt(accessToken);
          const newRefreshToken = refreshToken
            ? newService.encrypt(refreshToken)
            : null;

          // Update database
          await client.query(
            `UPDATE oauth_connections
             SET access_token_encrypted = $1,
                 refresh_token_encrypted = $2,
                 updated_at = NOW()
             WHERE id = $3`,
            [newAccessToken, newRefreshToken, row.id]
          );

          console.log(`[Encryption] Rotated keys for connection ${row.id}`);
        } catch (error) {
          console.error(`[Encryption] Failed to rotate connection ${row.id}:`, error);
          throw error;
        }
      }

      await client.query('COMMIT');
      console.log('[Encryption] Key rotation completed successfully');

      return true;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('[Encryption] Key rotation failed:', error);
      throw new Error('Failed to rotate encryption keys');
    } finally {
      client.release();
    }
  }

  /**
   * Mask sensitive data for logging
   *
   * @param {string} data - Sensitive data
   * @param {number} visibleChars - Number of characters to show
   * @returns {string} Masked string
   */
  maskSensitive(data, visibleChars = 4) {
    if (!data || data.length <= visibleChars) {
      return '***';
    }

    const visible = data.slice(0, visibleChars);
    const masked = '*'.repeat(Math.min(data.length - visibleChars, 20));

    return `${visible}${masked}`;
  }
}

// Singleton instance
const encryptionService = new EncryptionService();

// Verify encryption key on startup
encryptionService.verifyEncryptionKey()
  .then(valid => {
    if (valid) {
      console.log('[Encryption] Encryption service initialized successfully');
    } else {
      console.error('[Encryption] WARNING: Encryption key verification failed!');
    }
  })
  .catch(error => {
    console.error('[Encryption] Failed to initialize encryption service:', error);
  });

module.exports = encryptionService;
