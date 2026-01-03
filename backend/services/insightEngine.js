/**
 * Insight Generation Engine
 *
 * Automatically generates meaningful insights from stakeholder data
 * without requiring user configuration or setup.
 *
 * Insight Types:
 * - Silence Gaps: High-influence stakeholders not contacted recently
 * - Engagement Trends: Improving/declining engagement patterns
 * - Risk Signals: High-risk stakeholder combinations
 * - Key People: Critical stakeholders needing attention
 * - Success Signals: Positive engagement trends
 * - Recommended Actions: Specific next steps
 */

const db = require('../database/db');

class InsightEngine {
  constructor() {
    this.SILENCE_THRESHOLD_DAYS = 21;
    this.MODERATE_SILENCE_DAYS = 14;
    this.HIGH_RISK_SCORE = 12;
    this.HIGH_INFLUENCE = 4;
    this.HIGH_POWER = 4;
  }

  /**
   * Generate all insights for a specific project
   * @param {number} projectId - Project ID
   * @returns {Promise<Array>} Array of insights
   */
  async generateProjectInsights(projectId) {
    const insights = [];

    try {
      // Get all stakeholders for the project
      const stakeholders = db.prepare(`
        SELECT * FROM stakeholders WHERE project_id = ?
      `).all(projectId);

      if (stakeholders.length === 0) {
        return [{
          type: 'empty_state',
          priority: 0,
          title: 'No stakeholders yet',
          message: 'Add stakeholders to start receiving insights 🙂',
          category: 'info',
          actionable: false
        }];
      }

      // Get all interactions for these stakeholders
      const stakeholderIds = stakeholders.map(s => s.id);
      const interactions = this.getInteractionsForStakeholders(stakeholderIds);

      // Generate different types of insights
      insights.push(...this.detectSilenceGaps(stakeholders, interactions));
      insights.push(...this.detectEngagementTrends(stakeholders, interactions));
      insights.push(...this.detectRiskSignals(stakeholders, interactions));
      insights.push(...this.detectKeyPeople(stakeholders, interactions));
      insights.push(...this.detectSuccessSignals(stakeholders, interactions));
      insights.push(...this.recommendActions(stakeholders, interactions));

      // Remove empty insights
      const validInsights = insights.filter(i => i !== null);

      if (validInsights.length === 0) {
        return [{
          type: 'empty_state',
          priority: 0,
          title: 'Not enough data yet',
          message: 'Insights will appear automatically as interactions are logged 🙂',
          category: 'info',
          actionable: false
        }];
      }

      return validInsights;
    } catch (error) {
      console.error('[InsightEngine] Error generating insights:', error);
      return [];
    }
  }

  /**
   * Generate insights for the entire organization (all projects)
   */
  async generateGlobalInsights() {
    const insights = [];

    try {
      const stakeholders = db.prepare('SELECT * FROM stakeholders').all();

      if (stakeholders.length === 0) {
        return [{
          type: 'empty_state',
          priority: 0,
          title: 'No data yet',
          message: 'Add projects and stakeholders to start receiving insights 🙂',
          category: 'info',
          actionable: false
        }];
      }

      const stakeholderIds = stakeholders.map(s => s.id);
      const interactions = this.getInteractionsForStakeholders(stakeholderIds);

      insights.push(...this.detectSilenceGaps(stakeholders, interactions));
      insights.push(...this.detectEngagementTrends(stakeholders, interactions));
      insights.push(...this.detectRiskSignals(stakeholders, interactions));
      insights.push(...this.detectKeyPeople(stakeholders, interactions));
      insights.push(...this.detectSuccessSignals(stakeholders, interactions));
      insights.push(...this.recommendActions(stakeholders, interactions));

      const validInsights = insights.filter(i => i !== null);

      if (validInsights.length === 0) {
        return [{
          type: 'empty_state',
          priority: 0,
          title: 'Not enough data yet',
          message: 'Insights will appear automatically as interactions are logged 🙂',
          category: 'info',
          actionable: false
        }];
      }

      return validInsights;
    } catch (error) {
      console.error('[InsightEngine] Error generating global insights:', error);
      return [];
    }
  }

