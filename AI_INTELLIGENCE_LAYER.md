# AI Intelligence Layer - Documentation

## Overview

The AI Intelligence Layer enhances Stakeholder Radar with intelligent insights, risk explanations, and suggested actions. The AI acts as a **supportive mentor** - helpful but not pushy, explainable and always allowing the user to remain in control.

## Architecture

### Core Components

1. **AIService** (`/utils/aiService.js`)
   - Mock AI service that generates insights
   - In production, would call an AI API (OpenAI, Anthropic, etc.)
   - Provides 7 key functions for different use cases

2. **AIAssistantPanel** (`/components/AIAssistantPanel.js`)
   - Reusable AI panel component
   - Purple gradient design to distinguish AI
   - Supports refresh, dismiss, and loading states

3. **AIInsightsModal** (`/components/AIInsightsModal.js`)
   - Detailed AI insights in a modal
   - Color-coded sections (warnings, tips, actions)
   - Disclaimer messaging

---

## AI Use Cases

### 1. Stakeholder Profile Insights

**Function:** `AIService.generateStakeholderInsights(stakeholder, interactions)`

**Generates:**
- Relationship summary
- Risk reasoning
- What they care about
- Communication tips
- Mistakes to avoid
- Suggested next action

**Example Output:**
```
Relationship Summary:
"Priya is resistant with high decision-making authority.
Their role as CTO positions them as a key decision-maker."

Communication Tips:
• Schedule meetings well in advance—respect their calendar
• Lead with outcomes, not process details
• Listen to concerns before presenting solutions

Suggested Action:
Schedule listening session
Timing: Within 1 week
Reason: Understanding concerns is the first step to alignment
```

---

### 2. Risk Explanation

**Function:** `AIService.explainRisk(stakeholder, daysSinceContact)`

**Generates:**
- Plain English risk reasons
- What changed
- Suggested action
- Risk trend (critical/elevated/stable)

**Example Output:**
```
Reasons:
• High power level means significant decision-making authority
• Current resistance requires active management
• No engagement for 18 days increases relationship risk

Action: Schedule urgent check-in within 3 days
Trend: Critical
```

---

### 3. Timeline Summary

**Function:** `AIService.summarizeTimeline(interactions)`

**Generates:**
- Activity summary
- Key highlights
- Pattern detection

**Example Output:**
```
Summary: "15 total interactions recorded. Most recent:
meeting on 01/15/2024."

Highlights:
• 5 interactions in recent history
• Communication methods used: meeting, email, call
• Last outcome: Positive - stakeholder agreed to next steps

Pattern: Varied communication methods—good adaptive approach
```

---

### 4. Executive Summary

**Function:** `AIService.generateExecutiveSummary(projects, stakeholders)`

**Generates:**
- Overview
- Key findings
- Recommendations
- Next steps

**Example Output:**
```
Overview: "Managing 47 stakeholders across 5 projects."

Key Findings:
• ⚠️ 3 high-risk stakeholders require immediate attention
• 8 stakeholders at elevated risk
• ✓ 25 supportive stakeholders showing positive engagement

Recommendations:
• Prioritize immediate outreach to high-risk stakeholders
• Monitor elevated-risk stakeholders to prevent escalation
```

---

### 5. Email Tone Guidance

**Function:** `AIService.generateEmailGuidance(stakeholder)`

**Generates:**
- Recommended tone
- Communication style
- Example approach
- Timing guidance
- Length recommendation

**Example Output:**
```
Tone: Calm and empathetic
Style: Acknowledge concerns and focus on shared goals
Example: Listen more than you speak; validate their perspective

Timing: Respond within 24 hours to show priority
Length: Keep concise—respect their time
```

---

### 6. Dashboard Summary

**Function:** `AIService.generateDashboardSummary(stats)`

**Generates:**
- Headline message
- Key insights
- Priority level

**Example Output:**
```
Headline: "3 stakeholders need your attention today"

Insights:
• Actively managing 47 stakeholders across 5 projects
• Focus on high-risk relationships first
• Maintain regular communication to prevent escalation

Priority: High
```

---

## Integration Guide

### Adding AI to a Page

**Step 1:** Import AI components

```javascript
import AIAssistantPanel from '../components/AIAssistantPanel';
import AIInsightsModal from '../components/AIInsightsModal';
import { AIService } from '../utils/aiService';
```

**Step 2:** Add state

```javascript
const [aiInsights, setAiInsights] = useState(null);
const [showAIModal, setShowAIModal] = useState(false);
const [aiLoading, setAiLoading] = useState(false);
```

**Step 3:** Generate insights

```javascript
function generateAIInsights(stakeholderData, interactionsData) {
  setAiLoading(true);

  // Simulate API delay
  setTimeout(() => {
    const insights = AIService.generateStakeholderInsights(
      stakeholderData,
      interactionsData
    );
    setAiInsights(insights);
    setAiLoading(false);
  }, 500);
}
```

**Step 4:** Add AI panel to UI

```javascript
<AIAssistantPanel
  title="AI Insights"
  insights={{
    summary: aiInsights?.relationshipSummary,
    items: aiInsights?.communicationTips,
    action: aiInsights?.suggestedAction ? {
      title: aiInsights.suggestedAction.action,
      description: aiInsights.suggestedAction.reason
    } : null
  }}
  loading={aiLoading}
  onRefresh={() => generateAIInsights(stakeholder, interactions)}
/>

<AIInsightsModal
  isOpen={showAIModal}
  onClose={() => setShowAIModal(false)}
  stakeholder={stakeholder}
  insights={aiInsights}
/>
```

---

## UI Design Principles

### Visual Identity

