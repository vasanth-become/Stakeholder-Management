import React from 'react';
import ProgressStepper from './ProgressStepper';

/**
 * OnboardingLayout Component
 * Wrapper for all onboarding screens with consistent layout
 */
function OnboardingLayout({
  children,
  currentStep,
  showStepper = true,
  showLogo = true
}) {
  const steps = ['Workspace', 'Role', 'Connect', 'Project', 'Stakeholder', 'Done'];

  return (
    <div className="onboarding-container">
      {showLogo && (
        <div className="onboarding-logo">
          <div className="logo-icon">📊</div>
          <span className="logo-text">Stakeholder Radar</span>
        </div>
      )}

      {showStepper && currentStep > 0 && currentStep < 7 && (
        <div className="onboarding-stepper-container">
          <ProgressStepper currentStep={currentStep - 1} steps={steps} />
        </div>
      )}

      <div className="onboarding-content">
        {children}
      </div>

      <div className="onboarding-footer">
        <p className="text-muted">
          Need help? <a href="mailto:support@stakeholderradar.com">Contact support</a>
        </p>
      </div>
    </div>
  );
}

export default OnboardingLayout;
