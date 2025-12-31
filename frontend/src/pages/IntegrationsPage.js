import React, { useState } from 'react';
import SlackIntegrationModal from '../components/SlackIntegrationModal';
import GmailIntegrationModal from '../components/GmailIntegrationModal';
import SheetsIntegrationModal from '../components/SheetsIntegrationModal';
import JiraIntegrationModal from '../components/JiraIntegrationModal';

function IntegrationsPage() {
  const [integrations, setIntegrations] = useState({
    slack: {
      id: 'slack',
      name: 'Slack',
      icon: '💬',
      description: 'Get real-time alerts and summaries in your Slack workspace',
      connected: false,
      workspaceName: null,
      settings: null
    },
    gmail: {
      id: 'gmail',
      name: 'Gmail',
      icon: '📧',
      description: 'Log stakeholder emails and track communication automatically',
      connected: false,
      email: null,
      settings: null
    },
    sheets: {
      id: 'sheets',
      name: 'Google Sheets',
      icon: '📊',
      description: 'Export and sync data with Google Sheets',
      connected: false,
      email: null,
      settings: null
    },
    jira: {
      id: 'jira',
      name: 'Jira',
      icon: '📋',
      description: 'Link stakeholder risk to your delivery work in Jira',
      connected: false,
      siteName: null,
      settings: null
    }
  });

  const [activeModal, setActiveModal] = useState(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const showSuccessToast = (message) => {
    setToastMessage(message);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  // Mock OAuth connection
  const handleConnect = (integrationId) => {
    // Simulate OAuth flow
    setTimeout(() => {
      setIntegrations(prev => ({
        ...prev,
        [integrationId]: {
          ...prev[integrationId],
          connected: true,
          ...(integrationId === 'slack' && { workspaceName: 'My Workspace' }),
          ...(integrationId === 'gmail' && { email: 'user@company.com' }),
          ...(integrationId === 'sheets' && { email: 'user@company.com' }),
          ...(integrationId === 'jira' && { siteName: 'company.atlassian.net' }),
          settings: {}
        }
      }));
      showSuccessToast(`${integrations[integrationId].name} connected successfully!`);
    }, 500);
  };

  const handleDisconnect = (integrationId) => {
    if (window.confirm(`Are you sure you want to disconnect ${integrations[integrationId].name}?`)) {
      setIntegrations(prev => ({
        ...prev,
        [integrationId]: {
          ...prev[integrationId],
          connected: false,
          workspaceName: null,
          email: null,
          siteName: null,
          settings: null
        }
      }));
      showSuccessToast(`${integrations[integrationId].name} disconnected`);
    }
  };

  const handleOpenSettings = (integrationId) => {
    setActiveModal(integrationId);
  };

  const handleSaveSettings = (integrationId, updatedIntegration) => {
    setIntegrations(prev => ({
      ...prev,
      [integrationId]: updatedIntegration
    }));
    showSuccessToast('Settings saved successfully');
  };

  const getStatusBadgeClass = (connected) => {
    return connected ? 'integration-status-connected' : 'integration-status-disconnected';
  };

  const getStatusText = (connected) => {
    return connected ? 'Connected' : 'Not Connected';
  };

  return (
    <div className="integrations-page">
      <div className="page-header">
        <div>
          <h1>Integrations</h1>
          <p className="text-muted">Connect your favorite tools to enhance stakeholder management</p>
        </div>
      </div>

      {/* Integration Cards Grid */}
      <div className="integrations-cards-grid">
        {Object.values(integrations).map(integration => (
          <div key={integration.id} className="integration-card-large">
            <div className="integration-card-header">
              <div className="integration-icon-large">{integration.icon}</div>
              <div className="integration-header-info">
                <h3>{integration.name}</h3>
                <span className={`integration-status-badge ${getStatusBadgeClass(integration.connected)}`}>
                  {getStatusText(integration.connected)}
                </span>
              </div>
            </div>

            <p className="integration-description">{integration.description}</p>

            {integration.connected && (
              <div className="integration-connection-info">
                {integration.workspaceName && (
                  <span className="connection-detail">Workspace: {integration.workspaceName}</span>
                )}
                {integration.email && (
                  <span className="connection-detail">Account: {integration.email}</span>
                )}
                {integration.siteName && (
                  <span className="connection-detail">Site: {integration.siteName}</span>
                )}
              </div>
            )}

            <div className="integration-card-actions">
              {!integration.connected ? (
                <button
                  className="btn btn-primary"
                  onClick={() => handleConnect(integration.id)}
                >
                  Connect {integration.name}
                </button>
              ) : (
                <>
                  <button
                    className="btn btn-secondary"
                    onClick={() => handleOpenSettings(integration.id)}
                  >
                    Settings
                  </button>
                  <button
                    className="btn btn-secondary"
                    onClick={() => handleDisconnect(integration.id)}
                  >
                    Disconnect
                  </button>
                </>
              )}
            </div>

            {/* Feature List */}
            <div className="integration-features">
              {integration.id === 'slack' && (
                <ul>
                  <li>⚠️ Real-time risk alerts</li>
                  <li>📊 Weekly project summaries</li>
                  <li>✨ AI-powered suggestions</li>
                  <li>📅 No-update reminders</li>
                </ul>
              )}
              {integration.id === 'gmail' && (
                <ul>
                  <li>📧 Auto-log stakeholder emails</li>
                  <li>📅 Track last contact dates</li>
                  <li>🎯 Sentiment analysis (coming soon)</li>
                  <li>📝 Email templates (coming soon)</li>
                </ul>
              )}
              {integration.id === 'sheets' && (
                <ul>
                  <li>📊 Export stakeholders & data</li>
                  <li>💬 Export interaction history</li>
                  <li>📈 Export risk reports</li>
                  <li>🔄 Auto-sync (coming soon)</li>
                </ul>
              )}
              {integration.id === 'jira' && (
                <ul>
                  <li>🔗 Link to Jira projects</li>
                  <li>⚠️ High-risk notifications</li>
                  <li>📝 Reference tickets in logs</li>
                  <li>➕ Auto-create issues (coming soon)</li>
                </ul>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Security Notice */}
      <div className="integration-security-notice">
        <div className="security-notice-icon">🔒</div>
        <div>
          <h4>Your data is secure</h4>
          <p>
            All integrations use industry-standard OAuth 2.0 authentication.
            We never store your passwords, and you can disconnect any integration at any time.
          </p>
        </div>
      </div>

      {/* Modals */}
      {activeModal === 'slack' && (
        <SlackIntegrationModal
          isOpen={true}
          onClose={() => setActiveModal(null)}
          integration={integrations.slack}
          onSave={(updated) => handleSaveSettings('slack', updated)}
        />
      )}

      {activeModal === 'gmail' && (
        <GmailIntegrationModal
          isOpen={true}
          onClose={() => setActiveModal(null)}
          integration={integrations.gmail}
          onSave={(updated) => handleSaveSettings('gmail', updated)}
        />
      )}

      {activeModal === 'sheets' && (
        <SheetsIntegrationModal
          isOpen={true}
          onClose={() => setActiveModal(null)}
          integration={integrations.sheets}
          onSave={(updated) => handleSaveSettings('sheets', updated)}
        />
      )}

      {activeModal === 'jira' && (
        <JiraIntegrationModal
          isOpen={true}
          onClose={() => setActiveModal(null)}
          integration={integrations.jira}
          onSave={(updated) => handleSaveSettings('jira', updated)}
        />
      )}

      {/* Toast Notification */}
      {showToast && (
        <div className="toast toast-success">
          <div className="toast-icon">✓</div>
          <div className="toast-message">{toastMessage}</div>
          <button className="toast-close" onClick={() => setShowToast(false)}>×</button>
        </div>
      )}
    </div>
  );
}

export default IntegrationsPage;
