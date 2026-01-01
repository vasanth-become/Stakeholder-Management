import React from 'react';

/**
 * ProgressStepper Component
 * Shows progress through onboarding steps
 */
function ProgressStepper({ currentStep, steps }) {
  return (
    <div className="progress-stepper">
      {steps.map((step, index) => {
        const isActive = index === currentStep;
        const isCompleted = index < currentStep;
        const isUpcoming = index > currentStep;

        return (
          <div key={index} className="progress-step-wrapper">
            <div className={`progress-step ${
              isCompleted ? 'completed' :
              isActive ? 'active' :
              'upcoming'
            }`}>
              <div className="step-indicator">
                {isCompleted ? (
                  <span className="step-checkmark">✓</span>
                ) : (
                  <span className="step-number">{index + 1}</span>
                )}
              </div>
              <div className="step-label">{step}</div>
            </div>

            {index < steps.length - 1 && (
              <div className={`step-connector ${
                isCompleted ? 'completed' : ''
              }`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default ProgressStepper;
