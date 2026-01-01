# Onboarding Flow - Implementation Guide

## 📋 Overview

A modern, multi-step onboarding wizard for Stakeholder Radar that guides new users from account creation to first value moment in 7 calm, simple steps.

**Design Style**: Linear / Notion inspired
- **Font**: Inter / System fonts
- **Primary Color**: #4F46E5 (Indigo)
- **Border Radius**: 12px
- **Whitespace**: Generous padding
- **Tone**: Friendly, professional, non-technical

---

## 🎯 Onboarding Stages

### **Stage 0: Welcome Screen**
- Headline: "Welcome to Stakeholder Radar"
- Subtitle: "Manage relationships. Reduce risk. Stay aligned."
- 3 feature previews with icons
- CTA: "Get Started"

### **Stage 1: Workspace Setup**
**Fields:**
- Workspace name * (text input)
- Industry * (dropdown)
- Team size * (dropdown)

**Validation:**
- All fields required
- Friendly error messages
- Auto-save to localStorage

### **Stage 2: Role Selection**
**Question:** "What best describes your role?"

**Options:**
- 🚀 Founder
- 📋 Product Manager
- 🎨 Designer
- 💼 Consultant
- 👥 HR / People Operations
- ✨ Other

**Features:**
- Optional step (can skip)
- Auto-advances on selection
- Stores preference only

### **Stage 3: Create First Project**
**Fields:**
- Project name * (text input)
- Description (textarea, optional)

**API Call:**
- Creates real project via `projectAPI.create()`
- Shows loading state
- Error handling with retry

### **Stage 4: Add First Stakeholder**
**Fields:**
- Name * (text input)
- Role (text input)
- Engagement status (dropdown: supportive/neutral/resistant)
- Power (slider: 1-5)
- Influence (slider: 1-5)

**API Call:**
- Creates real stakeholder via `stakeholderAPI.create()`
- Links to project from Stage 3
- Shows loading state

### **Stage 5: First Value Screen**
**Shows:**
- ✓ Project created
- ✓ Stakeholder added
- Risk score badge
- AI interpretation message (contextual based on engagement status)

**CTAs:**
- "Go to Dashboard" (primary)
- "Invite teammates" (secondary)

### **Stage 6: Success Screen**
- 🎉 Success icon with animation
- Title: "You're all set!"
- Checklist of completed items
- CTA: "Go to Dashboard"
- Marks onboarding as complete
- Clears localStorage

---

## 🏗️ Architecture

### **File Structure**

```
frontend/src/
├── context/
│   └── OnboardingContext.js       # State management + auto-save
├── components/
│   ├── ProgressStepper.js         # Progress indicator
│   └── OnboardingLayout.js        # Wrapper layout
├── pages/
│   └── Onboarding.js              # Main wizard (all 7 steps)
└── App.js                         # Updated with provider & route
```

### **State Management**

**OnboardingContext** provides:
```javascript
{
  // State
  currentStep: 0-6,
  workspace: { name, industry, teamSize },
  role: string,
  project: object | null,
  stakeholder: object | null,
  completed: boolean,

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
}
```

**Auto-Save:**
- Every state change saves to `localStorage`
- Key: `stakeholder_radar_onboarding`
- Clears on completion
- Prevents data loss on refresh

---

## 🎨 Component API

### **ProgressStepper**
```jsx
<ProgressStepper
  currentStep={2}
  steps={['Workspace', 'Role', 'Project', 'Stakeholder', 'Done']}
/>
```

**Visual States:**
- ✓ Completed (green)
- ● Active (blue with shadow)
- ○ Upcoming (gray)

### **OnboardingLayout**
```jsx
<OnboardingLayout
  currentStep={1}
  showStepper={true}    // Hide for welcome/success
  showLogo={true}       // Always show logo
>
  {children}
</OnboardingLayout>
```

**Features:**
- Centered layout
- Gradient background
- Logo at top
- Progress stepper (conditional)
- Support link in footer

---

## 🔄 Data Flow

```
┌─────────────┐
│   User      │
│  Action     │
└──────┬──────┘
       │
       ▼
┌─────────────────┐
│  Component      │
│  Updates State  │
└────────┬────────┘
         │
         ├──────────┐
         │          │
         ▼          ▼
┌──────────────┐  ┌──────────────┐
│  Context     │  │  API Call    │
│  Auto-save   │  │  (Projects,  │
│  to Storage  │  │  Stakeholders)│
└──────────────┘  └──────────────┘
```

**Persistence:**
- Workspace, role → localStorage only
- Project → Database via API
- Stakeholder → Database via API

---

## 🛡️ Error Handling

### **Validation Errors**
```javascript
{
  name: "Please enter your workspace name"
}
```

**Display:**
- Red border on input
- Error message below field
- Clears on correction

### **API Errors**
```javascript
try {
  await projectAPI.create(data);
} catch (error) {
  setErrors({ projectName: 'Failed to create project. Please try again.' });
}
```

**Features:**
- Friendly error messages
- Loading states prevent double-submit
- Retry capability

---

## 🚀 Usage

### **Starting Onboarding**
```javascript
// Navigate user to onboarding
navigate('/onboarding');

// Or check if onboarding needed
const { completed } = useOnboarding();
if (!completed) {
  navigate('/onboarding');
}
```

### **Accessing Onboarding Data**
```javascript
import { useOnboarding } from '../context/OnboardingContext';

function MyComponent() {
  const { workspace, project, stakeholder } = useOnboarding();

  return (
    <div>
      <h1>Welcome to {workspace.name}!</h1>
      <p>You have {project ? '1' : '0'} projects</p>
    </div>
  );
}
```

### **Resetting Onboarding (for testing)**
```javascript
const { resetOnboarding } = useOnboarding();

resetOnboarding(); // Clears all state and localStorage
navigate('/onboarding');
```

