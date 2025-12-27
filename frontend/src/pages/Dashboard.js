import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { projectAPI, stakeholderAPI } from '../services/api';

function Dashboard() {
  const [projects, setProjects] = useState([]);
  const [highRiskStakeholders, setHighRiskStakeholders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showNewProject, setShowNewProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const projectsData = await projectAPI.getAll();
      setProjects(projectsData);

      // Get all high-risk stakeholders (AT RISK: score >= 12)
      const atRiskStakeholders = await stakeholderAPI.getAllHighRisk();

      setHighRiskStakeholders(atRiskStakeholders);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateProject(e) {
    e.preventDefault();
    try {
      await projectAPI.create({
        name: newProjectName,
        description: newProjectDesc,
        status: 'active'
      });
      setNewProjectName('');
      setNewProjectDesc('');
      setShowNewProject(false);
      loadData();
    } catch (err) {
      alert('Error creating project: ' + err.message);
    }
  }

  function getRiskLevel(score) {
    // Score is out of 20
    if (score >= 14) return 'high';      // 70%+ is high risk
    if (score >= 8) return 'medium';     // 40-69% is medium risk
    return 'low';                         // <40% is low risk
  }

  if (loading) return <div className="loading">Loading...</div>;
  if (error) return <div className="error">Error: {error}</div>;

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Stakeholder Radar Dashboard</h1>
      </div>

      <div className="dashboard-grid">
        {/* Projects Section */}
        <div className="card">
          <div className="card-header">
            <h2>Projects</h2>
            <button onClick={() => setShowNewProject(!showNewProject)} className="btn btn-primary">
              + New Project
            </button>
          </div>

          {showNewProject && (
            <form onSubmit={handleCreateProject} className="new-project-form">
              <input
                type="text"
                placeholder="Project name"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                required
              />
              <textarea
                placeholder="Description (optional)"
                value={newProjectDesc}
                onChange={(e) => setNewProjectDesc(e.target.value)}
              />
              <div className="form-actions">
                <button type="submit" className="btn btn-primary">Create</button>
                <button type="button" onClick={() => setShowNewProject(false)} className="btn btn-secondary">
                  Cancel
                </button>
              </div>
            </form>
          )}

          <div className="project-list">
            {projects.length === 0 ? (
              <p className="empty-state">No projects yet. Create one to get started!</p>
            ) : (
              projects.map(project => (
                <div
                  key={project.id}
                  className="project-item"
                  onClick={() => navigate(`/project/${project.id}`)}
                >
                  <div className="project-info">
                    <h3>{project.name}</h3>
                    <p>{project.description || 'No description'}</p>
                    <span className={`badge badge-${project.status}`}>{project.status}</span>
                  </div>
                  <div className="project-arrow">→</div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* High Risk Stakeholders Section */}
        <div className="card card-at-risk">
          <div className="card-header">
            <div>
              <h2>High Risk Stakeholders</h2>
              <p className="at-risk-subtitle">
                <span className="badge badge-at-risk">AT RISK</span>
                {highRiskStakeholders.length > 0 && (
                  <span className="text-muted"> • {highRiskStakeholders.length} stakeholder{highRiskStakeholders.length !== 1 ? 's' : ''} with score ≥12</span>
                )}
              </p>
            </div>
          </div>

          <div className="stakeholder-list">
            {highRiskStakeholders.length === 0 ? (
              <p className="empty-state">✓ No high-risk stakeholders - All stakeholders are being managed well!</p>
            ) : (
              highRiskStakeholders.map(stakeholder => (
                <div
                  key={stakeholder.id}
                  className="stakeholder-item stakeholder-at-risk"
                  onClick={() => navigate(`/stakeholder/${stakeholder.id}`)}
                >
                  <div className="stakeholder-info">
                    <div className="stakeholder-header-line">
                      <h3>{stakeholder.name}</h3>
                      <span className="badge badge-at-risk">AT RISK</span>
                    </div>
                    <p className="text-muted">{stakeholder.project_name} • {stakeholder.role}</p>
                    <div className="stakeholder-metrics">
                      <span>Power: {stakeholder.power}/5</span>
                      <span>Influence: {stakeholder.influence}/5</span>
                      <span className={`badge badge-${stakeholder.engagement_status}`}>
                        {stakeholder.engagement_status}
                      </span>
                    </div>
                  </div>
                  <div className="risk-score">
                    <div className={`risk-badge risk-${getRiskLevel(stakeholder.risk_score)}`}>
                      {stakeholder.risk_score}/20
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
