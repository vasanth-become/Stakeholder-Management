import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { stakeholderAPI, projectAPI } from '../services/api';
import AddStakeholderModal from '../components/AddStakeholderModal';
import Toast from '../components/Toast';

function StakeholdersListPage() {
  const [stakeholders, setStakeholders] = useState([]);
  const [filteredStakeholders, setFilteredStakeholders] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [projectFilter, setProjectFilter] = useState('all');
  const [riskFilter, setRiskFilter] = useState('all');
  const [engagementFilter, setEngagementFilter] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterStakeholders();
  }, [stakeholders, searchQuery, projectFilter, riskFilter, engagementFilter]);

  async function loadData() {
    try {
      setLoading(true);
      const [stakeholdersData, projectsData] = await Promise.all([
        stakeholderAPI.getAll(),
        projectAPI.getAll(),
      ]);

      setStakeholders(stakeholdersData);
      setProjects(projectsData);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function filterStakeholders() {
    let filtered = [...stakeholders];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (s) =>
          s.name.toLowerCase().includes(query) ||
          s.role.toLowerCase().includes(query) ||
          (s.company && s.company.toLowerCase().includes(query)) ||
          (s.owner && s.owner.toLowerCase().includes(query))
      );
    }

    // Project filter
    if (projectFilter !== 'all') {
      filtered = filtered.filter((s) => s.project_id === parseInt(projectFilter));
    }

    // Risk filter
    if (riskFilter !== 'all') {
      if (riskFilter === 'high') {
        filtered = filtered.filter((s) => s.risk_score >= 12);
      } else if (riskFilter === 'medium') {
        filtered = filtered.filter((s) => s.risk_score >= 7 && s.risk_score < 12);
      } else if (riskFilter === 'low') {
        filtered = filtered.filter((s) => s.risk_score < 7);
      }
    }

    // Engagement filter
    if (engagementFilter !== 'all') {
      filtered = filtered.filter((s) => s.engagement_status === engagementFilter);
    }

    setFilteredStakeholders(filtered);
  }

  function getRiskLevel(score) {
    if (score >= 12) return 'high';
    if (score >= 7) return 'medium';
    return 'low';
  }

  function handleStakeholderAdded(newStakeholder) {
    setToast({
      show: true,
      message: 'Stakeholder added successfully 🎉',
      type: 'success',
    });
    loadData();
  }

  function closeToast() {
    setToast({ show: false, message: '', type: 'success' });
  }

  if (loading) return <div className="loading">Loading stakeholders...</div>;
  if (error) return <div className="error">Error: {error}</div>;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Stakeholders</h1>
          <p className="text-muted">Manage and track all your stakeholders</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="btn btn-primary"
        >
          + Add Stakeholder
        </button>
      </div>

      {/* Filter Bar */}
      <div className="filter-bar">
        <div className="search-box">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search stakeholders..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="filter-chips">
          <select
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Projects</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>

          <select
            value={riskFilter}
            onChange={(e) => setRiskFilter(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Risk Levels</option>
            <option value="high">High Risk</option>
            <option value="medium">Medium Risk</option>
            <option value="low">Low Risk</option>
          </select>

          <select
            value={engagementFilter}
            onChange={(e) => setEngagementFilter(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Engagement</option>
            <option value="supportive">Supportive</option>
            <option value="neutral">Neutral</option>
            <option value="resistant">Resistant</option>
          </select>
        </div>
      </div>

      {/* Stakeholders Table */}
      {stakeholders.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">👥</div>
          <h3>No stakeholders yet</h3>
          <p className="text-muted">Add your first stakeholder to start tracking engagement</p>
          <button
            onClick={() => setShowAddModal(true)}
            className="btn btn-primary"
            style={{ marginTop: '1.5rem' }}
          >
            + Add Stakeholder
          </button>
        </div>
      ) : filteredStakeholders.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🔍</div>
          <h3>No stakeholders match your filters</h3>
          <p className="text-muted">Try adjusting your search or filters</p>
        </div>
      ) : (
        <div className="card">
          <div className="table-container">
            <table className="stakeholder-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Role</th>
                  <th>Project</th>
                  <th>Engagement</th>
                  <th>Risk Score</th>
                  <th>Owner</th>
                  <th>Last Interaction</th>
                </tr>
              </thead>
              <tbody>
                {filteredStakeholders.map((stakeholder) => (
                  <tr
                    key={stakeholder.id}
                    onClick={() => navigate(`/stakeholder/${stakeholder.id}`)}
                    className="clickable-row"
                  >
                    <td>
                      <div className="stakeholder-name-cell">
                        <strong>{stakeholder.name}</strong>
                        {stakeholder.company && (
                          <span className="company-tag">{stakeholder.company}</span>
                        )}
                      </div>
                    </td>
                    <td>{stakeholder.role}</td>
                    <td>{stakeholder.project_name}</td>
                    <td>
                      <span className={`engagement-badge engagement-${stakeholder.engagement_status}`}>
                        {stakeholder.engagement_status}
                      </span>
                    </td>
                    <td>
                      <span className={`risk-badge risk-${getRiskLevel(stakeholder.risk_score)}`}>
                        {stakeholder.risk_score}/20
                      </span>
                    </td>
                    <td>{stakeholder.owner || '—'}</td>
                    <td className="text-muted">
                      {stakeholder.last_interaction_date || 'No interactions'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Stakeholder Modal */}
      <AddStakeholderModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={handleStakeholderAdded}
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

export default StakeholdersListPage;
