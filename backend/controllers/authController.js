/**
 * Authentication Controller
 *
 * HTTP request handlers for auth endpoints
 */

const authService = require('../services/authService');
const tokenService = require('../services/tokenService');
const auditService = require('../services/auditService');
const authConfig = require('../config/auth');

class AuthController {
  /**
   * POST /auth/signup
   * Register new user
   */
  async signup(req, res) {
    try {
      const { email, password, firstName, lastName } = req.body;

      // Validate input
      if (!email || !password) {
        return res.status(400).json({
          error: 'Email and password are required',
        });
      }

      // Create user
      const user = await authService.signup(email, password, firstName, lastName);

      res.status(201).json({
        message: 'User created successfully',
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
        },
      });
    } catch (error) {
      console.error('[Signup] Error:', error);

      if (error.message.includes('already exists')) {
        return res.status(409).json({ error: error.message });
      }

      if (error.message.includes('Password') || error.message.includes('Invalid email')) {
        return res.status(400).json({ error: error.message });
      }

      res.status(500).json({ error: 'Failed to create user' });
    }
  }

  /**
   * POST /auth/login
   * Authenticate user and return tokens
   */
  async login(req, res) {
    try {
      const { email, password, rememberMe } = req.body;

      // Validate input
      if (!email || !password) {
        return res.status(400).json({
          error: 'Email and password are required',
        });
      }

      // Get request metadata
      const ipAddress = req.clientIP;
      const userAgent = req.userAgent;

      // Authenticate user
      const user = await authService.login(email, password, ipAddress, userAgent);

      // Generate tokens
      const accessToken = tokenService.generateAccessToken(user);
      const refreshToken = tokenService.generateRefreshToken();

      // Store refresh token
      await tokenService.storeRefreshToken(
        user.id,
        refreshToken,
        this.getDeviceInfo(userAgent),
        ipAddress,
        userAgent
      );

      // Set cookies
      this.setAuthCookies(res, accessToken, refreshToken, rememberMe);

      res.json({
        message: 'Login successful',
        user,
      });
    } catch (error) {
      console.error('[Login] Error:', error);

      if (error.message.includes('Invalid email or password')) {
        return res.status(401).json({ error: error.message });
      }

      if (error.message.includes('locked')) {
        return res.status(423).json({ error: error.message });
      }

      if (error.message.includes('inactive')) {
        return res.status(403).json({ error: error.message });
      }

      res.status(500).json({ error: 'Login failed' });
    }
  }

  /**
   * POST /auth/logout
   * Logout user and revoke refresh token
   */
  async logout(req, res) {
    try {
      const refreshToken = req.cookies[authConfig.cookies.refreshTokenName];

      if (refreshToken) {
        // Revoke refresh token
        await tokenService.revokeRefreshToken(refreshToken, 'logout');

        // Log logout event
        if (req.user) {
          await auditService.log(
            req.user.userId,
            'user_logout',
            null,
            req.clientIP,
            { user_agent: req.userAgent }
          );
        }
      }

      // Clear cookies
      this.clearAuthCookies(res);

      res.json({ message: 'Logout successful' });
    } catch (error) {
      console.error('[Logout] Error:', error);
      // Always clear cookies even on error
      this.clearAuthCookies(res);
      res.json({ message: 'Logout successful' });
    }
  }

  /**
   * POST /auth/logout-all
   * Logout from all devices
   */
  async logoutAll(req, res) {
    try {
      const userId = req.user.userId;

      // Revoke all refresh tokens
      const revokedCount = await tokenService.revokeAllUserTokens(userId, 'logout_all');

      // Log security event
      await auditService.log(
        userId,
        'logout_all_devices',
        null,
        req.clientIP,
        { revoked_sessions: revokedCount }
      );

      // Clear cookies
      this.clearAuthCookies(res);

      res.json({
        message: 'Logged out from all devices',
        revokedSessions: revokedCount,
      });
    } catch (error) {
      console.error('[Logout All] Error:', error);
      res.status(500).json({ error: 'Failed to logout from all devices' });
    }
  }

  /**
   * POST /auth/refresh
   * Refresh access token using refresh token
   */
  async refresh(req, res) {
    try {
      const tokenData = req.refreshTokenData;
      const oldRefreshToken = req.refreshToken;

      // Generate new access token
      const accessToken = tokenService.generateAccessToken({
        id: tokenData.user_id,
        email: tokenData.email,
        role: tokenData.role,
      });

      // Rotate refresh token
      const newRefreshToken = await tokenService.rotateRefreshToken(
        oldRefreshToken,
        tokenData.user_id,
        this.getDeviceInfo(req.userAgent),
        req.clientIP,
        req.userAgent
      );

      // Set new cookies
      this.setAuthCookies(res, accessToken, newRefreshToken);

      res.json({ message: 'Token refreshed successfully' });
    } catch (error) {
      console.error('[Refresh] Error:', error);
      this.clearAuthCookies(res);
      res.status(401).json({ error: 'Failed to refresh token' });
    }
  }

  /**
   * GET /auth/me
   * Get current user info
   */
  async me(req, res) {
    try {
      const user = await authService.findUserById(req.user.userId);

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json({ user });
    } catch (error) {
      console.error('[Me] Error:', error);
      res.status(500).json({ error: 'Failed to get user info' });
    }
  }

  /**
   * POST /auth/password/forgot
   * Request password reset
   */
  async forgotPassword(req, res) {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ error: 'Email is required' });
      }

      const result = await authService.requestPasswordReset(email);

      // In production, send email here
      // await emailService.sendPasswordResetEmail(result.email, result.token);

      // Always return success (don't reveal if email exists)
      res.json({
        message: 'If an account exists with this email, a password reset link has been sent.',
      });

      // Log the token in development
      if (process.env.NODE_ENV === 'development' && result.token) {
        console.log('[Password Reset] Token:', result.token);
        console.log('[Password Reset] Link: http://localhost:3000/reset-password?token=' + result.token);
      }
    } catch (error) {
      console.error('[Forgot Password] Error:', error);
      res.status(500).json({ error: 'Failed to process password reset request' });
    }
  }

  /**
   * POST /auth/password/reset
   * Reset password with token
   */
  async resetPassword(req, res) {
    try {
      const { token, password } = req.body;

      if (!token || !password) {
        return res.status(400).json({
          error: 'Token and new password are required',
        });
      }

      await authService.resetPassword(token, password);

      res.json({
        message: 'Password reset successful. Please login with your new password.',
      });
    } catch (error) {
      console.error('[Reset Password] Error:', error);

      if (error.message.includes('Invalid or expired')) {
        return res.status(400).json({ error: error.message });
      }

      if (error.message.includes('Password')) {
        return res.status(400).json({ error: error.message });
      }

      res.status(500).json({ error: 'Failed to reset password' });
    }
  }

  /**
   * POST /auth/password/change
   * Change password (authenticated)
   */
  async changePassword(req, res) {
    try {
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({
          error: 'Current password and new password are required',
        });
      }

      await authService.changePassword(
        req.user.userId,
        currentPassword,
        newPassword
      );

      res.json({ message: 'Password changed successfully' });
    } catch (error) {
      console.error('[Change Password] Error:', error);

      if (error.message.includes('incorrect') || error.message.includes('different')) {
        return res.status(400).json({ error: error.message });
      }

      if (error.message.includes('Password')) {
        return res.status(400).json({ error: error.message });
      }

      res.status(500).json({ error: 'Failed to change password' });
    }
  }

  /**
   * GET /auth/sessions
   * Get active sessions
   */
  async getSessions(req, res) {
    try {
      const sessions = await tokenService.getActiveSessions(req.user.userId);

      res.json({ sessions });
    } catch (error) {
      console.error('[Get Sessions] Error:', error);
      res.status(500).json({ error: 'Failed to get sessions' });
    }
  }

  /**
   * DELETE /auth/sessions/:sessionId
   * Revoke specific session
   */
  async revokeSession(req, res) {
    try {
      const { sessionId } = req.params;

      const success = await tokenService.revokeSession(req.user.userId, sessionId);

      if (!success) {
        return res.status(404).json({ error: 'Session not found' });
      }

      res.json({ message: 'Session revoked successfully' });
    } catch (error) {
      console.error('[Revoke Session] Error:', error);
      res.status(500).json({ error: 'Failed to revoke session' });
    }
  }

  /**
   * Helper: Set auth cookies
   */
  setAuthCookies(res, accessToken, refreshToken, rememberMe = false) {
    const cookieOptions = { ...authConfig.cookies.options };

    // Access token cookie (short-lived)
    res.cookie(authConfig.cookies.accessTokenName, accessToken, {
      ...cookieOptions,
      maxAge: this.parseExpiry(authConfig.jwt.accessExpiry),
    });

    // Refresh token cookie (long-lived)
    const refreshMaxAge = rememberMe
      ? 30 * 24 * 60 * 60 * 1000 // 30 days
      : this.parseExpiry(authConfig.jwt.refreshExpiry);

    res.cookie(authConfig.cookies.refreshTokenName, refreshToken, {
      ...cookieOptions,
      maxAge: refreshMaxAge,
    });
  }

  /**
   * Helper: Clear auth cookies
   */
  clearAuthCookies(res) {
    const cookieOptions = { ...authConfig.cookies.options };

    res.clearCookie(authConfig.cookies.accessTokenName, cookieOptions);
    res.clearCookie(authConfig.cookies.refreshTokenName, cookieOptions);
  }

  /**
   * Helper: Parse device info from user agent
   */
  getDeviceInfo(userAgent) {
    if (!userAgent) return 'Unknown Device';

    if (userAgent.includes('Mobile')) return 'Mobile';
    if (userAgent.includes('Tablet')) return 'Tablet';
    return 'Desktop';
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

module.exports = new AuthController();
