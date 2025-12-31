import React, { useState, useEffect } from 'react';
import { projectAPI, stakeholderAPI } from '../services/api';
import ProjectCard from '../components/ProjectCard';
import CreateProjectModal from '../components/CreateProjectModal';
import Toast from '../components/Toast';

function ProjectsPage() {
  const [projects, setProjects] = useState([]);
  const [filteredProjects, setFilteredProjects] = useState([]);
  const [stakeholderCounts, setStakeholderCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterProjects();
  }, [projects, searchQuery, statusFilter]);

  async function loadData() {
    try {
      setLoading(true);
      const [projectsData, stakeholdersData] = await Promise.all([
        projectAPI.getAll(),
        stakeholderAPI.getAll(),
      ]);

      setProjects(projectsData);

      // Count stakeholders per project
      const counts = {};
      stakeholdersData.forEach((stakeholder) => {
        counts[stakeholder.project_id] = (counts[stakeholder.project_id] || 0) + 1;
      });
      setStakeholderCounts(counts);

      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function filterProjects() {
    let filtered = [...projects];

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (project) =>
          project.name.toLowerCase().includes(query) ||
          (project.description && project.description.toLowerCase().includes(query)) ||
          (project.owner && project.owner.toLowerCase().includes(query))
      );
    }

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter((project) => project.status === statusFilter);
    }

    setFilteredProjects(filtered);
  }

  function handleProjectCreated(newProject) {
    setToast({
      show: true,
      message: 'Project created successfully 🎉',
      type: 'success',
    });
    loadData();
  }

  function closeToast() {
    setToast({ show: false, message: '', type: 'success' });
  }

  if (loading) return <div className="loading">Loading projects...</div>;
  if (error) return <div className="error">Error: {error}</div>;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Projects</h1>
          <p className="text-muted">Manage your project portfolio</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn btn-primary"
        >
          + Create Project
        </button>
      </div>

      {/* Search and Filter Bar */}
      {projects.length > 0 && (
        <div className="filter-bar">
          <div className="search-box">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
          </div>

          <div className="filter-group">
            <label className="filter-label">Status:</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="filter-select"
            >
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="planning">Planning</option>
              <option value="on-hold">On Hold</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        </div>
      )}

      {/* Projects Grid */}
      {projects.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📁</div>
          <h3>No projects yet — create your first one 🚀</h3>
          <p className="text-muted">Start organizing your stakeholders by creating a project</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn btn-primary"
            style={{ marginTop: '1.5rem' }}
          >
            + Create Project
          </button>
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🔍</div>
          <h3>No projects match your search</h3>
          <p className="text-muted">Try adjusting your filters or search query</p>
        </div>
      ) : (
        <div className="projects-grid">
          {filteredProjects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              stakeholderCount={stakeholderCounts[project.id] || 0}
            />
          ))}
        </div>
      )}

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

export default ProjectsPage;
