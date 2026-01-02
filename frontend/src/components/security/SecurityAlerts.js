import React, { useState, useEffect } from 'react';
import './SecurityAlerts.css';

export default function SecurityAlerts() {
  const [settings, setSettings] = useState({
    emailAlerts: true,
    loginAlerts: true,
    unusualActivityAlerts: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/security/settings', { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        setSettings({
          emailAlerts: data.emailAlerts,
          loginAlerts: data.loginAlerts,
          unusualActivityAlerts: data.unusualActivityAlerts,
        });
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = async (key, value) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    setSaving(true);

    try {
      await fetch('/api/security/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(newSettings),
      });
    } catch (error) {
      console.error('Failed to update settings:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="security-alerts">
      <div className="security-alerts-header">
        <h2>Email Alerts</h2>
        <p className="security-alerts-subtitle">Choose which security notifications you'd like to receive</p>
      </div>

      <div className="alerts-list">
        <div className="alert-setting">
          <div className="alert-info">
            <h3>📧 Email Alerts</h3>
            <p>Receive security notifications via email</p>
          </div>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={settings.emailAlerts}
              onChange={(e) => updateSetting('emailAlerts', e.target.checked)}
            />
            <span className="toggle-slider"></span>
          </label>
        </div>

        <div className="alert-setting">
          <div className="alert-info">
            <h3>🔐 Login Alerts</h3>
            <p>Get notified when someone logs into your account</p>
          </div>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={settings.loginAlerts}
              onChange={(e) => updateSetting('loginAlerts', e.target.checked)}
            />
            <span className="toggle-slider"></span>
          </label>
        </div>

        <div className="alert-setting">
          <div className="alert-info">
            <h3>⚠️ Unusual Activity Alerts</h3>
            <p>Receive alerts about suspicious or unusual account activity</p>
          </div>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={settings.unusualActivityAlerts}
              onChange={(e) => updateSetting('unusualActivityAlerts', e.target.checked)}
            />
            <span className="toggle-slider"></span>
          </label>
        </div>
      </div>

      {saving && <div className="saving-indicator">Saving...</div>}
    </div>
  );
}
