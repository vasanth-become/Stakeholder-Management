import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { stakeholderAPI, interactionAPI } from '../services/api';
import Tabs from '../components/Tabs';
import Toast from '../components/Toast';
import AIAssistantPanel from '../components/AIAssistantPanel';
import AIInsightsModal from '../components/AIInsightsModal';
import { AIService } from '../utils/aiService';

function StakeholderProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [stakeholder, setStakeholder] = useState(null);
  const [interactions, setInteractions] = useState([]);
  const [suggestions, setSuggestions] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [showAddInteraction, setShowAddInteraction] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [aiInsights, setAiInsights] = useState(null);
  const [showAIModal, setShowAIModal] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [showEngagementModal, setShowEngagementModal] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [selectedEngagement, setSelectedEngagement] = useState('');

  const [interactionForm, setInteractionForm] = useState({
    type: 'meeting',
    date: new Date().toISOString().split('T')[0],
    summary: '',
    sentiment: 'neutral',
  });

  useEffect(() => {
    loadData();
  }, [id]);

  async function loadData() {
    try {
      setLoading(true);
      const [stakeholderData, suggestionsData] = await Promise.all([
        stakeholderAPI.getWithInteractions(id),
        stakeholderAPI.getSuggestions(id),
      ]);

      setStakeholder(stakeholderData);
      setInteractions(stakeholderData.interactions || []);
      setSuggestions(suggestionsData);
      setError(null);

      // Generate AI insights
      generateAIInsights(stakeholderData, stakeholderData.interactions || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function generateAIInsights(stakeholderData, interactionsData) {
    if (!stakeholderData) return;

    setAiLoading(true);
    // Simulate API delay
    setTimeout(() => {
      const insights = AIService.generateStakeholderInsights(stakeholderData, interactionsData);
      setAiInsights(insights);
      setAiLoading(false);
    }, 500);
  }

  async function handleAddInteraction(e) {
    e.preventDefault();
    try {
      await interactionAPI.create({
        stakeholder_id: parseInt(id),
        interaction_type: interactionForm.type,
        date: interactionForm.date,
        summary: interactionForm.summary,
        outcome: interactionForm.sentiment,
        follow_up_needed: false,
      });

      setInteractionForm({
        type: 'meeting',
        date: new Date().toISOString().split('T')[0],
        summary: '',
        sentiment: 'neutral',
      });
      setShowAddInteraction(false);
      setToast({
        show: true,
        message: 'Interaction logged successfully ✓',
        type: 'success',
      });
      loadData();
    } catch (err) {
      setToast({
        show: true,
        message: 'Failed to log interaction',
        type: 'error',
      });
    }
  }

  async function handleAddNote() {
    if (!noteText.trim()) return;

    try {
      const currentNotes = stakeholder.notes || '';
      const timestamp = new Date().toLocaleString();
      const newNote = currentNotes
        ? `${currentNotes}\n\n[${timestamp}] ${noteText.trim()}`
        : `[${timestamp}] ${noteText.trim()}`;

      await stakeholderAPI.update(id, {
        ...stakeholder,
        notes: newNote,
      });

      setNoteText('');
      setShowNoteModal(false);
      setToast({
        show: true,
        message: 'Note added successfully ✓',
        type: 'success',
      });
      loadData();
    } catch (err) {
      setToast({
        show: true,
        message: 'Failed to add note',
        type: 'error',
      });
    }
  }

  async function handleChangeEngagement() {
    if (!selectedEngagement) return;

    try {
      await stakeholderAPI.update(id, {
        ...stakeholder,
        engagement_status: selectedEngagement,
      });

      setShowEngagementModal(false);
      setToast({
        show: true,
        message: 'Engagement status updated successfully ✓',
        type: 'success',
      });
      loadData();
    } catch (err) {
      setToast({
        show: true,
        message: 'Failed to update engagement status',
        type: 'error',
      });
    }
  }

  function getRiskLevel(score) {
    if (score >= 12) return 'high';
    if (score >= 7) return 'medium';
    return 'low';
  }

  function formatDateTime(dateString) {
    if (!dateString) return 'Recently';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  function closeToast() {
    setToast({ show: false, message: '', type: 'success' });
  }

  if (loading) return <div className="loading">Loading stakeholder...</div>;
  if (error) return <div className="error">Error: {error}</div>;
  if (!stakeholder) return <div className="error">Stakeholder not found</div>;

  const riskLevel = getRiskLevel(stakeholder.risk_score);

  const tabs = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'timeline', label: 'Timeline', icon: '📅', count: interactions.length },
    { id: 'notes', label: 'Notes', icon: '📝' },
    { id: 'ai-strategy', label: 'AI Strategy', icon: '✨' },
  ];

  return (
    <div className="page">
      {/* Header Card */}
      <div className="stakeholder-header-card">
        <div className="stakeholder-header-main">
          <div className="stakeholder-header-title">
            <h1>{stakeholder.name}</h1>
            <span className={`engagement-badge engagement-${stakeholder.engagement_status}`}>
              {stakeholder.engagement_status}
            </span>
            <span className={`risk-badge risk-${riskLevel}`}>
              {stakeholder.risk_score}/20 Risk
            </span>
          </div>

          <p className="stakeholder-role">{stakeholder.role}</p>

          <div className="stakeholder-meta">
            {stakeholder.company && (
              <div className="meta-item">
                <span className="meta-label">Company:</span>
                <span className="meta-value">{stakeholder.company}</span>
              </div>
            )}

            <div className="meta-item">
              <span className="meta-label">Project:</span>
              <span className="meta-value">{stakeholder.project_name}</span>
            </div>

            <div className="meta-item">
              <span className="meta-label">Preferred Channel:</span>
              <span className="meta-value">{stakeholder.preferred_channel || 'Not set'}</span>
            </div>

            {stakeholder.owner && (
              <div className="meta-item">
                <span className="meta-label">Owner:</span>
                <span className="meta-value">{stakeholder.owner}</span>
              </div>
            )}
          </div>
        </div>

        <div className="stakeholder-header-actions">
          <button className="btn btn-secondary">
            ✏️ Edit
          </button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === 'overview' && (
          <div className="overview-tab">
            {/* Key Metrics */}
            <div className="metrics-grid">
              <div className="metric-card">
                <div className="metric-label">Power Level</div>
                <div className="metric-value">{stakeholder.power}/5</div>
                <div className="metric-bar">
                  <div
                    className="metric-bar-fill"
                    style={{ width: `${(stakeholder.power / 5) * 100}%` }}
                  />
                </div>
                <div className="metric-hint">Decision-making authority</div>
              </div>

              <div className="metric-card">
                <div className="metric-label">Influence Level</div>
                <div className="metric-value">{stakeholder.influence}/5</div>
                <div className="metric-bar">
                  <div
                    className="metric-bar-fill"
                    style={{ width: `${(stakeholder.influence / 5) * 100}%` }}
                  />
                </div>
                <div className="metric-hint">Impact on others</div>
              </div>

              <div className="metric-card">
                <div className="metric-label">Engagement Status</div>
                <div className="metric-value">
                  <span className={`engagement-badge engagement-${stakeholder.engagement_status}`}>
                    {stakeholder.engagement_status}
                  </span>
                </div>
                <div className="metric-hint">Current stance</div>
              </div>

              <div className="metric-card metric-card-alert">
                <div className="metric-label">Risk Score</div>
                <div className="metric-value">
                  <span className={`risk-badge risk-${riskLevel}`}>
                    {stakeholder.risk_score}/20
                  </span>
                </div>
                <div className="metric-hint">{riskLevel.toUpperCase()} risk</div>
              </div>
            </div>

            {/* Summary */}
            <div className="card summary-card">
              <h3>Summary</h3>
              <p className="summary-text">
                {stakeholder.influence >= 4 && stakeholder.power >= 4
                  ? 'This stakeholder has high influence and high power. They are a key decision-maker.'
                  : stakeholder.influence >= 4
                  ? 'This stakeholder has high influence. They can significantly impact the project outcome.'
                  : stakeholder.power >= 4
                  ? 'This stakeholder has high decision-making power. Keep them informed and engaged.'
                  : 'Monitor this stakeholder and maintain regular communication.'}
              </p>
              {stakeholder.notes && (
                <>
                  <h4>Notes</h4>
                  <p className="notes-text">{stakeholder.notes}</p>
                </>
              )}
            </div>

            {/* AI Insights Panel */}
            <AIAssistantPanel
              title="AI Relationship Insights"
              insights={aiInsights ? {
                summary: aiInsights.relationshipSummary,
                items: aiInsights.communicationTips?.slice(0, 3) || [],
                action: aiInsights.suggestedAction ? {
                  title: aiInsights.suggestedAction.action,
                  description: `${aiInsights.suggestedAction.timing} • ${aiInsights.suggestedAction.reason}`
                } : null
              } : null}
              loading={aiLoading}
              onRefresh={() => generateAIInsights(stakeholder, interactions)}
            />

            {/* View Full AI Insights Button */}
            {aiInsights && !aiLoading && (
              <div style={{ marginTop: '1rem', marginBottom: '1.5rem' }}>
                <button
                  className="btn btn-secondary"
                  onClick={() => setShowAIModal(true)}
                  style={{ width: '100%' }}
                >
                  ✨ View Full AI Insights & Strategy
                </button>
              </div>
            )}

            {/* Quick Actions */}
            <div className="card">
              <h3>Quick Actions</h3>
              <div className="quick-actions">
                <button
                  onClick={() => {
                    setActiveTab('timeline');
                    setShowAddInteraction(true);
                  }}
                  className="action-button"
                >
                  <span className="action-icon">📝</span>
                  <div>
                    <div className="action-title">Log Interaction</div>
                    <div className="action-description">Record a meeting or conversation</div>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setNoteText('');
                    setShowNoteModal(true);
                  }}
                  className="action-button"
                >
                  <span className="action-icon">📝</span>
                  <div>
                    <div className="action-title">Add Note</div>
                    <div className="action-description">Quick note or observation</div>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setSelectedEngagement(stakeholder.engagement_status);
                    setShowEngagementModal(true);
                  }}
                  className="action-button"
                >
                  <span className="action-icon">🔄</span>
                  <div>
                    <div className="action-title">Change Engagement</div>
                    <div className="action-description">Update engagement status</div>
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'timeline' && (
          <div className="timeline-tab">
            <div className="tab-header">
              <p className="text-muted">
                {interactions.length} interaction{interactions.length !== 1 ? 's' : ''} logged
              </p>
              <button
                onClick={() => setShowAddInteraction(!showAddInteraction)}
                className="btn btn-primary btn-sm"
              >
                + Log Interaction
              </button>
            </div>

            {/* Add Interaction Form */}
            {showAddInteraction && (
              <div className="card" style={{ marginBottom: '1.5rem' }}>
                <form onSubmit={handleAddInteraction} className="project-form">
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Type</label>
                      <select
                        value={interactionForm.type}
                        onChange={(e) =>
                          setInteractionForm({ ...interactionForm, type: e.target.value })
                        }
                        className="form-select"
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
                        value={interactionForm.date}
                        onChange={(e) =>
                          setInteractionForm({ ...interactionForm, date: e.target.value })
                        }
                        className="form-input"
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Summary</label>
                    <textarea
                      value={interactionForm.summary}
                      onChange={(e) =>
                        setInteractionForm({ ...interactionForm, summary: e.target.value })
                      }
                      className="form-textarea"
                      placeholder="What was discussed?"
                      rows="3"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Sentiment</label>
                    <select
                      value={interactionForm.sentiment}
                      onChange={(e) =>
                        setInteractionForm({ ...interactionForm, sentiment: e.target.value })
                      }
                      className="form-select"
                    >
                      <option value="positive">Positive</option>
                      <option value="neutral">Neutral</option>
                      <option value="negative">Negative</option>
                    </select>
                  </div>

                  <div className="form-actions">
                    <button
                      type="button"
                      onClick={() => setShowAddInteraction(false)}
                      className="btn btn-secondary"
                    >
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-primary">
                      Log Interaction
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Timeline */}
            {interactions.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📅</div>
                <h3>No interactions yet — add one to build history 🙂</h3>
                <button
                  onClick={() => setShowAddInteraction(true)}
                  className="btn btn-primary"
                  style={{ marginTop: '1rem' }}
                >
                  + Log Interaction
                </button>
              </div>
            ) : (
              <div className="timeline">
                {interactions.map((interaction) => (
                  <div key={interaction.id} className="timeline-item">
                    <div className="timeline-marker"></div>
                    <div className="timeline-content">
                      <div className="timeline-header">
                        <span className="timeline-type">{interaction.interaction_type}</span>
                        <span className="timeline-date">{formatDateTime(interaction.date)}</span>
                      </div>
                      {interaction.summary && (
                        <p className="timeline-summary">{interaction.summary}</p>
                      )}
                      {interaction.outcome && (
                        <p className="timeline-outcome">
                          <strong>Outcome:</strong> {interaction.outcome}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'notes' && (
          <div className="notes-tab">
            <div className="tab-header">
              <p className="text-muted">
                Notes and observations about {stakeholder.name}
              </p>
              <button
                onClick={() => {
                  setNoteText('');
                  setShowNoteModal(true);
                }}
                className="btn btn-primary btn-sm"
              >
                + Add Note
              </button>
            </div>

            {stakeholder.notes ? (
              <div className="notes-list">
                {stakeholder.notes.split('\n\n').filter(note => note.trim()).map((note, index) => {
                  // Extract timestamp and content from note
                  const timestampMatch = note.match(/^\[(.*?)\]\s*(.*)/s);
                  const timestamp = timestampMatch ? timestampMatch[1] : '';
                  const content = timestampMatch ? timestampMatch[2] : note;

                  return (
                    <div key={index} className="note-item">
                      {timestamp && (
                        <div className="note-timestamp">{timestamp}</div>
                      )}
                      <div className="note-content">{content}</div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-icon">📝</div>
                <h3>No notes yet</h3>
                <p className="text-muted">Add quick notes and observations about this stakeholder</p>
                <button
                  onClick={() => {
                    setNoteText('');
                    setShowNoteModal(true);
                  }}
                  className="btn btn-primary"
                  style={{ marginTop: '1.5rem' }}
                >
                  + Add First Note
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'ai-strategy' && (
          <div className="ai-strategy-tab">
            {suggestions ? (
              <div className="ai-panel">
                <div className="ai-panel-header">
                  <h3>✨ AI Recommendation</h3>
                </div>

                <div className="ai-sections">
                  <div className="ai-section">
                    <h4>Risk Summary</h4>
                    <p>{suggestions.riskAssessment?.summary || 'Analyzing risk factors...'}</p>
                  </div>

                  <div className="ai-section">
                    <h4>Communication Strategy</h4>
                    <p>{suggestions.communicationStrategy?.approach || 'Analyzing best approach...'}</p>
                  </div>

                  <div className="ai-section">
                    <h4>Suggested Next Step</h4>
                    <p>{suggestions.nextSteps?.[0]?.action || 'Calculating recommendations...'}</p>
                  </div>

                  <div className="ai-section">
                    <h4>Recommended Frequency</h4>
                    <p>
                      {stakeholder.risk_score >= 12
                        ? 'Weekly check-ins recommended for high-risk stakeholders'
                        : stakeholder.risk_score >= 7
                        ? 'Bi-weekly check-ins recommended'
                        : 'Monthly check-ins recommended'}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-icon">✨</div>
                <h3>Loading AI recommendations...</h3>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Toast */}
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.show}
        onClose={closeToast}
      />

      {/* AI Insights Modal */}
      <AIInsightsModal
        isOpen={showAIModal}
        onClose={() => setShowAIModal(false)}
        stakeholder={stakeholder}
        insights={aiInsights}
      />

      {/* Add Note Modal */}
      {showNoteModal && (
        <div className="modal-overlay" onClick={() => setShowNoteModal(false)}>
          <div className="modal-content modal-medium" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add Note</h2>
              <button
                className="modal-close"
                onClick={() => setShowNoteModal(false)}
                aria-label="Close modal"
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label htmlFor="note" className="form-label">
                  Note
                </label>
                <textarea
                  id="note"
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  className="form-textarea"
                  placeholder="Add your note or observation..."
                  rows="4"
                  autoFocus
                />
              </div>
              <div className="form-actions">
                <button
                  type="button"
                  onClick={() => setShowNoteModal(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAddNote}
                  className="btn btn-primary"
                  disabled={!noteText.trim()}
                >
                  Add Note
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Change Engagement Modal */}
      {showEngagementModal && (
        <div className="modal-overlay" onClick={() => setShowEngagementModal(false)}>
          <div className="modal-content modal-medium" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Change Engagement Status</h2>
              <button
                className="modal-close"
                onClick={() => setShowEngagementModal(false)}
                aria-label="Close modal"
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label htmlFor="engagement" className="form-label">
                  Engagement Status
                </label>
                <select
                  id="engagement"
                  value={selectedEngagement}
                  onChange={(e) => setSelectedEngagement(e.target.value)}
                  className="form-select"
                  autoFocus
                >
                  <option value="supportive">Supportive</option>
                  <option value="neutral">Neutral</option>
                  <option value="resistant">Resistant</option>
                </select>
              </div>
              <div className="form-actions">
                <button
                  type="button"
                  onClick={() => setShowEngagementModal(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleChangeEngagement}
                  className="btn btn-primary"
                >
                  Update Status
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default StakeholderProfilePage;
