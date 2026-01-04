/**
 * Visual Insights Service
 *
 * Generates data for premium visual intelligence:
 * - Engagement Heatmap
 * - Risk History Timeline
 * - Influence Network Graph
 *
 * Privacy-safe: only computes trends, no raw content exposed
 */

const db = require('../database/db');

class VisualInsightsService {
  /**
   * Generate Engagement Heatmap Data
   * Shows engagement levels over time periods (weeks)
   *
   * @param {number} projectId - Optional project filter
   * @param {number} weeks - Number of weeks to show (default 12)
   * @returns {Object} Heatmap data structure
   */
  generateEngagementHeatmap(projectId = null, weeks = 12) {
    try {
      // Get stakeholders
      const stakeholders = projectId
        ? db.prepare('SELECT * FROM stakeholders WHERE project_id = ?').all(projectId)
        : db.prepare('SELECT * FROM stakeholders').all();

      if (stakeholders.length === 0) {
        return this.getEmptyHeatmap();
      }

      // Calculate time periods (weeks)
      const periods = this.calculateWeekPeriods(weeks);

      // Build heatmap data
      const heatmapData = stakeholders.map(stakeholder => {
        const cells = periods.map(period => {
          return this.calculateEngagementCell(stakeholder.id, period);
        });

        return {
          stakeholderId: stakeholder.id,
          stakeholderName: stakeholder.name,
          role: stakeholder.role,
          power: stakeholder.power,
          influence: stakeholder.influence,
          riskScore: stakeholder.risk_score,
          cells
        };
      });

      return {
        success: true,
        periods: periods.map(p => p.label),
        stakeholders: heatmapData,
        sortOptions: ['influence', 'power', 'risk']
      };
    } catch (error) {
      console.error('[VisualInsights] Error generating heatmap:', error);
      return this.getEmptyHeatmap();
    }
  }

  /**
   * Calculate engagement level for a specific time period
   */
  calculateEngagementCell(stakeholderId, period) {
    const interactions = db.prepare(`
      SELECT * FROM interactions
      WHERE stakeholder_id = ?
        AND date >= ?
        AND date < ?
      ORDER BY date DESC
    `).all(stakeholderId, period.start, period.end);

    // Get stakeholder current state
    const stakeholder = db.prepare('SELECT * FROM stakeholders WHERE id = ?').get(stakeholderId);

    if (interactions.length === 0) {
      return {
        level: 'no_data',
        color: '#e2e8f0',
        tooltip: 'No interactions in this period',
        interactionCount: 0
      };
    }

    // Determine engagement level based on:
    // - Engagement status
    // - Interaction frequency
    // - Follow-up patterns
    const level = this.determineEngagementLevel(stakeholder, interactions);
    const color = this.getEngagementColor(level);

    const lastInteraction = interactions[0];

    return {
      level,
      color,
      tooltip: `${interactions.length} interaction${interactions.length > 1 ? 's' : ''} | Last: ${lastInteraction.interaction_type}`,
      interactionCount: interactions.length,
      lastInteractionDate: lastInteraction.date,
      lastInteractionType: lastInteraction.interaction_type
    };
  }

  /**
   * Determine engagement level
   */
  determineEngagementLevel(stakeholder, interactions) {
    const { engagement_status, risk_score } = stakeholder;

    // High risk
    if (risk_score >= 14) {
      return 'high_risk';
    }

    // Based on engagement status
    if (engagement_status === 'supportive' && interactions.length >= 2) {
      return 'engaged';
    }

    if (engagement_status === 'resistant') {
      return 'resistant';
    }

    // Neutral or declining
    if (interactions.length === 1) {
      return 'declining';
    }

    return 'neutral';
  }

  /**
   * Get color for engagement level
   */
  getEngagementColor(level) {
    const colors = {
      engaged: '#10b981',      // Green - supportive/responsive
      neutral: '#fbbf24',      // Yellow - neutral/decreasing
      declining: '#fbbf24',    // Yellow
      resistant: '#f97316',    // Orange - resistant
      high_risk: '#ef4444',    // Red - high-risk
      no_data: '#e2e8f0'       // Grey - no data
    };

    return colors[level] || colors.no_data;
  }

