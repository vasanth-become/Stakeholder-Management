/**
 * Backend Analytics Service
 *
 * Handles server-side event tracking with:
 * - Event validation
 * - Queue-based processing
 * - Retry logic
 * - Privacy enforcement
 */

class BackendAnalyticsService {
  constructor() {
    this.enabled = process.env.ANALYTICS_ENABLED !== 'false';
    this.queue = [];
    this.processing = false;
    this.maxRetries = 3;
    this.retryDelay = 1000; // 1 second

    // Start background processor
    this.startProcessor();
  }

  /**
   * Track a server-side event
   */
  track(eventName, userId, properties = {}) {
    if (!this.enabled) return;

    const event = {
      event: eventName,
      user_id: userId,
      properties: {
        ...properties,
        timestamp: new Date().toISOString(),
        source: 'backend',
      },
      retry_count: 0,
    };

    // Validate before queuing
    if (this.validateEvent(event)) {
      this.queue.push(event);
    }
  }

  /**
   * Validate event to ensure no PII
   */
  validateEvent(event) {
    // Blocklist of sensitive keys
    const blocklist = [
      'email', 'password', 'token', 'secret', 'api_key',
      'name', 'first_name', 'last_name', 'full_name',
      'phone', 'address', 'ssn', 'credit_card',
      'notes', 'summary', 'message', 'content', 'text',
      'ip_address', 'user_agent'
    ];

    const containsSensitiveData = (obj, path = '') => {
      for (const key in obj) {
        const lowerKey = key.toLowerCase();

        // Check if key is in blocklist
        if (blocklist.some(blocked => lowerKey.includes(blocked))) {
          console.warn(`[Analytics] Blocked sensitive key: ${path}.${key}`);
          return true;
        }

        // Check nested objects
        if (typeof obj[key] === 'object' && obj[key] !== null) {
          if (containsSensitiveData(obj[key], `${path}.${key}`)) {
            return true;
          }
        }

        // Check for suspiciously long strings
        if (typeof obj[key] === 'string' && obj[key].length > 200) {
          console.warn(`[Analytics] Blocked long string at ${path}.${key}`);
          return true;
        }
      }
      return false;
    };

    if (containsSensitiveData(event.properties)) {
      console.error('[Analytics] Event contains sensitive data, discarding:', event.event);
      return false;
    }

    return true;
  }

  /**
   * Process queued events
   */
  async startProcessor() {
    setInterval(async () => {
      if (this.queue.length > 0 && !this.processing) {
        await this.processQueue();
      }
    }, 5000); // Process every 5 seconds
  }

  /**
   * Process all events in queue
   */
  async processQueue() {
    if (this.queue.length === 0 || this.processing) return;

    this.processing = true;

    const batch = this.queue.splice(0, 100); // Process up to 100 events at a time

    for (const event of batch) {
      try {
        await this.sendToAnalyticsPlatform(event);
      } catch (error) {
        console.error('[Analytics] Failed to send event:', error);

        // Retry logic
        if (event.retry_count < this.maxRetries) {
          event.retry_count++;
          this.queue.push(event);
          await this.sleep(this.retryDelay * event.retry_count);
        } else {
          console.error('[Analytics] Max retries reached for event:', event.event);
        }
      }
    }

    this.processing = false;
  }

  /**
   * Send event to analytics platform (PostHog/Mixpanel/Amplitude)
   */
  async sendToAnalyticsPlatform(event) {
    // In development, just log
    if (process.env.NODE_ENV === 'development') {
      console.log('[Analytics] Event:', event);
      return;
    }

    // PostHog integration example
    if (process.env.POSTHOG_API_KEY) {
      await this.sendToPostHog(event);
    }

    // Mixpanel integration example
    if (process.env.MIXPANEL_TOKEN) {
      await this.sendToMixpanel(event);
    }

    // Could also send to custom data warehouse
    if (process.env.ANALYTICS_WEBHOOK_URL) {
      await this.sendToWebhook(event);
    }
  }

  /**
   * Send to PostHog
   */
  async sendToPostHog(event) {
    // const posthog = require('posthog-node');
    // const client = new posthog.PostHog(process.env.POSTHOG_API_KEY);
    //
    // await client.capture({
    //   distinctId: event.user_id,
    //   event: event.event,
    //   properties: event.properties,
    // });
    //
    // await client.shutdown();

    console.log('[Analytics] Would send to PostHog:', event.event);
  }

  /**
   * Send to Mixpanel
   */
  async sendToMixpanel(event) {
    // const Mixpanel = require('mixpanel');
    // const mixpanel = Mixpanel.init(process.env.MIXPANEL_TOKEN);
    //
    // mixpanel.track(event.event, {
    //   distinct_id: event.user_id,
    //   ...event.properties,
    // });

    console.log('[Analytics] Would send to Mixpanel:', event.event);
  }

  /**
   * Send to custom webhook
   */
  async sendToWebhook(event) {
    const response = await fetch(process.env.ANALYTICS_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Analytics-Secret': process.env.ANALYTICS_WEBHOOK_SECRET || '',
      },
      body: JSON.stringify(event),
    });

    if (!response.ok) {
      throw new Error(`Webhook failed: ${response.status}`);
    }
  }

  /**
   * Helper: Sleep for retry logic
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Convenience methods for server-side events
   */

  trackUserAction(userId, action, metadata = {}) {
    this.track(`user_${action}`, userId, metadata);
  }

  trackAPIRequest(userId, endpoint, method, statusCode, duration) {
    this.track('api_request', userId, {
      endpoint,
      method,
      status_code: statusCode,
      duration_ms: duration,
    });
  }

  trackError(userId, errorType, errorMessage, context = {}) {
    this.track('error_occurred', userId, {
      error_type: errorType,
      error_message: errorMessage.substring(0, 100), // Limit length
      ...context,
    });
  }

  trackSystemEvent(eventName, metadata = {}) {
    this.track(eventName, 'system', metadata);
  }
}

// Export singleton
const analyticsService = new BackendAnalyticsService();

module.exports = analyticsService;
