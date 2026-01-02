# Stakeholder Radar Analytics System

## Event Schema

### Authentication Events

#### `user_signed_up`
```json
{
  "event": "user_signed_up",
  "user_id": "uuid",
  "properties": {
    "signup_method": "email|google|sso",
    "referral_source": "string",
    "plan_type": "free|trial|pro|enterprise",
    "timestamp": "ISO8601"
  }
}
```

#### `user_logged_in`
```json
{
  "event": "user_logged_in",
  "user_id": "uuid",
  "properties": {
    "login_method": "email|google|sso",
    "device_type": "desktop|mobile|tablet",
    "timestamp": "ISO8601"
  }
}
```

#### `user_logged_out`
```json
{
  "event": "user_logged_out",
  "user_id": "uuid",
  "properties": {
    "session_duration": "seconds",
    "timestamp": "ISO8601"
  }
}
```

### Onboarding Events

#### `onboarding_started`
```json
{
  "event": "onboarding_started",
  "user_id": "uuid",
  "properties": {
    "timestamp": "ISO8601"
  }
}
```

#### `onboarding_step_completed`
```json
{
  "event": "onboarding_step_completed",
  "user_id": "uuid",
  "properties": {
    "step_number": "integer",
    "step_name": "string",
    "timestamp": "ISO8601"
  }
}
```

#### `onboarding_completed`
```json
{
  "event": "onboarding_completed",
  "user_id": "uuid",
  "properties": {
    "completion_time": "seconds",
    "steps_completed": "integer",
    "timestamp": "ISO8601"
  }
}
```

### Workspace Events

#### `workspace_created`
```json
{
  "event": "workspace_created",
  "user_id": "uuid",
  "workspace_id": "uuid",
  "properties": {
    "workspace_name_length": "integer",
    "role": "admin|member|viewer",
    "timestamp": "ISO8601"
  }
}
```

### Project Events

#### `project_created`
```json
{
  "event": "project_created",
  "user_id": "uuid",
  "workspace_id": "uuid",
  "project_id": "uuid",
  "properties": {
    "project_type": "string",
    "has_description": "boolean",
    "stakeholder_count": "integer",
    "timestamp": "ISO8601"
  }
}
```

#### `project_viewed`
```json
{
  "event": "project_viewed",
  "user_id": "uuid",
  "workspace_id": "uuid",
  "project_id": "uuid",
  "properties": {
    "view_source": "list|dashboard|search|direct",
    "timestamp": "ISO8601"
  }
}
```

#### `project_archived`
```json
{
  "event": "project_archived",
  "user_id": "uuid",
  "workspace_id": "uuid",
  "project_id": "uuid",
  "properties": {
    "project_age_days": "integer",
    "stakeholder_count": "integer",
    "timestamp": "ISO8601"
  }
}
```

### Stakeholder Events

#### `stakeholder_created`
```json
{
  "event": "stakeholder_created",
  "user_id": "uuid",
  "workspace_id": "uuid",
  "project_id": "uuid",
  "stakeholder_id": "uuid",
  "properties": {
    "power_level": "1-5",
    "influence_level": "1-5",
    "engagement_status": "supportive|neutral|resistant",
    "risk_score": "0-20",
    "has_notes": "boolean",
    "timestamp": "ISO8601"
  }
}
```

#### `stakeholder_viewed`
```json
{
  "event": "stakeholder_viewed",
  "user_id": "uuid",
  "workspace_id": "uuid",
  "project_id": "uuid",
  "stakeholder_id": "uuid",
  "properties": {
    "view_source": "list|project|search|direct",
    "active_tab": "overview|timeline|notes|ai-strategy",
    "timestamp": "ISO8601"
  }
}
```

#### `stakeholder_updated`
```json
{
  "event": "stakeholder_updated",
  "user_id": "uuid",
  "workspace_id": "uuid",
  "project_id": "uuid",
  "stakeholder_id": "uuid",
  "properties": {
    "fields_updated": ["array", "of", "field", "names"],
    "risk_score_change": "integer",
    "engagement_changed": "boolean",
    "timestamp": "ISO8601"
  }
}
```

### Interaction Events

#### `interaction_logged`
```json
{
  "event": "interaction_logged",
  "user_id": "uuid",
  "workspace_id": "uuid",
  "project_id": "uuid",
  "stakeholder_id": "uuid",
  "properties": {
    "interaction_type": "meeting|call|email|update",
    "sentiment": "positive|neutral|negative",
    "has_summary": "boolean",
    "timestamp": "ISO8601"
  }
}
```

#### `interaction_viewed`
```json
{
  "event": "interaction_viewed",
  "user_id": "uuid",
  "workspace_id": "uuid",
  "stakeholder_id": "uuid",
  "properties": {
    "view_context": "timeline|stakeholder_profile",
    "timestamp": "ISO8601"
  }
}
```

