/**
 * Security Service
 *
 * Handles security-related operations for user accounts
 */

const db = require('../config/database');

class SecurityService {
  /**
   * Get login history for a user
   *
   * @param {string} userId - User ID
   * @param {number} limit - Number of records to return
   * @returns {Array} Login history
   */
  async getLoginHistory(userId, limit = 20) {
    try {
      const result = await db.query(
        `SELECT
          id,
          event_type,
          ip_address,
          user_agent,
          success,
          metadata,
          created_at
         FROM audit_logs
         WHERE user_id = $1
         AND event_type IN ('user_login', 'login_failed', 'user_logout')
         ORDER BY created_at DESC
         LIMIT $2`,
        [userId, limit]
      );

      return result.rows.map(row => ({
        id: row.id,
        eventType: row.event_type,
        ipAddress: row.ip_address,
        userAgent: row.user_agent,
        success: row.success,
        location: this.getLocationFromIP(row.ip_address),
        device: this.parseUserAgent(row.user_agent),
        timestamp: row.created_at,
      }));
    } catch (error) {
      console.error('[Security] Failed to get login history:', error);
      throw new Error('Failed to retrieve login history');
    }
  }

  /**
   * Detect suspicious activity
   *
   * @param {string} userId - User ID
   * @returns {Array} Suspicious activities
   */
  async detectSuspiciousActivity(userId) {
    try {
      const activities = [];

      // Check for failed login attempts
      const failedLogins = await db.query(
        `SELECT COUNT(*) as count
         FROM audit_logs
         WHERE user_id = $1
         AND event_type = 'login_failed'
         AND created_at > NOW() - INTERVAL '24 hours'`,
        [userId]
      );

      if (failedLogins.rows[0].count > 3) {
        activities.push({
          type: 'failed_logins',
          severity: 'medium',
          message: `${failedLogins.rows[0].count} failed login attempts in the last 24 hours`,
          timestamp: new Date(),
        });
      }

      // Check for logins from new locations
      const recentLogins = await db.query(
        `SELECT DISTINCT ip_address, created_at
         FROM audit_logs
         WHERE user_id = $1
         AND event_type = 'user_login'
         AND success = true
         AND created_at > NOW() - INTERVAL '7 days'
         ORDER BY created_at DESC`,
        [userId]
      );

      const knownIPs = await db.query(
        `SELECT DISTINCT ip_address
         FROM audit_logs
         WHERE user_id = $1
         AND event_type = 'user_login'
         AND success = true
         AND created_at < NOW() - INTERVAL '30 days'`,
        [userId]
      );

      const knownIPSet = new Set(knownIPs.rows.map(row => row.ip_address));
      const newIPs = recentLogins.rows.filter(row => !knownIPSet.has(row.ip_address));

      if (newIPs.length > 0) {
        activities.push({
          type: 'new_location',
          severity: 'low',
          message: `Login from ${newIPs.length} new location(s)`,
          timestamp: newIPs[0].created_at,
          details: newIPs.map(ip => ({
            ipAddress: ip.ip_address,
            location: this.getLocationFromIP(ip.ip_address),
            timestamp: ip.created_at,
          })),
        });
      }

      // Check for unusual activity times
      const nightLogins = await db.query(
        `SELECT COUNT(*) as count
         FROM audit_logs
         WHERE user_id = $1
         AND event_type = 'user_login'
         AND success = true
         AND EXTRACT(HOUR FROM created_at) BETWEEN 0 AND 5
         AND created_at > NOW() - INTERVAL '7 days'`,
        [userId]
      );

      if (nightLogins.rows[0].count > 2) {
        activities.push({
          type: 'unusual_time',
          severity: 'low',
          message: `${nightLogins.rows[0].count} logins during unusual hours (12 AM - 5 AM)`,
          timestamp: new Date(),
        });
      }

      // Check for multiple active sessions
      const activeSessions = await db.query(
        `SELECT COUNT(*) as count
         FROM refresh_tokens
         WHERE user_id = $1
         AND revoked = false
         AND expires_at > NOW()`,
        [userId]
      );

      if (activeSessions.rows[0].count > 5) {
        activities.push({
          type: 'multiple_sessions',
          severity: 'medium',
          message: `${activeSessions.rows[0].count} active sessions detected`,
          timestamp: new Date(),
        });
      }

      return activities;
    } catch (error) {
      console.error('[Security] Failed to detect suspicious activity:', error);
      throw new Error('Failed to check for suspicious activity');
    }
  }

