import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { stakeholderAPI, projectAPI } from '../services/api';
import EnrichmentSuggestionPanel from './EnrichmentSuggestionPanel';

function AddStakeholderModal({ isOpen, onClose, onSuccess, preselectedProjectId = null }) {
  const [projects, setProjects] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    role: '',
    company: '',
    email: '',
    linkedin_url: '',
    project_id: preselectedProjectId || '',
    power: 3,
    influence: 3,
    engagement_status: 'neutral',
    preferred_channel: 'email',
    owner: '',
    notes: '',
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [enrichmentSuggestions, setEnrichmentSuggestions] = useState(null);
  const [isEnriching, setIsEnriching] = useState(false);
  const [showEnrichmentPanel, setShowEnrichmentPanel] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadProjects();
      if (preselectedProjectId) {
        setFormData(prev => ({ ...prev, project_id: preselectedProjectId }));
      }
    }
  }, [isOpen, preselectedProjectId]);

  async function loadProjects() {
    try {
      const projectsData = await projectAPI.getAll();
      setProjects(projectsData);
    } catch (err) {
      console.error('Failed to load projects:', err);
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

  const handleEnrich = async () => {
    const { email, linkedin_url, name, company } = formData;

    // Check if we have sufficient data
    if (!email && !linkedin_url && !(name && company)) {
      setErrors({
        ...errors,
        enrichment: 'Please provide either email, LinkedIn URL, or both name and company to enrich the profile.'
      });
      return;
    }

    setIsEnriching(true);
    setErrors({ ...errors, enrichment: '' });

    try {
      const result = await stakeholderAPI.enrich({
        email: email || undefined,
        linkedinUrl: linkedin_url || undefined,
        name: name || undefined,
        company: company || undefined
      });

      if (result.success && result.suggestions) {
        setEnrichmentSuggestions(result.suggestions);
        setShowEnrichmentPanel(true);
      } else {
        setErrors({
          ...errors,
          enrichment: result.message || 'No enrichment data found. Try adding more information.'
        });
      }
    } catch (error) {
      setErrors({
        ...errors,
        enrichment: 'Failed to enrich profile. Please try again.'
      });
    } finally {
      setIsEnriching(false);
    }
  };

  const handleAcceptEnrichment = (acceptedFields) => {
    // Apply accepted fields to form data
    const updates = {};

    acceptedFields.forEach(fieldName => {
      const suggestion = enrichmentSuggestions[fieldName];
      if (suggestion) {
        // Map enrichment field names to form field names
        const fieldMap = {
          linkedinUrl: 'linkedin_url',
          companySize: 'company_size'
        };

        const formFieldName = fieldMap[fieldName] || fieldName;
        updates[formFieldName] = suggestion.value;
      }
    });

    setFormData(prev => ({ ...prev, ...updates }));
    setShowEnrichmentPanel(false);
    setEnrichmentSuggestions(null);
  };

  const handleRejectEnrichment = () => {
    setShowEnrichmentPanel(false);
    setEnrichmentSuggestions(null);
  };

  const canEnrich = () => {
    const { email, linkedin_url, name, company } = formData;
    return !!(email || linkedin_url || (name && company));
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Please enter a name 🙂';
    }

    if (!formData.role.trim()) {
      newErrors.role = 'Please enter a role 🙂';
    }

    if (!formData.project_id) {
      newErrors.project_id = 'Please select a project 🙂';
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
        project_id: parseInt(formData.project_id),
        name: formData.name.trim(),
        role: formData.role.trim(),
        company: formData.company.trim() || null,
        email: formData.email.trim() || null,
        linkedin_url: formData.linkedin_url.trim() || null,
        power: parseInt(formData.power),
        influence: parseInt(formData.influence),
        engagement_status: formData.engagement_status,
        preferred_channel: formData.preferred_channel,
        owner: formData.owner.trim() || null,
        notes: formData.notes.trim() || null,
      };

      const newStakeholder = await stakeholderAPI.create(stakeholderData);

      // Reset form
      setFormData({
        name: '',
        role: '',
        company: '',
        email: '',
        linkedin_url: '',
        project_id: preselectedProjectId || '',
        power: 3,
        influence: 3,
        engagement_status: 'neutral',
        preferred_channel: 'email',
        owner: '',
        notes: '',
      });
      setErrors({});
      setEnrichmentSuggestions(null);
      setShowEnrichmentPanel(false);

      onSuccess(newStakeholder);
      onClose();
    } catch (error) {
      setErrors({ submit: error.message || 'Failed to add stakeholder. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      name: '',
      role: '',
      company: '',
      email: '',
      linkedin_url: '',
      project_id: preselectedProjectId || '',
      power: 3,
      influence: 3,
      engagement_status: 'neutral',
      preferred_channel: 'email',
      owner: '',
      notes: '',
    });
    setErrors({});
    setEnrichmentSuggestions(null);
    setShowEnrichmentPanel(false);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleCancel} title="Add Stakeholder" size="large">
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

        {/* Email and LinkedIn */}
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="email" className="form-label">
              Email
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="form-input"
              placeholder="e.g., sarah@company.com"
            />
          </div>

          <div className="form-group">
            <label htmlFor="linkedin_url" className="form-label">
              LinkedIn URL
            </label>
            <input
              type="url"
              id="linkedin_url"
              name="linkedin_url"
              value={formData.linkedin_url}
              onChange={handleChange}
              className="form-input"
              placeholder="e.g., linkedin.com/in/sarahjohnson"
            />
          </div>
        </div>

        {/* Enrichment Section */}
        {canEnrich() && (
          <div className="enrichment-section" style={{
            padding: '1rem',
            background: '#f8fafc',
            borderRadius: '8px',
            marginBottom: '1.5rem',
            border: '1px solid #e2e8f0'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ margin: 0, fontWeight: 600, color: '#475569' }}>✨ Auto-fill profile data</p>
                <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem', color: '#64748b' }}>
                  We can find additional information from public sources
                </p>
              </div>
              <button
                type="button"
                onClick={handleEnrich}
                disabled={isEnriching}
                className="btn btn-outline"
                style={{ whiteSpace: 'nowrap' }}
              >
                {isEnriching ? 'Searching...' : '🔍 Get Suggestions'}
              </button>
            </div>
            {errors.enrichment && (
              <div style={{ marginTop: '0.75rem', color: '#dc2626', fontSize: '0.875rem' }}>
                {errors.enrichment}
              </div>
            )}
          </div>
        )}

        {/* Project */}
        <div className="form-group">
          <label htmlFor="project_id" className="form-label required">
            Project
          </label>
          <select
            id="project_id"
            name="project_id"
            value={formData.project_id}
            onChange={handleChange}
            className={`form-select ${errors.project_id ? 'error' : ''}`}
            disabled={!!preselectedProjectId}
          >
            <option value="">Select a project</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
          {errors.project_id && <span className="form-error">{errors.project_id}</span>}
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

      {/* Enrichment Suggestion Panel */}
      {showEnrichmentPanel && enrichmentSuggestions && (
        <EnrichmentSuggestionPanel
          suggestions={enrichmentSuggestions}
          onAccept={handleAcceptEnrichment}
          onReject={handleRejectEnrichment}
          onClose={() => setShowEnrichmentPanel(false)}
          loading={false}
        />
      )}
    </Modal>
  );
}

export default AddStakeholderModal;
