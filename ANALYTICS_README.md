# Analytics System - Complete Implementation

## 📊 Overview

This analytics system provides **privacy-focused, production-grade event tracking** for Stakeholder Radar. It tracks user behavior, activation, retention, and revenue metrics while **never storing sensitive data**.

## 🎯 What's Included

### 1. **Event Schema** (`ANALYTICS.md`)
- 50+ predefined events covering all user actions
- Consistent property structure
- Privacy-safe metadata only
- Dashboard definitions for insights

### 2. **Frontend Analytics Wrapper** (`frontend/src/services/analytics.js`)
- Privacy-first tracking (no PII)
- Automatic event batching
- Offline queue with retry logic
- 30+ convenience methods
- Development mode logging
- Opt-out support

### 3. **Backend Event Logger** (`backend/services/analytics.js`)
- Server-side event tracking
- Queue-based async processing
- Retry logic with exponential backoff
- PII validation and blocking
- Multi-platform support (PostHog, Mixpanel, webhooks)

### 4. **Express Middleware** (`backend/middleware/analytics.js`)
- Automatic API request tracking
- Error tracking
- Event ingestion endpoint
- User context extraction

### 5. **Integration Guide** (`ANALYTICS_INTEGRATION.md`)
- Step-by-step integration instructions
- Code examples for all features
- Privacy controls implementation
- Dashboard query examples

## 🚀 Quick Start

### Installation

```bash
# Frontend (optional - only if using PostHog/Mixpanel SDK)
cd frontend
npm install posthog-js  # or mixpanel-browser

# Backend (optional - only if using PostHog/Mixpanel SDK)
cd backend
npm install posthog-node  # or mixpanel
```

### Basic Setup

**1. Frontend - Track events:**

```javascript
import { analytics } from './services/analytics';

// Identify user after login
analytics.identify(user.id, {
  workspaceId: user.workspace_id,
  plan_type: user.plan_type,
});

// Track actions
analytics.trackProjectCreated(project.id, true, 5);
analytics.trackReportExported('pdf', 100);
```

**2. Backend - Add endpoint:**

```javascript
const { handleAnalyticsEvents } = require('./middleware/analytics');

app.post('/api/analytics/events', handleAnalyticsEvents);
```

**3. Environment Variables:**

```bash
# .env
ANALYTICS_ENABLED=true
POSTHOG_API_KEY=your_key_here  # optional
MIXPANEL_TOKEN=your_token_here  # optional
```

That's it! Events will now be tracked and logged to console in development.

## 📈 Key Metrics Tracked

### Activation Funnel
- Signup → Workspace → Project → Stakeholder → Interaction
- Measures: Time to activate, completion rate, drop-off points

### Feature Adoption
- AI Insights usage
- Report exports
- Interaction logging
- Risk monitoring
- Notes usage

### Retention
- Day 1, 7, 14, 30, 60, 90 retention
- WAU/MAU ratios
- Cohort analysis
- Churn prediction

### Revenue
- MRR/ARR tracking
- Trial → Paid conversion
- Plan upgrades/downgrades
- Churn rate
- LTV calculations

### AI Impact
- AI users vs non-AI users retention
- AI usage correlation with success
- Feature value quantification

## 🔒 Privacy & Compliance

### What We Track ✅
- Event names (actions taken)
- Timestamps
- Counts and boolean flags
- Categorical values (status, type, etc.)
- Aggregated metrics

### What We Never Track ❌
- ❌ Names (stakeholder names, user names)
- ❌ Email addresses
- ❌ Notes or message content
- ❌ Interaction summaries
- ❌ Any PII or sensitive data

### Privacy Features
- **Automatic PII detection** - Blocks suspicious keys/values
- **Opt-out support** - Users can disable tracking
- **Data retention limits** - Raw events deleted after 90 days
- **GDPR compliant** - Right to deletion, export, opt-out
- **Transparent** - Clear privacy policy linked

## 🛠️ Implementation Checklist

