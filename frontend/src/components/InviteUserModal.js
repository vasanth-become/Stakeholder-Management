import React, { useState } from 'react';

function InviteUserModal({ isOpen, onClose, onInvite }) {
  const [formData, setFormData] = useState({
    email: '',
    role: 'viewer',
    message: ''
  });

  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    onInvite(formData);
    setFormData({ email: '', role: 'viewer', message: '' });
    setErrors({});
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-medium" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Invite Team Member</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          <form onSubmit={handleSubmit} className="invite-form">
            <div className="form-group">
              <label htmlFor="email" className="form-label required">Email Address</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className={`form-input ${errors.email ? 'error' : ''}`}
                placeholder="colleague@company.com"
              />
              {errors.email && <span className="form-error">{errors.email}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="role" className="form-label required">Role</label>
              <select
                id="role"
                name="role"
                value={formData.role}
                onChange={handleChange}
                className="form-select"
              >
                <option value="admin">Admin — Full access to everything</option>
                <option value="manager">Manager — Manage projects and stakeholders</option>
                <option value="contributor">Contributor — Add interactions and edit assigned projects</option>
                <option value="viewer">Viewer — Read-only access</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="message" className="form-label">Personal Message (Optional)</label>
              <textarea
                id="message"
                name="message"
                value={formData.message}
                onChange={handleChange}
                className="form-textarea"
                placeholder="Add a personal note to the invitation..."
                rows="3"
              />
              <span className="form-hint">This will be included in the invitation email</span>
            </div>

            <div className="form-actions">
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                Send Invitation
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default InviteUserModal;