### AI Events

#### `ai_insights_generated`
```json
{
  "event": "ai_insights_generated",
  "user_id": "uuid",
  "workspace_id": "uuid",
  "properties": {
    "context_type": "stakeholder|project|dashboard",
    "context_id": "uuid",
    "insights_count": "integer",
    "timestamp": "ISO8601"
  }
}
```

#### `ai_insights_viewed`
```json
{
  "event": "ai_insights_viewed",
  "user_id": "uuid",
  "workspace_id": "uuid",
  "properties": {
    "context_type": "stakeholder|project|dashboard",
    "context_id": "uuid",
    "tab_name": "string",
    "timestamp": "ISO8601"
  }
}
```

#### `ai_suggestion_used`
```json
{
  "event": "ai_suggestion_used",
  "user_id": "uuid",
  "workspace_id": "uuid",
  "properties": {
    "suggestion_type": "communication|next_step|risk_mitigation",
    "context_type": "stakeholder|project",
    "timestamp": "ISO8601"
  }
}
```

### Risk Events

#### `risk_viewed`
```json
{
  "event": "risk_viewed",
  "user_id": "uuid",
  "workspace_id": "uuid",
  "properties": {
    "view_type": "dashboard|report|stakeholder_profile",
    "high_risk_count": "integer",
    "timestamp": "ISO8601"
  }
}
```

#### `risk_alert_triggered`
```json
{
  "event": "risk_alert_triggered",
  "user_id": "uuid",
  "workspace_id": "uuid",
  "stakeholder_id": "uuid",
  "properties": {
    "risk_level": "low|medium|high",
    "risk_score": "0-20",
    "alert_type": "threshold|change",
    "timestamp": "ISO8601"
  }
}
```

### Report Events

#### `report_viewed`
```json
{
  "event": "report_viewed",
  "user_id": "uuid",
  "workspace_id": "uuid",
  "properties": {
    "report_type": "overview|analytics",
    "filters_applied": "integer",
    "timestamp": "ISO8601"
  }
}
```

#### `report_exported`
```json
{
  "event": "report_exported",
  "user_id": "uuid",
  "workspace_id": "uuid",
  "properties": {
    "export_format": "csv|pdf",
    "data_rows": "integer",
    "timestamp": "ISO8601"
  }
}
```

### Integration Events

#### `integration_connected`
```json
{
  "event": "integration_connected",
  "user_id": "uuid",
  "workspace_id": "uuid",
  "properties": {
    "integration_type": "slack|teams|zapier",
    "timestamp": "ISO8601"
  }
}
```

#### `integration_disconnected`
```json
{
  "event": "integration_disconnected",
  "user_id": "uuid",
  "workspace_id": "uuid",
  "properties": {
    "integration_type": "slack|teams|zapier",
    "days_connected": "integer",
    "timestamp": "ISO8601"
  }
}
```

### Billing Events

#### `trial_started`
```json
{
  "event": "trial_started",
  "user_id": "uuid",
  "workspace_id": "uuid",
  "properties": {
    "plan_type": "pro|enterprise",
    "trial_duration_days": "integer",
    "timestamp": "ISO8601"
  }
}
```

#### `plan_upgraded`
```json
{
  "event": "plan_upgraded",
  "user_id": "uuid",
  "workspace_id": "uuid",
  "properties": {
    "from_plan": "free|trial|pro",
    "to_plan": "pro|enterprise",
    "billing_cycle": "monthly|annual",
    "timestamp": "ISO8601"
  }
}
```

#### `plan_downgraded`
```json
{
  "event": "plan_downgraded",
  "user_id": "uuid",
  "workspace_id": "uuid",
  "properties": {
    "from_plan": "pro|enterprise",
    "to_plan": "free|pro",
    "reason": "string",
    "timestamp": "ISO8601"
  }
}
```

#### `subscription_cancelled`
```json
{
  "event": "subscription_cancelled",
  "user_id": "uuid",
  "workspace_id": "uuid",
  "properties": {
    "plan_type": "pro|enterprise",
    "subscription_age_days": "integer",
    "cancel_reason": "string",
    "timestamp": "ISO8601"
  }
}
```

## Dashboard Definitions

### 1. Activation Funnel
**Goal**: Measure user onboarding success

**Metrics**:
- Signup → Workspace Created: `user_signed_up` → `workspace_created`
- Workspace → First Project: `workspace_created` → `project_created`
- Project → First Stakeholder: `project_created` → `stakeholder_created`
- Stakeholder → First Interaction: `stakeholder_created` → `interaction_logged`
- Overall Activation Rate: % completing all steps in 7 days

**Segments**: Plan type, signup method, referral source

### 2. Feature Adoption
**Goal**: Track which features drive engagement

