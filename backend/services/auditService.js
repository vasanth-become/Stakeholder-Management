/**
 * Audit Service
 *
 * Logs security events and user actions for compliance and monitoring
 */

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

class AuditService {
  /**
   * Log an audit event
   *
   * @param {string} userId - User ID (can be null for system events)
   * @param {string} action - Action performed (e.g., 'user_login', 'password_change')
   * @param {string} resourceType - Type of resource affected (e.g., 'user', 'project')
   * @param {string} resourceId - ID of resource affected
   * @param {object} metadata - Additional data (JSON)
   * @param {string} ipAddress - IP address
   * @param {string} userAgent - User agent string
   */
  async log(userId, action, resourceType = null, ipAddress = null, metadata = {}, resourceId = null, userAgent = null) {
    const query = `
      INSERT INTO audit_logs (user_id, action, resource_type, resource_id, ip_address, user_agent, metadata)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id
    `;

    try {
      const result = await pool.query(query, [
        userId,
        action,
        resourceType,
        resourceId,
        ipAddress,
        userAgent,
        JSON.stringify(metadata),
      ]);

      return result.rows[0].id;
    } catch (error) {
      // Don't throw - audit logging should never break the application
      console.error('[Audit Service] Failed to log event:', error);
      return null;
    }
  }

  /**
   * Get audit logs for a user
   */
  async getUserLogs(userId, limit = 100, offset = 0) {
    const query = `
      SELECT *
      FROM audit_logs
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `;

    const result = await pool.query(query, [userId, limit, offset]);
    return result.rows;
  }

  /**
   * Get audit logs by action type
   */
  async getLogsByAction(action, limit = 100) {
    const query = `
      SELECT *
      FROM audit_logs
      WHERE action = $1
      ORDER BY created_at DESC
      LIMIT $2
    `;

    const result = await pool.query(query, [action, limit]);
    return result.rows;
  }

  /**
   * Get recent security events
   */
  async getSecurityEvents(hours = 24, limit = 100) {
    const query = `
      SELECT *
      FROM audit_logs
      WHERE action IN ('user_login', 'user_logout', 'password_changed', 'password_reset_requested', 'password_reset_completed')
        AND created_at > NOW() - INTERVAL '${hours} hours'
      ORDER BY created_at DESC
      LIMIT $1
    `;

    const result = await pool.query(query, [limit]);
    return result.rows;
  }

  /**
   * Get suspicious activity
   */
  async getSuspiciousActivity(hours = 24) {
    const query = `
      SELECT
        ip_address,
        COUNT(*) as event_count,
        COUNT(DISTINCT user_id) as unique_users,
        array_agg(DISTINCT action) as actions
      FROM audit_logs
      WHERE created_at > NOW() - INTERVAL '${hours} hours'
      GROUP BY ip_address
      HAVING COUNT(*) > 50 OR COUNT(DISTINCT user_id) > 5
      ORDER BY event_count DESC
    `;

    const result = await pool.query(query);
    return result.rows;
  }

  /**
   * Get failed login attempts
   */
  async getFailedLoginAttempts(hours = 24, limit = 100) {
    const query = `
      SELECT *
      FROM login_attempts
      WHERE success = FALSE
        AND attempted_at > NOW() - INTERVAL '${hours} hours'
      ORDER BY attempted_at DESC
      LIMIT $1
    `;

    const result = await pool.query(query, [limit]);
    return result.rows;
  }

  /**
   * Clean up old audit logs (keep last N days)
   */
  async cleanupOldLogs(daysToKeep = 90) {
    const query = `
      DELETE FROM audit_logs
      WHERE created_at < NOW() - INTERVAL '${daysToKeep} days'
    `;

    const result = await pool.query(query);
    return result.rowCount;
  }
}

module.exports = new AuditService();
