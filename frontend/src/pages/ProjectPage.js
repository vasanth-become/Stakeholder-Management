import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { projectAPI, stakeholderAPI } from '../services/api';

function ProjectPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [stakeholders, setStakeholders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddStakeholder, setShowAddStakeholder] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    role: '',
    power: 3,
    influence: 3,
    engagement_status: 'neutral',
    owner: '',
    preferred_channel: '',
    notes: ''
  });

  useEffect(() => {
    loadData();
  }, [id]);

  async function loadData() {
    try {
      setLoading(true);
      const projectData = await projectAPI.getById(id);
      const stakeholderData = await stakeholderAPI.getByProject(id);
      setProject(projectData);
      setStakeholders(stakeholderData);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddStakeholder(e) {
    e.preventDefault();
    try {
      await stakeholderAPI.create({
        project_id: parseInt(id),
        ...formData,
        power: parseInt(formData.power),
        influence: parseInt(formData.influence)
      });

      // Reset form
      setFormData({
        name: '',
        role: '',
        power: 3,
        influence: 3,
        engagement_status: 'neutral',
        owner: '',
        preferred_channel: '',
        notes: ''
      });

      setShowAddStakeholder(false);
      loadData();
    } catch (err) {
      alert('Error adding stakeholder: ' + err.message);
    }
  }

  function handleInputChange(e) {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  }

  function getRiskLevel(score) {
    // Score is out of 20
    if (score >= 14) return 'high';      // 70%+ is high risk
    if (score >= 8) return 'medium';     // 40-69% is medium risk
    return 'low';                         // <40% is low risk
  }

  if (loading) return <div className="loading">Loading...</div>;
  if (error) return <div className="error">Error: {error}</div>;
  if (!project) return <div className="error">Project not found</div>;

  return (
    <div className="project-page">
      <div className="page-header">
        <button onClick={() => navigate('/')} className="btn btn-back">← Back</button>
        <div>
          <h1>{project.name}</h1>
          <p className="text-muted">{project.description}</p>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2>Stakeholders ({stakeholders.length})</h2>
          <button onClick={() => setShowAddStakeholder(!showAddStakeholder)} className="btn btn-primary">
            + Add Stakeholder
          </button>
        </div>

        {showAddStakeholder && (
          <form onSubmit={handleAddStakeholder} className="add-stakeholder-form">
            <div className="form-grid">
              <div className="form-group">
                <label>Name *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Role</label>
                <input
                  type="text"
                  name="role"
                  value={formData.role}
                  onChange={handleInputChange}
                  placeholder="e.g., CEO, Project Manager"
                />
              </div>

              <div className="form-group">
                <label>Power (1-5) *</label>
                <input
                  type="number"
                  name="power"
                  min="1"
                  max="5"
                  value={formData.power}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Influence (1-5) *</label>
                <input
                  type="number"
                  name="influence"
                  min="1"
                  max="5"
                  value={formData.influence}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Engagement Status *</label>
                <select
                  name="engagement_status"
                  value={formData.engagement_status}
                  onChange={handleInputChange}
                  required
                >
                  <option value="supportive">Supportive</option>
                  <option value="neutral">Neutral</option>
                  <option value="resistant">Resistant</option>
                </select>
              </div>

              <div className="form-group">
                <label>Owner</label>
                <input
                  type="text"
                  name="owner"
                  value={formData.owner}
                  onChange={handleInputChange}
                  placeholder="Who manages this stakeholder?"
                />
              </div>

              <div className="form-group">
                <label>Preferred Channel</label>
                <input
                  type="text"
                  name="preferred_channel"
                  value={formData.preferred_channel}
                  onChange={handleInputChange}
                  placeholder="e.g., Email, Phone, In-person"
                />
              </div>
            </div>

            <div className="form-group">
              <label>Notes</label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                rows="3"
                placeholder="Additional notes about this stakeholder..."
              />
            </div>

            <div className="form-actions">
              <button type="submit" className="btn btn-primary">Add Stakeholder</button>
              <button type="button" onClick={() => setShowAddStakeholder(false)} className="btn btn-secondary">
                Cancel
              </button>
            </div>
          </form>
        )}

        <div className="stakeholder-table">
          {stakeholders.length === 0 ? (
            <p className="empty-state">No stakeholders yet. Add one to get started!</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Role</th>
                  <th>Power</th>
                  <th>Influence</th>
                  <th>Engagement</th>
                  <th>Risk Score</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {stakeholders.map(stakeholder => (
                  <tr key={stakeholder.id} className={stakeholder.risk_score >= 12 ? 'row-at-risk' : ''}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <strong>{stakeholder.name}</strong>
                        {stakeholder.risk_score >= 12 && (
                          <span className="badge badge-at-risk">AT RISK</span>
                        )}
                      </div>
                    </td>
                    <td>{stakeholder.role || '-'}</td>
                    <td>{stakeholder.power}/5</td>
                    <td>{stakeholder.influence}/5</td>
                    <td>
                      <span className={`badge badge-${stakeholder.engagement_status}`}>
                        {stakeholder.engagement_status}
                      </span>
                    </td>
                    <td>
                      <span className={`risk-badge risk-${getRiskLevel(stakeholder.risk_score)}`}>
                        {stakeholder.risk_score}/20
                      </span>
                    </td>
                    <td>
                      <button
                        onClick={() => navigate(`/stakeholder/${stakeholder.id}`)}
                        className="btn btn-small"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

export default ProjectPage;
