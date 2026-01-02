/**
 * Analytics Middleware
 *
 * Automatically tracks API requests and provides analytics context
 */

const analyticsService = require('../services/analytics');

/**
 * Track API requests
 */
function trackAPIRequests(req, res, next) {
  const start = Date.now();

  // Capture original end function
  const originalEnd = res.end;

  // Override res.end to capture response
  res.end = function(...args) {
    const duration = Date.now() - start;

    // Only track API requests (not static files)
    if (req.path.startsWith('/api/')) {
      // Extract user ID from request (adjust based on your auth)
      const userId = req.user?.id || req.session?.userId || 'anonymous';

      // Track the request
      analyticsService.trackAPIRequest(
        userId,
        req.path,
        req.method,
        res.statusCode,
        duration
      );
    }

    // Call original end
    originalEnd.apply(res, args);
  };

  next();
}

/**
 * Track errors
 */
function trackErrors(err, req, res, next) {
  const userId = req.user?.id || req.session?.userId || 'anonymous';

  analyticsService.trackError(
    userId,
    err.name || 'Error',
    err.message,
    {
      endpoint: req.path,
      method: req.method,
      status_code: err.statusCode || 500,
    }
  );

  next(err);
}

/**
 * Handle analytics events from frontend
 */
async function handleAnalyticsEvents(req, res) {
  try {
    const { events } = req.body;

    if (!Array.isArray(events)) {
      return res.status(400).json({ error: 'Events must be an array' });
    }

    // Process each event
    for (const event of events) {
      if (!event.event || !event.user_id) {
        continue; // Skip invalid events
      }

      // Track the event
      analyticsService.track(
        event.event,
        event.user_id,
        {
          workspace_id: event.workspace_id,
          ...event.properties,
        }
      );
    }

    res.status(200).json({ success: true, processed: events.length });
  } catch (error) {
    console.error('[Analytics API] Error processing events:', error);
    res.status(500).json({ error: 'Failed to process events' });
  }
}

module.exports = {
  trackAPIRequests,
  trackErrors,
  handleAnalyticsEvents,
};
