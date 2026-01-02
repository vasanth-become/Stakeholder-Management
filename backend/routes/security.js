/**
 * Security Routes
 *
 * Handles security-related endpoints for user account security
 */

const express = require('express');
const router = express.Router();
const { verifyAuth } = require('../middleware/auth');
const securityService = require('../services/securityService');
const authService = require('../services/authService');
const tokenService = require('../services/tokenService');
const auditService = require('../services/auditService');

// All routes require authentication
router.use(verifyAuth);

/**
 * GET /security/login-history
 * Get user's login history
 */
router.get('/login-history', async (req, res) => {
  try {
    const { userId } = req.user;
    const limit = parseInt(req.query.limit) || 20;

    const loginHistory = await securityService.getLoginHistory(userId, limit);

    res.json({
      loginHistory,
      count: loginHistory.length,
    });
  } catch (error) {
    console.error('[Security] Get login history failed:', error);
    res.status(500).json({ error: 'Failed to retrieve login history' });
  }
});

/**
 * GET /security/active-sessions
 * Get all active sessions for the user
 */
router.get('/active-sessions', async (req, res) => {
  try {
    const { userId } = req.user;

    const sessions = await tokenService.getActiveSessions(userId);

    // Add current session indicator
    const currentRefreshToken = req.cookies.refreshToken;
    const sessionsWithCurrent = sessions.map(session => ({
      ...session,
      is_current: session.token_hash === currentRefreshToken,
    }));

    res.json({
      sessions: sessionsWithCurrent,
      count: sessionsWithCurrent.length,
    });
  } catch (error) {
    console.error('[Security] Get active sessions failed:', error);
    res.status(500).json({ error: 'Failed to retrieve active sessions' });
  }
});

/**
 * DELETE /security/sessions/:sessionId
 * Revoke a specific session
 */
router.delete('/sessions/:sessionId', async (req, res) => {
  try {
    const { userId } = req.user;
    const { sessionId } = req.params;

    const success = await tokenService.revokeSession(userId, sessionId);

    if (!success) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Audit log
    await auditService.log(
      userId,
      'session_revoked',
      sessionId,
      req.clientIP,
      { manual_revoke: true }
    );

    res.json({
      message: 'Session revoked successfully',
      sessionId,
    });
  } catch (error) {
    console.error('[Security] Revoke session failed:', error);
    res.status(500).json({ error: 'Failed to revoke session' });
  }
});

/**
 * POST /security/revoke-all-sessions
 * Revoke all sessions except the current one
 */
router.post('/revoke-all-sessions', async (req, res) => {
  try {
    const { userId } = req.user;
    const { includeCurrentSession } = req.body;

    // Get current session
    const currentRefreshToken = req.cookies.refreshToken;

    // Revoke all sessions
    const revokedCount = await tokenService.revokeAllUserTokens(
      userId,
      'user_revoke_all',
      includeCurrentSession ? null : currentRefreshToken
    );

    // Audit log
    await auditService.log(
      userId,
      'all_sessions_revoked',
      null,
      req.clientIP,
      {
        revoked_count: revokedCount,
        include_current: includeCurrentSession,
      }
    );

    res.json({
      message: 'All sessions revoked successfully',
      revokedCount,
    });
  } catch (error) {
    console.error('[Security] Revoke all sessions failed:', error);
    res.status(500).json({ error: 'Failed to revoke sessions' });
  }
});

/**
 * POST /security/change-password
 * Change user's password
 */
router.post('/change-password', async (req, res) => {
  try {
    const { userId } = req.user;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        error: 'Current password and new password are required',
      });
    }

    await authService.changePassword(userId, currentPassword, newPassword);

    // Audit log
    await auditService.log(
      userId,
      'password_changed',
      null,
      req.clientIP,
      { changed_at: new Date().toISOString() }
    );

    res.json({
      message: 'Password changed successfully',
    });
  } catch (error) {
    console.error('[Security] Change password failed:', error);

    if (error.message.includes('incorrect') || error.message.includes('different')) {
      return res.status(400).json({ error: error.message });
    }

    res.status(500).json({ error: 'Failed to change password' });
  }
});

