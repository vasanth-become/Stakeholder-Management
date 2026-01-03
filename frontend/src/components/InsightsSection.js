import React, { useState, useEffect } from 'react';
import InsightCard from './InsightCard';
import './InsightsSection.css';

/**
 * InsightsSection Component
 *
 * Container for displaying multiple insights
 * Handles loading, filtering, and dismissal
 */
function InsightsSection({
  title = 'Insights',
  insights = [],
  loading = false,
  onInsightAction,
  onInsightDismiss,
  showHeader = true,
  maxDisplay = 8,
  compact = false
}) {
  const [displayedInsights, setDisplayedInsights] = useState([]);
  const [dismissedIds, setDismissedIds] = useState(new Set());

  useEffect(() => {
    // Filter out dismissed insights
    const filtered = insights.filter((insight, index) => {
      const insightId = insight.id || `${insight.type}_${index}`;
      return !dismissedIds.has(insightId);
    });

    // Limit display
    setDisplayedInsights(filtered.slice(0, maxDisplay));
  }, [insights, dismissedIds, maxDisplay]);

  const handleDismiss = (insight) => {
    const insightId = insight.id || `${insight.type}_${Math.random()}`;
    setDismissedIds(prev => new Set([...prev, insightId]));

    if (onInsightDismiss) {
      onInsightDismiss(insight);
    }
  };

  const handleAction = (insight) => {
    if (onInsightAction) {
      onInsightAction(insight);
    }
  };

  if (loading) {
    return (
      <div className={`insights-section ${compact ? 'insights-compact' : ''}`}>
        {showHeader && (
          <div className="insights-header">
            <h3 className="insights-title">{title}</h3>
          </div>
        )}
        <div className="insights-loading">
          <div className="insights-loading-spinner" />
          <p>Loading insights...</p>
        </div>
      </div>
    );
  }

  if (displayedInsights.length === 0 && insights.length === 0) {
    return null; // Don't show section if no insights
  }

  if (displayedInsights.length === 0 && dismissedIds.size > 0) {
    // All insights have been dismissed
    return (
      <div className={`insights-section ${compact ? 'insights-compact' : ''}`}>
        {showHeader && (
          <div className="insights-header">
            <h3 className="insights-title">{title}</h3>
          </div>
        )}
        <div className="insights-empty">
          <p>All insights cleared 👍</p>
        </div>
      </div>
    );
  }

  // Group insights by category for rendering
  const groupedInsights = groupByCategory(displayedInsights);

  return (
    <div className={`insights-section ${compact ? 'insights-compact' : ''}`}>
      {showHeader && (
        <div className="insights-header">
          <h3 className="insights-title">{title}</h3>
          <span className="insights-count">{displayedInsights.length}</span>
        </div>
      )}

      <div className="insights-list">
        {groupedInsights.map((group, groupIndex) => (
          <div key={groupIndex} className="insights-category-group">
            {group.showLabel && !compact && (
              <div className="insights-category-label">
                {getCategoryLabel(group.category)}
              </div>
            )}

            {group.insights.map((insight, index) => (
              <InsightCard
                key={insight.id || `${insight.type}_${index}`}
                insight={insight}
                onAction={handleAction}
                onDismiss={handleDismiss}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Group insights by category
 */
function groupByCategory(insights) {
  const groups = [];
  let currentCategory = null;

  insights.forEach(insight => {
    const category = insight.category || 'info';

    if (category !== currentCategory) {
      groups.push({
        category,
        showLabel: groups.length > 0, // Show label for all but first group
        insights: [insight]
      });
      currentCategory = category;
    } else {
      groups[groups.length - 1].insights.push(insight);
    }
  });

  return groups;
}

/**
 * Get human-friendly category label
 */
function getCategoryLabel(category) {
  switch (category) {
    case 'danger':
      return 'Critical';
    case 'warning':
      return 'Needs Attention';
    case 'success':
      return 'Positive Signals';
    case 'info':
      return 'Recommendations';
    default:
      return '';
  }
}

export default InsightsSection;