  /**
   * Get security settings for a user
   *
   * @param {string} userId - User ID
   * @returns {Object} Security settings
   */
  async getSecuritySettings(userId) {
    try {
      const result = await db.query(
        `SELECT
          email_alerts,
          login_alerts,
          unusual_activity_alerts,
          two_factor_enabled
         FROM user_security_settings
         WHERE user_id = $1`,
        [userId]
      );

      if (result.rows.length === 0) {
        // Create default settings
        await db.query(
          `INSERT INTO user_security_settings (
            user_id,
            email_alerts,
            login_alerts,
            unusual_activity_alerts,
            two_factor_enabled
          ) VALUES ($1, true, true, true, false)`,
          [userId]
        );

        return {
          emailAlerts: true,
          loginAlerts: true,
          unusualActivityAlerts: true,
          twoFactorEnabled: false,
        };
      }

      return {
        emailAlerts: result.rows[0].email_alerts,
        loginAlerts: result.rows[0].login_alerts,
        unusualActivityAlerts: result.rows[0].unusual_activity_alerts,
        twoFactorEnabled: result.rows[0].two_factor_enabled,
      };
    } catch (error) {
      console.error('[Security] Failed to get security settings:', error);
      throw new Error('Failed to retrieve security settings');
    }
  }

  /**
   * Update security settings
   *
   * @param {string} userId - User ID
   * @param {Object} settings - Settings to update
   * @returns {Object} Updated settings
   */
  async updateSecuritySettings(userId, settings) {
    try {
      const { emailAlerts, loginAlerts, unusualActivityAlerts } = settings;

      await db.query(
        `INSERT INTO user_security_settings (
          user_id,
          email_alerts,
          login_alerts,
          unusual_activity_alerts
        ) VALUES ($1, $2, $3, $4)
        ON CONFLICT (user_id)
        DO UPDATE SET
          email_alerts = EXCLUDED.email_alerts,
          login_alerts = EXCLUDED.login_alerts,
          unusual_activity_alerts = EXCLUDED.unusual_activity_alerts,
          updated_at = NOW()`,
        [userId, emailAlerts, loginAlerts, unusualActivityAlerts]
      );

      return await this.getSecuritySettings(userId);
    } catch (error) {
      console.error('[Security] Failed to update security settings:', error);
      throw new Error('Failed to update security settings');
    }
  }

  /**
   * Parse user agent to get device info
   *
   * @param {string} userAgent - User agent string
   * @returns {Object} Device information
   */
  parseUserAgent(userAgent) {
    if (!userAgent) {
      return {
        browser: 'Unknown',
        os: 'Unknown',
        device: 'Unknown',
      };
    }

    const browser = this.detectBrowser(userAgent);
    const os = this.detectOS(userAgent);
    const device = this.detectDevice(userAgent);

    return { browser, os, device };
  }

  detectBrowser(ua) {
    if (ua.includes('Chrome')) return 'Chrome';
    if (ua.includes('Firefox')) return 'Firefox';
    if (ua.includes('Safari')) return 'Safari';
    if (ua.includes('Edge')) return 'Edge';
    if (ua.includes('Opera')) return 'Opera';
    return 'Unknown';
  }

  detectOS(ua) {
    if (ua.includes('Windows')) return 'Windows';
    if (ua.includes('Mac OS')) return 'macOS';
    if (ua.includes('Linux')) return 'Linux';
    if (ua.includes('Android')) return 'Android';
    if (ua.includes('iOS')) return 'iOS';
    return 'Unknown';
  }

  detectDevice(ua) {
    if (ua.includes('Mobile')) return 'Mobile';
    if (ua.includes('Tablet')) return 'Tablet';
    return 'Desktop';
  }

  /**
   * Get approximate location from IP address
   * (Simplified version - in production, use a geo-IP service)
   *
   * @param {string} ipAddress - IP address
   * @returns {string} Location
   */
  getLocationFromIP(ipAddress) {
    // In production, use MaxMind GeoIP or similar service
    // For now, return a placeholder
    if (!ipAddress || ipAddress === 'unknown') {
      return 'Unknown';
    }

    // Placeholder logic
    if (ipAddress.startsWith('192.168.') || ipAddress.startsWith('10.')) {
      return 'Local Network';
    }

    return 'Unknown Location';
  }
}

module.exports = new SecurityService();