/**
 * GET /security/suspicious-activity
 * Check for suspicious activity on the account
 */
router.get('/suspicious-activity', async (req, res) => {
  try {
    const { userId } = req.user;

    const suspiciousActivity = await securityService.detectSuspiciousActivity(userId);

    res.json({
      hasSuspiciousActivity: suspiciousActivity.length > 0,
      activities: suspiciousActivity,
      count: suspiciousActivity.length,
    });
  } catch (error) {
    console.error('[Security] Check suspicious activity failed:', error);
    res.status(500).json({ error: 'Failed to check suspicious activity' });
  }
});

/**
 * GET /security/settings
 * Get user's security settings
 */
router.get('/settings', async (req, res) => {
  try {
    const { userId } = req.user;

    const settings = await securityService.getSecuritySettings(userId);

    res.json(settings);
  } catch (error) {
    console.error('[Security] Get security settings failed:', error);
    res.status(500).json({ error: 'Failed to retrieve security settings' });
  }
});

/**
 * PUT /security/settings
 * Update security settings
 */
router.put('/settings', async (req, res) => {
  try {
    const { userId } = req.user;
    const { emailAlerts, loginAlerts, unusualActivityAlerts } = req.body;

    const updated = await securityService.updateSecuritySettings(userId, {
      emailAlerts,
      loginAlerts,
      unusualActivityAlerts,
    });

    // Audit log
    await auditService.log(
      userId,
      'security_settings_updated',
      null,
      req.clientIP,
      { settings: { emailAlerts, loginAlerts, unusualActivityAlerts } }
    );

    res.json({
      message: 'Security settings updated successfully',
      settings: updated,
    });
  } catch (error) {
    console.error('[Security] Update security settings failed:', error);
    res.status(500).json({ error: 'Failed to update security settings' });
  }
});

/**
 * POST /security/2fa/setup
 * Initialize 2FA setup (placeholder)
 */
router.post('/2fa/setup', async (req, res) => {
  try {
    const { userId } = req.user;

    // Placeholder for 2FA setup
    // In a real implementation, this would:
    // 1. Generate TOTP secret
    // 2. Create QR code
    // 3. Return setup instructions

    res.json({
      message: '2FA setup initiated (placeholder)',
      qrCode: 'data:image/png;base64,placeholder',
      secret: 'PLACEHOLDER_SECRET',
      backupCodes: [
        'XXXX-XXXX-XXXX',
        'YYYY-YYYY-YYYY',
        'ZZZZ-ZZZZ-ZZZZ',
      ],
    });
  } catch (error) {
    console.error('[Security] 2FA setup failed:', error);
    res.status(500).json({ error: 'Failed to setup 2FA' });
  }
});

/**
 * POST /security/2fa/verify
 * Verify and enable 2FA (placeholder)
 */
router.post('/2fa/verify', async (req, res) => {
  try {
    const { userId } = req.user;
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'Verification code required' });
    }

    // Placeholder verification
    res.json({
      message: '2FA enabled successfully (placeholder)',
      enabled: true,
    });
  } catch (error) {
    console.error('[Security] 2FA verify failed:', error);
    res.status(500).json({ error: 'Failed to verify 2FA code' });
  }
});

/**
 * DELETE /security/2fa
 * Disable 2FA (placeholder)
 */
router.delete('/2fa', async (req, res) => {
  try {
    const { userId } = req.user;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ error: 'Password required to disable 2FA' });
    }

    // Placeholder disable
    res.json({
      message: '2FA disabled successfully (placeholder)',
      enabled: false,
    });
  } catch (error) {
    console.error('[Security] Disable 2FA failed:', error);
    res.status(500).json({ error: 'Failed to disable 2FA' });
  }
});

module.exports = router;