  /**
   * Calculate week periods for heatmap
   */
  calculateWeekPeriods(weeks) {
    const periods = [];
    const now = new Date();

    for (let i = weeks - 1; i >= 0; i--) {
      const end = new Date(now);
      end.setDate(end.getDate() - (i * 7));

      const start = new Date(end);
      start.setDate(start.getDate() - 7);

      periods.push({
        start: start.toISOString().split('T')[0],
        end: end.toISOString().split('T')[0],
        label: this.formatWeekLabel(start)
      });
    }

    return periods;
  }

  /**
   * Format week label
   */
  formatWeekLabel(date) {
    const month = date.toLocaleDateString('en-US', { month: 'short' });
    const day = date.getDate();
    return `${month} ${day}`;
  }

  /**
   * Generate Risk History Timeline Data
   * Shows risk score evolution over time
   *
   * @param {number} projectId - Optional project filter
   * @param {number} stakeholderId - Optional stakeholder filter
   * @param {number} days - Number of days to show (default 90)
   * @returns {Object} Timeline data
   */
  generateRiskTimeline(projectId = null, stakeholderId = null, days = 90) {
    try {
      let stakeholders = [];

      if (stakeholderId) {
        const s = db.prepare('SELECT * FROM stakeholders WHERE id = ?').get(stakeholderId);
        if (s) stakeholders = [s];
      } else if (projectId) {
        stakeholders = db.prepare('SELECT * FROM stakeholders WHERE project_id = ?').all(projectId);
      } else {
        stakeholders = db.prepare('SELECT * FROM stakeholders').all();
      }

      if (stakeholders.length === 0) {
        return this.getEmptyTimeline();
      }

      // Calculate time points
      const timePoints = this.calculateTimePoints(days);

      // Build timeline data
      const timelines = stakeholders.map(stakeholder => {
        const dataPoints = timePoints.map(point => {
          const risk = this.calculateHistoricalRisk(stakeholder, point);
          return {
            date: point.date,
            riskScore: risk.score,
            events: risk.events
          };
        });

        return {
          stakeholderId: stakeholder.id,
          stakeholderName: stakeholder.name,
          currentRisk: stakeholder.risk_score,
          dataPoints
        };
      });

      return {
        success: true,
        timelines,
        maxRisk: 20,
        timeRange: { start: timePoints[0].date, end: timePoints[timePoints.length - 1].date }
      };
    } catch (error) {
      console.error('[VisualInsights] Error generating timeline:', error);
      return this.getEmptyTimeline();
    }
  }

  /**
   * Calculate historical risk at a point in time
   */
  calculateHistoricalRisk(stakeholder, timePoint) {
    // Get interactions up to this point
    const interactions = db.prepare(`
      SELECT * FROM interactions
      WHERE stakeholder_id = ?
        AND date <= ?
      ORDER BY date DESC
    `).all(stakeholder.id, timePoint.date);

    const daysSince = this.calculateDaysSince(interactions[0]?.date, timePoint.date);

    // Simple risk calculation (power + influence + engagement penalty + silence penalty)
    let risk = stakeholder.power + stakeholder.influence;

    const engagementPenalty = {
      supportive: 0,
      neutral: 2,
      resistant: 4
    };
    risk += engagementPenalty[stakeholder.engagement_status] || 2;

    if (daysSince > 14) {
      risk += 3;
    }

    // Check for events on this date
    const events = this.getEventsForDate(stakeholder.id, timePoint.date);

    return {
      score: Math.min(risk, 20),
      events
    };
  }

  /**
   * Get events for a specific date
   */
  getEventsForDate(stakeholderId, date) {
    const interactions = db.prepare(`
      SELECT * FROM interactions
      WHERE stakeholder_id = ?
        AND date = ?
    `).all(stakeholderId, date);

    return interactions.map(i => ({
      type: i.interaction_type,
      summary: i.summary
    }));
  }

