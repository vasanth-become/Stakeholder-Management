import React, { useState } from 'react';

function SheetsIntegrationModal({ isOpen, onClose, integration, onSave }) {
  const [settings, setSettings] = useState({
    sheetId: integration?.settings?.sheetId || '',
    autoSync: integration?.settings?.autoSync ?? false,
    syncFrequency: integration?.settings?.syncFrequency || 'manual'
  });

  const handleExport = (type) => {
    // Mock export functionality
    alert(`Exporting ${type} to Google Sheets...`);
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
          <h2>Google Sheets Integration Settings</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          <div className="integration-modal-content">
            {/* Connection Status */}
            <div className="integration-status-banner">
              <div className="status-icon">✓</div>
              <div>
                <h4>Connected to Google Sheets</h4>
                <p className="text-muted">Account: {integration?.email || 'user@company.com'}</p>
              </div>
            </div>

            {/* Export Options */}
            <div className="integration-settings-section">
              <h3>Export Data</h3>
              <p className="text-muted">Export your data to Google Sheets with one click</p>

              <div className="export-grid">
                <div className="export-card">
                  <div className="export-card-icon">👥</div>
                  <h4>Stakeholders</h4>
                  <p className="text-muted">Export all stakeholders with risk scores and engagement levels</p>
                  <button className="btn btn-secondary btn-sm" onClick={() => handleExport('stakeholders')}>
                    Export Now
                  </button>
                </div>

                <div className="export-card">
                  <div className="export-card-icon">💬</div>
                  <h4>Interactions</h4>
                  <p className="text-muted">Export interaction timeline and communication history</p>
                  <button className="btn btn-secondary btn-sm" onClick={() => handleExport('interactions')}>
                    Export Now
                  </button>
                </div>

                <div className="export-card">
                  <div className="export-card-icon">📊</div>
                  <h4>Risk Reports</h4>
                  <p className="text-muted">Export comprehensive risk analysis and metrics</p>
                  <button className="btn btn-secondary btn-sm" onClick={() => handleExport('reports')}>
                    Export Now
                  </button>
                </div>

                <div className="export-card">
                  <div className="export-card-icon">📁</div>
                  <h4>Projects</h4>
                  <p className="text-muted">Export project details and stakeholder assignments</p>
                  <button className="btn btn-secondary btn-sm" onClick={() => handleExport('projects')}>
                    Export Now
                  </button>
                </div>
              </div>
            </div>

            {/* Sheet Configuration */}
            <div className="integration-settings-section">
              <h3>Sheet Configuration</h3>

              <div className="form-group">
                <label className="form-label">Target Sheet ID (Optional)</label>
                <input
                  type="text"
                  value={settings.sheetId}
                  onChange={(e) => setSettings({ ...settings, sheetId: e.target.value })}
                  className="form-input"
                  placeholder="Enter Google Sheets ID or leave blank for new sheet"
                />
                <span className="form-hint">Leave blank to create a new sheet for each export</span>
              </div>
            </div>

            {/* Auto Sync (Future) */}
            <div className="integration-settings-section">
              <h3>Auto-Sync (Coming Soon)</h3>
              <p className="text-muted">Automatically sync data to Google Sheets on a schedule</p>

              <div className="notification-toggle-item">
                <div>
                  <h4>🔄 Enable Auto-Sync</h4>
                  <p className="text-muted">Keep your Google Sheets up to date automatically</p>
                </div>
                <label className="toggle-label">
                  <input
                    type="checkbox"
                    checked={settings.autoSync}
                    onChange={() => setSettings({ ...settings, autoSync: !settings.autoSync })}
                    className="toggle-checkbox"
                    disabled
                  />
                  <span className="toggle-switch"></span>
                </label>
              </div>

              {settings.autoSync && (
                <div className="form-group">
                  <label className="form-label">Sync Frequency</label>
                  <select
                    value={settings.syncFrequency}
                    onChange={(e) => setSettings({ ...settings, syncFrequency: e.target.value })}
                    className="form-select"
                    disabled
                  >
                    <option value="manual">Manual Only</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="realtime">Real-time (Beta)</option>
                  </select>
                </div>
              )}
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

export default SheetsIntegrationModal;
