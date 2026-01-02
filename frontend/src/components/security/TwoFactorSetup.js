import React, { useState } from 'react';
import './TwoFactorSetup.css';

export default function TwoFactorSetup() {
  const [enabled, setEnabled] = useState(false);
  const [setupStep, setSetupStep] = useState(1);
  const [qrCode, setQrCode] = useState('');
  const [backupCodes, setBackupCodes] = useState([]);

  const startSetup = async () => {
    try {
      const response = await fetch('/api/security/2fa/setup', {
        method: 'POST',
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setQrCode(data.qrCode);
        setBackupCodes(data.backupCodes);
        setSetupStep(2);
      }
    } catch (error) {
      console.error('Failed to setup 2FA:', error);
    }
  };

  return (
    <div className="two-factor-setup">
      <div className="two-factor-header">
        <h2>Two-Factor Authentication</h2>
        <p className="two-factor-subtitle">Add an extra layer of security to your account</p>
      </div>

      {!enabled ? (
        <div className="two-factor-disabled">
          <div className="feature-card">
            <span className="feature-icon">🔐</span>
            <h3>Enable Two-Factor Authentication</h3>
            <p>Protect your account with an additional security code when logging in</p>
            <button className="btn-primary" onClick={startSetup}>
              Enable 2FA
            </button>
          </div>

          <div className="two-factor-info">
            <h3>What is Two-Factor Authentication?</h3>
            <ul>
              <li>Adds an extra layer of security to your account</li>
              <li>Requires both your password and a verification code</li>
              <li>Protects against unauthorized access</li>
              <li>Works with authenticator apps like Google Authenticator</li>
            </ul>
          </div>
        </div>
      ) : (
        <div className="two-factor-enabled">
          <div className="status-card enabled">
            <span className="status-icon">✅</span>
            <div>
              <h3>2FA Enabled</h3>
              <p>Your account is protected with two-factor authentication</p>
            </div>
          </div>
          <button className="btn-danger">Disable 2FA</button>
        </div>
      )}
    </div>
  );
}
