import React, { useState } from 'react';
import './EnrichmentSuggestionPanel.css';

/**
 * EnrichmentSuggestionPanel
 *
 * Displays AI-powered profile enrichment suggestions with privacy controls
 * Shows field-by-field preview with confidence scores and accept/reject options
 */
function EnrichmentSuggestionPanel({
  suggestions,
  onAccept,
  onReject,
  onClose,
  loading = false
}) {
  const [selectedFields, setSelectedFields] = useState(new Set());

  if (!suggestions || Object.keys(suggestions).length === 0) {
    return null;
  }

  const suggestionFields = Object.entries(suggestions);

  const toggleField = (fieldName) => {
    const newSelected = new Set(selectedFields);
    if (newSelected.has(fieldName)) {
      newSelected.delete(fieldName);
    } else {
      newSelected.add(fieldName);
    }
    setSelectedFields(newSelected);
  };

  const handleAcceptAll = () => {
    const allFields = Object.keys(suggestions);
    onAccept(allFields);
  };

  const handleAcceptSelected = () => {
    if (selectedFields.size === 0) {
      return;
    }
    onAccept(Array.from(selectedFields));
  };

  const handleReject = () => {
    onReject();
  };

  const getConfidenceLabel = (confidence) => {
    if (confidence >= 0.9) return 'Very High';
    if (confidence >= 0.75) return 'High';
    if (confidence >= 0.6) return 'Medium';
    return 'Low';
  };

  const getConfidenceClass = (confidence) => {
    if (confidence >= 0.9) return 'very-high';
    if (confidence >= 0.75) return 'high';
    if (confidence >= 0.6) return 'medium';
    return 'low';
  };

  return (
    <div className="enrichment-overlay">
      <div className="enrichment-panel">
        {/* Header */}
        <div className="enrichment-header">
          <div>
            <h3>✨ Profile Enrichment Suggestions</h3>
            <p className="enrichment-subtitle">
              We found {suggestionFields.length} suggestion{suggestionFields.length !== 1 ? 's' : ''} from public sources
            </p>
          </div>
          <button
            className="close-button"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Privacy Notice */}
        <div className="privacy-notice">
          <span className="privacy-icon">🔒</span>
          <div className="privacy-text">
            <strong>Privacy Protected:</strong> All data is from public sources only.
            You control what gets saved. Nothing is stored without your approval.
          </div>
        </div>

        {/* Suggestions List */}
        <div className="suggestions-list">
          {suggestionFields.map(([fieldName, suggestion]) => (
            <div
              key={fieldName}
              className={`suggestion-item ${selectedFields.has(fieldName) ? 'selected' : ''}`}
              onClick={() => toggleField(fieldName)}
            >
              <div className="suggestion-checkbox">
                <input
                  type="checkbox"
                  checked={selectedFields.has(fieldName)}
                  onChange={() => toggleField(fieldName)}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>

              <div className="suggestion-content">
                <div className="suggestion-header-row">
                  <span className="suggestion-label">{suggestion.label}</span>
                  <span className={`confidence-badge confidence-${getConfidenceClass(suggestion.confidence)}`}>
                    {getConfidenceLabel(suggestion.confidence)} Confidence
                  </span>
                </div>

                <div className="suggestion-value">{suggestion.value}</div>

                {suggestion.source && (
                  <div className="suggestion-source">
                    Source: {suggestion.source}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="enrichment-actions">
          <button
            className="btn btn-secondary"
            onClick={handleReject}
            disabled={loading}
          >
            Dismiss All
          </button>

          <div className="primary-actions">
            {selectedFields.size > 0 && (
              <button
                className="btn btn-outline"
                onClick={handleAcceptSelected}
                disabled={loading}
              >
                Accept Selected ({selectedFields.size})
              </button>
            )}

            <button
              className="btn btn-primary"
              onClick={handleAcceptAll}
              disabled={loading}
            >
              {loading ? 'Saving...' : 'Accept All'}
            </button>
          </div>
        </div>

        {/* Help Text */}
        <div className="enrichment-help">
          <p>
            💡 <strong>Tip:</strong> Click on individual suggestions to select/deselect them,
            or use "Accept All" to apply everything at once.
          </p>
        </div>
      </div>
    </div>
  );
}

export default EnrichmentSuggestionPanel;
