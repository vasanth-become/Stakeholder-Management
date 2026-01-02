/**
 * Authentication Service
 *
 * Core auth business logic: signup, login, password management
 */

const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { Pool } = require('pg');
const authConfig = require('../config/auth');
const tokenService = require('./tokenService');
const auditService = require('./auditService');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

class AuthService {
  /**
   * Register new user
   */
  async signup(email, password, firstName, lastName) {
    // Validate email
    if (!this.isValidEmail(email)) {
      throw new Error('Invalid email format');
    }

    // Validate password strength
    const passwordValidation = this.validatePassword(password);
    if (!passwordValidation.valid) {
      throw new Error(passwordValidation.message);
    }

    // Check if user already exists
    const existingUser = await this.findUserByEmail(email);
    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Hash password
    const passwordHash = await this.hashPassword(password);

    // Create user
    const query = `
      INSERT INTO users (email, password_hash, first_name, last_name)
      VALUES ($1, $2, $3, $4)
      RETURNING id, email, first_name, last_name, role, created_at
    `;

    const result = await pool.query(query, [email, passwordHash, firstName, lastName]);
    const user = result.rows[0];

    // Log signup
    await auditService.log(user.id, 'user_signup', null, null, {
      email: user.email,
    });

    return user;
  }

  /**
   * Login user
   */
  async login(email, password, ipAddress, userAgent) {
    // Find user
    const user = await this.findUserByEmail(email);

    if (!user) {
      // Log failed attempt
      await this.logLoginAttempt(email, ipAddress, userAgent, false, 'user_not_found');
      throw new Error('Invalid email or password');
    }

    // Check if account is locked
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      const lockTimeRemaining = Math.ceil((new Date(user.locked_until) - new Date()) / 1000 / 60);
      throw new Error(`Account locked. Try again in ${lockTimeRemaining} minutes.`);
    }

    // Check if account is active
    if (!user.is_active) {
      await this.logLoginAttempt(email, ipAddress, userAgent, false, 'account_inactive');
      throw new Error('Account is inactive. Please contact support.');
    }

    // Verify password
    const isValidPassword = await this.verifyPassword(password, user.password_hash);

    if (!isValidPassword) {
      // Increment failed attempts
      await this.incrementFailedAttempts(user.id);

      // Log failed attempt
      await this.logLoginAttempt(email, ipAddress, userAgent, false, 'invalid_password');

      throw new Error('Invalid email or password');
    }

    // Reset failed attempts on successful login
    await this.resetFailedAttempts(user.id);

