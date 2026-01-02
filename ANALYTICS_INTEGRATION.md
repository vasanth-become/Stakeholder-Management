# Analytics Integration Guide

This guide shows how to integrate analytics tracking into your existing Stakeholder Radar codebase.

## Backend Integration

### 1. Add Analytics API Endpoint

Add to your Express app (e.g., `backend/server.js` or `backend/routes/index.js`):

```javascript
const { handleAnalyticsEvents, trackAPIRequests, trackErrors } = require('./middleware/analytics');

// Add middleware to track all API requests (optional)
app.use(trackAPIRequests);

// Add analytics endpoint
app.post('/api/analytics/events', handleAnalyticsEvents);

// Add error tracking middleware (should be last)
app.use(trackErrors);
```

### 2. Track Backend Events

In your existing route handlers, add tracking:

```javascript
const analyticsService = require('./services/analytics');

// Example: Track project creation
router.post('/api/projects', async (req, res) => {
  try {
    const project = await Project.create(req.body);

    // Track the event
    analyticsService.track('project_created', req.user.id, {
      project_id: project.id,
      workspace_id: req.user.workspace_id,
      has_description: Boolean(project.description),
      stakeholder_count: 0,
    });

    res.json(project);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Example: Track stakeholder creation
router.post('/api/stakeholders', async (req, res) => {
  try {
    const stakeholder = await Stakeholder.create(req.body);

    analyticsService.track('stakeholder_created', req.user.id, {
      stakeholder_id: stakeholder.id,
      project_id: stakeholder.project_id,
      workspace_id: req.user.workspace_id,
      power_level: stakeholder.power,
      influence_level: stakeholder.influence,
      engagement_status: stakeholder.engagement_status,
      risk_score: stakeholder.risk_score,
      has_notes: Boolean(stakeholder.notes),
    });

    res.json(stakeholder);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

## Frontend Integration

### 1. Initialize Analytics

In your `App.js` or root component:

```javascript
import { analytics } from './services/analytics';
import { useEffect } from 'react';

function App() {
  useEffect(() => {
    // Initialize with user context (after login)
    const user = getCurrentUser(); // Your auth function

    if (user) {
      analytics.identify(user.id, {
        workspaceId: user.workspace_id,
        plan_type: user.plan_type,
        role: user.role,
        signup_date: user.created_at,
      });
    }
  }, []);

  return (
    // Your app content
  );
}
```

### 2. Track Page Views

Add to your router or page components:

```javascript
import { analytics } from './services/analytics';
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

function PageTracker() {
  const location = useLocation();

  useEffect(() => {
    // Track page view on route change
    analytics.page(location.pathname);
  }, [location]);

  return null;
}

// Add PageTracker to your App
function App() {
  return (
    <Router>
      <PageTracker />
      {/* Your routes */}
    </Router>
  );
}
```

### 3. Track User Actions

#### Projects

```javascript
// In CreateProjectPage.js or ProjectsPage.js
import { analytics } from '../services/analytics';

async function handleCreateProject(projectData) {
  try {
    const project = await projectAPI.create(projectData);

    // Track project creation
    analytics.trackProjectCreated(
      project.id,
      Boolean(projectData.description),
      0 // initial stakeholder count
    );

    navigate(`/project/${project.id}`);
  } catch (error) {
    console.error('Failed to create project:', error);
  }
}
```

#### Stakeholders

```javascript
// In AddStakeholderPage.js
import { analytics } from '../services/analytics';

async function handleCreateStakeholder(stakeholderData) {
  try {
    const stakeholder = await stakeholderAPI.create(stakeholderData);

    // Track stakeholder creation
    analytics.trackStakeholderCreated(
      stakeholder.id,
      stakeholder.project_id,
      {
        power: stakeholder.power,
        influence: stakeholder.influence,
        engagement_status: stakeholder.engagement_status,
        risk_score: stakeholder.risk_score,
        notes: stakeholder.notes,
      }
    );

    navigate(`/stakeholder/${stakeholder.id}`);
  } catch (error) {
    console.error('Failed to create stakeholder:', error);
  }
}

// In StakeholderProfilePage.js
import { analytics } from '../services/analytics';

useEffect(() => {
  if (stakeholder) {
    // Track stakeholder view
    analytics.trackStakeholderViewed(
      stakeholder.id,
      stakeholder.project_id,
      'direct',
      activeTab
    );
  }
}, [stakeholder, activeTab]);

