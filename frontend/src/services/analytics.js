/**
 * Analytics Service - Privacy-Focused Event Tracking
 *
 * This service provides a wrapper for tracking user behavior without
 * compromising privacy. No sensitive data (names, notes, messages) is tracked.
 *
 * Usage:
 *   import { analytics } from './services/analytics';
 *   analytics.track('project_created', { has_description: true });
 */

class AnalyticsService {
  constructor() {
    this.enabled = true;
    this.queue = [];
    this.userId = null;
    this.workspaceId = null;
    this.sessionStart = Date.now();
    this.maxQueueSize = 50;
    this.flushInterval = 10000; // 10 seconds

    // Start auto-flush
    this.startAutoFlush();

    // Flush on page unload
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => this.flush());
    }
  }

  /**
   * Initialize analytics with user context
   */
  identify(userId, traits = {}) {
    this.userId = userId;

    // Extract workspace ID if provided
    if (traits.workspaceId) {
      this.workspaceId = traits.workspaceId;
    }

    // Don't track PII - only track metadata
    const sanitizedTraits = {
      plan_type: traits.plan_type || 'free',
      role: traits.role,
      signup_date: traits.signup_date,
      // Never include: email, name, phone, etc.
    };

    if (this.enabled) {
      console.log('[Analytics] Identified user:', userId, sanitizedTraits);
      // In production, this would call PostHog/Mixpanel identify
      // posthog.identify(userId, sanitizedTraits);
    }
  }

  /**
   * Track an event
   */
  track(eventName, properties = {}) {
    if (!this.enabled) return;

    const event = {
      event: eventName,
      user_id: this.userId,
      workspace_id: this.workspaceId,
      properties: {
        ...properties,
        timestamp: new Date().toISOString(),
        session_duration: Math.floor((Date.now() - this.sessionStart) / 1000),
      },
    };

    // Validate event (in dev mode)
    if (process.env.NODE_ENV === 'development') {
      this.validateEvent(event);
    }

    // Add to queue
    this.queue.push(event);

    // Flush if queue is full
    if (this.queue.length >= this.maxQueueSize) {
      this.flush();
    }
  }

  /**
   * Page view tracking
   */
  page(pageName, properties = {}) {
    this.track('page_viewed', {
      page_name: pageName,
      ...properties,
    });
  }

  /**
   * Flush events to backend
   */
  async flush() {
    if (this.queue.length === 0) return;

    const events = [...this.queue];
    this.queue = [];

    try {
      // In development, just log
      if (process.env.NODE_ENV === 'development') {
        console.log('[Analytics] Flushing events:', events);
        return;
      }

      // In production, send to backend
      await fetch('/api/analytics/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ events }),
      });
    } catch (error) {
      console.error('[Analytics] Failed to flush events:', error);
      // Re-queue events on failure (with limit)
      if (this.queue.length < this.maxQueueSize) {
        this.queue.unshift(...events.slice(0, this.maxQueueSize - this.queue.length));
      }
    }
  }

  /**
   * Start auto-flush timer
   */
  startAutoFlush() {
    setInterval(() => {
      this.flush();
    }, this.flushInterval);
  }

  /**
   * Validate event schema (development only)
   */
  validateEvent(event) {
    // Check for sensitive data
    const sensitiveKeys = ['email', 'name', 'phone', 'password', 'token', 'notes', 'summary', 'message', 'content'];
    const checkForSensitiveData = (obj, path = '') => {
      for (const key in obj) {
        const fullPath = path ? `${path}.${key}` : key;

        // Check if key name suggests sensitive data
        if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
          console.warn(`[Analytics] Potentially sensitive key detected: ${fullPath}`);
        }

        // Check if value is an object and recurse
        if (typeof obj[key] === 'object' && obj[key] !== null) {
          checkForSensitiveData(obj[key], fullPath);
        }

        // Check for long strings (might be content)
        if (typeof obj[key] === 'string' && obj[key].length > 100) {
          console.warn(`[Analytics] Long string detected at ${fullPath}: ${obj[key].substring(0, 50)}...`);
        }
      }
    };

    checkForSensitiveData(event.properties);
  }

  /**
   * Enable/disable tracking
   */
  setEnabled(enabled) {
    this.enabled = enabled;
    if (!enabled) {
      this.queue = [];
    }
  }

  // ==========================================================================
  // Convenience Methods for Common Events
  // ==========================================================================

  /**
   * Authentication Events
   */
  trackSignup(method, referralSource = null) {
    this.track('user_signed_up', {
      signup_method: method,
      referral_source: referralSource,
    });
  }

  trackLogin(method) {
    this.track('user_logged_in', {
      login_method: method,
      device_type: this.getDeviceType(),
    });
  }

  trackLogout() {
    this.track('user_logged_out', {
      session_duration: Math.floor((Date.now() - this.sessionStart) / 1000),
    });
  }

  /**
   * Onboarding Events
   */
  trackOnboardingStarted() {
    this.track('onboarding_started');
  }

  trackOnboardingStepCompleted(stepNumber, stepName) {
    this.track('onboarding_step_completed', {
      step_number: stepNumber,
      step_name: stepName,
    });
  }

  trackOnboardingCompleted(completionTime, stepsCompleted) {
    this.track('onboarding_completed', {
      completion_time: completionTime,
      steps_completed: stepsCompleted,
    });
  }

  /**
   * Workspace Events
   */
  trackWorkspaceCreated(workspaceNameLength) {
    this.track('workspace_created', {
      workspace_name_length: workspaceNameLength,
    });
  }

  /**
   * Project Events
   */
  trackProjectCreated(projectId, hasDescription, stakeholderCount = 0) {
    this.track('project_created', {
      project_id: projectId,
      has_description: hasDescription,
      stakeholder_count: stakeholderCount,
    });
  }

  trackProjectViewed(projectId, viewSource = 'direct') {
    this.track('project_viewed', {
      project_id: projectId,
      view_source: viewSource,
    });
  }

  trackProjectArchived(projectId, projectAgeDays, stakeholderCount) {
    this.track('project_archived', {
      project_id: projectId,
      project_age_days: projectAgeDays,
      stakeholder_count: stakeholderCount,
    });
  }

  /**
   * Stakeholder Events
   */
  trackStakeholderCreated(stakeholderId, projectId, data) {
    this.track('stakeholder_created', {
      stakeholder_id: stakeholderId,
      project_id: projectId,
      power_level: data.power,
      influence_level: data.influence,
      engagement_status: data.engagement_status,
      risk_score: data.risk_score,
      has_notes: Boolean(data.notes),
    });
  }

  trackStakeholderViewed(stakeholderId, projectId, viewSource = 'direct', activeTab = 'overview') {
    this.track('stakeholder_viewed', {
      stakeholder_id: stakeholderId,
      project_id: projectId,
      view_source: viewSource,
      active_tab: activeTab,
    });
  }

  trackStakeholderUpdated(stakeholderId, projectId, fieldsUpdated, riskScoreChange = 0, engagementChanged = false) {
    this.track('stakeholder_updated', {
      stakeholder_id: stakeholderId,
      project_id: projectId,
      fields_updated: fieldsUpdated,
      risk_score_change: riskScoreChange,
      engagement_changed: engagementChanged,
    });
  }

  /**
   * Interaction Events
   */
  trackInteractionLogged(stakeholderId, projectId, interactionType, sentiment, hasSummary) {
    this.track('interaction_logged', {
      stakeholder_id: stakeholderId,
      project_id: projectId,
      interaction_type: interactionType,
      sentiment: sentiment,
      has_summary: hasSummary,
    });
  }

  trackInteractionViewed(stakeholderId, viewContext = 'timeline') {
    this.track('interaction_viewed', {
      stakeholder_id: stakeholderId,
      view_context: viewContext,
    });
  }

  /**
   * AI Events
   */
  trackAIInsightsGenerated(contextType, contextId, insightsCount) {
    this.track('ai_insights_generated', {
      context_type: contextType,
      context_id: contextId,
      insights_count: insightsCount,
    });
  }

  trackAIInsightsViewed(contextType, contextId, tabName) {
    this.track('ai_insights_viewed', {
      context_type: contextType,
      context_id: contextId,
      tab_name: tabName,
    });
  }

  trackAISuggestionUsed(suggestionType, contextType) {
    this.track('ai_suggestion_used', {
      suggestion_type: suggestionType,
      context_type: contextType,
    });
  }

  /**
   * Risk Events
   */
  trackRiskViewed(viewType, highRiskCount) {
    this.track('risk_viewed', {
      view_type: viewType,
      high_risk_count: highRiskCount,
    });
  }

  trackRiskAlertTriggered(stakeholderId, riskLevel, riskScore, alertType) {
    this.track('risk_alert_triggered', {
      stakeholder_id: stakeholderId,
      risk_level: riskLevel,
      risk_score: riskScore,
      alert_type: alertType,
    });
  }

  /**
   * Report Events
   */
  trackReportViewed(reportType, filtersApplied = 0) {
    this.track('report_viewed', {
      report_type: reportType,
      filters_applied: filtersApplied,
    });
  }

  trackReportExported(exportFormat, dataRows) {
    this.track('report_exported', {
      export_format: exportFormat,
      data_rows: dataRows,
    });
  }

  /**
   * Integration Events
   */
  trackIntegrationConnected(integrationType) {
    this.track('integration_connected', {
      integration_type: integrationType,
    });
  }

  trackIntegrationDisconnected(integrationType, daysConnected) {
    this.track('integration_disconnected', {
      integration_type: integrationType,
      days_connected: daysConnected,
    });
  }

  /**
   * Billing Events
   */
  trackTrialStarted(planType, trialDuration) {
    this.track('trial_started', {
      plan_type: planType,
      trial_duration_days: trialDuration,
    });
  }

  trackPlanUpgraded(fromPlan, toPlan, billingCycle) {
    this.track('plan_upgraded', {
      from_plan: fromPlan,
      to_plan: toPlan,
      billing_cycle: billingCycle,
    });
  }

  trackPlanDowngraded(fromPlan, toPlan, reason = null) {
    this.track('plan_downgraded', {
      from_plan: fromPlan,
      to_plan: toPlan,
      reason: reason,
    });
  }

  trackSubscriptionCancelled(planType, subscriptionAgeDays, cancelReason = null) {
    this.track('subscription_cancelled', {
      plan_type: planType,
      subscription_age_days: subscriptionAgeDays,
      cancel_reason: cancelReason,
    });
  }

  /**
   * Helper: Get device type
   */
  getDeviceType() {
    if (typeof window === 'undefined') return 'unknown';

    const ua = navigator.userAgent;
    if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
      return 'tablet';
    }
    if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) {
      return 'mobile';
    }
    return 'desktop';
  }
}

// Export singleton instance
export const analytics = new AnalyticsService();

// Export class for testing
export { AnalyticsService };
