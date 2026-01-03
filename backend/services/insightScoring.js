/**
 * Insight Scoring & Priority Service
 *
 * Ranks insights by relevance and importance based on:
 * 1. Risk severity
 * 2. Influence level
 * 3. Relationship decay rate
 * 4. Recency
 * 5. Owner relevance
 *
 * Ensures insights are useful, non-spammy, and limited in quantity
 */

class InsightScoring {
  /**
   * Score and rank insights
   * @param {Array} insights - Array of raw insights
   * @param {Object} context - Additional context (user, project, etc.)
   * @returns {Array} Sorted and scored insights
   */
  scoreAndRank(insights, context = {}) {
    if (!insights || insights.length === 0) {
      return [];
    }

    // Score each insight
    const scoredInsights = insights.map(insight => ({
      ...insight,
      score: this.calculateScore(insight, context)
    }));

    // Sort by score (descending) then by priority
    const sorted = scoredInsights.sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      return b.priority - a.priority;
    });

    // Limit quantity to prevent spam
    const limited = this.limitInsights(sorted, context);

    // Group by category for better organization
    const grouped = this.groupByCategory(limited);

    return grouped;
  }

  /**
   * Calculate composite score for an insight
   */
  calculateScore(insight, context) {
    let score = 0;

    // Base score from priority (0-100)
    score += insight.priority || 0;

    // Risk severity bonus (up to +30)
    if (insight.category === 'danger') {
      score += 30;
    } else if (insight.category === 'warning') {
      score += 20;
    }

    // Recency bonus (insights about recent events score higher)
    if (insight.metadata?.days_since_contact) {
      const days = insight.metadata.days_since_contact;
      if (days > 30) {
        score += 15; // Very stale
      } else if (days > 21) {
        score += 10; // Stale
      } else if (days > 14) {
        score += 5; // Moderately stale
      }
    }

    // Influence level bonus (from metadata)
    if (insight.metadata?.influence) {
      score += insight.metadata.influence * 3;
    }

    // Stakeholder count bonus (affects multiple people)
    if (insight.stakeholderIds && insight.stakeholderIds.length > 1) {
      score += Math.min(insight.stakeholderIds.length * 2, 10);
    }

    // Actionable insights score slightly higher
    if (insight.actionable) {
      score += 5;
    }

    // Owner relevance (if context includes current user)
    if (context.userId && insight.metadata?.owner === context.userId) {
      score += 10;
    }

    return Math.round(score);
  }

  /**
   * Limit insights to prevent overwhelm
   * Rules:
   * - Max 8 insights total
   * - Max 2 success signals (keep it positive, not spammy)
   * - Max 3 info/recommendations
   * - Prioritize warnings and dangers
   */
  limitInsights(insights, context) {
    const MAX_TOTAL = context.maxInsights || 8;
    const MAX_SUCCESS = 2;
    const MAX_INFO = 3;

    const categories = {
      danger: [],
      warning: [],
      success: [],
      info: []
    };

    // Group by category
    insights.forEach(insight => {
      const category = insight.category || 'info';
      if (categories[category]) {
        categories[category].push(insight);
      }
    });

    // Build final list with limits
    const limited = [
      ...categories.danger, // All danger signals
      ...categories.warning.slice(0, 4), // Up to 4 warnings
      ...categories.success.slice(0, MAX_SUCCESS), // Up to 2 success signals
      ...categories.info.slice(0, MAX_INFO) // Up to 3 info items
    ];

    return limited.slice(0, MAX_TOTAL);
  }

  /**
   * Group insights by category for better organization
   */
  groupByCategory(insights) {
    // Return flat array with category markers for rendering
    // Frontend can use this to create visual sections
    return insights.map((insight, index) => ({
      ...insight,
      rank: index + 1,
      isFirstInCategory: index === 0 || insights[index - 1].category !== insight.category
    }));
  }

  /**
   * Filter insights by project
   */
  filterByProject(insights, projectId) {
    if (!projectId) {
      return insights;
    }

    return insights.filter(insight => {
      return insight.projectId === projectId || !insight.projectId;
    });
  }

  /**
   * Filter insights by stakeholder
   */
  filterByStakeholder(insights, stakeholderId) {
    if (!stakeholderId) {
      return insights;
    }

    return insights.filter(insight => {
      return insight.stakeholderIds && insight.stakeholderIds.includes(stakeholderId);
    });
  }

  /**
   * Deduplicate similar insights
   * Prevents showing multiple insights about the same issue
   */
  deduplicate(insights) {
    const seen = new Set();
    const unique = [];

    for (const insight of insights) {
      // Create a fingerprint for this insight
      const fingerprint = `${insight.type}_${insight.stakeholderIds?.sort().join('_')}`;

      if (!seen.has(fingerprint)) {
        seen.add(fingerprint);
        unique.push(insight);
      }
    }

    return unique;
  }

  /**
   * Calculate health score for insights overview
   * Returns a 0-100 score representing overall health
   */
  calculateHealthScore(insights) {
    if (!insights || insights.length === 0) {
      return 100; // No insights = no problems
    }

    let score = 100;

    insights.forEach(insight => {
      switch (insight.category) {
        case 'danger':
          score -= 15;
          break;
        case 'warning':
          score -= 8;
          break;
        case 'info':
          score -= 2;
          break;
        case 'success':
          score += 5; // Success insights improve score
          break;
      }
    });

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Get insight statistics for analytics
   */
  getInsightStats(insights) {
    const stats = {
      total: insights.length,
      byCategory: {
        danger: 0,
        warning: 0,
        success: 0,
        info: 0
      },
      byType: {},
      actionable: 0,
      stakeholdersAffected: new Set()
    };

    insights.forEach(insight => {
      // Category counts
      const category = insight.category || 'info';
      stats.byCategory[category]++;

      // Type counts
      stats.byType[insight.type] = (stats.byType[insight.type] || 0) + 1;

      // Actionable count
      if (insight.actionable) {
        stats.actionable++;
      }

      // Affected stakeholders
      if (insight.stakeholderIds) {
        insight.stakeholderIds.forEach(id => stats.stakeholdersAffected.add(id));
      }
    });

    stats.stakeholdersAffected = stats.stakeholdersAffected.size;

    return stats;
  }
}

// Singleton instance
const insightScoring = new InsightScoring();

module.exports = insightScoring;