// Track tab changes
function handleTabChange(newTab) {
  setActiveTab(newTab);

  if (newTab === 'ai-strategy') {
    analytics.trackAIInsightsViewed('stakeholder', stakeholder.id, 'ai-strategy');
  }
}
```

#### Interactions

```javascript
// In StakeholderProfilePage.js (interaction logging)
import { analytics } from '../services/analytics';

async function handleAddInteraction(e) {
  e.preventDefault();

  try {
    await interactionAPI.create({
      stakeholder_id: parseInt(id),
      interaction_type: interactionForm.type,
      date: interactionForm.date,
      summary: interactionForm.summary,
      outcome: interactionForm.sentiment,
    });

    // Track interaction logged
    analytics.trackInteractionLogged(
      id,
      stakeholder.project_id,
      interactionForm.type,
      interactionForm.sentiment,
      Boolean(interactionForm.summary)
    );

    loadData();
  } catch (err) {
    console.error('Failed to log interaction:', err);
  }
}
```

#### Reports & Exports

```javascript
// In ReportsPage.js
import { analytics } from '../services/analytics';

useEffect(() => {
  // Track report view
  analytics.trackReportViewed('overview', 0);
}, []);

function handleExportCSV() {
  // ... your CSV export logic ...

  // Track export
  analytics.trackReportExported('csv', stakeholders.length);
}

function handleExportPDF() {
  // ... your PDF export logic ...

  // Track export
  analytics.trackReportExported('pdf', stakeholders.length + projects.length);
}
```

#### AI Insights

```javascript
// In StakeholderProfilePage.js
import { analytics } from '../services/analytics';

function generateAIInsights(stakeholderData, interactionsData) {
  setAiLoading(true);

  setTimeout(() => {
    const insights = AIService.generateStakeholderInsights(stakeholderData, interactionsData);
    setAiInsights(insights);
    setAiLoading(false);

    // Track AI insights generated
    analytics.trackAIInsightsGenerated(
      'stakeholder',
      stakeholderData.id,
      Object.keys(insights).length
    );
  }, 500);
}

// When user clicks on AI suggestion
function handleUseSuggestion(suggestionType) {
  analytics.trackAISuggestionUsed(suggestionType, 'stakeholder');

  // ... apply the suggestion ...
}
```

#### Onboarding

```javascript
// In Onboarding.js
import { analytics } from '../services/analytics';

useEffect(() => {
  if (currentStep === 0) {
    analytics.trackOnboardingStarted();
  }
}, []);

function handleStepComplete() {
  analytics.trackOnboardingStepCompleted(currentStep + 1, steps[currentStep].title);

  if (currentStep === steps.length - 1) {
    const completionTime = Math.floor((Date.now() - startTime) / 1000);
    analytics.trackOnboardingCompleted(completionTime, steps.length);
  }

  nextStep();
}
```

#### Authentication

```javascript
// In your login component
import { analytics } from '../services/analytics';

async function handleLogin(credentials) {
  try {
    const user = await authAPI.login(credentials);

    analytics.identify(user.id, {
      workspaceId: user.workspace_id,
      plan_type: user.plan_type,
      role: user.role,
    });

    analytics.trackLogin('email');

    navigate('/dashboard');
  } catch (error) {
    console.error('Login failed:', error);
  }
}

async function handleSignup(userData) {
  try {
    const user = await authAPI.signup(userData);

    analytics.trackSignup('email', null);

    navigate('/onboarding');
  } catch (error) {
    console.error('Signup failed:', error);
  }
}

function handleLogout() {
  analytics.trackLogout();
  authAPI.logout();
  navigate('/login');
}
```

## Privacy Controls

### Add Analytics Settings

Create a settings page where users can opt out:

```javascript
// In SettingsPage.js
import { analytics } from '../services/analytics';
import { useState } from 'react';

