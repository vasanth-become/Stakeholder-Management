import React, { useState } from 'react';
import InviteUserModal from '../components/InviteUserModal';

function SettingsPage() {
  const [activeSection, setActiveSection] = useState('workspace');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Workspace settings state
  const [workspaceSettings, setWorkspaceSettings] = useState({
    name: 'My Workspace',
    timezone: 'America/New_York',
    language: 'en',
    dateFormat: 'MM/DD/YYYY'
  });

  // Team members state
  const [teamMembers, setTeamMembers] = useState([
    {
      id: 1,
      name: 'Sarah Chen',
      email: 'sarah@company.com',
      role: 'admin',
      status: 'active',
      avatar: 'SC'
    },
    {
      id: 2,
      name: 'John Martinez',
      email: 'john@company.com',
      role: 'manager',
      status: 'active',
      avatar: 'JM'
    },
    {
      id: 3,
      name: 'Emily Wilson',
      email: 'emily@company.com',
      role: 'contributor',
      status: 'active',
      avatar: 'EW'
    }
  ]);

  // Notification settings state
  const [notifications, setNotifications] = useState({
    riskChanges: { email: true, inApp: true, frequency: 'instant' },
    noUpdateReminders: { email: true, inApp: true, frequency: 'weekly' },
    mentions: { email: true, inApp: true, frequency: 'instant' },
    reportSummaries: { email: true, inApp: false, frequency: 'weekly' },
    weeklyDigest: { email: true, inApp: false, frequency: 'weekly' }
  });

  // Security settings state
  const [securitySettings, setSecuritySettings] = useState({
    twoFactorEnabled: false,
    lastLogin: '2024-01-15 14:32 EST'
  });

  const handleWorkspaceChange = (e) => {
    const { name, value } = e.target;
    setWorkspaceSettings(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveWorkspace = () => {
    showSuccessToast('Workspace settings saved successfully');
  };

  const handleInviteUser = (userData) => {
    const newMember = {
      id: teamMembers.length + 1,
      name: userData.email.split('@')[0],
      email: userData.email,
      role: userData.role,
      status: 'invited',
      avatar: userData.email.substring(0, 2).toUpperCase()
    };
    setTeamMembers(prev => [...prev, newMember]);
    showSuccessToast(`Invitation sent to ${userData.email}`);
  };

  const handleRemoveUser = (userId) => {
    if (window.confirm('Are you sure you want to remove this team member?')) {
      setTeamMembers(prev => prev.filter(m => m.id !== userId));
      showSuccessToast('Team member removed');
    }
  };

  const handleChangeRole = (userId, newRole) => {
    setTeamMembers(prev => prev.map(m =>
      m.id === userId ? { ...m, role: newRole } : m
    ));
    showSuccessToast('Role updated successfully');
  };

  const handleNotificationToggle = (key, type) => {
    setNotifications(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        [type]: !prev[key][type]
      }
    }));
  };

  const handleNotificationFrequency = (key, frequency) => {
    setNotifications(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        frequency
      }
    }));
  };

  const handleToggle2FA = () => {
    setSecuritySettings(prev => ({
      ...prev,
      twoFactorEnabled: !prev.twoFactorEnabled
    }));
    showSuccessToast(securitySettings.twoFactorEnabled ? '2FA disabled' : '2FA enabled');
  };

  const showSuccessToast = (message) => {
    setToastMessage(message);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const sections = [
    { id: 'workspace', label: 'Workspace', icon: '🏢' },
    { id: 'team', label: 'Team & Roles', icon: '👥' },
    { id: 'notifications', label: 'Notifications', icon: '🔔' },
    { id: 'security', label: 'Security', icon: '🔒' },
    { id: 'billing', label: 'Billing', icon: '💳' },
    { id: 'integrations', label: 'Integrations', icon: '🔌' },
    { id: 'about', label: 'About', icon: 'ℹ️' }
  ];

  const getRoleBadgeClass = (role) => {
    const classes = {
      admin: 'role-badge-admin',
      manager: 'role-badge-manager',
      contributor: 'role-badge-contributor',
      viewer: 'role-badge-viewer'
    };
    return classes[role] || '';
  };

  const getRoleLabel = (role) => {
    const labels = {
      admin: 'Admin',
      manager: 'Manager',
      contributor: 'Contributor',
      viewer: 'Viewer'
    };
    return labels[role] || role;
  };

  return (
    <div className="settings-page">
      <div className="page-header">
        <h1>Settings</h1>
      </div>

      <div className="settings-container">
        {/* Sidebar Navigation */}
        <aside className="settings-sidebar">
          <nav className="settings-nav">
            {sections.map(section => (
              <button
                key={section.id}
                className={`settings-nav-item ${activeSection === section.id ? 'active' : ''}`}
                onClick={() => setActiveSection(section.id)}
              >
                <span className="settings-nav-icon">{section.icon}</span>
                <span className="settings-nav-label">{section.label}</span>
              </button>
            ))}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="settings-content">
          {/* Workspace Settings */}
          {activeSection === 'workspace' && (
            <div className="settings-section">
              <div className="section-header">
                <h2>Workspace Settings</h2>
                <p className="text-muted">Manage your workspace preferences and defaults</p>
              </div>

              <div className="settings-card">
                <div className="form-group">
                  <label htmlFor="workspace-name" className="form-label">Workspace Name</label>
                  <input
                    type="text"
                    id="workspace-name"
                    name="name"
                    value={workspaceSettings.name}
                    onChange={handleWorkspaceChange}
                    className="form-input"
                    placeholder="My Workspace"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="timezone" className="form-label">Timezone</label>
                  <select
                    id="timezone"
                    name="timezone"
                    value={workspaceSettings.timezone}
                    onChange={handleWorkspaceChange}
                    className="form-select"
                  >
                    <option value="America/New_York">Eastern Time (ET)</option>
                    <option value="America/Chicago">Central Time (CT)</option>
                    <option value="America/Denver">Mountain Time (MT)</option>
                    <option value="America/Los_Angeles">Pacific Time (PT)</option>
                    <option value="Europe/London">London (GMT)</option>
                    <option value="Asia/Tokyo">Tokyo (JST)</option>
                  </select>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="language" className="form-label">Language</label>
                    <select
                      id="language"
                      name="language"
                      value={workspaceSettings.language}
                      onChange={handleWorkspaceChange}
                      className="form-select"
                    >
                      <option value="en">English</option>
                      <option value="es">Spanish</option>
                      <option value="fr">French</option>
                      <option value="de">German</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label htmlFor="dateFormat" className="form-label">Date Format</label>
                    <select
                      id="dateFormat"
                      name="dateFormat"
                      value={workspaceSettings.dateFormat}
                      onChange={handleWorkspaceChange}
                      className="form-select"
                    >
                      <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                      <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                      <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                    </select>
                  </div>
                </div>

                <div className="form-actions">
                  <button className="btn btn-secondary">Reset to Default</button>
                  <button className="btn btn-primary" onClick={handleSaveWorkspace}>
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Team & Roles */}
          {activeSection === 'team' && (
            <div className="settings-section">
              <div className="section-header">
                <div>
                  <h2>Team & Roles</h2>
                  <p className="text-muted">Manage team members and their permissions</p>
                </div>
                <button className="btn btn-primary" onClick={() => setShowInviteModal(true)}>
                  + Invite Member
                </button>
              </div>

              {teamMembers.length === 0 ? (
                <div className="settings-card">
                  <div className="empty-state">
                    <span className="empty-icon">👥</span>
                    <p>No team members yet — invite your first teammate 🙂</p>
                    <button className="btn btn-primary" onClick={() => setShowInviteModal(true)}>
                      Invite Team Member
                    </button>
                  </div>
                </div>
              ) : (
                <div className="settings-card">
                  <div className="team-table">
                    <table>
                      <thead>
                        <tr>
                          <th>Member</th>
                          <th>Role</th>
                          <th>Status</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {teamMembers.map(member => (
                          <tr key={member.id}>
                            <td>
                              <div className="member-cell">
                                <div className="member-avatar">{member.avatar}</div>
                                <div className="member-info">
                                  <div className="member-name">{member.name}</div>
                                  <div className="member-email">{member.email}</div>
                                </div>
                              </div>
                            </td>
                            <td>
                              <select
                                value={member.role}
                                onChange={(e) => handleChangeRole(member.id, e.target.value)}
                                className={`role-badge ${getRoleBadgeClass(member.role)}`}
                              >
                                <option value="admin">Admin</option>
                                <option value="manager">Manager</option>
                                <option value="contributor">Contributor</option>
                                <option value="viewer">Viewer</option>
                              </select>
                            </td>
                            <td>
                              <span className={`status-badge status-${member.status}`}>
                                {member.status}
                              </span>
                            </td>
                            <td>
                              <button
                                className="btn-icon-action"
                                onClick={() => handleRemoveUser(member.id)}
                                title="Remove member"
                              >
                                🗑️
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Role Permissions Info */}
                  <div className="roles-info">
                    <h3>Role Permissions</h3>
                    <div className="roles-grid">
                      <div className="role-card">
                        <div className="role-card-header">
                          <span className={`role-badge role-badge-admin`}>Admin</span>
                        </div>
                        <ul className="role-permissions">
                          <li>✓ Full access to everything</li>
                          <li>✓ Manage billing</li>
                          <li>✓ Workspace settings</li>
                          <li>✓ User management</li>
                        </ul>
                      </div>

                      <div className="role-card">
                        <div className="role-card-header">
                          <span className={`role-badge role-badge-manager`}>Manager</span>
                        </div>
                        <ul className="role-permissions">
                          <li>✓ Manage projects</li>
                          <li>✓ Manage stakeholders</li>
                          <li>✓ View reports</li>
                          <li>✓ Assign tasks</li>
                        </ul>
                      </div>

                      <div className="role-card">
                        <div className="role-card-header">
                          <span className={`role-badge role-badge-contributor`}>Contributor</span>
                        </div>
                        <ul className="role-permissions">
                          <li>✓ Add interactions</li>
                          <li>✓ Edit assigned projects</li>
                          <li>✓ View stakeholders</li>
                          <li>○ Limited settings access</li>
                        </ul>
                      </div>

                      <div className="role-card">
                        <div className="role-card-header">
                          <span className={`role-badge role-badge-viewer`}>Viewer</span>
                        </div>
                        <ul className="role-permissions">
                          <li>✓ Read-only access</li>
                          <li>✓ View projects</li>
                          <li>✓ View stakeholders</li>
                          <li>○ No editing rights</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Notifications */}
          {activeSection === 'notifications' && (
            <div className="settings-section">
              <div className="section-header">
                <h2>Notification Preferences</h2>
                <p className="text-muted">Choose how and when you want to be notified</p>
              </div>

              <div className="settings-card">
                <div className="notification-groups">
                  {/* Risk Changes */}
                  <div className="notification-item">
                    <div className="notification-header">
                      <div>
                        <h4>Stakeholder Risk Changes</h4>
                        <p className="text-muted">Get alerted when a stakeholder's risk score changes significantly</p>
                      </div>
                    </div>
                    <div className="notification-controls">
                      <label className="toggle-label">
                        <input
                          type="checkbox"
                          checked={notifications.riskChanges.email}
                          onChange={() => handleNotificationToggle('riskChanges', 'email')}
                          className="toggle-checkbox"
                        />
                        <span className="toggle-switch"></span>
                        <span>Email</span>
                      </label>
                      <label className="toggle-label">
                        <input
                          type="checkbox"
                          checked={notifications.riskChanges.inApp}
                          onChange={() => handleNotificationToggle('riskChanges', 'inApp')}
                          className="toggle-checkbox"
                        />
                        <span className="toggle-switch"></span>
                        <span>In-App</span>
                      </label>
                      <select
                        value={notifications.riskChanges.frequency}
                        onChange={(e) => handleNotificationFrequency('riskChanges', e.target.value)}
                        className="frequency-select"
                      >
                        <option value="instant">Instant</option>
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="none">None</option>
                      </select>
                    </div>
                  </div>

                  {/* No Update Reminders */}
                  <div className="notification-item">
                    <div className="notification-header">
                      <div>
                        <h4>No-Update Reminders</h4>
                        <p className="text-muted">Reminders when stakeholders haven't been updated recently</p>
                      </div>
                    </div>
                    <div className="notification-controls">
                      <label className="toggle-label">
                        <input
                          type="checkbox"
                          checked={notifications.noUpdateReminders.email}
                          onChange={() => handleNotificationToggle('noUpdateReminders', 'email')}
                          className="toggle-checkbox"
                        />
                        <span className="toggle-switch"></span>
                        <span>Email</span>
                      </label>
                      <label className="toggle-label">
                        <input
                          type="checkbox"
                          checked={notifications.noUpdateReminders.inApp}
                          onChange={() => handleNotificationToggle('noUpdateReminders', 'inApp')}
                          className="toggle-checkbox"
                        />
                        <span className="toggle-switch"></span>
                        <span>In-App</span>
                      </label>
                      <select
                        value={notifications.noUpdateReminders.frequency}
                        onChange={(e) => handleNotificationFrequency('noUpdateReminders', e.target.value)}
                        className="frequency-select"
                      >
                        <option value="instant">Instant</option>
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="none">None</option>
                      </select>
                    </div>
                  </div>

                  {/* Mentions */}
                  <div className="notification-item">
                    <div className="notification-header">
                      <div>
                        <h4>Mentions & Assignments</h4>
                        <p className="text-muted">When you're mentioned or assigned to a project or task</p>
                      </div>
                    </div>
                    <div className="notification-controls">
                      <label className="toggle-label">
                        <input
                          type="checkbox"
                          checked={notifications.mentions.email}
                          onChange={() => handleNotificationToggle('mentions', 'email')}
                          className="toggle-checkbox"
                        />
                        <span className="toggle-switch"></span>
                        <span>Email</span>
                      </label>
                      <label className="toggle-label">
                        <input
                          type="checkbox"
                          checked={notifications.mentions.inApp}
                          onChange={() => handleNotificationToggle('mentions', 'inApp')}
                          className="toggle-checkbox"
                        />
                        <span className="toggle-switch"></span>
                        <span>In-App</span>
                      </label>
                      <select
                        value={notifications.mentions.frequency}
                        onChange={(e) => handleNotificationFrequency('mentions', e.target.value)}
                        className="frequency-select"
                      >
                        <option value="instant">Instant</option>
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="none">None</option>
                      </select>
                    </div>
                  </div>

                  {/* Report Summaries */}
                  <div className="notification-item">
                    <div className="notification-header">
                      <div>
                        <h4>Report Summaries</h4>
                        <p className="text-muted">Automated report summaries and insights</p>
                      </div>
                    </div>
                    <div className="notification-controls">
                      <label className="toggle-label">
                        <input
                          type="checkbox"
                          checked={notifications.reportSummaries.email}
                          onChange={() => handleNotificationToggle('reportSummaries', 'email')}
                          className="toggle-checkbox"
                        />
                        <span className="toggle-switch"></span>
                        <span>Email</span>
                      </label>
                      <label className="toggle-label">
                        <input
                          type="checkbox"
                          checked={notifications.reportSummaries.inApp}
                          onChange={() => handleNotificationToggle('reportSummaries', 'inApp')}
                          className="toggle-checkbox"
                        />
                        <span className="toggle-switch"></span>
                        <span>In-App</span>
                      </label>
                      <select
                        value={notifications.reportSummaries.frequency}
                        onChange={(e) => handleNotificationFrequency('reportSummaries', e.target.value)}
                        className="frequency-select"
                      >
                        <option value="instant">Instant</option>
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="none">None</option>
                      </select>
                    </div>
                  </div>

                  {/* Weekly Digest */}
                  <div className="notification-item">
                    <div className="notification-header">
                      <div>
                        <h4>Weekly Digest</h4>
                        <p className="text-muted">A summary of the week's activity and updates</p>
                      </div>
                    </div>
                    <div className="notification-controls">
                      <label className="toggle-label">
                        <input
                          type="checkbox"
                          checked={notifications.weeklyDigest.email}
                          onChange={() => handleNotificationToggle('weeklyDigest', 'email')}
                          className="toggle-checkbox"
                        />
                        <span className="toggle-switch"></span>
                        <span>Email</span>
                      </label>
                      <label className="toggle-label">
                        <input
                          type="checkbox"
                          checked={notifications.weeklyDigest.inApp}
                          onChange={() => handleNotificationToggle('weeklyDigest', 'inApp')}
                          className="toggle-checkbox"
                        />
                        <span className="toggle-switch"></span>
                        <span>In-App</span>
                      </label>
                      <select
                        value={notifications.weeklyDigest.frequency}
                        onChange={(e) => handleNotificationFrequency('weeklyDigest', e.target.value)}
                        className="frequency-select"
                      >
                        <option value="weekly">Weekly</option>
                        <option value="none">None</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Security */}
          {activeSection === 'security' && (
            <div className="settings-section">
              <div className="section-header">
                <h2>Security Settings</h2>
                <p className="text-muted">Manage your account security and authentication</p>
              </div>

              <div className="settings-card">
                <div className="security-item">
                  <div>
                    <h4>Password</h4>
                    <p className="text-muted">Last changed 3 months ago</p>
                  </div>
                  <button className="btn btn-secondary">Change Password</button>
                </div>

                <div className="security-item">
                  <div>
                    <h4>Two-Factor Authentication</h4>
                    <p className="text-muted">
                      {securitySettings.twoFactorEnabled
                        ? 'Extra security enabled with 2FA'
                        : 'Add an extra layer of security to your account'}
                    </p>
                  </div>
                  <label className="toggle-label">
                    <input
                      type="checkbox"
                      checked={securitySettings.twoFactorEnabled}
                      onChange={handleToggle2FA}
                      className="toggle-checkbox"
                    />
                    <span className="toggle-switch"></span>
                    <span>{securitySettings.twoFactorEnabled ? 'Enabled' : 'Disabled'}</span>
                  </label>
                </div>

                <div className="security-item">
                  <div>
                    <h4>Session History</h4>
                    <p className="text-muted">Last login: {securitySettings.lastLogin}</p>
                  </div>
                  <button className="btn btn-secondary">View History</button>
                </div>

                <div className="security-item">
                  <div>
                    <h4>Active Sessions</h4>
                    <p className="text-muted">Manage devices where you're currently signed in</p>
                  </div>
                  <button className="btn btn-secondary">Manage Sessions</button>
                </div>
              </div>
            </div>
          )}

          {/* Billing */}
          {activeSection === 'billing' && (
            <div className="settings-section">
              <div className="section-header">
                <h2>Billing & Subscription</h2>
                <p className="text-muted">Manage your plan and billing information</p>
              </div>

              <div className="settings-card">
                <div className="billing-overview">
                  <div className="billing-plan">
                    <h3>Professional Plan</h3>
                    <div className="plan-price">$49<span>/month</span></div>
                    <p className="text-muted">Billed monthly</p>
                  </div>

                  <div className="billing-details">
                    <div className="billing-detail-item">
                      <span className="detail-label">Active Seats</span>
                      <span className="detail-value">{teamMembers.length} / 10</span>
                    </div>
                    <div className="billing-detail-item">
                      <span className="detail-label">Next Billing Date</span>
                      <span className="detail-value">February 15, 2024</span>
                    </div>
                    <div className="billing-detail-item">
                      <span className="detail-label">Payment Method</span>
                      <span className="detail-value">•••• 4242</span>
                    </div>
                  </div>
                </div>

                <div className="form-actions">
                  <button className="btn btn-secondary">Update Payment Method</button>
                  <button className="btn btn-secondary">View Invoices</button>
                  <button className="btn btn-primary">Upgrade Plan</button>
                </div>
              </div>
            </div>
          )}

          {/* Integrations */}
          {activeSection === 'integrations' && (
            <div className="settings-section">
              <div className="section-header">
                <h2>Integrations</h2>
                <p className="text-muted">Connect your favorite tools and services</p>
              </div>

              <div className="integrations-grid">
                <div className="integration-card">
                  <div className="integration-icon">💬</div>
                  <h4>Slack</h4>
                  <p className="text-muted">Get notifications and updates in your Slack workspace</p>
                  <span className="badge-coming-soon">Coming Soon</span>
                </div>

                <div className="integration-card">
                  <div className="integration-icon">📧</div>
                  <h4>Email</h4>
                  <p className="text-muted">Sync stakeholder communications with your email</p>
                  <span className="badge-coming-soon">Coming Soon</span>
                </div>

                <div className="integration-card">
                  <div className="integration-icon">📋</div>
                  <h4>Jira</h4>
                  <p className="text-muted">Link stakeholders to Jira issues and projects</p>
                  <span className="badge-coming-soon">Coming Soon</span>
                </div>

                <div className="integration-card">
                  <div className="integration-icon">📊</div>
                  <h4>Google Sheets</h4>
                  <p className="text-muted">Export and sync data with Google Sheets</p>
                  <span className="badge-coming-soon">Coming Soon</span>
                </div>
              </div>
            </div>
          )}

          {/* About */}
          {activeSection === 'about' && (
            <div className="settings-section">
              <div className="section-header">
                <h2>About Stakeholder Radar</h2>
                <p className="text-muted">Version information and resources</p>
              </div>

              <div className="settings-card">
                <div className="about-content">
                  <div className="about-logo">
                    <div className="brand-icon" style={{ width: '64px', height: '64px', fontSize: '1.5rem' }}>SR</div>
                  </div>

                  <div className="about-info">
                    <h3>Stakeholder Radar</h3>
                    <p className="version">Version 1.0.0</p>
                    <p className="text-muted">
                      A modern stakeholder management platform designed to help teams track,
                      engage, and manage relationships with key stakeholders.
                    </p>
                  </div>

                  <div className="about-links">
                    <a href="#" className="about-link">Documentation</a>
                    <a href="#" className="about-link">Support</a>
                    <a href="#" className="about-link">Privacy Policy</a>
                    <a href="#" className="about-link">Terms of Service</a>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Invite User Modal */}
      <InviteUserModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        onInvite={handleInviteUser}
      />

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

export default SettingsPage;
