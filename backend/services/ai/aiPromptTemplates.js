/**
 * AI Prompt Templates
 *
 * Modular, reusable prompt templates for the AI Intelligence Layer
 * Designed to be calm, supportive, and privacy-respectful
 */

class AIPromptTemplates {
  /**
   * Relationship Coach Prompt
   * Analyzes stakeholder data to provide relationship guidance
   */
  static relationshipCoach(stakeholderData, interactions) {
    const { name, role, power, influence, engagement_status, risk_score } = stakeholderData;
    const interactionCount = interactions.length;
    const recentInteractions = interactions.slice(0, 3);

    return `You are a calm, supportive relationship intelligence assistant for stakeholder management.

STAKEHOLDER PROFILE:
- Name: ${name}
- Role: ${role}
- Power Level: ${power}/5
- Influence Level: ${influence}/5
- Engagement Status: ${engagement_status}
- Risk Score: ${risk_score}/20
- Total Interactions: ${interactionCount}

RECENT INTERACTIONS:
${recentInteractions.map((i, idx) => `${idx + 1}. ${i.date}: ${i.interaction_type} - ${i.summary || 'No summary'}`).join('\n')}

Please provide a brief relationship intelligence brief in JSON format:

{
  "summary": "2-3 sentence neutral relationship summary",
  "engagement_health": "Brief explanation of current engagement state",
  "communication_style": "Suggested communication approach based on available data",
  "key_priorities": "What seems to matter most to them (if evident)",
  "risks": "Any alignment risks (or 'None detected' if none)",
  "suggested_approach": "Recommended tone and approach for next interaction"
}

IMPORTANT RULES:
- Be calm, supportive, and neutral
- Reference ONLY available data
- Never fabricate facts or guess personal details
- Use phrases like "appears to", "may be", "suggests" for uncertainty
- If data is limited, say "Not enough activity yet"
- Keep language professional and empathetic
- No drama or absolute statements`;
  }

  /**
   * Risk Detection Prompt
   * Identifies early alignment risks
   */
  static riskDetection(stakeholderData, interactions, trends) {
    return `You are a risk detection assistant for stakeholder relationship management.

STAKEHOLDER DATA:
- Name: ${stakeholderData.name}
- Power: ${stakeholderData.power}/5
- Influence: ${stakeholderData.influence}/5
- Engagement: ${stakeholderData.engagement_status}
- Risk Score: ${stakeholderData.risk_score}/20

INTERACTION PATTERNS:
- Total interactions: ${interactions.length}
- Last interaction: ${interactions[0]?.date || 'Never'}
- Days since contact: ${trends.daysSinceContact}

TRENDS:
${JSON.stringify(trends, null, 2)}

Analyze for early alignment risks. Provide response in JSON:

{
  "risk_detected": true/false,
  "risk_level": "low|medium|high",
  "confidence": 0.0-1.0,
  "reason": "Clear, calm explanation of the risk",
  "evidence": ["specific data points that support this assessment"],
  "suggested_next_step": "Practical recommendation",
  "tone": "Calm and supportive explanation"
}

RULES:
- Never exaggerate risk
- Always explain reasoning clearly
- Provide confidence score (0-1)
- Use calm, professional language
- If uncertain, say so explicitly`;
  }

