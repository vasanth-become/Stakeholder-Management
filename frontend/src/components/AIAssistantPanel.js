import React, { useState } from 'react';

function AIAssistantPanel({
  title = "AI Assistant",
  insights = null,
  loading = false,
  onRefresh = null,
  compact = false,
  className = ""
}) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div className={`ai-assistant-panel ${compact ? 'ai-assistant-compact' : ''} ${className}`}>
      <div className="ai-assistant-header">
        <div className="ai-assistant-title">
          <span className="ai-icon">✨</span>
          <h3>{title}</h3>
        </div>
        <div className="ai-assistant-actions">
          {onRefresh && (
            <button
              className="ai-action-btn"
              onClick={onRefresh}
              disabled={loading}
              title="Refresh insights"
            >
              🔄
            </button>
          )}
          <button
            className="ai-action-btn"
            onClick={() => setDismissed(true)}
            title="Dismiss"
          >
            ✕
          </button>
        </div>
      </div>

      <div className="ai-assistant-content">
        {loading ? (
          <div className="ai-loading">
            <div className="ai-loading-spinner"></div>
            <p>Generating insights...</p>
          </div>
        ) : insights ? (
          <div className="ai-insights">
            {insights.summary && (
              <p className="ai-summary">{insights.summary}</p>
            )}

            {insights.items && insights.items.length > 0 && (
              <ul className="ai-insights-list">
                {insights.items.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            )}

            {insights.action && (
              <div className="ai-action-suggestion">
                <div className="ai-action-icon">→</div>
                <div>
                  <strong>{insights.action.title}</strong>
                  {insights.action.description && (
                    <p>{insights.action.description}</p>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          <p className="ai-empty-state">No insights available</p>
        )}
      </div>

      <div className="ai-assistant-footer">
        <span className="ai-disclaimer">AI-generated suggestions • Review before acting</span>
      </div>
    </div>
  );
}

export default AIAssistantPanel;
