import React, { useState } from 'react';

function JiraIntegrationModal({ isOpen, onClose, integration, onSave }) {
  const [settings, setSettings] = useState({
    jiraProject: integration?.settings?.jiraProject || '',
    linkProjects: integration?.settings?.linkProjects ?? true,
    createIssues: integration?.settings?.createIssues ?? false,
    riskAlerts: integration?.settings?.riskAlerts ?? true
  });

  const handleToggle = (key) => {
    setSettings(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleSave = () => {
    onSave({ ...integration, settings });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Jira Integration Settings</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          <div className="integration-modal-content">
            {/* Connection Status */}
            <div className="integration-status-banner">
              <div className="status-icon">✓</div>
              <div>
                <h4>Connected to Jira</h4>
                <p className="text-muted">Site: {integration?.siteName || 'company.atlassian.net'}</p>
              </div>
            </div>

            {/* Project Linking */}
            <div className="integration-settings-section">
              <h3>Project Configuration</h3>
              <p className="text-muted">Link Stakeholder Radar projects to Jira projects</p>

              <div className="form-group">
                <label className="form-label">Default Jira Project</label>
                <select
                  value={settings.jiraProject}
                  onChange={(e) => setSettings({ ...settings, jiraProject: e.target.value })}
                  className="form-select"
                >
                  <option value="">Select a Jira project...</option>
                  <option value="STAKE-1">Stakeholder Management (STAKE)</option>
                  <option value="PROJ-1">Project Delivery (PROJ)</option>
                  <option value="ENG-1">Engineering (ENG)</option>
                  <option value="PROD-1">Product (PROD)</option>
                </select>
                <span className="form-hint">Choose the Jira project to link with stakeholder activities</span>
              </div>
            </div>

            {/* Features */}
            <div className="integration-settings-section">
              <h3>Integration Features</h3>

              <div className="notification-toggles">
                <div className="notification-toggle-item">
                  <div>
                    <h4>🔗 Link Projects</h4>
                    <p className="text-muted">Reference Jira tickets in stakeholder interactions</p>
                    <div className="info-box">
                      <strong>Example:</strong> Log interactions with references like "Discussed STAKE-123 implementation"
                    </div>
                  </div>
                  <label className="toggle-label">
                    <input
                      type="checkbox"
                      checked={settings.linkProjects}
                      onChange={() => handleToggle('linkProjects')}
                      className="toggle-checkbox"
                    />
                    <span className="toggle-switch"></span>
                  </label>
                </div>

                <div className="notification-toggle-item">
                  <div>
                    <h4>⚠️ High-Risk Alerts</h4>
                    <p className="text-muted">Get notified in Jira when stakeholder risk increases</p>
                    <div className="info-box">
                      Creates a notification or comment when key stakeholders become high-risk
                    </div>
                  </div>
                  <label className="toggle-label">
                    <input
                      type="checkbox"
                      checked={settings.riskAlerts}
                      onChange={() => handleToggle('riskAlerts')}
                      className="toggle-checkbox"
                    />
                    <span className="toggle-switch"></span>
                  </label>
                </div>

                <div className="notification-toggle-item">
                  <div>
                    <h4>➕ Auto-Create Issues (Beta)</h4>
                    <p className="text-muted">Automatically create Jira issues for high-risk stakeholders</p>
                    <div className="info-box">
                      <strong>Coming soon:</strong> Create follow-up tasks in Jira based on stakeholder engagement needs
                    </div>
                  </div>
                  <label className="toggle-label">
                    <input
                      type="checkbox"
                      checked={settings.createIssues}
                      onChange={() => handleToggle('createIssues')}
                      className="toggle-checkbox"
                      disabled
                    />
                    <span className="toggle-switch"></span>
                  </label>
                </div>
              </div>
            </div>

            {/* Issue Type Configuration */}
            <div className="integration-settings-section">
              <h3>Issue Settings</h3>
              <p className="text-muted">Configure how stakeholder activities are tracked in Jira</p>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Issue Type</label>
                  <select className="form-select" disabled>
                    <option value="task">Task</option>
                    <option value="story">Story</option>
                    <option value="bug">Bug</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Priority</label>
                  <select className="form-select" disabled>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
              </div>

              <span className="form-hint">These settings will be available when auto-create is enabled</span>
            </div>

            <div className="form-actions">
              <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave}>Save Settings</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default JiraIntegrationModal;
