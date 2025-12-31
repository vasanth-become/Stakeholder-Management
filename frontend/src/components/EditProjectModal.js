import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { projectAPI } from '../services/api';

function EditProjectModal({ isOpen, onClose, onSuccess, project }) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    owner: '',
    start_date: '',
    end_date: '',
    status: 'active',
    tags: [],
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tagInput, setTagInput] = useState('');

  // Initialize form with project data when modal opens
  useEffect(() => {
    if (isOpen && project) {
      setFormData({
        name: project.name || '',
        description: project.description || '',
        owner: project.owner || '',
        start_date: project.start_date || '',
        end_date: project.end_date || '',
        status: project.status || 'active',
        tags: project.tags ? project.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      });
    }
  }, [isOpen, project]);

  const statusOptions = [
    { value: 'active', label: 'Active' },
    { value: 'planning', label: 'Planning' },
    { value: 'on-hold', label: 'On Hold' },
    { value: 'completed', label: 'Completed' },
  ];

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

  const handleAddTag = (e) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      if (!formData.tags.includes(tagInput.trim())) {
        setFormData((prev) => ({
          ...prev,
          tags: [...prev.tags, tagInput.trim()],
        }));
      }
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.filter((tag) => tag !== tagToRemove),
    }));
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Please enter a project name 🙂';
    }

    if (formData.start_date && formData.end_date) {
      const startDate = new Date(formData.start_date);
      const endDate = new Date(formData.end_date);
      if (endDate < startDate) {
        newErrors.end_date = 'End date cannot be before start date 📅';
      }
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
      const projectData = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        status: formData.status,
        owner: formData.owner.trim() || null,
        start_date: formData.start_date || null,
        end_date: formData.end_date || null,
        tags: formData.tags.length > 0 ? formData.tags.join(',') : null,
      };

      const updatedProject = await projectAPI.update(project.id, projectData);

      setErrors({});
      onSuccess(updatedProject);
      onClose();
    } catch (error) {
      setErrors({ submit: error.message || 'Failed to update project. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setErrors({});
    setTagInput('');
    onClose();
  };

  if (!project) return null;

  return (
    <Modal isOpen={isOpen} onClose={handleCancel} title="Edit Project" size="large">
      <form onSubmit={handleSubmit} className="project-form">
        {errors.submit && (
          <div className="form-error-banner">
            {errors.submit}
          </div>
        )}

        {/* Project Name */}
        <div className="form-group">
          <label htmlFor="name" className="form-label required">
            Project Name
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            className={`form-input ${errors.name ? 'error' : ''}`}
            placeholder="e.g., Website Redesign"
            autoFocus
          />
          {errors.name && <span className="form-error">{errors.name}</span>}
        </div>

        {/* Description */}
        <div className="form-group">
          <label htmlFor="description" className="form-label">
            Description
          </label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            className="form-textarea"
            placeholder="What is this project about?"
            rows="3"
          />
        </div>

        {/* Two Column Layout */}
        <div className="form-row">
          {/* Owner */}
          <div className="form-group">
            <label htmlFor="owner" className="form-label">
              Owner
            </label>
            <input
              type="text"
              id="owner"
              name="owner"
              value={formData.owner}
              onChange={handleChange}
              className="form-input"
              placeholder="Project owner name"
            />
          </div>

          {/* Status */}
          <div className="form-group">
            <label htmlFor="status" className="form-label">
              Status
            </label>
            <select
              id="status"
              name="status"
              value={formData.status}
              onChange={handleChange}
              className="form-select"
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Date Range */}
        <div className="form-row">
          {/* Start Date */}
          <div className="form-group">
            <label htmlFor="start_date" className="form-label">
              Start Date
            </label>
            <input
              type="date"
              id="start_date"
              name="start_date"
              value={formData.start_date}
              onChange={handleChange}
              className="form-input"
            />
          </div>

          {/* End Date */}
          <div className="form-group">
            <label htmlFor="end_date" className="form-label">
              End Date
            </label>
            <input
              type="date"
              id="end_date"
              name="end_date"
              value={formData.end_date}
              onChange={handleChange}
              className={`form-input ${errors.end_date ? 'error' : ''}`}
            />
            {errors.end_date && <span className="form-error">{errors.end_date}</span>}
          </div>
        </div>

        {/* Tags */}
        <div className="form-group">
          <label htmlFor="tags" className="form-label">
            Tags
          </label>
          <div className="tags-container">
            {formData.tags.map((tag) => (
              <span key={tag} className="tag">
                {tag}
                <button
                  type="button"
                  onClick={() => handleRemoveTag(tag)}
                  className="tag-remove"
                  aria-label={`Remove ${tag}`}
                >
                  ×
                </button>
              </span>
            ))}
            <input
              type="text"
              id="tags"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleAddTag}
              className="tag-input"
              placeholder="Type and press Enter to add tags"
            />
          </div>
          <p className="form-hint">Press Enter after typing each tag</p>
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
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default EditProjectModal;