**Metrics**:
- AI Insights Usage: % users who viewed/used AI suggestions
- Report Export: % users who exported reports
- Interaction Logging: Avg interactions per user per week
- Risk Monitoring: % users who view risk dashboard
- Notes Usage: % stakeholders with notes

**Visualization**: Feature adoption matrix, time-series trends

### 3. Retention Cohorts
**Goal**: Understand long-term user retention

**Metrics**:
- Day 1, 7, 14, 30, 60, 90 retention
- Weekly Active Users (WAU)
- Monthly Active Users (MAU)
- DAU/MAU ratio
- Churn rate by cohort

**Segments**: Plan type, activation status, feature usage

### 4. Revenue Analytics
**Goal**: Track subscription and revenue metrics

**Metrics**:
- MRR (Monthly Recurring Revenue)
- ARR (Annual Recurring Revenue)
- ARPU (Average Revenue Per User)
- Churn MRR
- Expansion MRR
- Net MRR Movement
- Trial → Paid conversion rate
- Upgrade rate
- Downgrade rate
- LTV (Lifetime Value)

**Segments**: Plan type, cohort, workspace size

### 5. AI Usage Impact
**Goal**: Measure AI feature value and engagement

**Metrics**:
- AI Insights Generated per user
- AI Insights Viewed rate
- AI Suggestions Used rate
- Time to first AI usage
- AI users vs non-AI users retention
- AI users vs non-AI users activation
- Correlation: AI usage → subscription upgrades

**Hypothesis Testing**:
- Do AI users have higher retention?
- Do AI users manage more stakeholders?
- Do AI users log more interactions?

## Privacy & Compliance

### Data Minimization
- **Never track**: Stakeholder names, notes content, interaction summaries, email addresses, phone numbers
- **Track only**: Metadata, counts, boolean flags, categorical values
- **Anonymize**: User IDs are pseudonymous, workspace IDs are hashed

### User Rights
- **Opt-out**: Users can disable analytics in settings
- **Data export**: Users can request their event data
- **Data deletion**: Cascade delete all events on account deletion
- **Transparency**: Link to privacy policy on analytics settings page

### Retention Policy
- **Raw events**: 90 days
- **Aggregated metrics**: 2 years
- **PII**: Never stored
- **Deleted users**: Immediate purge

## Implementation Best Practices

### Frontend Tracking
1. **Track user intent, not just clicks** - e.g., "stakeholder_created" not "submit_button_clicked"
2. **Use semantic events** - Event names describe business outcomes
3. **Batch events** - Reduce network requests
4. **Queue offline events** - Retry when connection restored
5. **Fail silently** - Never break UX due to analytics failure

### Backend Tracking
1. **Async processing** - Don't block HTTP responses
2. **Queue-based** - Use message queue for reliability
3. **Idempotent events** - Handle duplicate sends gracefully
4. **Error handling** - Log failures without throwing
5. **Rate limiting** - Prevent analytics spam

### Performance
- **Non-blocking**: Analytics should not slow down user actions
- **Debounced**: Limit rapid-fire events (e.g., scrolling, typing)
- **Sampled**: For high-volume events, sample if needed
- **Compressed**: Batch and compress event payloads

### Testing
- **Mock in dev**: Don't send real events during development
- **Validate schema**: Ensure events match schema before sending
- **Monitor delivery**: Track analytics system health
- **A/B test tracking**: Verify tracking in experiments

## Event Delivery Architecture

```
User Action
    ↓
Frontend Analytics Wrapper
    ↓
Event Queue (LocalStorage/Memory)
    ↓
Batch Send (every 10s or 50 events)
    ↓
Backend Analytics API
    ↓
Event Validation
    ↓
Message Queue (Redis/RabbitMQ)
    ↓
Analytics Platform (PostHog/Mixpanel)
    ↓
Dashboards & Insights
```

## Integration Options

### PostHog (Recommended)
- **Pros**: Self-hosted option, feature flags, session replay, open source
- **Cons**: Newer platform, fewer integrations
- **Setup**: `npm install posthog-js` (frontend), `posthog-node` (backend)

### Mixpanel
- **Pros**: Mature platform, excellent cohort analysis, strong mobile support
- **Cons**: Expensive at scale, proprietary
- **Setup**: `npm install mixpanel-browser` (frontend), `mixpanel` (backend)

### Amplitude
- **Pros**: Best-in-class product analytics, great free tier
- **Cons**: Complex for simple use cases
- **Setup**: `npm install @amplitude/analytics-browser`

## Success Metrics

### Week 1
- ✅ Analytics infrastructure deployed
- ✅ Core events tracked (auth, onboarding, CRUD)
- ✅ Basic dashboards created

### Month 1
- ✅ All events tracked
- ✅ Activation funnel optimized
- ✅ Retention baseline established

### Month 3
- ✅ AI usage patterns identified
- ✅ Revenue analytics automated
- ✅ Predictive churn model built
