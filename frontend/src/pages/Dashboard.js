import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { projectAPI, stakeholderAPI, interactionAPI } from '../services/api';
import CreateProjectModal from '../components/CreateProjectModal';
import Toast from '../components/Toast';

function Dashboard() {
  const [projects, setProjects] = useState([]);
  const [allStakeholders, setAllStakeholders] = useState([]);
  const [highRiskStakeholders, setHighRiskStakeholders] = useState([]);
  const [stakeholderInteractions, setStakeholderInteractions] = useState({});
  const [followUpActions, setFollowUpActions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const [projectsData, stakeholdersData, atRiskStakeholders, followUpData] = await Promise.all([
        projectAPI.getAll(),
        stakeholderAPI.getAll(),
        stakeholderAPI.getAllHighRisk(),
        interactionAPI.getFollowUp(),
      ]);

      setProjects(projectsData);
      setAllStakeholders(stakeholdersData);
      setHighRiskStakeholders(atRiskStakeholders);
      setFollowUpActions(followUpData);

      // Fetch last interaction for each high-risk stakeholder
      const interactions = {};
      for (const stakeholder of atRiskStakeholders) {
        try {
          const stakeholderInteractions = await interactionAPI.getByStakeholder(stakeholder.id);
          if (stakeholderInteractions.length > 0) {
            interactions[stakeholder.id] = stakeholderInteractions[0];
          }
        } catch (err) {
          // No interactions for this stakeholder
        }
      }
      setStakeholderInteractions(interactions);

      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function getRiskLevel(score) {
    if (score >= 14) return 'high';
    if (score >= 8) return 'medium';
    return 'low';
  }

  function formatDate(dateString) {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays <= 7) return `${diffDays} days ago`;
    if (diffDays <= 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return `${Math.floor(diffDays / 30)} months ago`;
  }

  function handleProjectCreated(newProject) {
    setToast({
      show: true,
      message: 'Project created successfully 🎉',
      type: 'success',
    });

    // Reload data to reflect new project
    loadData();

    // Navigate to project detail page after a brief delay
    setTimeout(() => {
      navigate(`/project/${newProject.id}`);
    }, 1000);
  }

  function closeToast() {
    setToast({ show: false, message: '', type: 'success' });
  }

  if (loading) return <div className="loading">Loading dashboard...</div>;
  if (error) return <div className="error">Error: {error}</div>;

  const activeProjects = projects.filter(p => p.status === 'active').length;

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div>
          <h1>Dashboard</h1>
          <p className="text-muted">Overview of your stakeholder management</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn btn-primary"
        >
          + Create Project
        </button>
      </div>

      {/* Stat Cards */}
      <div className="stat-cards">
        <div className="stat-card">
          <div className="stat-icon">▢</div>
          <div className="stat-content">
            <div className="stat-value">{activeProjects}</div>
            <div className="stat-label">Active Projects</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">◉</div>
          <div className="stat-content">
            <div className="stat-value">{allStakeholders.length}</div>
            <div className="stat-label">Total Stakeholders</div>
          </div>
        </div>

        <div className="stat-card stat-card-alert">
          <div className="stat-icon">⚠</div>
          <div className="stat-content">
            <div className="stat-value">{highRiskStakeholders.length}</div>
            <div className="stat-label">High Risk Stakeholders</div>
          </div>
        </div>
      </div>

      {/* High Risk Stakeholders Table */}
      <div className="card">
        <div className="card-header">
          <div>
            <h2>High Risk Stakeholders</h2>
            <p className="text-muted">Stakeholders requiring immediate attention (risk score ≥12)</p>
          </div>
        </div>

        {highRiskStakeholders.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">✓</div>
            <p>No high-risk stakeholders</p>
            <p className="text-muted">All stakeholders are being managed well</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="stakeholder-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Role</th>
                  <th>Risk Score</th>
                  <th>Last Interaction</th>
                  <th>Owner</th>
                </tr>
              </thead>
              <tbody>
                {highRiskStakeholders.map(stakeholder => (
                  <tr
                    key={stakeholder.id}
                    onClick={() => navigate(`/stakeholder/${stakeholder.id}`)}
                    className="clickable-row"
                  >
                    <td>
                      <div className="stakeholder-name">
                        <strong>{stakeholder.name}</strong>
                        <span className="project-tag">{stakeholder.project_name}</span>
                      </div>
                    </td>
                    <td>{stakeholder.role}</td>
                    <td>
                      <span className={`risk-badge risk-${getRiskLevel(stakeholder.risk_score)}`}>
                        {stakeholder.risk_score}/20
                      </span>
                    </td>
                    <td className="text-muted">
                      {stakeholderInteractions[stakeholder.id]
                        ? formatDate(stakeholderInteractions[stakeholder.id].date)
                        : 'No interactions'}
                    </td>
                    <td>{stakeholder.owner || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* AI Suggested Actions */}
      <div className="card ai-actions-panel">
        <div className="card-header">
          <div>
            <h2>🤖 Suggested Actions</h2>
            <p className="text-muted">AI-powered recommendations based on your stakeholder data</p>
          </div>
        </div>

        <div className="actions-grid">
          {followUpActions.length > 0 && (
            <div className="action-card action-card-priority">
              <div className="action-icon">📝</div>
              <div className="action-content">
                <h3>Follow-up Required</h3>
                <p>{followUpActions.length} interaction{followUpActions.length !== 1 ? 's' : ''} marked for follow-up</p>
                <button className="action-link" onClick={() => navigate('/stakeholders')}>
                  View all →
                </button>
              </div>
            </div>
          )}

          {highRiskStakeholders.length > 0 && (
            <div className="action-card">
              <div className="action-icon">⚠️</div>
              <div className="action-content">
                <h3>Address High-Risk Stakeholders</h3>
                <p>Review and create mitigation strategies for {highRiskStakeholders.length} at-risk stakeholder{highRiskStakeholders.length !== 1 ? 's' : ''}</p>
                <button className="action-link" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
                  View table above →
                </button>
              </div>
            </div>
          )}

          {highRiskStakeholders.some(s =>
            !stakeholderInteractions[s.id] ||
            new Date() - new Date(stakeholderInteractions[s.id]?.date) > 14 * 24 * 60 * 60 * 1000
          ) && (
            <div className="action-card">
              <div className="action-icon">📅</div>
              <div className="action-content">
                <h3>Schedule Check-ins</h3>
                <p>Some high-risk stakeholders haven't been contacted recently</p>
                <button className="action-link" onClick={() => navigate('/stakeholders')}>
                  Review →
                </button>
              </div>
            </div>
          )}

          {activeProjects > 0 && (
            <div className="action-card">
              <div className="action-icon">🎯</div>
              <div className="action-content">
                <h3>Update Project Status</h3>
                <p>Keep your project information current for better insights</p>
                <button className="action-link" onClick={() => navigate('/projects')}>
                  View projects →
                </button>
              </div>
            </div>
          )}
        </div>

        {followUpActions.length === 0 && highRiskStakeholders.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">✨</div>
            <p>All caught up!</p>
            <p className="text-muted">No urgent actions required at this time</p>
          </div>
        )}
      </div>

      {/* Create Project Modal */}
      <CreateProjectModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={handleProjectCreated}
      />

      {/* Toast Notification */}
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.show}
        onClose={closeToast}
      />
    </div>
  );
}

export default Dashboard;
