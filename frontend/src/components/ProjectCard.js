import React from 'react';
import { useNavigate } from 'react-router-dom';

function ProjectCard({ project, stakeholderCount = 0 }) {
  const navigate = useNavigate();

  const getStatusConfig = (status) => {
    const configs = {
      active: { label: 'Active', color: 'blue' },
      planning: { label: 'Planning', color: 'purple' },
      'on-hold': { label: 'On Hold', color: 'yellow' },
      completed: { label: 'Completed', color: 'green' },
    };
    return configs[status] || { label: status, color: 'gray' };
  };

  const formatDate = (dateString) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getDateRange = () => {
    const start = formatDate(project.start_date);
    const end = formatDate(project.end_date);

    if (start && end) return `${start} - ${end}`;
    if (start) return `Started ${start}`;
    if (end) return `Due ${end}`;
    return 'No dates set';
  };

  const statusConfig = getStatusConfig(project.status);

  return (
    <div
      className="project-card"
      onClick={() => navigate(`/project/${project.id}`)}
    >
      <div className="project-card-header">
        <h3 className="project-card-name">{project.name}</h3>
        <span className={`status-badge status-${statusConfig.color}`}>
          {statusConfig.label}
        </span>
      </div>

      {project.description && (
        <p className="project-card-description">{project.description}</p>
      )}

      <div className="project-card-meta">
        {project.owner && (
          <div className="meta-item">
            <span className="meta-icon">👤</span>
            <span className="meta-text">{project.owner}</span>
          </div>
        )}

        <div className="meta-item">
          <span className="meta-icon">📅</span>
          <span className="meta-text">{getDateRange()}</span>
        </div>

        {stakeholderCount > 0 && (
          <div className="meta-item">
            <span className="meta-icon">👥</span>
            <span className="meta-text">{stakeholderCount} stakeholder{stakeholderCount !== 1 ? 's' : ''}</span>
          </div>
        )}
      </div>

      <div className="project-card-footer">
        <span className="text-muted">
          Updated {formatDate(project.updated_at || project.created_at) || 'recently'}
        </span>
      </div>
    </div>
  );
}

export default ProjectCard;
