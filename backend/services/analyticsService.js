/**
 * Analytics Service
 *
 * Tracks events for product analytics
 * Can be extended to integrate with analytics platforms (Mixpanel, Amplitude, etc.)
 */

class AnalyticsService {
  constructor() {
    this.enabled = true;
  }

  /**
   * Track an event
   * @param {string} event - Event name
   * @param {Object} properties - Event properties
   * @param {string} userId - User ID (optional)
   */
  track(event, properties = {}, userId = 'system') {
    if (!this.enabled) return;

    const timestamp = new Date().toISOString();

    // Log to console for now
    // In production, this would send to analytics platform
    console.log('[Analytics]', {
      event,
      properties,
      userId,
      timestamp
    });

    // TODO: Integrate with analytics platform
    // Example: mixpanel.track(event, properties);
  }

  /**
   * Track enrichment suggestion event
   */
  trackEnrichmentSuggested(properties) {
    this.track('profile_enrichment_suggested', {
      ...properties,
      suggestion_count: properties.suggestions ? Object.keys(properties.suggestions).length : 0
    });
  }

  /**
   * Track enrichment acceptance event
   */
  trackEnrichmentAccepted(properties) {
    this.track('profile_enrichment_accepted', {
      ...properties,
      accepted_count: properties.acceptedFields ? properties.acceptedFields.length : 0
    });
  }

  /**
   * Track enrichment rejection event
   */
  trackEnrichmentRejected(properties) {
    this.track('profile_enrichment_rejected', {
      ...properties
    });
  }

  /**
   * Track enrichment error event
   */
  trackEnrichmentError(properties) {
    this.track('profile_enrichment_error', {
      ...properties
    });
  }

  /**
   * Enable/disable analytics
   */
  setEnabled(enabled) {
    this.enabled = enabled;
  }
}

// Singleton instance
const analyticsService = new AnalyticsService();

module.exports = analyticsService;
