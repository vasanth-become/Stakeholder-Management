import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { stakeholderAPI, interactionAPI } from '../services/api';

function StakeholderPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [stakeholder, setStakeholder] = useState(null);
  const [interactions, setInteractions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddInteraction, setShowAddInteraction] = useState(false);

  // Interaction form state
  const [interactionForm, setInteractionForm] = useState({
    interaction_type: '',
    date: new Date().toISOString().split('T')[0],
    summary: '',
    outcome: '',
    follow_up_needed: false
  });

  useEffect(() => {
    loadData();
  }, [id]);

  async function loadData() {
    try {
      setLoading(true);
      const stakeholderData = await stakeholderAPI.getWithInteractions(id);
      setStakeholder(stakeholderData);
      setInteractions(stakeholderData.interactions || []);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddInteraction(e) {
    e.preventDefault();
    try {
      await interactionAPI.create({
        stakeholder_id: parseInt(id),
        ...interactionForm
      });

      // Reset form
      setInteractionForm({
        interaction_type: '',
        date: new Date().toISOString().split('T')[0],
        summary: '',
        outcome: '',
        follow_up_needed: false
      });

      setShowAddInteraction(false);
      loadData();
    } catch (err) {
      alert('Error adding interaction: ' + err.message);
    }
  }

  function handleInteractionInputChange(e) {
    const { name, value, type, checked } = e.target;
    setInteractionForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  }

  function getRiskLevel(score) {
    if (score >= 7) return 'high';
    if (score >= 4) return 'medium';
    return 'low';
  }

  function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  if (loading) return <div className="loading">Loading...</div>;
  if (error) return <div className="error">Error: {error}</div>;
  if (!stakeholder) return <div className="error">Stakeholder not found</div>;

  const riskLevel = getRiskLevel(stakeholder.risk_score);

  return (
    <div className="stakeholder-page">
      <div className="page-header">
        <button onClick={() => navigate(-1)} className="btn btn-back">← Back</button>
      </div>

      {/* Stakeholder Details Card */}
      <div className="card stakeholder-details">
        <div className="stakeholder-header">
          <div>
            <h1>{stakeholder.name}</h1>
            <p className="text-muted">{stakeholder.role || 'No role specified'}</p>
          </div>
          <div className={`risk-score-large risk-${riskLevel}`}>
            <div className="risk-label">Risk Score</div>
            <div className="risk-value">{stakeholder.risk_score}</div>
            <div className="risk-level">{riskLevel.toUpperCase()}</div>
          </div>
        </div>

        <div className="details-grid">
          <div className="detail-item">
            <label>Power</label>
            <div className="rating-bar">
              <div className="rating-fill" style={{ width: `${(stakeholder.power / 5) * 100}%` }} />
              <span>{stakeholder.power}/5</span>
            </div>
          </div>

          <div className="detail-item">
            <label>Influence</label>
            <div className="rating-bar">
              <div className="rating-fill" style={{ width: `${(stakeholder.influence / 5) * 100}%` }} />
              <span>{stakeholder.influence}/5</span>
            </div>
          </div>

          <div className="detail-item">
            <label>Engagement Status</label>
            <span className={`badge badge-${stakeholder.engagement_status}`}>
              {stakeholder.engagement_status}
            </span>
          </div>

          <div className="detail-item">
            <label>Owner</label>
            <span>{stakeholder.owner || 'Not assigned'}</span>
          </div>

          <div className="detail-item">
            <label>Preferred Channel</label>
            <span>{stakeholder.preferred_channel || 'Not specified'}</span>
          </div>
        </div>

        {stakeholder.notes && (
          <div className="notes-section">
            <label>Notes</label>
            <p>{stakeholder.notes}</p>
          </div>
        )}
      </div>

      {/* Interactions Card */}
      <div className="card">
        <div className="card-header">
          <h2>Interaction History ({interactions.length})</h2>
          <button onClick={() => setShowAddInteraction(!showAddInteraction)} className="btn btn-primary">
            + Log Interaction
          </button>
        </div>

        {showAddInteraction && (
          <form onSubmit={handleAddInteraction} className="add-interaction-form">
            <div className="form-grid">
              <div className="form-group">
                <label>Interaction Type</label>
                <input
                  type="text"
                  name="interaction_type"
                  value={interactionForm.interaction_type}
                  onChange={handleInteractionInputChange}
                  placeholder="e.g., Meeting, Email, Phone Call"
                />
              </div>

              <div className="form-group">
                <label>Date</label>
                <input
                  type="date"
                  name="date"
                  value={interactionForm.date}
                  onChange={handleInteractionInputChange}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label>Summary</label>
              <textarea
                name="summary"
                value={interactionForm.summary}
                onChange={handleInteractionInputChange}
                rows="3"
                placeholder="What was discussed?"
              />
            </div>

            <div className="form-group">
              <label>Outcome</label>
              <textarea
                name="outcome"
                value={interactionForm.outcome}
                onChange={handleInteractionInputChange}
                rows="2"
                placeholder="What was the result?"
              />
            </div>

            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="follow_up_needed"
                  checked={interactionForm.follow_up_needed}
                  onChange={handleInteractionInputChange}
                />
                Follow-up needed
              </label>
            </div>

            <div className="form-actions">
              <button type="submit" className="btn btn-primary">Log Interaction</button>
              <button type="button" onClick={() => setShowAddInteraction(false)} className="btn btn-secondary">
                Cancel
              </button>
            </div>
          </form>
        )}

        <div className="interactions-timeline">
          {interactions.length === 0 ? (
            <p className="empty-state">No interactions logged yet</p>
          ) : (
            interactions.map(interaction => (
              <div key={interaction.id} className="interaction-item">
                <div className="interaction-date">{formatDate(interaction.date)}</div>
                <div className="interaction-content">
                  <div className="interaction-header">
                    <span className="interaction-type">{interaction.interaction_type || 'Interaction'}</span>
                    {interaction.follow_up_needed && (
                      <span className="badge badge-warning">Follow-up needed</span>
                    )}
                  </div>
                  {interaction.summary && (
                    <p className="interaction-summary">{interaction.summary}</p>
                  )}
                  {interaction.outcome && (
                    <p className="interaction-outcome">
                      <strong>Outcome:</strong> {interaction.outcome}
                    </p>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default StakeholderPage;