  /**
   * Generate insights for a specific stakeholder
   */
  async generateStakeholderInsights(stakeholderId) {
    const insights = [];

    try {
      const stakeholder = db.prepare('SELECT * FROM stakeholders WHERE id = ?').get(stakeholderId);

      if (!stakeholder) {
        return [];
      }

      const interactions = this.getInteractionsForStakeholders([stakeholderId]);

      // Stakeholder-specific insights
      insights.push(...this.detectStakeholderRiskTrends(stakeholder, interactions));
      insights.push(...this.detectStakeholderEngagement(stakeholder, interactions));
      insights.push(...this.recommendStakeholderActions(stakeholder, interactions));

      return insights.filter(i => i !== null);
    } catch (error) {
      console.error('[InsightEngine] Error generating stakeholder insights:', error);
      return [];
    }
  }

  /**
   * Detect silence gaps - stakeholders not contacted recently
   */
  detectSilenceGaps(stakeholders, interactions) {
    const insights = [];
    const now = new Date();

    const silentStakeholders = stakeholders.filter(stakeholder => {
      // Only check high-influence stakeholders
      if (stakeholder.influence < this.HIGH_INFLUENCE) {
        return false;
      }

      const stakeholderInteractions = interactions.filter(i => i.stakeholder_id === stakeholder.id);

      if (stakeholderInteractions.length === 0) {
        return true; // No interactions ever
      }

      const lastInteraction = new Date(stakeholderInteractions[0].date);
      const daysSince = Math.floor((now - lastInteraction) / (1000 * 60 * 60 * 24));

      return daysSince >= this.SILENCE_THRESHOLD_DAYS;
    });

    if (silentStakeholders.length > 0) {
      const count = silentStakeholders.length;
      const names = silentStakeholders.slice(0, 2).map(s => s.name).join(', ');
      const others = count > 2 ? ` and ${count - 2} other${count - 2 > 1 ? 's' : ''}` : '';

      insights.push({
        type: 'silence_gap',
        priority: 90,
        category: 'warning',
        title: `${count} high-influence stakeholder${count > 1 ? 's' : ''} need${count === 1 ? 's' : ''} attention`,
        message: `${names}${others} ${count === 1 ? 'has' : 'have'} not been contacted in over ${this.SILENCE_THRESHOLD_DAYS} days.`,
        icon: '⏰',
        actionable: true,
        action: 'Schedule check-ins',
        stakeholderIds: silentStakeholders.map(s => s.id),
        metadata: {
          count,
          threshold_days: this.SILENCE_THRESHOLD_DAYS
        }
      });
    }

    return insights;
  }

  /**
   * Detect engagement trends - improving or declining
   */
  detectEngagementTrends(stakeholders, interactions) {
    const insights = [];

    // Group interactions by stakeholder and check recent trends
    const engagementChanges = stakeholders
      .filter(s => s.influence >= 3) // Only check moderately influential stakeholders
      .map(stakeholder => {
        const stakeholderInteractions = interactions
          .filter(i => i.stakeholder_id === stakeholder.id)
          .sort((a, b) => new Date(b.date) - new Date(a.date));

        if (stakeholderInteractions.length < 2) {
          return null; // Not enough data
        }

        // Check recent interactions (last 30 days)
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const recentInteractions = stakeholderInteractions.filter(
          i => new Date(i.date) > thirtyDaysAgo
        );

        if (recentInteractions.length >= 3) {
          // Frequent engagement = improving
          if (stakeholder.engagement_status === 'supportive' || stakeholder.engagement_status === 'neutral') {
            return {
              stakeholder,
              trend: 'improving',
              count: recentInteractions.length
            };
          }
        }

        return null;
      })
      .filter(t => t !== null);

    // Report improving engagement
    const improving = engagementChanges.filter(t => t.trend === 'improving');
    if (improving.length > 0 && improving.length <= 3) {
      const names = improving.map(t => t.stakeholder.name).join(', ');

      insights.push({
        type: 'engagement_improving',
        priority: 40,
        category: 'success',
        title: 'Engagement is improving',
        message: `Great — alignment signals are improving with ${names}.`,
        icon: '📈',
        actionable: false,
        stakeholderIds: improving.map(t => t.stakeholder.id),
        metadata: {
          count: improving.length
        }
      });
    }

    return insights;
  }

