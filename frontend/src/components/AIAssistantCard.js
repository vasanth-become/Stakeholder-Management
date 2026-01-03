import React, { useState, useEffect } from 'react';
import { aiAPI } from '../services/api';
import './AIAssistantCard.css';

/**
 * AIAssistantCard Component
 *
 * Calm, supportive AI relationship intelligence card
 * Displays AI-generated insights about stakeholders
 */
function AIAssistantCard({ stakeholderId, type = 'coach' }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    if (stakeholderId) {
      loadAIInsights();
    }
  }, [stakeholderId, type]);

  async function loadAIInsights() {
    try {
      setLoading(true);
      setError(null);

      let response;
      switch (type) {
        case 'coach':
          response = await aiAPI.getCoach(stakeholderId);
          aiAPI.track('ai_coach_viewed', { stakeholder_id: stakeholderId });
          break;
        case 'risk':
          response = await aiAPI.getRiskAnalysis(stakeholderId);
          break;
        case 'prep':
          response = await aiAPI.getMeetingPrep(stakeholderId);
          aiAPI.track('ai_meeting_prep_viewed', { stakeholder_id: stakeholderId });
          break;
        default:
          throw new Error('Invalid AI type');
      }

      setData(response);
    } catch (err) {
      console.error('Failed to load AI insights:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const renderCoachInsights = () => {
    const insights = data.insights;

    return (
      <div className="ai-insights">
        <div className="ai-section">
          <h5 className="ai-section-label">Relationship Summary</h5>
          <p className="ai-text">{insights.summary}</p>
        </div>

        <div className="ai-section">
          <h5 className="ai-section-label">Engagement Health</h5>
          <p className="ai-text">{insights.engagement_health}</p>
        </div>

        <div className="ai-section">
          <h5 className="ai-section-label">Communication Style</h5>
          <p className="ai-text">{insights.communication_style}</p>
        </div>

        <div className="ai-section">
          <h5 className="ai-section-label">Key Priorities</h5>
          <p className="ai-text">{insights.key_priorities}</p>
        </div>

        {insights.risks !== 'None detected' && insights.risks !== 'Cannot assess - insufficient data' && (
          <div className="ai-section ai-warning">
            <h5 className="ai-section-label">⚠️ Risks</h5>
            <p className="ai-text">{insights.risks}</p>
          </div>
        )}

        <div className="ai-section ai-suggestion">
          <h5 className="ai-section-label">💡 Suggested Approach</h5>
          <p className="ai-text">{insights.suggested_approach}</p>
        </div>
      </div>
    );
  };

  const renderRiskAnalysis = () => {
    const analysis = data.riskAnalysis;

    if (!analysis.risk_detected) {
      return (
        <div className="ai-insights">
          <div className="ai-section ai-success">
            <p className="ai-text">✓ {analysis.reason}</p>
          </div>
        </div>
      );
    }

    const levelColors = {
      low: 'ai-info',
      medium: 'ai-warning',
      high: 'ai-danger'
    };

    return (
      <div className="ai-insights">
        <div className={`ai-section ${levelColors[analysis.risk_level]}`}>
          <h5 className="ai-section-label">Risk Level: {analysis.risk_level.toUpperCase()}</h5>
          <p className="ai-text">{analysis.reason}</p>
        </div>

        {analysis.evidence.length > 0 && (
          <div className="ai-section">
            <h5 className="ai-section-label">Evidence</h5>
            <ul className="ai-list">
              {analysis.evidence.map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="ai-section ai-suggestion">
          <h5 className="ai-section-label">💡 Suggested Next Step</h5>
          <p className="ai-text">{analysis.suggested_next_step}</p>
        </div>

        <div className="ai-disclaimer">
          <small>{analysis.tone}</small>
        </div>
      </div>
    );
  };

  const renderMeetingPrep = () => {
    const prep = data.prepBrief;

    return (
      <div className="ai-insights">
        <div className="ai-section">
          <h5 className="ai-section-label">Relationship State</h5>
          <p className="ai-text">{prep.relationship_state}</p>
        </div>

        {prep.last_interaction_summary && prep.last_interaction_summary !== 'No previous interactions recorded.' && (
          <div className="ai-section">
            <h5 className="ai-section-label">Last Interaction</h5>
            <p className="ai-text">{prep.last_interaction_summary}</p>
          </div>
        )}

        {prep.context_reminders.length > 0 && (
          <div className="ai-section">
            <h5 className="ai-section-label">Context Reminders</h5>
            <ul className="ai-list">
              {prep.context_reminders.map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          </div>
        )}

        {prep.suggested_talking_points.length > 0 && (
          <div className="ai-section ai-suggestion">
            <h5 className="ai-section-label">💡 Suggested Talking Points</h5>
            <ul className="ai-list">
              {prep.suggested_talking_points.map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="ai-section">
          <h5 className="ai-section-label">Tone Recommendation</h5>
          <p className="ai-text">{prep.tone_recommendation}</p>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="ai-assistant-card">
        <div className="ai-header">
          <div className="ai-title">
            <span className="ai-icon">✨</span>
            <h4>AI Assistant</h4>
          </div>
        </div>
        <div className="ai-loading">
          <div className="ai-spinner" />
          <p>Analyzing relationship data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="ai-assistant-card">
        <div className="ai-header">
          <div className="ai-title">
            <span className="ai-icon">✨</span>
            <h4>AI Assistant</h4>
          </div>
        </div>
        <div className="ai-error">
          <p>Unable to load AI insights</p>
          <button onClick={loadAIInsights} className="ai-retry-btn">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const titles = {
    coach: 'Relationship Intelligence',
    risk: 'Risk Analysis',
    prep: 'Meeting Preparation'
  };

  return (
    <div className="ai-assistant-card">
      <div className="ai-header">
        <div className="ai-title">
          <span className="ai-icon">✨</span>
          <h4>AI Assistant</h4>
          <span className="ai-subtitle">{titles[type]}</span>
        </div>
        <button
          className="ai-toggle"
          onClick={() => setExpanded(!expanded)}
          aria-label={expanded ? 'Collapse' : 'Expand'}
        >
          {expanded ? '−' : '+'}
        </button>
      </div>

      {expanded && (
        <>
          {type === 'coach' && renderCoachInsights()}
          {type === 'risk' && renderRiskAnalysis()}
          {type === 'prep' && renderMeetingPrep()}

          <div className="ai-disclaimer">
            <small>
              💡 AI-generated insights based on available data. Please review and apply your judgment.
            </small>
          </div>
        </>
      )}
    </div>
  );
}

export default AIAssistantCard;
