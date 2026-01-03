import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { projectAPI, stakeholderAPI, interactionAPI } from '../services/api';
import Tabs from '../components/Tabs';
import EditProjectModal from '../components/EditProjectModal';
import ArchiveProjectModal from '../components/ArchiveProjectModal';
import Toast from '../components/Toast';
import BackButton from '../components/BackButton';
import { AIService } from '../utils/aiService';

function ProjectDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [project, setProject] = useState(null);
  const [stakeholders, setStakeholders] = useState([]);
  const [interactions, setInteractions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [showEditModal, setShowEditModal] = useState(false);
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [aiInsights, setAiInsights] = useState(null);

  useEffect(() => {
    loadProjectData();
  }, [id]);

  async function loadProjectData() {
    try {
      setLoading(true);
      const [projectData, stakeholdersData] = await Promise.all([
        projectAPI.getById(id),
        stakeholderAPI.getByProject(id),
      ]);

      setProject(projectData);
      setStakeholders(stakeholdersData);

      // Load interactions for timeline
      const allInteractions = [];
      for (const stakeholder of stakeholdersData) {
        try {
          const stakeholderInteractions = await interactionAPI.getByStakeholder(stakeholder.id);
          allInteractions.push(...stakeholderInteractions.map(i => ({
            ...i,
            stakeholder_name: stakeholder.name,
          })));
        } catch (err) {
          // Skip if no interactions
        }
      }
      // Sort by date descending
      allInteractions.sort((a, b) => new Date(b.date) - new Date(a.date));
      setInteractions(allInteractions);

      // Generate AI insights
      const insights = AIService.generateProjectInsights(projectData, stakeholdersData, allInteractions);
      setAiInsights(insights);

      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleProjectUpdated(updatedProject) {
    setProject(updatedProject);
    setToast({
      show: true,
      message: 'Project updated successfully ✓',
      type: 'success',
    });
  }

  function handleProjectArchived() {
    setToast({
      show: true,
      message: 'Project archived successfully',
      type: 'success',
    });
    setTimeout(() => {
      navigate('/projects');
    }, 1500);
  }

  function closeToast() {
    setToast({ show: false, message: '', type: 'success' });
  }

  function getStatusConfig(status) {
    const configs = {
      active: { label: 'Active', color: 'blue' },
      planning: { label: 'Planning', color: 'purple' },
      'on-hold': { label: 'On Hold', color: 'yellow' },
      completed: { label: 'Completed', color: 'green' },
    };
    return configs[status] || { label: status, color: 'gray' };
  }

  function getRiskLevel(score) {
    if (score >= 14) return 'high';
    if (score >= 8) return 'medium';
    return 'low';
  }

  function formatDate(dateString) {
    if (!dateString) return null;
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function formatDateTime(dateString) {
    if (!dateString) return 'Recently';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  if (loading) return <div className="loading">Loading project...</div>;
  if (error) return <div className="error">Error: {error}</div>;
  if (!project) return <div className="error">Project not found</div>;

  const statusConfig = getStatusConfig(project.status);
  const highRiskCount = stakeholders.filter(s => s.risk_score >= 12).length;

  const tabs = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'stakeholders', label: 'Stakeholders', icon: '👥', count: stakeholders.length },
    { id: 'timeline', label: 'Timeline', icon: '📅', count: interactions.length },
  ];

  return (
    <div className="page">
      {/* Back Button */}
      <BackButton to="/projects" label="Back to Projects" />

      {/* Header Card */}
      <div className="project-header-card">
        <div className="project-header-main">
          <div className="project-header-title">
            <h1>{project.name}</h1>
            <span className={`status-badge status-${statusConfig.color}`}>
              {statusConfig.label}
            </span>
          </div>

          {project.description && (
            <p className="project-description">{project.description}</p>
          )}

          <div className="project-header-meta">
            {project.owner && (
              <div className="meta-item">
                <span className="meta-label">Owner:</span>
                <span className="meta-value">{project.owner}</span>
              </div>
            )}

            {(project.start_date || project.end_date) && (
              <div className="meta-item">
                <span className="meta-label">Duration:</span>
                <span className="meta-value">
                  {project.start_date && formatDate(project.start_date)}
                  {project.start_date && project.end_date && ' - '}
                  {project.end_date && formatDate(project.end_date)}
                  {!project.start_date && !project.end_date && 'Not set'}
                </span>
              </div>
            )}

            {project.tags && (
              <div className="meta-item">
                <span className="meta-label">Tags:</span>
                <div className="project-tags">
                  {project.tags.split(',').map((tag, index) => (
                    <span key={index} className="tag">{tag.trim()}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="project-header-actions">
          <button
            onClick={() => setShowEditModal(true)}
            className="btn btn-secondary"
          >
            ✏️ Edit
          </button>
          <button
            onClick={() => setShowArchiveModal(true)}
            className="btn btn-secondary"
          >
            📦 Archive
          </button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === 'overview' && (
          <div className="overview-tab">
            {/* Summary Cards */}
            <div className="summary-cards">
              <div className="summary-card">
                <div className="summary-icon">👥</div>
                <div className="summary-content">
                  <div className="summary-value">{stakeholders.length}</div>
                  <div className="summary-label">Total Stakeholders</div>
                </div>
              </div>

              <div className="summary-card summary-card-alert">
                <div className="summary-icon">⚠️</div>
                <div className="summary-content">
                  <div className="summary-value">{highRiskCount}</div>
                  <div className="summary-label">High Risk</div>
                </div>
              </div>

              <div className="summary-card">
                <div className="summary-icon">📅</div>
                <div className="summary-content">
                  <div className="summary-value">{interactions.length}</div>
                  <div className="summary-label">Interactions</div>
                </div>
              </div>
            </div>

            {/* Risk Summary Widget */}
            {stakeholders.length > 0 && (
              <div className="card">
                <h3>Risk Summary</h3>
                <div className="risk-summary">
                  {highRiskCount > 0 ? (
                    <>
                      <p className="risk-warning">
                        ⚠️ {highRiskCount} stakeholder{highRiskCount !== 1 ? 's need' : ' needs'} immediate attention
                      </p>
                      <div className="risk-list">
                        {stakeholders
                          .filter(s => s.risk_score >= 12)
                          .slice(0, 5)
                          .map(stakeholder => (
                            <div key={stakeholder.id} className="risk-item">
                              <span className="risk-item-name">{stakeholder.name}</span>
                              <span className={`risk-badge risk-${getRiskLevel(stakeholder.risk_score)}`}>
                                {stakeholder.risk_score}/20
                              </span>
                            </div>
                          ))}
                      </div>
                    </>
                  ) : (
                    <p className="risk-success">✓ All stakeholders are being managed well</p>
                  )}
                </div>
              </div>
            )}

            {/* AI Insights */}
            {aiInsights && (
              <div className="card">
                <div className="card-header">
                  <h3>🤖 AI Insights</h3>
                  <span className={`health-badge health-${aiInsights.healthStatus}`}>
                    {aiInsights.healthStatus === 'healthy' ? '✓ Healthy' :
                     aiInsights.healthStatus === 'needs-attention' ? '⚠ Needs Attention' :
                     '🔴 At Risk'}
                  </span>
                </div>

                <div className="ai-summary">
                  <p>{aiInsights.summary}</p>
                </div>

                <div className="ai-sections">
                  <div className="ai-section">
                    <h4>📊 Stakeholder Overview</h4>
                    <div className="stakeholder-stats">
                      <div className="stat-row">
                        <span>Total Stakeholders:</span>
                        <strong>{aiInsights.stakeholderBreakdown.total}</strong>
                      </div>
                      {aiInsights.stakeholderBreakdown.supportive > 0 && (
                        <div className="stat-row">
                          <span>Supportive:</span>
                          <strong className="text-success">{aiInsights.stakeholderBreakdown.supportive}</strong>
                        </div>
                      )}
                      {aiInsights.stakeholderBreakdown.neutral > 0 && (
                        <div className="stat-row">
                          <span>Neutral:</span>
                          <strong>{aiInsights.stakeholderBreakdown.neutral}</strong>
                        </div>
                      )}
                      {aiInsights.stakeholderBreakdown.resistant > 0 && (
                        <div className="stat-row">
                          <span>Resistant:</span>
                          <strong className="text-danger">{aiInsights.stakeholderBreakdown.resistant}</strong>
                        </div>
                      )}
                      {aiInsights.stakeholderBreakdown.highRisk > 0 && (
                        <div className="stat-row">
                          <span>High Risk:</span>
                          <strong className="text-danger">{aiInsights.stakeholderBreakdown.highRisk}</strong>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="ai-section">
                    <h4>💡 Key Insights</h4>
                    <ul className="insight-list">
                      {aiInsights.keyInsights.map((insight, index) => (
                        <li key={index}>{insight}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="ai-section">
                    <h4>✅ Recommendations</h4>
                    <ul className="insight-list">
                      {aiInsights.recommendations.map((rec, index) => (
                        <li key={index}>{rec}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="ai-section">
                    <h4>⚠️ Risks</h4>
                    {aiInsights.risks.map((risk, index) => (
                      <div key={index} className={`risk-item risk-${risk.level}`}>
                        <div className="risk-header">
                          <strong>{risk.description}</strong>
                        </div>
                        <div className="risk-mitigation">
                          <em>Mitigation:</em> {risk.mitigation}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="ai-section">
                    <h4>🎯 Opportunities</h4>
                    <ul className="insight-list">
                      {aiInsights.opportunities.map((opp, index) => (
                        <li key={index}>{opp}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'stakeholders' && (
          <div className="stakeholders-tab">
            <div className="tab-header">
              <p className="text-muted">
                {stakeholders.length} stakeholder{stakeholders.length !== 1 ? 's' : ''} in this project
              </p>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => navigate(`/project/${id}/add-stakeholder`)}
              >
                + Add Stakeholder
              </button>
            </div>

            {stakeholders.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">👥</div>
                <h3>No stakeholders yet</h3>
                <p className="text-muted">Add your first stakeholder to start tracking</p>
                <button
                  className="btn btn-primary"
                  onClick={() => navigate(`/project/${id}/add-stakeholder`)}
                  style={{ marginTop: '1.5rem' }}
                >
                  + Add Stakeholder
                </button>
              </div>
            ) : (
              <div className="table-container">
                <table className="stakeholder-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Role</th>
                      <th>Power</th>
                      <th>Influence</th>
                      <th>Engagement</th>
                      <th>Risk</th>
                      <th>Owner</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stakeholders.map(stakeholder => (
                      <tr
                        key={stakeholder.id}
                        onClick={() => navigate(`/stakeholder/${stakeholder.id}`)}
                        className="clickable-row"
                      >
                        <td><strong>{stakeholder.name}</strong></td>
                        <td>{stakeholder.role}</td>
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
                        <td>{stakeholder.owner || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'timeline' && (
          <div className="timeline-tab">
            <p className="text-muted" style={{ marginBottom: '1.5rem' }}>
              {interactions.length} interaction{interactions.length !== 1 ? 's' : ''} logged
            </p>

            {interactions.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📅</div>
                <h3>No activity yet</h3>
                <p className="text-muted">Interactions will appear here as you log them</p>
              </div>
            ) : (
              <div className="timeline">
                {interactions.map((interaction) => (
                  <div key={interaction.id} className="timeline-item">
                    <div className="timeline-marker"></div>
                    <div className="timeline-content">
                      <div className="timeline-header">
                        <span className="timeline-type">{interaction.type}</span>
                        <span className="timeline-date">{formatDateTime(interaction.date)}</span>
                      </div>
                      <p className="timeline-stakeholder">
                        with <strong>{interaction.stakeholder_name}</strong>
                      </p>
                      {interaction.summary && (
                        <p className="timeline-summary">{interaction.summary}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Edit Project Modal */}
      <EditProjectModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        onSuccess={handleProjectUpdated}
        project={project}
      />

      {/* Archive Confirmation Modal */}
      <ArchiveProjectModal
        isOpen={showArchiveModal}
        onClose={() => setShowArchiveModal(false)}
        onSuccess={handleProjectArchived}
        project={project}
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

export default ProjectDetailPage;
