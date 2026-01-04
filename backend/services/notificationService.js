/**
 * Notification Service
 *
 * Handles all notification operations:
 * - Create notifications
 * - Mark as read/unread
 * - Get user notifications
 * - Batch notifications (digests)
 * - Respect quiet hours
 * - Multi-channel delivery (in-app, email, Slack)
 */

const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

class NotificationService {
  /**
   * Create a new notification
   */
  async createNotification(
    {
      userId,
      type,
      title,
      message,
      relatedEntityType = null,
      relatedEntityId = null,
      actionUrl = null,
      metadata = {}
    },
    client = null
  ) {
    const useClient = client || await pool.connect();
    const shouldRelease = !client;

    try {
      // Check user notification preferences
      const userPrefs = await this.getUserPreferences(userId, useClient);

      // Check quiet hours
      if (this.isInQuietHours(userPrefs)) {
        // Queue for later delivery
        console.log(`[Notification] User ${userId} in quiet hours, queueing notification`);
        // TODO: Implement queue for quiet hours
      }

      // Insert notification
      const query = `
        INSERT INTO notifications (
          user_id,
          type,
          title,
          message,
          related_entity_type,
          related_entity_id,
          action_url,
          metadata
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `;

      const result = await useClient.query(query, [
        userId,
        type,
        title,
        message,
        relatedEntityType,
        relatedEntityId ? relatedEntityId.toString() : null,
        actionUrl,
        JSON.stringify(metadata)
      ]);

      const notification = result.rows[0];

      // Send via configured channels
      if (userPrefs.in_app) {
        // Already created in database
      }

      if (userPrefs.email && !this.isInQuietHours(userPrefs)) {
        // TODO: Queue email delivery
        await this.queueEmailNotification(notification, useClient);
      }

      if (userPrefs.slack && !this.isInQuietHours(userPrefs)) {
        // TODO: Queue Slack notification
        await this.queueSlackNotification(notification, useClient);
      }

      return notification;

    } finally {
      if (shouldRelease) {
        useClient.release();
      }
    }
  }

  /**
   * Get user's notification preferences
   */
  async getUserPreferences(userId, client = null) {
    const useClient = client || pool;

    const result = await useClient.query(
      'SELECT notification_preferences, quiet_hours_start, quiet_hours_end, timezone FROM users WHERE id = $1',
      [userId]
    );

    if (!result.rows[0]) {
      // Default preferences
      return {
        in_app: true,
        email: true,
        slack: false,
        digest: 'daily',
        quiet_hours_enabled: false
      };
    }

    const user = result.rows[0];
    return {
      ...user.notification_preferences,
      quiet_hours_start: user.quiet_hours_start,
      quiet_hours_end: user.quiet_hours_end,
      timezone: user.timezone
    };
  }

  /**
   * Check if current time is in user's quiet hours
   */
  isInQuietHours(userPrefs) {
    if (!userPrefs.quiet_hours_enabled || !userPrefs.quiet_hours_start || !userPrefs.quiet_hours_end) {
      return false;
    }

    // TODO: Implement timezone-aware quiet hours check
    // For now, return false
    return false;
  }

  /**
   * Get notifications for a user
   */
  async getUserNotifications(userId, options = {}) {
    const {
      limit = 50,
      offset = 0,
      unreadOnly = false,
      type = null
    } = options;

    let query = `
      SELECT *
      FROM notifications
      WHERE user_id = $1
    `;

    const params = [userId];
    let paramIndex = 2;

    if (unreadOnly) {
      query += ` AND is_read = FALSE`;
    }

    if (type) {
      query += ` AND type = $${paramIndex}`;
      params.push(type);
      paramIndex++;
    }

    query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);
    return result.rows;
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount(userId) {
    const result = await pool.query(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND is_read = FALSE',
      [userId]
    );

    return parseInt(result.rows[0].count);
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId, userId) {
    const query = `
      UPDATE notifications
      SET is_read = TRUE, read_at = NOW()
      WHERE id = $1 AND user_id = $2
      RETURNING *
    `;

    const result = await pool.query(query, [notificationId, userId]);
    return result.rows[0];
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(userId) {
    const query = `
      UPDATE notifications
      SET is_read = TRUE, read_at = NOW()
      WHERE user_id = $1 AND is_read = FALSE
      RETURNING COUNT(*) as count
    `;

    const result = await pool.query(query, [userId]);
    return { updated: result.rowCount };
  }

  /**
   * Delete a notification
   */
  async deleteNotification(notificationId, userId) {
    const query = `
      DELETE FROM notifications
      WHERE id = $1 AND user_id = $2
      RETURNING *
    `;

    const result = await pool.query(query, [notificationId, userId]);
    return { success: result.rowCount > 0 };
  }

  /**
   * Queue email notification for delivery
   */
  async queueEmailNotification(notification, client = null) {
    // TODO: Implement email queue
    // For now, just mark as queued
    const useClient = client || pool;

    await useClient.query(
      'UPDATE notifications SET sent_email = TRUE, email_sent_at = NOW() WHERE id = $1',
      [notification.id]
    );

    console.log(`[Notification] Email queued for notification ${notification.id}`);
  }

  /**
   * Queue Slack notification for delivery
   */
  async queueSlackNotification(notification, client = null) {
    // TODO: Implement Slack delivery
    const useClient = client || pool;

    await useClient.query(
      'UPDATE notifications SET sent_slack = TRUE, slack_sent_at = NOW() WHERE id = $1',
      [notification.id]
    );

    console.log(`[Notification] Slack queued for notification ${notification.id}`);
  }

  /**
   * Create notification batch (digest)
   */
  async createBatch(userId, notificationIds, batchType) {
    const query = `
      INSERT INTO notification_batches (user_id, notification_ids, batch_type, total_count)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;

    const result = await pool.query(query, [
      userId,
      notificationIds,
      batchType,
      notificationIds.length
    ]);

    return result.rows[0];
  }

  /**
   * Get notifications ready for batching
   */
  async getNotificationsForBatch(userId, batchType) {
    // Get unread notifications based on batch type
    let timeThreshold;

    if (batchType === 'hourly_digest') {
      timeThreshold = "NOW() - INTERVAL '1 hour'";
    } else if (batchType === 'daily_digest') {
      timeThreshold = "NOW() - INTERVAL '1 day'";
    } else if (batchType === 'weekly_digest') {
      timeThreshold = "NOW() - INTERVAL '1 week'";
    }

    const query = `
      SELECT *
      FROM notifications
      WHERE user_id = $1
        AND is_read = FALSE
        AND created_at >= ${timeThreshold}
        AND id NOT IN (
          SELECT unnest(notification_ids)
          FROM notification_batches
          WHERE user_id = $1
        )
      ORDER BY created_at DESC
    `;

    const result = await pool.query(query, [userId]);
    return result.rows;
  }

  /**
   * Update user notification preferences
   */
  async updatePreferences(userId, preferences) {
    const query = `
      UPDATE users
      SET notification_preferences = $1,
          quiet_hours_start = $2,
          quiet_hours_end = $3
      WHERE id = $4
      RETURNING notification_preferences, quiet_hours_start, quiet_hours_end
    `;

    const result = await pool.query(query, [
      JSON.stringify(preferences),
      preferences.quiet_hours_start || null,
      preferences.quiet_hours_end || null,
      userId
    ]);

    return result.rows[0];
  }
}

module.exports = new NotificationService();