function AnalyticsSettings() {
  const [analyticsEnabled, setAnalyticsEnabled] = useState(
    localStorage.getItem('analytics_enabled') !== 'false'
  );

  function handleToggle(enabled) {
    setAnalyticsEnabled(enabled);
    localStorage.setItem('analytics_enabled', enabled);
    analytics.setEnabled(enabled);
  }

  return (
    <div className="settings-section">
      <h3>Analytics & Privacy</h3>
      <div className="setting-item">
        <label>
          <input
            type="checkbox"
            checked={analyticsEnabled}
            onChange={(e) => handleToggle(e.target.checked)}
          />
          Enable usage analytics
        </label>
        <p className="setting-description">
          Help us improve Stakeholder Radar by sharing anonymous usage data.
          We never collect sensitive information like names, notes, or messages.
          <a href="/privacy" target="_blank"> Learn more</a>
        </p>
      </div>
    </div>
  );
}
```

## Environment Variables

Add to your `.env` files:

```bash
# Backend (.env)
ANALYTICS_ENABLED=true
POSTHOG_API_KEY=your_posthog_key_here
MIXPANEL_TOKEN=your_mixpanel_token_here
ANALYTICS_WEBHOOK_URL=https://your-webhook.com/events
ANALYTICS_WEBHOOK_SECRET=your_secret_here

# Frontend (.env)
REACT_APP_ANALYTICS_ENABLED=true
```

## Testing Analytics

### Development Mode

In development, analytics events are logged to console instead of being sent to external services:

```javascript
// Check console for:
// [Analytics] Flushing events: [...]
// [Analytics] Event: {...}
```

### Production Testing

1. **Use PostHog Debug Mode**: Add `?posthog_debug=true` to URL
2. **Check Network Tab**: Look for requests to `/api/analytics/events`
3. **Verify Events in Dashboard**: Check your PostHog/Mixpanel dashboard

### Common Issues

**Events not showing up?**
- Check `ANALYTICS_ENABLED` environment variable
- Verify user is identified: `analytics.identify(userId)`
- Check browser console for analytics logs
- Ensure backend endpoint is accessible

**Sensitive data being tracked?**
- Review event properties in console
- Check analytics validation warnings
- Never pass full objects, only metadata

## Best Practices

### DO ✅
- Track **what** happened, not **why** (that's for user research)
- Use semantic event names (`project_created` not `button_clicked`)
- Track metadata and counts, not content
- Batch events for performance
- Handle errors gracefully
- Test tracking in development

### DON'T ❌
- Track PII (names, emails, phone numbers)
- Track content (notes, messages, summaries)
- Track every single click
- Block user actions while tracking
- Throw errors from analytics code
- Track without user consent (GDPR)

## Dashboard Examples

### Activation Funnel

```sql
-- Example query for activation funnel
SELECT
  COUNT(DISTINCT CASE WHEN event = 'user_signed_up' THEN user_id END) as signups,
  COUNT(DISTINCT CASE WHEN event = 'workspace_created' THEN user_id END) as workspace_created,
  COUNT(DISTINCT CASE WHEN event = 'project_created' THEN user_id END) as project_created,
  COUNT(DISTINCT CASE WHEN event = 'stakeholder_created' THEN user_id END) as stakeholder_created,
  COUNT(DISTINCT CASE WHEN event = 'interaction_logged' THEN user_id END) as interaction_logged
FROM events
WHERE timestamp >= NOW() - INTERVAL '7 days';
```

### Feature Adoption

```sql
-- Users who used AI insights
SELECT
  COUNT(DISTINCT user_id) as ai_users,
  COUNT(*) as ai_events
FROM events
WHERE event IN ('ai_insights_generated', 'ai_insights_viewed', 'ai_suggestion_used')
  AND timestamp >= NOW() - INTERVAL '30 days';
```

### Retention

```sql
-- Day 7 retention
SELECT
  signup_cohort,
  COUNT(DISTINCT user_id) as cohort_size,
  COUNT(DISTINCT CASE WHEN days_since_signup = 7 THEN user_id END) as day_7_active,
  (COUNT(DISTINCT CASE WHEN days_since_signup = 7 THEN user_id END) * 100.0 / COUNT(DISTINCT user_id)) as retention_rate
FROM (
  SELECT
    user_id,
    DATE(MIN(timestamp)) as signup_cohort,
    DATE_DIFF(DATE(timestamp), DATE(MIN(timestamp)), DAY) as days_since_signup
  FROM events
  GROUP BY user_id, DATE(timestamp)
)
GROUP BY signup_cohort
ORDER BY signup_cohort DESC;
```

## Next Steps

1. **Install analytics platform SDK** (PostHog/Mixpanel/Amplitude)
2. **Add tracking to key user flows** (signup, onboarding, core features)
3. **Set up dashboards** (activation, retention, feature adoption)
4. **Monitor data quality** (validate events are being sent correctly)
5. **Iterate based on insights** (improve onboarding, feature adoption, etc.)