  /**
   * Detect risk signals - high-risk combinations
   */
  detectRiskSignals(stakeholders, interactions) {
    const insights = [];

    const highRiskStakeholders = stakeholders.filter(s => {
      return (
        s.risk_score >= this.HIGH_RISK_SCORE &&
        (s.power >= this.HIGH_POWER || s.influence >= this.HIGH_INFLUENCE) &&
        s.engagement_status === 'resistant'
      );
    });

    if (highRiskStakeholders.length > 0) {
      const stakeholder = highRiskStakeholders[0]; // Focus on most critical

      insights.push({
        type: 'risk_signal',
        priority: 95,
        category: 'danger',
        title: 'High-risk stakeholder detected',
        message: `${stakeholder.name} has high power/influence and resistant engagement — review alignment soon.`,
        icon: '⚠️',
        actionable: true,
        action: 'Review strategy',
        stakeholderIds: [stakeholder.id],
        metadata: {
          stakeholder_name: stakeholder.name,
          risk_score: stakeholder.risk_score,
          engagement_status: stakeholder.engagement_status
        }
      });
    }

    return insights;
  }

  /**
   * Detect key people who need attention
   */
  detectKeyPeople(stakeholders, interactions) {
    const insights = [];

    const keyPeopleNeedingAttention = stakeholders.filter(s => {
      if (s.influence < this.HIGH_INFLUENCE) {
        return false;
      }

      if (s.engagement_status !== 'neutral') {
        return false;
      }

      const stakeholderInteractions = interactions.filter(i => i.stakeholder_id === s.id);

      // Check if engagement frequency is dropping
      const now = new Date();
      const recent = stakeholderInteractions.filter(i => {
        const daysSince = (now - new Date(i.date)) / (1000 * 60 * 60 * 24);
        return daysSince <= 30;
      });

      return recent.length < 2; // Less than 2 interactions in 30 days
    });

    if (keyPeopleNeedingAttention.length > 0 && keyPeopleNeedingAttention.length <= 2) {
      const stakeholder = keyPeopleNeedingAttention[0];

      insights.push({
        type: 'key_person',
        priority: 70,
        category: 'warning',
        title: 'Key stakeholder needs attention',
        message: `${stakeholder.name} is high-influence and neutral — engagement may be dropping.`,
        icon: '👤',
        actionable: true,
        action: 'Schedule a check-in',
        stakeholderIds: [stakeholder.id],
        metadata: {
          stakeholder_name: stakeholder.name,
          influence: stakeholder.influence
        }
      });
    }

    return insights;
  }

  /**
   * Detect success signals
   */
  detectSuccessSignals(stakeholders, interactions) {
    const insights = [];

    // Find stakeholders who moved from resistant/neutral to supportive recently
    const positiveMoves = stakeholders.filter(s => {
      if (s.engagement_status !== 'supportive') {
        return false;
      }

      if (s.influence < 3) {
        return false;
      }

      const stakeholderInteractions = interactions.filter(i => i.stakeholder_id === s.id);
      const recentInteractions = stakeholderInteractions.filter(i => {
        const daysSince = (new Date() - new Date(i.date)) / (1000 * 60 * 60 * 24);
        return daysSince <= 14;
      });

      return recentInteractions.length >= 1;
    });

    if (positiveMoves.length > 0 && positiveMoves.length <= 2) {
      const stakeholder = positiveMoves[0];

      insights.push({
        type: 'success_signal',
        priority: 30,
        category: 'success',
        title: 'Positive engagement detected',
        message: `Alignment is improving with ${stakeholder.name} — great work!`,
        icon: '✨',
        actionable: false,
        stakeholderIds: [stakeholder.id],
        metadata: {
          stakeholder_name: stakeholder.name
        }
      });
    }

    return insights;
  }

