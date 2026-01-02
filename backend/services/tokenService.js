/**
 * Token Service
 *
 * Handles JWT generation, verification, and refresh token management
 */

const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { Pool } = require('pg');
const authConfig = require('../config/auth');

// Initialize DB connection (adjust based on your setup)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

class TokenService {
  /**
   * Generate Access Token (short-lived)
   */
  generateAccessToken(user) {
    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      type: 'access',
    };

    return jwt.sign(payload, authConfig.jwt.accessSecret, {
      expiresIn: authConfig.jwt.accessExpiry,
      issuer: authConfig.jwt.issuer,
      audience: authConfig.jwt.audience,
    });
  }

  /**
   * Generate Refresh Token (long-lived)
   */
  generateRefreshToken() {
    // Generate a cryptographically secure random token
    return crypto.randomBytes(40).toString('hex');
  }

  /**
   * Hash token for database storage
   */
  hashToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Store refresh token in database
   */
  async storeRefreshToken(userId, token, deviceInfo, ipAddress, userAgent) {
    const tokenHash = this.hashToken(token);
    const expiresAt = new Date(Date.now() + this.parseExpiry(authConfig.jwt.refreshExpiry));

    const query = `
      INSERT INTO refresh_tokens (user_id, token_hash, device_info, ip_address, user_agent, expires_at)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id
    `;

    const result = await pool.query(query, [
      userId,
      tokenHash,
      deviceInfo,
      ipAddress,
      userAgent,
      expiresAt,
    ]);

    return result.rows[0];
  }

  /**
   * Verify refresh token
   */
  async verifyRefreshToken(token) {
    const tokenHash = this.hashToken(token);

    const query = `
      SELECT rt.*, u.id as user_id, u.email, u.role, u.is_active
      FROM refresh_tokens rt
      JOIN users u ON rt.user_id = u.id
      WHERE rt.token_hash = $1
        AND rt.revoked = FALSE
        AND rt.expires_at > NOW()
        AND u.is_active = TRUE
    `;

    const result = await pool.query(query, [tokenHash]);

    if (result.rows.length === 0) {
      throw new Error('Invalid or expired refresh token');
    }

    // Update last used timestamp
    await pool.query(
      'UPDATE refresh_tokens SET last_used_at = NOW() WHERE id = $1',
      [result.rows[0].id]
    );

    return result.rows[0];
  }

  /**
   * Revoke refresh token
   */
  async revokeRefreshToken(token, reason = 'logout') {
    const tokenHash = this.hashToken(token);

    const query = `
      UPDATE refresh_tokens
      SET revoked = TRUE, revoked_at = NOW(), revoked_reason = $2
      WHERE token_hash = $1
      RETURNING id
    `;

    const result = await pool.query(query, [tokenHash, reason]);
    return result.rowCount > 0;
  }

  /**
   * Revoke all refresh tokens for a user (logout everywhere)
   */
  async revokeAllUserTokens(userId, reason = 'logout_all') {
    const query = `
      UPDATE refresh_tokens
      SET revoked = TRUE, revoked_at = NOW(), revoked_reason = $2
      WHERE user_id = $1 AND revoked = FALSE
      RETURNING id
    `;

    const result = await pool.query(query, [userId, reason]);
    return result.rowCount;
  }

  /**
   * Rotate refresh token (revoke old, create new)
   */
  async rotateRefreshToken(oldToken, userId, deviceInfo, ipAddress, userAgent) {
    // Revoke old token
    await this.revokeRefreshToken(oldToken, 'rotation');

    // Generate and store new token
    const newToken = this.generateRefreshToken();
    await this.storeRefreshToken(userId, newToken, deviceInfo, ipAddress, userAgent);

    return newToken;
  }

  /**
   * Verify Access Token
   */
  verifyAccessToken(token) {
    try {
      const decoded = jwt.verify(token, authConfig.jwt.accessSecret, {
        issuer: authConfig.jwt.issuer,
        audience: authConfig.jwt.audience,
      });

      if (decoded.type !== 'access') {
        throw new Error('Invalid token type');
      }

      return decoded;
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('Access token expired');
      }
      if (error.name === 'JsonWebTokenError') {
        throw new Error('Invalid access token');
      }
      throw error;
    }
  }

  /**
   * Clean up expired tokens (run periodically)
   */
  async cleanupExpiredTokens() {
    const query = `
      DELETE FROM refresh_tokens
      WHERE expires_at < NOW() OR (revoked = TRUE AND revoked_at < NOW() - INTERVAL '7 days')
    `;

    const result = await pool.query(query);
    return result.rowCount;
  }

  /**
   * Get active sessions for user
   */
  async getActiveSessions(userId) {
    const query = `
      SELECT id, device_info, ip_address, created_at, last_used_at
      FROM refresh_tokens
      WHERE user_id = $1 AND revoked = FALSE AND expires_at > NOW()
      ORDER BY last_used_at DESC
    `;

    const result = await pool.query(query, [userId]);
    return result.rows;
  }

  /**
   * Revoke specific session
   */
  async revokeSession(userId, sessionId) {
    const query = `
      UPDATE refresh_tokens
      SET revoked = TRUE, revoked_at = NOW(), revoked_reason = 'manual_revoke'
      WHERE id = $1 AND user_id = $2
      RETURNING id
    `;

    const result = await pool.query(query, [sessionId, userId]);
    return result.rowCount > 0;
  }

  /**
   * Helper: Parse expiry string to milliseconds
   */
  parseExpiry(expiryString) {
    const unit = expiryString.slice(-1);
    const value = parseInt(expiryString.slice(0, -1));

    const multipliers = {
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
    };

    return value * (multipliers[unit] || multipliers.m);
  }
}

module.exports = new TokenService();