---

## 🎯 UX Principles

### **Calm & Guided**
- One question per screen
- Clear progress indicator
- No overwhelming choices

### **Simple & Non-Technical**
- Friendly copy (not jargon)
- Emoji for visual cues
- Plain English errors

### **Low Friction**
- Auto-save every step
- Optional fields clearly marked
- Can go back without losing progress

### **Quick to Value**
- 7 steps total
- ~2 minutes to complete
- Immediate feedback after stakeholder creation

---

## 💾 LocalStorage Schema

```json
{
  "currentStep": 3,
  "completed": false,
  "workspace": {
    "name": "Acme Inc.",
    "industry": "saas",
    "teamSize": "6-10"
  },
  "role": "founder",
  "project": {
    "id": 1,
    "name": "Q1 Product Launch",
    "description": "..."
  },
  "stakeholder": null,
  "startedAt": "2024-01-15T10:00:00Z",
  "completedAt": null
}
```

**Key:** `stakeholder_radar_onboarding`

**Lifecycle:**
- Created on first step
- Updated on every action
- Cleared on completion

---

## 📊 Analytics Events (Recommended)

Track these events for product insights:

```javascript
// Track step views
analytics.track('Onboarding Step Viewed', {
  step: currentStep,
  stepName: 'Workspace Setup'
});

// Track step completion
analytics.track('Onboarding Step Completed', {
  step: currentStep,
  stepName: 'Workspace Setup',
  timeSpent: 23 // seconds
});

// Track overall completion
analytics.track('Onboarding Completed', {
  totalTime: 145, // seconds
  stepsCompleted: 7,
  projectCreated: true,
  stakeholderCreated: true
});

// Track abandonment
analytics.track('Onboarding Abandoned', {
  lastStep: currentStep,
  stepName: 'Role Selection'
});
```

---

## 🎨 Customization

### **Change Colors**
```css
/* Primary color */
--onboarding-primary: #4F46E5;

/* Success color */
--onboarding-success: #10B981;

/* Background gradient */
background: linear-gradient(135deg, #FAFBFF 0%, #F5F3FF 100%);
```

### **Add/Remove Steps**
```javascript
// In Onboarding.js
const steps = [
  WelcomeStep,
  WorkspaceStep,
  RoleStep,
  ProjectStep,
  StakeholderStep,
  FirstValueStep,
  SuccessStep,
  NewCustomStep  // Add here
];
```

### **Change Industry Options**
```javascript
// In WorkspaceStep
<option value="ecommerce">E-commerce</option>
<option value="education">Education</option>
// Add more...
```

---

## ✅ Production Checklist

Before deploying onboarding:

- [ ] Test all 7 steps end-to-end
- [ ] Test error states (invalid inputs, API failures)
- [ ] Test browser back button behavior
- [ ] Test localStorage persistence (refresh during onboarding)
- [ ] Test on mobile devices (responsive design)
- [ ] Verify API endpoints are working
- [ ] Add analytics tracking
- [ ] Test completion flow (redirects to dashboard)
- [ ] Test with real OAuth callback (if applicable)
- [ ] Add loading skeletons for API calls
- [ ] Verify form validation messages
- [ ] Test accessibility (keyboard navigation, screen readers)

---

## 🐛 Troubleshooting

### **Onboarding doesn't show progress**
**Issue:** localStorage blocked
**Solution:** Check browser privacy settings allow localStorage

### **Step doesn't advance**
**Issue:** Validation failed
**Solution:** Check console for errors, ensure required fields filled

### **Project/Stakeholder not created**
**Issue:** API endpoint not responding
**Solution:** Check backend server is running, check network tab

### **Can't go back**
**Issue:** Previous step data lost
**Solution:** Check localStorage has saved state

---

## 🚧 Future Enhancements

### **V2 Features**
- [ ] Skip entire onboarding (for experienced users)
- [ ] Multi-language support
- [ ] A/B test different flows
- [ ] Add video tutorials per step
- [ ] Keyboard shortcuts (Next: Enter, Back: Esc)
- [ ] Save & Resume Later button
- [ ] Email invitation flow from onboarding
- [ ] Onboarding checklist widget in dashboard
- [ ] Celebrate with confetti on completion

### **Advanced Features**
- [ ] Dynamic steps based on role
- [ ] Import stakeholders from CSV
- [ ] Connect OAuth during onboarding
- [ ] Guided tour after onboarding
- [ ] Personalized recommendations based on industry

---

## 📝 Code Examples

### **Add Custom Step**

```javascript
// 1. Create step component
const CustomStep = () => (
  <OnboardingLayout currentStep={currentStep}>
    <div className="onboarding-card">
      <h2>Custom Step</h2>
      <p>Your custom content here</p>
      <button onClick={nextStep}>Continue</button>
    </div>
  </OnboardingLayout>
);

// 2. Add to steps array
const steps = [
  WelcomeStep,
  WorkspaceStep,
  CustomStep,  // Add here
  RoleStep,
  // ...
];

// 3. Update progress labels
const steps = ['Workspace', 'Custom', 'Role', 'Project', 'Stakeholder', 'Done'];
```

### **Skip Step Programmatically**

```javascript
// Skip role selection if already known
useEffect(() => {
  if (currentStep === 2 && existingUserRole) {
    updateRole(existingUserRole);
    nextStep();
  }
}, [currentStep]);
```

---

## 🤝 Contributing

To improve onboarding:

1. Test current flow
2. Identify friction points
3. Propose changes (with data)
4. A/B test new variations
5. Measure completion rates

**Key Metrics:**
- Completion rate (% who finish all steps)
- Average time to complete
- Drop-off by step
- Error rate per field

---

**Built for seamless user activation** 🚀