    // Update last login
    await pool.query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [user.id]);

    // Log successful login
    await this.logLoginAttempt(email, ipAddress, userAgent, true, null);
    await auditService.log(user.id, 'user_login', null, ipAddress, { user_agent: userAgent });

    return {
      id: user.id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      role: user.role,
    };
  }

  /**
   * Hash password with bcrypt
   */
  async hashPassword(password) {
    return bcrypt.hash(password, authConfig.password.bcryptRounds);
  }

  /**
   * Verify password
   */
  async verifyPassword(password, hash) {
    return bcrypt.compare(password, hash);
  }

  /**
   * Validate password strength
   */
  validatePassword(password) {
    const config = authConfig.password;

    if (password.length < config.minLength) {
      return {
        valid: false,
        message: `Password must be at least ${config.minLength} characters long`,
      };
    }

    if (config.requireUppercase && !/[A-Z]/.test(password)) {
      return {
        valid: false,
        message: 'Password must contain at least one uppercase letter',
      };
    }

    if (config.requireLowercase && !/[a-z]/.test(password)) {
      return {
        valid: false,
        message: 'Password must contain at least one lowercase letter',
      };
    }

    if (config.requireNumbers && !/\d/.test(password)) {
      return {
        valid: false,
        message: 'Password must contain at least one number',
      };
    }

    if (config.requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      return {
        valid: false,
        message: 'Password must contain at least one special character',
      };
    }

    // Check common passwords (basic check)
    const commonPasswords = ['password', '123456', 'qwerty', 'abc123', 'password123'];
    if (commonPasswords.includes(password.toLowerCase())) {
      return {
        valid: false,
        message: 'Password is too common. Please choose a stronger password',
      };
    }

    return { valid: true };
  }

  /**
   * Validate email format
   */
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Find user by email
   */
  async findUserByEmail(email) {
    const query = 'SELECT * FROM users WHERE email = $1';
    const result = await pool.query(query, [email]);
    return result.rows[0] || null;
  }

  /**
   * Find user by ID
   */
  async findUserById(userId) {
    const query = 'SELECT id, email, first_name, last_name, role, is_active FROM users WHERE id = $1';
    const result = await pool.query(query, [userId]);
    return result.rows[0] || null;
  }

  /**
   * Increment failed login attempts
   */
  async incrementFailedAttempts(userId) {
    const query = `
      UPDATE users
      SET failed_login_attempts = failed_login_attempts + 1,
          locked_until = CASE
            WHEN failed_login_attempts + 1 >= $2 THEN NOW() + INTERVAL '${authConfig.bruteForce.lockoutDuration / 1000} seconds'
            ELSE NULL
          END
      WHERE id = $1
    `;

    await pool.query(query, [userId, authConfig.bruteForce.maxAttemptsPerEmail]);
  }

  /**
   * Reset failed attempts
   */
  async resetFailedAttempts(userId) {
    const query = 'UPDATE users SET failed_login_attempts = 0, locked_until = NULL WHERE id = $1';
    await pool.query(query, [userId]);
  }

  /**
   * Log login attempt
   */
  async logLoginAttempt(email, ipAddress, userAgent, success, failureReason = null) {
    const query = `
      INSERT INTO login_attempts (email, ip_address, user_agent, success, failure_reason)
      VALUES ($1, $2, $3, $4, $5)
    `;

    await pool.query(query, [email, ipAddress, userAgent, success, failureReason]);
  }

  /**
   * Request password reset
   */
  async requestPasswordReset(email) {
    const user = await this.findUserByEmail(email);

    if (!user) {
      // Don't reveal if email exists
      return { success: true };
    }

    // Generate secure token
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = tokenService.hashToken(token);
    const expiresAt = new Date(Date.now() + authConfig.security.passwordResetExpiry);

    // Store token
    const query = `
      INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
      VALUES ($1, $2, $3)
      RETURNING id
    `;

    await pool.query(query, [user.id, tokenHash, expiresAt]);

    // Log event
    await auditService.log(user.id, 'password_reset_requested', null, null);

    // Return token (to be sent via email)
    return { success: true, token, email: user.email };
  }

  /**
   * Verify password reset token
   */
  async verifyPasswordResetToken(token) {
    const tokenHash = tokenService.hashToken(token);

    const query = `
      SELECT prt.*, u.email
      FROM password_reset_tokens prt
      JOIN users u ON prt.user_id = u.id
      WHERE prt.token_hash = $1
        AND prt.used = FALSE
        AND prt.expires_at > NOW()
    `;

    const result = await pool.query(query, [tokenHash]);

    if (result.rows.length === 0) {
      throw new Error('Invalid or expired password reset token');
    }

    return result.rows[0];
  }

  /**
   * Reset password with token
   */
  async resetPassword(token, newPassword) {
    // Validate new password
    const passwordValidation = this.validatePassword(newPassword);
    if (!passwordValidation.valid) {
      throw new Error(passwordValidation.message);
    }

    // Verify token
    const resetToken = await this.verifyPasswordResetToken(token);

    // Hash new password
    const passwordHash = await this.hashPassword(newPassword);

    // Update password
    await pool.query(
      'UPDATE users SET password_hash = $1, password_changed_at = NOW(), failed_login_attempts = 0, locked_until = NULL WHERE id = $2',
      [passwordHash, resetToken.user_id]
    );

    // Mark token as used
    await pool.query(
      'UPDATE password_reset_tokens SET used = TRUE, used_at = NOW() WHERE id = $1',
      [resetToken.id]
    );

    // Revoke all refresh tokens (logout everywhere for security)
    await tokenService.revokeAllUserTokens(resetToken.user_id, 'password_reset');

    // Log event
    await auditService.log(resetToken.user_id, 'password_reset_completed', null, null);

    return { success: true };
  }

  /**
   * Change password (authenticated user)
   */
  async changePassword(userId, currentPassword, newPassword) {
    // Get user
    const query = 'SELECT password_hash FROM users WHERE id = $1';
    const result = await pool.query(query, [userId]);

    if (result.rows.length === 0) {
      throw new Error('User not found');
    }

    const user = result.rows[0];

    // Verify current password
    const isValid = await this.verifyPassword(currentPassword, user.password_hash);
    if (!isValid) {
      throw new Error('Current password is incorrect');
    }

    // Validate new password
    const passwordValidation = this.validatePassword(newPassword);
    if (!passwordValidation.valid) {
      throw new Error(passwordValidation.message);
    }

    // Ensure new password is different
    const isSame = await this.verifyPassword(newPassword, user.password_hash);
    if (isSame) {
      throw new Error('New password must be different from current password');
    }

    // Hash and update
    const passwordHash = await this.hashPassword(newPassword);
    await pool.query(
      'UPDATE users SET password_hash = $1, password_changed_at = NOW() WHERE id = $2',
      [passwordHash, userId]
    );

    // Log event
    await auditService.log(userId, 'password_changed', null, null);

    return { success: true };
  }

  /**
   * Get failed login attempts for IP
   */
  async getFailedAttemptsForIP(ipAddress, windowMinutes = 15) {
    const query = `
      SELECT COUNT(*) as count
      FROM login_attempts
      WHERE ip_address = $1
        AND success = FALSE
        AND attempted_at > NOW() - INTERVAL '${windowMinutes} minutes'
    `;

    const result = await pool.query(query, [ipAddress]);
    return parseInt(result.rows[0].count);
  }

  /**
   * Get failed login attempts for email
   */
  async getFailedAttemptsForEmail(email, windowHours = 1) {
    const query = `
      SELECT COUNT(*) as count
      FROM login_attempts
      WHERE email = $1
        AND success = FALSE
        AND attempted_at > NOW() - INTERVAL '${windowHours} hours'
    `;

    const result = await pool.query(query, [email]);
    return parseInt(result.rows[0].count);
  }
}

module.exports = new AuthService();
