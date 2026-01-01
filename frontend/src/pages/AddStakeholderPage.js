import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { stakeholderAPI, projectAPI } from '../services/api';

function AddStakeholderPage() {
  const { id: projectId } = useParams();
  const navigate = useNavigate();

  const [project, setProject] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    role: '',
    company: '',
    power: 3,
    influence: 3,
    engagement_status: 'neutral',
    preferred_channel: 'email',
    owner: '',
    notes: '',
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadProject();
  }, [projectId]);

  async function loadProject() {
    try {
      const projectData = await projectAPI.getById(projectId);
      setProject(projectData);
    } catch (err) {
      console.error('Failed to load project:', err);
      setErrors({ submit: 'Failed to load project details' });
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.role.trim()) {
      newErrors.role = 'Role is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const stakeholderData = {
        project_id: parseInt(projectId),
        name: formData.name.trim(),
        role: formData.role.trim(),
        company: formData.company.trim() || null,
        power: parseInt(formData.power),
        influence: parseInt(formData.influence),
        engagement_status: formData.engagement_status,
        preferred_channel: formData.preferred_channel,
        owner: formData.owner.trim() || null,
        notes: formData.notes.trim() || null,
      };

      await stakeholderAPI.create(stakeholderData);

      // Navigate back to project detail page
      navigate(`/project/${projectId}`);
    } catch (error) {
      setErrors({ submit: error.message || 'Failed to add stakeholder. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    navigate(`/project/${projectId}`);
  };

  if (!project) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <button onClick={handleCancel} className="btn-back">
            ← Back to {project.name}
          </button>
          <h1>Add Stakeholder</h1>
          <p className="text-muted">Add a new stakeholder to {project.name}</p>
        </div>
      </div>

      <div className="form-container">
        <form onSubmit={handleSubmit} className="project-form">
          {errors.submit && (
            <div className="form-error-banner">
              {errors.submit}
            </div>
          )}

          {/* Name */}
          <div className="form-group">
            <label htmlFor="name" className="form-label required">
              Full Name
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className={`form-input ${errors.name ? 'error' : ''}`}
              placeholder="e.g., Sarah Johnson"
              autoFocus
            />
            {errors.name && <span className="form-error">{errors.name}</span>}
          </div>

          {/* Two Column Layout */}
          <div className="form-row">
            {/* Role */}
            <div className="form-group">
              <label htmlFor="role" className="form-label required">
                Role
              </label>
              <input
                type="text"
                id="role"
                name="role"
                value={formData.role}
                onChange={handleChange}
                className={`form-input ${errors.role ? 'error' : ''}`}
                placeholder="e.g., VP Engineering"
              />
              {errors.role && <span className="form-error">{errors.role}</span>}
            </div>

            {/* Company */}
            <div className="form-group">
              <label htmlFor="company" className="form-label">
                Company
              </label>
              <input
                type="text"
                id="company"
                name="company"
                value={formData.company}
                onChange={handleChange}
                className="form-input"
                placeholder="e.g., Acme Corp"
              />
            </div>
          </div>

          {/* Power and Influence */}
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="power" className="form-label">
                Power Level
              </label>
              <div className="slider-container">
                <input
                  type="range"
                  id="power"
                  name="power"
                  min="1"
                  max="5"
                  value={formData.power}
                  onChange={handleChange}
                  className="form-slider"
                />
                <span className="slider-value">{formData.power}/5</span>
              </div>
              <p className="form-hint">Decision-making authority</p>
            </div>

            <div className="form-group">
              <label htmlFor="influence" className="form-label">
                Influence Level
              </label>
              <div className="slider-container">
                <input
                  type="range"
                  id="influence"
                  name="influence"
                  min="1"
                  max="5"
                  value={formData.influence}
                  onChange={handleChange}
                  className="form-slider"
                />
                <span className="slider-value">{formData.influence}/5</span>
              </div>
              <p className="form-hint">Impact on others</p>
            </div>
          </div>

          {/* Engagement Status and Preferred Channel */}
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="engagement_status" className="form-label">
                Engagement Status
              </label>
              <select
                id="engagement_status"
                name="engagement_status"
                value={formData.engagement_status}
                onChange={handleChange}
                className="form-select"
              >
                <option value="supportive">Supportive</option>
                <option value="neutral">Neutral</option>
                <option value="resistant">Resistant</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="preferred_channel" className="form-label">
                Preferred Channel
              </label>
              <select
                id="preferred_channel"
                name="preferred_channel"
                value={formData.preferred_channel}
                onChange={handleChange}
                className="form-select"
              >
                <option value="email">Email</option>
                <option value="slack">Slack</option>
                <option value="call">Call</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          {/* Owner */}
          <div className="form-group">
            <label htmlFor="owner" className="form-label">
              Assigned Owner
            </label>
            <input
              type="text"
              id="owner"
              name="owner"
              value={formData.owner}
              onChange={handleChange}
              className="form-input"
              placeholder="Who manages this stakeholder?"
            />
          </div>

          {/* Notes */}
          <div className="form-group">
            <label htmlFor="notes" className="form-label">
              Notes
            </label>
            <textarea
              id="notes"
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              className="form-textarea"
              placeholder="Additional context or background..."
              rows="3"
            />
          </div>

          {/* Form Actions */}
          <div className="form-actions">
            <button
              type="button"
              onClick={handleCancel}
              className="btn btn-secondary"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Adding...' : 'Add Stakeholder'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddStakeholderPage;