- **Color:** Purple gradient (#F5F3FF → #FAFBFF)
- **Border:** Indigo (#C7D2FE)
- **Icon:** Sparkles ✨ (pulsing animation)
- **Title Color:** Deep indigo (#4338CA)

### Tone & Voice

✅ **Do:**
- Use friendly, human language
- Explain reasoning clearly
- Provide actionable advice
- Show uncertainty when appropriate ("consider", "may", "often")
- Frame as suggestions, not commands

❌ **Don't:**
- Be overly confident or absolute
- Use technical jargon
- Push or pressure the user
- Make guarantees
- Hide how conclusions were reached

### Example Phrasing

**Good:**
- "Consider scheduling a check-in within the next few days"
- "Based on their role, they likely value clear outcomes"
- "This approach often works well with resistant stakeholders"

**Bad:**
- "You must call them immediately"
- "They definitely won't respond to emails"
- "This is the only solution"

---

## UX Controls

### Always Provide

1. **Refresh Button** - Regenerate insights
2. **Dismiss Button** - Hide the panel
3. **Disclaimer** - "AI-generated suggestions • Review before acting"
4. **Loading State** - Spinner with "Generating insights..."
5. **Empty State** - "No insights available"

### User Actions

- ✓ User can dismiss any AI panel
- ✓ User can refresh insights
- ✓ User can ignore suggestions
- ✓ AI never auto-executes actions
- ✓ All suggestions clearly labeled as AI-generated

---

## Integration Points

### Current Implementation

✅ **Stakeholder Profile Page**
- AI insights state added
- generateAIInsights() function created
- Ready to add UI components

✅ **Infrastructure Ready**
- AIService with 7 functions
- AIAssistantPanel component
- AIInsightsModal component
- Complete CSS styling (375+ lines)

### Recommended Next Integrations

1. **Dashboard** - Add AI summary panel
2. **Reports Page** - Add executive summary
3. **Project Detail** - Add project-specific insights
4. **Stakeholder List** - Add batch insights

---

## Example Usage: Stakeholder Profile

```javascript
// In Overview Tab
<AIAssistantPanel
  title="AI Relationship Insights"
  insights={{
    summary: aiInsights?.relationshipSummary,
    items: [
      `Risk Level: ${aiInsights?.riskReasoning}`,
      `Communication: ${aiInsights?.communicationTips?.[0]}`
    ]
  }}
  loading={aiLoading}
  compact
/>

// Quick Action Button
<button
  className="btn btn-primary"
  onClick={() => setShowAIModal(true)}
>
  ✨ View Full AI Insights
</button>
```

---

## Privacy & Security

### Current Approach (Mock)
- All processing happens client-side
- No data sent to external APIs
- Insights generated from local state

### Production Considerations
1. **API Integration** - Call actual AI service (OpenAI, Anthropic)
2. **Data Privacy** - Ensure PII is handled appropriately
3. **Token Storage** - Secure API key management
4. **Rate Limiting** - Prevent excessive AI calls
5. **Caching** - Store recent insights to reduce API costs
6. **User Consent** - Clear messaging about AI usage

---

## Color-Coded Sections

### AI Insights Modal

| Section | Background | Border | Title Color |
|---------|-----------|---------|-------------|
| Warning | Red gradient | #FCA5A5 | #991B1B |
| Tips | Blue gradient | #93C5FD | #075985 |
| Avoid | Yellow gradient | #FDE68A | #92400E |
| Action | Purple gradient | #C4B5FD | #6B21A8 |

---

## Performance

### Optimization Tips

1. **Debounce Generation** - Don't regenerate on every state change
2. **Cache Results** - Store insights for 5-10 minutes
3. **Lazy Load** - Only generate when user views the tab
4. **Progressive Loading** - Show summary first, details on demand

---

## Testing Considerations

### Test Scenarios

1. **Empty State** - No interactions, new stakeholder
2. **High Risk** - Power 5, Influence 5, Resistant, 30+ days no contact
3. **Low Risk** - Power 1, Influence 1, Supportive, recent contact
4. **Edge Cases** - Missing data, null values, invalid dates

### Expected Behavior

- AI panel should never crash the page
- Loading state should always resolve
- Empty states should be friendly and helpful
- Dismissing should persist during session (not across refreshes)

---

## Future Enhancements

### Phase 2
- Real AI API integration (OpenAI/Anthropic)
- Sentiment analysis on interactions
- Predictive risk scoring
- Email drafting assistance

### Phase 3
- Learning from user actions
- Personalized insights based on user style
- Multi-stakeholder relationship mapping
- AI-powered meeting prep

---

## CSS Classes Reference

### AI Assistant Panel
- `.ai-assistant-panel` - Main container
- `.ai-assistant-compact` - Compact variant
- `.ai-icon` - Sparkle icon with pulse animation
- `.ai-loading-spinner` - Spinning loader
- `.ai-insights-list` - Bullet list with checkmarks

### AI Insights Modal
- `.ai-insights-modal` - Modal container
- `.ai-insight-section` - Section wrapper
- `.ai-section-warning` - Red warning section
- `.ai-section-tips` - Blue tips section
- `.ai-section-avoid` - Yellow avoid section
- `.ai-section-action` - Purple action section
- `.ai-disclaimer-box` - Bottom disclaimer

---

## Support

For questions or issues with the AI Intelligence Layer, review the source files:
- `/utils/aiService.js` - All AI generation logic
- `/components/AIAssistantPanel.js` - Panel component
- `/components/AIInsightsModal.js` - Modal component
- `/App.css` - Lines 4356-4728 for AI styles

---

**Built with care to enhance, not replace, human judgment in stakeholder management.**
