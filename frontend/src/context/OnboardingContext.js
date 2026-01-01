import React, { createContext, useContext, useState, useEffect } from 'react';

/**
 * Onboarding Context
 * Manages onboarding state with auto-save to localStorage
 */

const OnboardingContext = createContext();

export const useOnboarding = () => {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error('useOnboarding must be used within OnboardingProvider');
  }
  return context;
};

const STORAGE_KEY = 'stakeholder_radar_onboarding';

const initialState = {
  currentStep: 0,
  completed: false,
  workspace: {
    name: '',
    industry: '',
    teamSize: ''
  },
  role: '',
  project: null,
  stakeholder: null,
  startedAt: null,
  completedAt: null
};

export const OnboardingProvider = ({ children }) => {
  // Load from localStorage or use initial state
  const [state, setState] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Don't load if already completed
        if (parsed.completed) {
          return initialState;
        }
        return { ...initialState, ...parsed };
      }
    } catch (error) {
      console.error('Error loading onboarding state:', error);
    }
    return initialState;
  });

  // Auto-save to localStorage whenever state changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.error('Error saving onboarding state:', error);
    }
  }, [state]);

  // Update workspace data
  const updateWorkspace = (workspaceData) => {
    setState(prev => ({
      ...prev,
      workspace: { ...prev.workspace, ...workspaceData }
    }));
  };

  // Update role
  const updateRole = (role) => {
    setState(prev => ({ ...prev, role }));
  };

  // Update project
  const updateProject = (project) => {
    setState(prev => ({ ...prev, project }));
  };

  // Update stakeholder
  const updateStakeholder = (stakeholder) => {
    setState(prev => ({ ...prev, stakeholder }));
  };

  // Navigate to next step
  const nextStep = () => {
    setState(prev => ({
      ...prev,
      currentStep: Math.min(prev.currentStep + 1, 6)
    }));
  };

  // Navigate to previous step
  const prevStep = () => {
    setState(prev => ({
      ...prev,
      currentStep: Math.max(prev.currentStep - 1, 0)
    }));
  };

  // Go to specific step
  const goToStep = (step) => {
    setState(prev => ({
      ...prev,
      currentStep: Math.max(0, Math.min(step, 6))
    }));
  };

  // Mark onboarding as complete
  const completeOnboarding = () => {
    setState(prev => ({
      ...prev,
      completed: true,
      completedAt: new Date().toISOString()
    }));
    // Clear from localStorage
    localStorage.removeItem(STORAGE_KEY);
  };

  // Reset onboarding (for testing or re-onboarding)
  const resetOnboarding = () => {
    setState(initialState);
    localStorage.removeItem(STORAGE_KEY);
  };

  // Start onboarding
  const startOnboarding = () => {
    setState(prev => ({
      ...prev,
      startedAt: new Date().toISOString(),
      currentStep: 0
    }));
  };

  const value = {
    // State
    currentStep: state.currentStep,
    workspace: state.workspace,
    role: state.role,
    project: state.project,
    stakeholder: state.stakeholder,
    completed: state.completed,

    // Actions
    updateWorkspace,
    updateRole,
    updateProject,
    updateStakeholder,
    nextStep,
    prevStep,
    goToStep,
    completeOnboarding,
    resetOnboarding,
    startOnboarding
  };

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
};
