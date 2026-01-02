import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { stakeholderAPI, projectAPI, interactionAPI } from '../services/api';
import AddStakeholderModal from '../components/AddStakeholderModal';
import Toast from '../components/Toast';

function StakeholdersListPage() {
  const [stakeholders, setStakeholders] = useState([]);
  const [filteredStakeholders, setFilteredStakeholders] = useState([]);
  const [projects, setProjects] = useState([]);
  const [followUpStakeholderIds, setFollowUpStakeholderIds] = useState(new Set());
  const [needsCheckInIds, setNeedsCheckInIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [projectFilter, setProjectFilter] = useState('all');
  const [riskFilter, setRiskFilter] = useState('all');
  const [engagementFilter, setEngagementFilter] = useState('all');
  const [followUpFilter, setFollowUpFilter] = useState('all');
  const [checkInFilter, setCheckInFilter] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    loadData();
    // Check URL parameters for initial filter
    const params = new URLSearchParams(location.search);
    if (params.get('filter') === 'followup') {
      setFollowUpFilter('yes');
    } else if (params.get('filter') === 'checkin') {
      setCheckInFilter('yes');
    }
  }, [location.search]);

  useEffect(() => {
    filterStakeholders();
  }, [stakeholders, searchQuery, projectFilter, riskFilter, engagementFilter, followUpFilter, checkInFilter, followUpStakeholderIds, needsCheckInIds]);

  async function loadData() {
    try {
      setLoading(true);
      const [stakeholdersData, projectsData, followUpData] = await Promise.all([
        stakeholderAPI.getAll(),
        projectAPI.getAll(),
        interactionAPI.getFollowUp(),
      ]);

      setStakeholders(stakeholdersData);
      setProjects(projectsData);

      // Extract unique stakeholder IDs that need follow-up
      const followUpIds = new Set(followUpData.map(interaction => interaction.stakeholder_id));
      setFollowUpStakeholderIds(followUpIds);

      // Calculate stakeholders needing check-in (high-risk + not contacted in 14+ days)
      const checkInIds = new Set();
      const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

      for (const stakeholder of stakeholdersData) {
        // Only consider high-risk stakeholders (score >= 12)
        if (stakeholder.risk_score >= 12) {
          try {
            const interactions = await interactionAPI.getByStakeholder(stakeholder.id);
            // No interactions or last interaction was 14+ days ago
            if (interactions.length === 0 || new Date(interactions[0].date) < fourteenDaysAgo) {
              checkInIds.add(stakeholder.id);
            }
          } catch (err) {
            // No interactions, add to check-in list
            checkInIds.add(stakeholder.id);
          }
        }
      }
      setNeedsCheckInIds(checkInIds);

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

    // Follow-up filter
    if (followUpFilter === 'yes') {
      filtered = filtered.filter((s) => followUpStakeholderIds.has(s.id));
    } else if (followUpFilter === 'no') {
      filtered = filtered.filter((s) => !followUpStakeholderIds.has(s.id));
    }

    // Check-in filter
    if (checkInFilter === 'yes') {
      filtered = filtered.filter((s) => needsCheckInIds.has(s.id));
    } else if (checkInFilter === 'no') {
      filtered = filtered.filter((s) => !needsCheckInIds.has(s.id));
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
            value={followUpFilter}
            onChange={(e) => setFollowUpFilter(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Stakeholders</option>
            <option value="yes">📝 Follow-up Needed ({followUpStakeholderIds.size})</option>
            <option value="no">No Follow-up</option>
          </select>

          <select
            value={checkInFilter}
            onChange={(e) => setCheckInFilter(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Stakeholders</option>
            <option value="yes">📅 Check-in Needed ({needsCheckInIds.size})</option>
            <option value="no">No Check-in Needed</option>
          </select>

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
