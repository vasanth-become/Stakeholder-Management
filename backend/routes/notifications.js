/**
 * Notifications API Routes
 *
 * Endpoints for notification operations:
 * - Get user notifications
 * - Mark as read
 * - Update preferences
 * - Get unread count
 */

const express = require('express');
const router = express.Router();
const notificationService = require('../services/notificationService');

// Apply auth middleware (when available)
// router.use(authMiddleware.requireAuth);

/**
 * GET /api/notifications
 * Get notifications for the current user
 *
 * Query params:
 * - limit (optional): Number of notifications to return (default 50)
 * - offset (optional): Pagination offset (default 0)
 * - unread_only (optional): true/false (default false)
 * - type (optional): Filter by notification type
 */
router.get('/', async (req, res) => {
  try {
    const { limit, offset, unread_only, type } = req.query;

    // TODO: Get user ID from auth middleware
    const userId = req.user?.id || '00000000-0000-0000-0000-000000000001';

    const options = {
      limit: limit ? parseInt(limit) : 50,
      offset: offset ? parseInt(offset) : 0,
      unreadOnly: unread_only === 'true',
      type: type || null
    };

    const notifications = await notificationService.getUserNotifications(userId, options);

    res.json({
      success: true,
      notifications,
      count: notifications.length
    });

  } catch (error) {
    console.error('[Notifications API] Error fetching notifications:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/notifications/unread-count
 * Get count of unread notifications
 */
router.get('/unread-count', async (req, res) => {
  try {
    // TODO: Get user ID from auth middleware
    const userId = req.user?.id || '00000000-0000-0000-0000-000000000001';

    const count = await notificationService.getUnreadCount(userId);

    res.json({
      success: true,
      count
    });

  } catch (error) {
    console.error('[Notifications API] Error getting unread count:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/notifications/:id/read
 * Mark a notification as read
 */
router.put('/:id/read', async (req, res) => {
  try {
    const { id } = req.params;

    // TODO: Get user ID from auth middleware
    const userId = req.user?.id || '00000000-0000-0000-0000-000000000001';

    const notification = await notificationService.markAsRead(id, userId);

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json({
      success: true,
      notification
    });

  } catch (error) {
    console.error('[Notifications API] Error marking notification as read:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/notifications/read-all
 * Mark all notifications as read
 */
router.put('/read-all', async (req, res) => {
  try {
    // TODO: Get user ID from auth middleware
    const userId = req.user?.id || '00000000-0000-0000-0000-000000000001';

    const result = await notificationService.markAllAsRead(userId);

    res.json({
      success: true,
      updated: result.updated
    });

  } catch (error) {
    console.error('[Notifications API] Error marking all as read:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/notifications/:id
 * Delete a notification
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // TODO: Get user ID from auth middleware
    const userId = req.user?.id || '00000000-0000-0000-0000-000000000001';

    const result = await notificationService.deleteNotification(id, userId);

    if (!result.success) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json({
      success: true,
      message: 'Notification deleted successfully'
    });

  } catch (error) {
    console.error('[Notifications API] Error deleting notification:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/notifications/preferences
 * Get user's notification preferences
 */
router.get('/preferences', async (req, res) => {
  try {
    // TODO: Get user ID from auth middleware
    const userId = req.user?.id || '00000000-0000-0000-0000-000000000001';

    const preferences = await notificationService.getUserPreferences(userId);

    res.json({
      success: true,
      preferences
    });

  } catch (error) {
    console.error('[Notifications API] Error getting preferences:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/notifications/preferences
 * Update user's notification preferences
 *
 * Body:
 * - in_app (optional): boolean
 * - email (optional): boolean
 * - slack (optional): boolean
 * - digest (optional): 'hourly', 'daily', 'weekly'
 * - quiet_hours_enabled (optional): boolean
 * - quiet_hours_start (optional): TIME string (HH:MM:SS)
 * - quiet_hours_end (optional): TIME string (HH:MM:SS)
 */
router.put('/preferences', async (req, res) => {
  try {
    const preferences = req.body;

    // TODO: Get user ID from auth middleware
    const userId = req.user?.id || '00000000-0000-0000-0000-000000000001';

    const updated = await notificationService.updatePreferences(userId, preferences);

    res.json({
      success: true,
      preferences: updated
    });

  } catch (error) {
    console.error('[Notifications API] Error updating preferences:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