- [ ] Install analytics dependencies (if using external platform)
- [ ] Set environment variables
- [ ] Add backend analytics endpoint
- [ ] Initialize analytics in frontend App component
- [ ] Add tracking to key user flows:
  - [ ] Authentication (signup, login, logout)
  - [ ] Onboarding (start, steps, completion)
  - [ ] Projects (create, view, archive)
  - [ ] Stakeholders (create, view, update)
  - [ ] Interactions (log, view)
  - [ ] AI features (generate, view, use suggestions)
  - [ ] Reports (view, export)
  - [ ] Billing (trial, upgrade, downgrade, cancel)
- [ ] Add privacy controls to settings page
- [ ] Set up dashboards in analytics platform
- [ ] Test events in development mode
- [ ] Deploy to production
- [ ] Monitor data quality

## 📚 File Structure

```
Stakeholder-Management/
├── ANALYTICS.md                       # Event schema & dashboard definitions
├── ANALYTICS_INTEGRATION.md           # Integration guide with examples
├── ANALYTICS_README.md                # This file - overview
├── frontend/
│   └── src/
│       └── services/
│           └── analytics.js           # Frontend analytics wrapper
└── backend/
    ├── services/
    │   └── analytics.js              # Backend event logger
    └── middleware/
        └── analytics.js              # Express middleware
```

## 🔧 Configuration Options

### Frontend Analytics

```javascript
import { analytics } from './services/analytics';

// Customize settings
analytics.maxQueueSize = 100;        // Max events before auto-flush
analytics.flushInterval = 10000;     // Auto-flush every 10s
analytics.setEnabled(true);           // Enable/disable tracking
```

### Backend Analytics

```javascript
const analyticsService = require('./services/analytics');

// Track custom events
analyticsService.track('custom_event', userId, {
  property1: 'value1',
  property2: 123,
});

// Track errors
analyticsService.trackError(userId, 'ErrorType', 'Error message', {
  context: 'additional info',
});
```

## 📊 Dashboard Queries

See `ANALYTICS.md` for complete dashboard definitions. Quick examples:

**Activation Rate:**
```sql
SELECT
  (COUNT(DISTINCT CASE WHEN event = 'onboarding_completed' THEN user_id END) * 100.0 /
   COUNT(DISTINCT CASE WHEN event = 'user_signed_up' THEN user_id END)) as activation_rate
FROM events
WHERE timestamp >= NOW() - INTERVAL '30 days';
```

**Feature Adoption:**
```sql
SELECT
  event,
  COUNT(DISTINCT user_id) as unique_users,
  COUNT(*) as total_events
FROM events
WHERE event LIKE 'ai_%'
  AND timestamp >= NOW() - INTERVAL '30 days'
GROUP BY event;
```

## 🧪 Testing

### Development Mode
Events are automatically logged to console:

```bash
[Analytics] Identified user: user_123 {plan_type: 'pro', role: 'admin'}
[Analytics] Flushing events: [{event: 'project_created', ...}]
[Analytics] Event: {event: 'stakeholder_created', user_id: 'user_123', ...}
```

### Production Testing
1. Check network tab for `/api/analytics/events` requests
2. Verify events in PostHog/Mixpanel dashboard
3. Monitor backend logs for processing confirmation

## 🎯 Next Steps

1. **Week 1**: Set up basic tracking (auth, CRUD operations)
2. **Week 2**: Add advanced tracking (AI, reports, integrations)
3. **Week 3**: Build dashboards and start analyzing data
4. **Month 1**: Optimize based on insights, set up alerts
5. **Month 3**: Build predictive models, A/B testing framework

## 📖 Resources

- [PostHog Documentation](https://posthog.com/docs)
- [Mixpanel Documentation](https://developer.mixpanel.com/)
- [Amplitude Documentation](https://www.docs.developers.amplitude.com/)
- [GDPR Compliance Guide](https://gdpr.eu/)
- [Analytics Best Practices](https://segment.com/academy/)

## 🤝 Support

For questions or issues:
1. Review integration guide in `ANALYTICS_INTEGRATION.md`
2. Check event schema in `ANALYTICS.md`
3. Verify environment variables are set correctly
4. Check console logs in development mode

## 📝 License

This analytics implementation is part of Stakeholder Radar and follows the same license.

---

**Built with privacy in mind. Track insights, not individuals.** 🔒