  /**
   * Meeting Prep Brief Prompt
   * Generates pre-meeting preparation brief
   */
  static meetingPrep(stakeholderData, interactions, projectContext) {
    return `You are a meeting preparation assistant.

UPCOMING MEETING WITH:
${stakeholderData.name} - ${stakeholderData.role}

STAKEHOLDER CONTEXT:
- Power: ${stakeholderData.power}/5
- Influence: ${stakeholderData.influence}/5
- Engagement: ${stakeholderData.engagement_status}
- Risk Score: ${stakeholderData.risk_score}/20

LAST INTERACTION:
${interactions[0] ? `${interactions[0].date}: ${interactions[0].summary}` : 'No previous interactions'}

PROJECT: ${projectContext?.name || 'No project context'}

Generate a calm, practical meeting prep brief in JSON:

{
  "relationship_state": "Current relationship status summary",
  "last_interaction_summary": "Brief recap of last interaction",
  "open_concerns": ["Any unresolved items from previous interactions"],
  "potential_risks": ["Any alignment risks to be mindful of"],
  "context_reminders": ["Important context to remember"],
  "suggested_talking_points": ["3-4 suggested discussion topics"],
  "tone_recommendation": "Recommended communication approach"
}

TONE:
- Calm and supportive
- Practical and actionable
- Professional but warm
- Example: "Before your call, it may help to clarify..."`;
  }

  /**
   * Post-Meeting Action Generator Prompt
   * Extracts actions from meeting notes
   */
  static actionGenerator(meetingNotes, stakeholderName) {
    return `You are a post-meeting action extraction assistant.

MEETING NOTES:
${meetingNotes}

STAKEHOLDER: ${stakeholderName}

Extract structured information from these notes in JSON format:

{
  "key_themes": ["Main discussion topics (2-4 items)"],
  "decisions": ["Decisions made during meeting"],
  "risks_identified": ["Any risks or concerns mentioned"],
  "action_items": [
    {
      "description": "Clear action description",
      "owner": "Person responsible (if mentioned)",
      "deadline": "Deadline if mentioned, or null",
      "priority": "high|medium|low"
    }
  ],
  "follow_up_timing": "Recommended next contact timing (e.g., '2 weeks', '1 month')",
  "overall_sentiment": "positive|neutral|concerning",
  "summary": "2-sentence meeting summary"
}

RULES:
- Extract ONLY what is explicitly mentioned
- If something isn't mentioned, use null or empty array
- Don't invent owners or deadlines
- Be accurate and conservative
- Keep language neutral and professional`;
  }

  /**
   * Engagement Trend Analysis Prompt
   * Analyzes engagement patterns over time
   */
  static engagementTrends(interactions, timeframe = 90) {
    return `Analyze engagement trends from these interactions:

INTERACTIONS (last ${timeframe} days):
${interactions.map(i => `${i.date}: ${i.interaction_type} - ${i.outcome || i.summary}`).join('\n')}

Provide trend analysis in JSON:

{
  "trend": "improving|stable|declining|insufficient_data",
  "confidence": 0.0-1.0,
  "indicators": ["Specific patterns observed"],
  "explanation": "Calm, neutral explanation of the trend",
  "recommendation": "Suggested action based on trend"
}

Be conservative and factual. Use "appears to" for uncertainty.`;
  }

  /**
   * Communication Style Analysis Prompt
   * Suggests communication approaches
   */
  static communicationStyle(stakeholderData, interactions) {
    return `Based on available interaction data, suggest communication style:

STAKEHOLDER: ${stakeholderData.name} - ${stakeholderData.role}
INTERACTIONS: ${interactions.length} total

INTERACTION TYPES:
${this.summarizeInteractionTypes(interactions)}

Provide communication guidance in JSON:

{
  "style": "Inferred communication style preference",
  "formality": "formal|semi-formal|casual",
  "detail_level": "high-level|balanced|detailed",
  "responsiveness": "Assessment of response patterns",
  "suggestions": ["2-3 specific communication tips"]
}

Base this ONLY on observable patterns. If insufficient data, say so.`;
  }

  /**
   * Helper: Summarize interaction types
   */
  static summarizeInteractionTypes(interactions) {
    const types = {};
    interactions.forEach(i => {
      types[i.interaction_type] = (types[i.interaction_type] || 0) + 1;
    });
    return Object.entries(types)
      .map(([type, count]) => `${type}: ${count}`)
      .join('\n');
  }
}

module.exports = AIPromptTemplates;
