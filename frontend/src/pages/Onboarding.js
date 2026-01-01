import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOnboarding } from '../context/OnboardingContext';
import OnboardingLayout from '../components/OnboardingLayout';
import { projectAPI, stakeholderAPI } from '../services/api';

/**
 * Main Onboarding Component
 * Multi-step wizard for new user onboarding
 */
function Onboarding() {
  const navigate = useNavigate();
  const {
    currentStep,
    workspace,
    role,
    project,
    stakeholder,
    updateWorkspace,
    updateRole,
    updateProject,
    updateStakeholder,
    nextStep,
    prevStep,
    completeOnboarding,
    startOnboarding
  } = useOnboarding();

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  // Initialize onboarding on mount
  useEffect(() => {
    if (currentStep === 0 && !workspace.name) {
      startOnboarding();
    }
  }, []);

  // ==================== STAGE 0: WELCOME ====================
  const WelcomeStep = () => (
    <OnboardingLayout showStepper={false} currentStep={currentStep}>
      <div className="onboarding-welcome">
        <div className="welcome-hero">
          <h1>Welcome to Stakeholder Radar</h1>
          <p className="welcome-subtitle">
            Manage relationships. Reduce risk. Stay aligned.
          </p>
        </div>

        <div className="welcome-features">
          <div className="welcome-feature">
            <span className="feature-icon">👥</span>
            <h3>Track Stakeholders</h3>
            <p>Map power, influence, and engagement across your projects</p>
          </div>
          <div className="welcome-feature">
            <span className="feature-icon">⚠️</span>
            <h3>Reduce Risk</h3>
            <p>Get early warnings when relationships need attention</p>
          </div>
          <div className="welcome-feature">
            <span className="feature-icon">✨</span>
            <h3>Stay Aligned</h3>
            <p>AI-powered insights keep everyone on the same page</p>
          </div>
        </div>

        <button className="btn btn-primary btn-large" onClick={nextStep}>
          Get Started
        </button>
      </div>
    </OnboardingLayout>
  );

  // ==================== STAGE 1: WORKSPACE ====================
  const WorkspaceStep = () => {
    const handleContinue = () => {
      const newErrors = {};

      if (!workspace.name.trim()) {
        newErrors.name = 'Please enter your workspace name';
      }
      if (!workspace.industry) {
        newErrors.industry = 'Please select your industry';
      }
      if (!workspace.teamSize) {
        newErrors.teamSize = 'Please select your team size';
      }

      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        return;
      }

      setErrors({});
      nextStep();
    };

    return (
      <OnboardingLayout currentStep={currentStep}>
        <div className="onboarding-card">
          <div className="onboarding-header">
            <h2>Set up your workspace</h2>
            <p className="text-muted">Tell us about your organization</p>
          </div>

          <div className="onboarding-form">
            <div className="form-group">
              <label className="form-label">Workspace name *</label>
              <input
                type="text"
                className={`form-input ${errors.name ? 'input-error' : ''}`}
                placeholder="Acme Inc."
                value={workspace.name}
                onChange={(e) => {
                  updateWorkspace({ name: e.target.value });
                  if (errors.name) setErrors(prev => ({ ...prev, name: null }));
                }}
              />
              {errors.name && <span className="error-message">{errors.name}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">Industry *</label>
              <select
                className={`form-select ${errors.industry ? 'input-error' : ''}`}
                value={workspace.industry}
                onChange={(e) => {
                  updateWorkspace({ industry: e.target.value });
                  if (errors.industry) setErrors(prev => ({ ...prev, industry: null }));
                }}
              >
                <option value="">Select industry</option>
                <option value="consulting">Consulting</option>
                <option value="ai">AI / Technology</option>
                <option value="hr-tech">HR Tech</option>
                <option value="saas">SaaS</option>
                <option value="healthcare">Healthcare</option>
                <option value="finance">Finance</option>
                <option value="other">Other</option>
              </select>
              {errors.industry && <span className="error-message">{errors.industry}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">Team size *</label>
              <select
                className={`form-select ${errors.teamSize ? 'input-error' : ''}`}
                value={workspace.teamSize}
                onChange={(e) => {
                  updateWorkspace({ teamSize: e.target.value });
                  if (errors.teamSize) setErrors(prev => ({ ...prev, teamSize: null }));
                }}
              >
                <option value="">Select team size</option>
                <option value="1-5">1–5 people</option>
                <option value="6-10">6–10 people</option>
                <option value="11-25">11–25 people</option>
                <option value="26-50">26–50 people</option>
                <option value="50+">50+ people</option>
              </select>
              {errors.teamSize && <span className="error-message">{errors.teamSize}</span>}
            </div>
          </div>

          <div className="onboarding-actions">
            <button className="btn btn-primary" onClick={handleContinue}>
              Continue
            </button>
          </div>
        </div>
      </OnboardingLayout>
    );
  };

  // ==================== STAGE 2: ROLE ====================
  const RoleStep = () => {
    const roles = [
      { value: 'founder', label: 'Founder', icon: '🚀' },
      { value: 'pm', label: 'Product Manager', icon: '📋' },
      { value: 'designer', label: 'Designer', icon: '🎨' },
      { value: 'consultant', label: 'Consultant', icon: '💼' },
      { value: 'hr', label: 'HR / People Operations', icon: '👥' },
      { value: 'other', label: 'Other', icon: '✨' }
    ];

    const handleSelectRole = (value) => {
      updateRole(value);
      // Auto-advance after selection
      setTimeout(() => nextStep(), 300);
    };

    return (
      <OnboardingLayout currentStep={currentStep}>
        <div className="onboarding-card">
          <div className="onboarding-header">
            <h2>What best describes your role?</h2>
            <p className="text-muted">This helps us personalize your experience</p>
          </div>

          <div className="role-selection-grid">
            {roles.map((r) => (
              <button
                key={r.value}
                className={`role-option ${role === r.value ? 'selected' : ''}`}
                onClick={() => handleSelectRole(r.value)}
              >
                <span className="role-icon">{r.icon}</span>
                <span className="role-label">{r.label}</span>
              </button>
            ))}
          </div>

          <div className="onboarding-actions">
            <button className="btn btn-secondary" onClick={prevStep}>
              Back
            </button>
            <button className="btn btn-text" onClick={nextStep}>
              Skip for now
            </button>
          </div>
        </div>
      </OnboardingLayout>
    );
  };

  // ==================== STAGE 3: CREATE PROJECT ====================
  const ProjectStep = () => {
    const [projectForm, setProjectForm] = useState({
      name: '',
      description: '',
      status: 'active'
    });

    const handleCreateProject = async () => {
      if (!projectForm.name.trim()) {
        setErrors({ projectName: 'Please enter a project name' });
        return;
      }

      setLoading(true);
      setErrors({});

      try {
        const createdProject = await projectAPI.create(projectForm);
        updateProject(createdProject);
        nextStep();
      } catch (error) {
        console.error('Error creating project:', error);
        setErrors({ projectName: 'Failed to create project. Please try again.' });
      } finally {
        setLoading(false);
      }
    };

    return (
      <OnboardingLayout currentStep={currentStep}>
        <div className="onboarding-card">
          <div className="onboarding-header">
            <h2>Create your first project</h2>
            <p className="text-muted">Projects help you organize stakeholders by initiative</p>
          </div>

          <div className="onboarding-form">
            <div className="form-group">
              <label className="form-label">Project name *</label>
              <input
                type="text"
                className={`form-input ${errors.projectName ? 'input-error' : ''}`}
                placeholder="Q1 Product Launch"
                value={projectForm.name}
                onChange={(e) => {
                  setProjectForm({ ...projectForm, name: e.target.value });
                  if (errors.projectName) setErrors({});
                }}
              />
              {errors.projectName && <span className="error-message">{errors.projectName}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">Description (optional)</label>
              <textarea
                className="form-textarea"
                placeholder="What is this project about?"
                rows="3"
                value={projectForm.description}
                onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })}
              />
            </div>
          </div>

          <div className="onboarding-actions">
            <button className="btn btn-secondary" onClick={prevStep} disabled={loading}>
              Back
            </button>
            <button
              className="btn btn-primary"
              onClick={handleCreateProject}
              disabled={loading}
            >
              {loading ? 'Creating...' : 'Continue'}
            </button>
          </div>
        </div>
      </OnboardingLayout>
    );
  };

  // ==================== STAGE 4: ADD STAKEHOLDER ====================
  const StakeholderStep = () => {
    const [stakeholderForm, setStakeholderForm] = useState({
      name: '',
      role: '',
      engagement_status: 'neutral',
      power: 3,
      influence: 3,
      owner: workspace.name || 'Me'
    });

    const handleAddStakeholder = async () => {
      if (!stakeholderForm.name.trim()) {
        setErrors({ stakeholderName: 'Please enter a stakeholder name' });
        return;
      }

      if (!project) {
        setErrors({ stakeholderName: 'Project not found. Please go back and create a project first.' });
        return;
      }

      setLoading(true);
      setErrors({});

      try {
        const stakeholderData = {
          ...stakeholderForm,
          project_id: project.id
        };

        const createdStakeholder = await stakeholderAPI.create(stakeholderData);
        updateStakeholder(createdStakeholder);
        nextStep();
      } catch (error) {
        console.error('Error creating stakeholder:', error);
        setErrors({ stakeholderName: 'Failed to create stakeholder. Please try again.' });
      } finally {
        setLoading(false);
      }
    };

    return (
      <OnboardingLayout currentStep={currentStep}>
        <div className="onboarding-card">
          <div className="onboarding-header">
            <h2>Add your first key stakeholder</h2>
            <p className="text-muted">Start mapping who matters most to your project</p>
          </div>

          <div className="onboarding-form">
            <div className="form-group">
              <label className="form-label">Name *</label>
              <input
                type="text"
                className={`form-input ${errors.stakeholderName ? 'input-error' : ''}`}
                placeholder="Sarah Chen"
                value={stakeholderForm.name}
                onChange={(e) => {
                  setStakeholderForm({ ...stakeholderForm, name: e.target.value });
                  if (errors.stakeholderName) setErrors({});
                }}
              />
              {errors.stakeholderName && <span className="error-message">{errors.stakeholderName}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">Role</label>
              <input
                type="text"
                className="form-input"
                placeholder="VP of Product"
                value={stakeholderForm.role}
                onChange={(e) => setStakeholderForm({ ...stakeholderForm, role: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Engagement status</label>
              <select
                className="form-select"
                value={stakeholderForm.engagement_status}
                onChange={(e) => setStakeholderForm({ ...stakeholderForm, engagement_status: e.target.value })}
              >
                <option value="supportive">Supportive</option>
                <option value="neutral">Neutral</option>
                <option value="resistant">Resistant</option>
              </select>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Power (1-5)</label>
                <input
                  type="range"
                  min="1"
                  max="5"
                  className="form-range"
                  value={stakeholderForm.power}
                  onChange={(e) => setStakeholderForm({ ...stakeholderForm, power: parseInt(e.target.value) })}
                />
                <div className="range-value">{stakeholderForm.power}</div>
              </div>

              <div className="form-group">
                <label className="form-label">Influence (1-5)</label>
                <input
                  type="range"
                  min="1"
                  max="5"
                  className="form-range"
                  value={stakeholderForm.influence}
                  onChange={(e) => setStakeholderForm({ ...stakeholderForm, influence: parseInt(e.target.value) })}
                />
                <div className="range-value">{stakeholderForm.influence}</div>
              </div>
            </div>
          </div>

          <div className="onboarding-actions">
            <button className="btn btn-secondary" onClick={prevStep} disabled={loading}>
              Back
            </button>
            <button
              className="btn btn-primary"
              onClick={handleAddStakeholder}
              disabled={loading}
            >
              {loading ? 'Saving...' : 'Save & Continue'}
            </button>
          </div>
        </div>
      </OnboardingLayout>
    );
  };

  // ==================== STAGE 5: FIRST VALUE (Preview) ====================
  const FirstValueStep = () => {
    const riskScore = stakeholder ? (stakeholder.power || 0) + (stakeholder.influence || 0) + 5 : 0;

    return (
      <OnboardingLayout currentStep={currentStep}>
        <div className="onboarding-card">
          <div className="onboarding-header">
            <h2>Great start — your stakeholder map has begun 👍</h2>
            <p className="text-muted">Here's what we've created together</p>
          </div>

          <div className="first-value-preview">
            {project && (
              <div className="preview-item">
                <div className="preview-label">Project</div>
                <div className="preview-value">{project.name}</div>
              </div>
            )}

            {stakeholder && (
              <>
                <div className="preview-item">
                  <div className="preview-label">Stakeholder</div>
                  <div className="preview-value">
                    {stakeholder.name}
                    {stakeholder.role && <span className="preview-meta"> • {stakeholder.role}</span>}
                  </div>
                </div>

                <div className="preview-item">
                  <div className="preview-label">Risk Score</div>
                  <div className="preview-value">
                    <span className={`risk-badge risk-${riskScore >= 12 ? 'high' : riskScore >= 7 ? 'medium' : 'low'}`}>
                      {riskScore}/20
                    </span>
                  </div>
                </div>

                <div className="ai-message-box">
                  <span className="ai-icon">✨</span>
                  <p>
                    {stakeholder.engagement_status === 'supportive'
                      ? `${stakeholder.name} is supportive with ${stakeholder.power >= 4 ? 'high' : 'moderate'} power. Great ally to keep engaged!`
                      : stakeholder.engagement_status === 'resistant'
                      ? `${stakeholder.name} shows resistance. Consider scheduling a 1-on-1 to understand their concerns.`
                      : `${stakeholder.name} is currently neutral. Regular updates can help build alignment.`}
                  </p>
                </div>
              </>
            )}
          </div>

          <div className="onboarding-actions">
            <button className="btn btn-primary" onClick={nextStep}>
              Go to Dashboard
            </button>
            <button className="btn btn-text" onClick={nextStep}>
              Invite teammates →
            </button>
          </div>
        </div>
      </OnboardingLayout>
    );
  };

  // ==================== STAGE 6: SUCCESS ====================
  const SuccessStep = () => {
    const handleFinish = () => {
      completeOnboarding();
      navigate('/');
    };

    return (
      <OnboardingLayout showStepper={false} currentStep={currentStep}>
        <div className="onboarding-success">
          <div className="success-icon">🎉</div>
          <h1>You're all set!</h1>
          <p className="success-subtitle">
            We'll help you keep stakeholders aligned and projects on track.
          </p>

          <div className="success-features">
            <div className="success-feature">
              <span className="check-icon">✓</span>
              <span>Workspace created: {workspace.name}</span>
            </div>
            <div className="success-feature">
              <span className="check-icon">✓</span>
              <span>First project added</span>
            </div>
            <div className="success-feature">
              <span className="check-icon">✓</span>
              <span>Stakeholder mapped</span>
            </div>
          </div>

          <button className="btn btn-primary btn-large" onClick={handleFinish}>
            Go to Dashboard
          </button>
        </div>
      </OnboardingLayout>
    );
  };

  // Render current step
  const steps = [
    WelcomeStep,
    WorkspaceStep,
    RoleStep,
    ProjectStep,
    StakeholderStep,
    FirstValueStep,
    SuccessStep
  ];

  const CurrentStep = steps[currentStep] || WelcomeStep;

  return <CurrentStep />;
}

export default Onboarding;
