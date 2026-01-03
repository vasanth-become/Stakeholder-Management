import React from 'react';
import { useNavigate } from 'react-router-dom';
import './InsightCard.css';

/**
 * InsightCard Component
 *
 * Displays a single insight with:
 * - Soft card layout
 * - Icon + headline
 * - Short explanation
 * - Optional call to action
 * - Calm, helpful tone
 */
function InsightCard({ insight, onAction, onDismiss }) {
  const navigate = useNavigate();

  const handleAction = () => {
    if (onAction) {
      onAction(insight);
    }

    // Default actions based on insight type
    if (insight.stakeholderIds && insight.stakeholderIds.length === 1) {
      // Single stakeholder - navigate to profile
      navigate(`/stakeholders/${insight.stakeholderIds[0]}`);
    } else if (insight.stakeholderIds && insight.stakeholderIds.length > 1) {
      // Multiple stakeholders - navigate to filtered list
      navigate('/stakeholders');
    }
  };

  const handleDismiss = () => {
    if (onDismiss) {
      onDismiss(insight);
    }
  };

  const getCategoryClass = () => {
    switch (insight.category) {
      case 'danger':
        return 'insight-danger';
      case 'warning':
        return 'insight-warning';
      case 'success':
        return 'insight-success';
      case 'info':
      default:
        return 'insight-info';
    }
  };

  // Empty state insight
  if (insight.type === 'empty_state') {
    return (
      <div className="insight-card insight-empty-state">
        <div className="insight-icon">{insight.icon || '💡'}</div>
        <div className="insight-content">
          <h4 className="insight-title">{insight.title}</h4>
          <p className="insight-message">{insight.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`insight-card ${getCategoryClass()}`}>
      {/* Dismiss button */}
      {onDismiss && (
        <button
          className="insight-dismiss"
          onClick={handleDismiss}
          aria-label="Dismiss"
          title="Dismiss this insight"
        >
          ×
        </button>
      )}

      {/* Icon */}
      <div className="insight-icon">{insight.icon || '💡'}</div>

      {/* Content */}
      <div className="insight-content">
        <h4 className="insight-title">{insight.title}</h4>
        <p className="insight-message">{insight.message}</p>

        {/* Action button */}
        {insight.actionable && insight.action && (
          <button className="insight-action" onClick={handleAction}>
            {insight.action} →
          </button>
        )}
      </div>

      {/* Category indicator dot */}
      <div className="insight-category-indicator" />
    </div>
  );
}

export default InsightCard;
