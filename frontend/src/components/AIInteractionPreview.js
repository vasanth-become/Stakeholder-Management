import React, { useState, useEffect } from 'react';
import './AIInteractionPreview.css';

function AIInteractionPreview({ processedData, onSave, onCancel, stakeholderId }) {
  const [formData, setFormData] = useState({
    type: '',
    date: '',
    stakeholdersInvolved: [],
    summary: '',
    sentiment: '',
    concerns: [],
    actionItems: [],
    owner: '',
    followUpTiming: '',
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Initialize form data from processed data
  useEffect(() => {
    if (processedData) {
      setFormData({
        type: processedData.interactionType || 'meeting',
        date: processedData.dateTime ? processedData.dateTime.split('T')[0] : new Date().toISOString().split('T')[0],
        stakeholdersInvolved: processedData.stakeholdersInvolved || [],
        summary: processedData.summary || '',
        sentiment: processedData.outcomeSentiment || 'neutral',
        concerns: processedData.keyConcerns || [],
        actionItems: processedData.actionItems || [],
        owner: processedData.owner || '',
        followUpTiming: processedData.suggestedFollowUp?.timing || '',
      });
    }
  }, [processedData]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleArrayAdd = (field, value) => {
    if (value.trim()) {
      setFormData(prev => ({
        ...prev,
        [field]: [...prev[field], value.trim()]
      }));
    }
  };

  const handleArrayRemove = (field, index) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index)
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    try {
      // Prepare data for backend
      const interactionData = {
        stakeholder_id: parseInt(stakeholderId),
        interaction_type: formData.type,
        date: formData.date,
        summary: formData.summary,
        outcome: formData.sentiment,
        follow_up_needed: formData.actionItems.length > 0 || formData.concerns.length > 0,
        concerns: formData.concerns.length > 0 ? JSON.stringify(formData.concerns) : null,
        action_items: formData.actionItems.length > 0 ? JSON.stringify(formData.actionItems) : null,
        owner: formData.owner || null,
        ai_confidence_score: processedData.aiConfidence || null,
        ai_generated: true,
        stakeholders_involved: formData.stakeholdersInvolved.length > 0 ? JSON.stringify(formData.stakeholdersInvolved) : null,
      };

      // Call the save callback
      await onSave(interactionData);
    } catch (err) {
      console.error('Save error:', err);
      setError(err.message || 'Failed to save interaction');
    } finally {
      setSaving(false);
    }
  };

  const getConfidenceColor = (score) => {
    if (score >= 0.8) return '#10b981'; // green
    if (score >= 0.6) return '#f59e0b'; // yellow
    return '#ef4444'; // red
  };

  const getConfidenceLabel = (score) => {
    if (score >= 0.8) return 'High Confidence';
    if (score >= 0.6) return 'Medium Confidence';
    return 'Low Confidence';
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content modal-large ai-preview-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2>✨ Review AI-Generated Interaction</h2>
            <p className="modal-subtitle">
              Review and edit the details before saving
            </p>
          </div>
          <button
            className="modal-close"
            onClick={onCancel}
            aria-label="Close modal"
            disabled={saving}
          >
            ×
          </button>
        </div>

        <div className="modal-body">
          {/* AI Confidence Badge */}
          <div className="ai-confidence-badge" style={{
            background: `${getConfidenceColor(processedData.aiConfidence)}15`,
            borderColor: getConfidenceColor(processedData.aiConfidence)
          }}>
            <span className="confidence-icon">🤖</span>
            <span className="confidence-label" style={{ color: getConfidenceColor(processedData.aiConfidence) }}>
              {getConfidenceLabel(processedData.aiConfidence)}
            </span>
            <span className="confidence-score">
              {Math.round(processedData.aiConfidence * 100)}%
            </span>
          </div>

          {/* Form Fields */}
          <div className="preview-form">
            {/* Basic Info */}
            <div className="form-section">
              <h3 className="section-title">Basic Information</h3>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Interaction Type</label>
                  <select
                    value={formData.type}
                    onChange={(e) => handleChange('type', e.target.value)}
                    className="form-select"
                    disabled={saving}
                  >
                    <option value="meeting">Meeting</option>
                    <option value="call">Call</option>
                    <option value="email">Email</option>
                    <option value="update">Update</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Date</label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => handleChange('date', e.target.value)}
                    className="form-input"
                    disabled={saving}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Summary</label>
                <textarea
                  value={formData.summary}
                  onChange={(e) => handleChange('summary', e.target.value)}
                  className="form-textarea"
                  rows="3"
                  disabled={saving}
                  placeholder="Brief summary of the interaction"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Outcome Sentiment</label>
                  <select
                    value={formData.sentiment}
                    onChange={(e) => handleChange('sentiment', e.target.value)}
                    className="form-select"
                    disabled={saving}
                  >
                    <option value="positive">✅ Positive</option>
                    <option value="neutral">➖ Neutral</option>
                    <option value="negative">⚠️ Negative</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Owner (Optional)</label>
                  <input
                    type="text"
                    value={formData.owner}
                    onChange={(e) => handleChange('owner', e.target.value)}
                    className="form-input"
                    placeholder="Who's responsible?"
                    disabled={saving}
                  />
                </div>
              </div>
            </div>

            {/* Stakeholders Involved */}
            {formData.stakeholdersInvolved.length > 0 && (
              <div className="form-section">
                <h3 className="section-title">Stakeholders Involved</h3>
                <div className="chip-list">
                  {formData.stakeholdersInvolved.map((stakeholder, index) => (
                    <div key={index} className="chip chip-stakeholder">
                      <span>{stakeholder}</span>
                      <button
                        onClick={() => handleArrayRemove('stakeholdersInvolved', index)}
                        className="chip-remove"
                        disabled={saving}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Key Concerns */}
            <div className="form-section">
              <h3 className="section-title">
                Key Concerns
                {formData.concerns.length > 0 && (
                  <span className="count-badge">{formData.concerns.length}</span>
                )}
              </h3>
              {formData.concerns.length > 0 ? (
                <div className="concerns-list">
                  {formData.concerns.map((concern, index) => (
                    <div key={index} className="concern-item">
                      <span className="concern-icon">⚠️</span>
                      <span className="concern-text">{concern}</span>
                      <button
                        onClick={() => handleArrayRemove('concerns', index)}
                        className="concern-remove"
                        disabled={saving}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="empty-message">No concerns identified</p>
              )}
            </div>

            {/* Action Items */}
            <div className="form-section">
              <h3 className="section-title">
                Action Items
                {formData.actionItems.length > 0 && (
                  <span className="count-badge">{formData.actionItems.length}</span>
                )}
              </h3>
              {formData.actionItems.length > 0 ? (
                <div className="actions-list">
                  {formData.actionItems.map((action, index) => (
                    <div key={index} className="action-item">
                      <span className="action-checkbox">☐</span>
                      <span className="action-text">{action}</span>
                      <button
                        onClick={() => handleArrayRemove('actionItems', index)}
                        className="action-remove"
                        disabled={saving}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="empty-message">No action items identified</p>
              )}
            </div>

            {/* Follow-up Suggestion */}
            {formData.followUpTiming && (
              <div className="form-section">
                <h3 className="section-title">Suggested Follow-up</h3>
                <div className="follow-up-suggestion">
                  <span className="followup-icon">📅</span>
                  <span className="followup-text">{formData.followUpTiming}</span>
                </div>
              </div>
            )}
          </div>

          {/* Error Display */}
          {error && (
            <div className="preview-error">
              <span className="error-icon">⚠️</span>
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="modal-footer">
          <button
            type="button"
            onClick={onCancel}
            className="btn btn-secondary"
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="btn btn-primary"
            disabled={saving || !formData.summary.trim()}
          >
            {saving ? (
              <>
                <span className="spinner"></span>
                Saving...
              </>
            ) : (
              'Save to Timeline'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default AIInteractionPreview;
