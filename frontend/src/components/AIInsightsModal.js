import React from 'react';

function AIInsightsModal({ isOpen, onClose, stakeholder, insights }) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-large ai-insights-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="ai-modal-title">
            <span className="ai-icon">✨</span>
            <h2>AI Insights: {stakeholder?.name}</h2>
          </div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          {insights && (
            <div className="ai-insights-detailed">
              {/* Relationship Summary */}
              {insights.relationshipSummary && (
                <div className="ai-insight-section">
                  <h3>Relationship Summary</h3>
                  <p className="ai-insight-text">{insights.relationshipSummary}</p>
                </div>
              )}

              {/* Risk Reasoning */}
              {insights.riskReasoning && (
                <div className="ai-insight-section ai-section-warning">
                  <h3>⚠️ Risk Analysis</h3>
                  <p className="ai-insight-text">{insights.riskReasoning}</p>
                </div>
              )}

              {/* What They Care About */}
              {insights.whatTheyCareAbout && insights.whatTheyCareAbout.length > 0 && (
                <div className="ai-insight-section">
                  <h3>What They Care About</h3>
                  <ul className="ai-bullet-list">
                    {insights.whatTheyCareAbout.map((item, index) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Communication Tips */}
              {insights.communicationTips && insights.communicationTips.length > 0 && (
                <div className="ai-insight-section ai-section-tips">
                  <h3>💬 Communication Tips</h3>
                  <ul className="ai-bullet-list">
                    {insights.communicationTips.map((tip, index) => (
                      <li key={index}>{tip}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Mistakes to Avoid */}
              {insights.mistakesToAvoid && insights.mistakesToAvoid.length > 0 && (
                <div className="ai-insight-section ai-section-avoid">
                  <h3>🚫 Mistakes to Avoid</h3>
                  <ul className="ai-bullet-list">
                    {insights.mistakesToAvoid.map((mistake, index) => (
                      <li key={index}>{mistake}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Suggested Action */}
              {insights.suggestedAction && (
                <div className="ai-insight-section ai-section-action">
                  <h3>→ Suggested Next Action</h3>
                  <div className="ai-action-card">
                    <div className="ai-action-main">
                      <strong>{insights.suggestedAction.action}</strong>
                      <span className="ai-action-timing">{insights.suggestedAction.timing}</span>
                    </div>
                    <p className="ai-action-reason">{insights.suggestedAction.reason}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="ai-disclaimer-box">
            <span className="ai-disclaimer-icon">ℹ️</span>
            <p>
              These insights are AI-generated based on available data.
              Always apply your own judgment and context when taking action.
            </p>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default AIInsightsModal;