  /**
   * Recommend specific actions
   */
  recommendActions(stakeholders, interactions) {
    const insights = [];

    // Recommend check-ins for stakeholders approaching silence threshold
    const approachingSilence = stakeholders.filter(stakeholder => {
      if (stakeholder.influence < 3) {
        return false;
      }

      const stakeholderInteractions = interactions.filter(i => i.stakeholder_id === stakeholder.id);

      if (stakeholderInteractions.length === 0) {
        return false; // Already covered by silence gaps
      }

      const lastInteraction = new Date(stakeholderInteractions[0].date);
      const daysSince = Math.floor((new Date() - lastInteraction) / (1000 * 60 * 60 * 24));

      return daysSince >= this.MODERATE_SILENCE_DAYS && daysSince < this.SILENCE_THRESHOLD_DAYS;
    });

    if (approachingSilence.length > 0) {
      const stakeholder = approachingSilence[0];
      const stakeholderInteractions = interactions.filter(i => i.stakeholder_id === stakeholder.id);
      const daysSince = Math.floor(
        (new Date() - new Date(stakeholderInteractions[0].date)) / (1000 * 60 * 60 * 24)
      );

      insights.push({
        type: 'recommended_action',
        priority: 60,
        category: 'info',
        title: 'Consider a check-in',
        message: `${stakeholder.name} hasn't been contacted in ${daysSince} days — consider reaching out in the next 5–7 days.`,
        icon: '💡',
        actionable: true,
        action: 'Log interaction',
        stakeholderIds: [stakeholder.id],
        metadata: {
          stakeholder_name: stakeholder.name,
          days_since_contact: daysSince
        }
      });
    }

    return insights;
  }

  /**
   * Stakeholder-specific: Risk trends
   */
  detectStakeholderRiskTrends(stakeholder, interactions) {
    const insights = [];

    if (stakeholder.risk_score >= this.HIGH_RISK_SCORE) {
      const message = stakeholder.engagement_status === 'resistant'
        ? 'Engagement is resistant — consider a strategic alignment conversation.'
        : 'Risk score is elevated — regular check-ins recommended.';

      insights.push({
        type: 'stakeholder_risk',
        priority: 80,
        category: 'warning',
        title: 'Risk score is high',
        message,
        icon: '⚠️',
        actionable: true,
        action: 'Review strategy',
        stakeholderIds: [stakeholder.id],
        metadata: {
          risk_score: stakeholder.risk_score
        }
      });
    }

    return insights;
  }

  /**
   * Stakeholder-specific: Engagement status
   */
  detectStakeholderEngagement(stakeholder, interactions) {
    const insights = [];

    if (stakeholder.engagement_status === 'supportive' && stakeholder.influence >= 3) {
      insights.push({
        type: 'stakeholder_supporter',
        priority: 20,
        category: 'success',
        title: 'Strong ally',
        message: `${stakeholder.name} is supportive and influential — a valuable advocate for your project.`,
        icon: '🤝',
        actionable: false,
        stakeholderIds: [stakeholder.id]
      });
    }

    return insights;
  }

  /**
   * Stakeholder-specific: Recommended actions
   */
  recommendStakeholderActions(stakeholder, interactions) {
    const insights = [];

    if (interactions.length === 0) {
      insights.push({
        type: 'stakeholder_first_contact',
        priority: 50,
        category: 'info',
        title: 'No interactions logged yet',
        message: 'Start logging interactions to track engagement over time.',
        icon: '📝',
        actionable: true,
        action: 'Log first interaction',
        stakeholderIds: [stakeholder.id]
      });
    }

    return insights;
  }

  /**
   * Helper: Get interactions for stakeholder IDs
   */
  getInteractionsForStakeholders(stakeholderIds) {
    if (stakeholderIds.length === 0) {
      return [];
    }

    const placeholders = stakeholderIds.map(() => '?').join(',');
    const query = `
      SELECT * FROM interactions
      WHERE stakeholder_id IN (${placeholders})
      ORDER BY date DESC
    `;

    return db.prepare(query).all(...stakeholderIds);
  }
}

// Singleton instance
const insightEngine = new InsightEngine();

module.exports = insightEngine;