  /**
   * Calculate days since date
   */
  calculateDaysSince(fromDate, toDate) {
    if (!fromDate) return 999;

    const from = new Date(fromDate);
    const to = new Date(toDate);
    const diffTime = to - from;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays;
  }

  /**
   * Calculate time points for timeline
   */
  calculateTimePoints(days) {
    const points = [];
    const now = new Date();

    // Sample every few days to avoid too many points
    const interval = Math.max(1, Math.floor(days / 30)); // Max 30 points

    for (let i = days; i >= 0; i -= interval) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);

      points.push({
        date: date.toISOString().split('T')[0],
        timestamp: date.getTime()
      });
    }

    return points;
  }

  /**
   * Generate Influence Network Data
   * Shows relationship dynamics and influence patterns
   *
   * @param {number} projectId - Optional project filter
   * @returns {Object} Network graph data
   */
  generateInfluenceNetwork(projectId = null) {
    try {
      const stakeholders = projectId
        ? db.prepare('SELECT * FROM stakeholders WHERE project_id = ?').all(projectId)
        : db.prepare('SELECT * FROM stakeholders').all();

      if (stakeholders.length === 0) {
        return this.getEmptyNetwork();
      }

      // Build nodes
      const nodes = stakeholders.map(s => ({
        id: s.id,
        name: s.name,
        role: s.role,
        power: s.power,
        influence: s.influence,
        engagement: s.engagement_status,
        size: this.calculateNodeSize(s.influence),
        color: this.getNodeColor(s.engagement_status),
        category: this.categorizeStakeholder(s)
      }));

      // Build edges (inferred from shared projects and influence levels)
      const edges = this.inferInfluenceEdges(stakeholders);

      return {
        success: true,
        nodes,
        edges,
        categories: ['decision_driver', 'blocker', 'champion', 'observer']
      };
    } catch (error) {
      console.error('[VisualInsights] Error generating network:', error);
      return this.getEmptyNetwork();
    }
  }

  /**
   * Calculate node size based on influence
   */
  calculateNodeSize(influence) {
    return 20 + (influence * 8); // Range: 28-60
  }

  /**
   * Get node color based on engagement
   */
  getNodeColor(engagement) {
    const colors = {
      supportive: '#10b981',
      neutral: '#64748b',
      resistant: '#ef4444'
    };

    return colors[engagement] || colors.neutral;
  }

  /**
   * Categorize stakeholder for network
   */
  categorizeStakeholder(stakeholder) {
    const { power, influence, engagement_status } = stakeholder;

    if (power >= 4 && influence >= 4) {
      return 'decision_driver';
    }

    if (engagement_status === 'resistant' && (power >= 3 || influence >= 3)) {
      return 'blocker';
    }

    if (engagement_status === 'supportive' && influence >= 4) {
      return 'champion';
    }

    return 'observer';
  }

  /**
   * Infer influence edges between stakeholders
   */
  inferInfluenceEdges(stakeholders) {
    const edges = [];

    // Connect high-influence stakeholders to others in same project
    stakeholders.forEach((source, i) => {
      if (source.influence >= 4) {
        stakeholders.forEach((target, j) => {
          if (i !== j && source.project_id === target.project_id) {
            edges.push({
              source: source.id,
              target: target.id,
              strength: source.influence / 5,
              type: 'influences'
            });
          }
        });
      }
    });

    return edges;
  }

  /**
   * Empty state responses
   */
  getEmptyHeatmap() {
    return {
      success: true,
      periods: [],
      stakeholders: [],
      message: "Insights will appear as interactions are logged 🙂"
    };
  }

  getEmptyTimeline() {
    return {
      success: true,
      timelines: [],
      message: "Insights will appear as interactions are logged 🙂"
    };
  }

  getEmptyNetwork() {
    return {
      success: true,
      nodes: [],
      edges: [],
      message: "Insights will appear as interactions are logged 🙂"
    };
  }
}

// Singleton instance
const visualInsightsService = new VisualInsightsService();

module.exports = visualInsightsService;
