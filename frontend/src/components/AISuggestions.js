import React from 'react';

function AISuggestions({ suggestions, loading }) {
  if (loading) {
    return (
      <div className="card ai-suggestions">
        <div className="card-header">
          <h2>🤖 AI Recommendations</h2>
        </div>
        <div className="loading">Analyzing stakeholder data...</div>
      </div>
    );
  }

  if (!suggestions) return null;

  const { communication_strategy, risk_assessment, next_steps, priority_level } = suggestions;

  return (
    <div className="card ai-suggestions">
      <div className="card-header">
        <div>
          <h2>🤖 AI-Powered Recommendations</h2>
          <p className="text-muted">Smart insights based on stakeholder analysis</p>
        </div>
        <span className={`priority-badge priority-${priority_level.toLowerCase()}`}>
          {priority_level} PRIORITY
        </span>
      </div>

      <div className="suggestions-grid">
        {/* Communication Strategy */}
        <div className="suggestion-section">
          <div className="suggestion-header">
            <span className="suggestion-icon">💬</span>
            <h3>Communication Strategy</h3>
          </div>

          <div className="suggestion-content">
            <div className="strategy-item">
              <label>Approach:</label>
              <p>{communication_strategy.approach}</p>
            </div>

            <div className="strategy-item">
              <label>Recommended Tone:</label>
              <p>{communication_strategy.tone}</p>
            </div>

            <div className="strategy-item">
              <label>Preferred Channel:</label>
              <p>{communication_strategy.channel}</p>
            </div>

            {communication_strategy.tips.length > 0 && (
              <div className="strategy-tips">
                <label>Key Tips:</label>
                <ul>
                  {communication_strategy.tips.map((tip, idx) => (
                    <li key={idx}>{tip}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Risk Assessment */}
        <div className="suggestion-section">
          <div className="suggestion-header">
            <span className="suggestion-icon">⚠️</span>
            <h3>Risk Assessment</h3>
          </div>

          <div className="suggestion-content">
            <div className="risk-level-display">
              <div className={`risk-indicator risk-${risk_assessment.level.toLowerCase()}`}>
                {risk_assessment.level}
              </div>
              <div className="risk-score-small">{risk_assessment.score}/20</div>
            </div>

            {risk_assessment.factors.length > 0 && (
              <div className="risk-factors">
                <label>Contributing Factors:</label>
                <ul>
                  {risk_assessment.factors.map((factor, idx) => (
                    <li key={idx}>{factor}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="risk-impact">
              <label>Impact Analysis:</label>
              <p className="impact-text">{risk_assessment.impact}</p>
            </div>
          </div>
        </div>

        {/* Next Steps */}
        <div className="suggestion-section suggestion-section-wide">
          <div className="suggestion-header">
            <span className="suggestion-icon">🎯</span>
            <h3>Recommended Actions</h3>
            {next_steps.urgency === 'urgent' && (
              <span className="urgency-badge">⚡ URGENT</span>
            )}
          </div>

          <div className="suggestion-content">
            {next_steps.recommended_actions.length === 0 ? (
              <p className="empty-state">All caught up! Continue regular engagement.</p>
            ) : (
              <div className="action-list">
                {next_steps.recommended_actions.map((action, idx) => (
                  <div key={idx} className={`action-item priority-${action.priority}`}>
                    <div className="action-header">
                      <span className="action-title">{action.action}</span>
                      <span className="action-timeline">{action.timeline}</span>
                    </div>
                    <p className="action-reason">{action.reason}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default AISuggestions;
