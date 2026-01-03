/**
 * AI Service
 *
 * Main orchestrator for the AI Intelligence Layer
 * Supports both mock (development) and real LLM providers (production)
 *
 * Pipeline: data → analysis → LLM prompt → response → formatting
 */

const AIPromptTemplates = require('./aiPromptTemplates');

class AIService {
  constructor() {
    // Determine which provider to use
    // Set MOCK_AI=true for development without API keys
    this.useMock = process.env.MOCK_AI === 'true' || !process.env.OPENAI_API_KEY;
    this.provider = this.useMock ? 'mock' : 'openai';

    if (this.useMock) {
      console.log('[AI Service] Using MOCK provider (no API key required)');
    } else {
      console.log('[AI Service] Using REAL LLM provider');
    }
  }

  /**
   * Generate relationship coach insights
   */
  async generateRelationshipCoach(stakeholderData, interactions) {
    try {
      const prompt = AIPromptTemplates.relationshipCoach(stakeholderData, interactions);

      if (this.useMock) {
        return this.mockRelationshipCoach(stakeholderData, interactions);
      }

      // Real LLM call would go here
      const response = await this.callLLM(prompt);
      return JSON.parse(response);
    } catch (error) {
      console.error('[AI Service] Error generating relationship coach:', error);
      return this.getEmptyStateResponse('coach');
    }
  }

  /**
   * Detect alignment risks
   */
  async detectRisks(stakeholderData, interactions, trends) {
    try {
      const prompt = AIPromptTemplates.riskDetection(stakeholderData, interactions, trends);

      if (this.useMock) {
        return this.mockRiskDetection(stakeholderData, interactions, trends);
      }

      const response = await this.callLLM(prompt);
      return JSON.parse(response);
    } catch (error) {
      console.error('[AI Service] Error detecting risks:', error);
      return this.getEmptyStateResponse('risk');
    }
  }

  /**
   * Generate meeting prep brief
   */
  async generateMeetingPrep(stakeholderData, interactions, projectContext) {
    try {
      const prompt = AIPromptTemplates.meetingPrep(stakeholderData, interactions, projectContext);

      if (this.useMock) {
        return this.mockMeetingPrep(stakeholderData, interactions);
      }

      const response = await this.callLLM(prompt);
      return JSON.parse(response);
    } catch (error) {
      console.error('[AI Service] Error generating meeting prep:', error);
      return this.getEmptyStateResponse('prep');
    }
  }

  /**
   * Generate post-meeting actions
   */
  async generateActions(meetingNotes, stakeholderName) {
    try {
      const prompt = AIPromptTemplates.actionGenerator(meetingNotes, stakeholderName);

      if (this.useMock) {
        return this.mockActionGenerator(meetingNotes);
      }

      const response = await this.callLLM(prompt);
      return JSON.parse(response);
    } catch (error) {
      console.error('[AI Service] Error generating actions:', error);
      return this.getEmptyStateResponse('actions');
    }
  }

  /**
   * Call LLM provider (placeholder for real implementation)
   */
  async callLLM(prompt) {
    // This is where you'd integrate with OpenAI, Anthropic, etc.
    // Example with OpenAI:
    /*
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 1000
      })
    });

    const data = await response.json();
    return data.choices[0].message.content;
    */

    throw new Error('Real LLM provider not configured');
  }

  /**
   * Mock: Relationship Coach
   */
  mockRelationshipCoach(stakeholderData, interactions) {
    const { name, engagement_status, risk_score, power, influence } = stakeholderData;
    const hasInteractions = interactions.length > 0;

    if (!hasInteractions) {
      return {
        summary: `No interactions with ${name} have been logged yet.`,
        engagement_health: "Not enough activity yet — insights will improve over time 🙂",
        communication_style: "Insufficient data to suggest communication style.",
        key_priorities: "Unknown - more interactions needed to identify priorities.",
        risks: "None detected - no interaction history available.",
        suggested_approach: "Schedule an initial conversation to establish rapport and understand their priorities."
      };
    }

    // Generate intelligent mock based on actual data
    const isHighPower = power >= 4;
    const isHighInfluence = influence >= 4;
    const isResistant = engagement_status === 'resistant';
    const isRisky = risk_score >= 12;

    let summary = `${name} is a ${this.getSeniorityLabel(power, influence)} stakeholder `;
    summary += engagement_status === 'supportive' ? 'with supportive engagement.' :
               engagement_status === 'resistant' ? 'showing some resistance.' :
               'with neutral engagement.';

    let engagement_health = interactions.length >= 5 ?
      "Regular interaction pattern suggests active relationship management." :
      "Limited interaction history - relationship is in early stages.";

    let communication_style = isHighPower ?
      "Keep communications concise and strategic - focus on outcomes and business impact." :
      "Balanced communication style - provide context while remaining clear and actionable.";

    if (isHighInfluence) {
      communication_style += " This stakeholder influences others, so alignment is particularly important.";
    }

    let key_priorities = "Based on available data: ";
    if (isHighPower || isHighInfluence) {
      key_priorities += "strategic alignment, clear outcomes, and efficient execution.";
    } else {
      key_priorities += "project details, collaboration, and timely updates.";
    }

    let risks = "None detected";
    if (isRisky) {
      if (isResistant) {
        risks = "Elevated risk - resistant engagement combined with high influence may impact project success.";
      } else {
        risks = "Some risk detected - relationship may benefit from more frequent touchpoints.";
      }
    }

    let suggested_approach = engagement_status === 'supportive' ?
      "Maintain current engagement level - relationship appears healthy." :
      engagement_status === 'resistant' ?
      "Consider a strategic conversation to understand concerns and find alignment." :
      "Look for opportunities to deepen engagement and build stronger alignment.";

    return {
      summary,
      engagement_health,
      communication_style,
      key_priorities,
      risks,
      suggested_approach
    };
  }

  /**
   * Mock: Risk Detection
   */
  mockRiskDetection(stakeholderData, interactions, trends) {
    const { power, influence, engagement_status, risk_score } = stakeholderData;
    const daysSinceContact = trends.daysSinceContact;

    let risk_detected = false;
    let risk_level = 'low';
    let reason = 'No significant risks detected.';
    let evidence = [];
    let confidence = 0.7;

    // Check for silence risk
    if (daysSinceContact > 21 && (power >= 3 || influence >= 3)) {
      risk_detected = true;
      risk_level = daysSinceContact > 30 ? 'high' : 'medium';
      reason = "Extended silence with an important stakeholder may indicate disengagement.";
      evidence.push(`${daysSinceContact} days since last contact`);
      evidence.push(`Power level: ${power}/5, Influence level: ${influence}/5`);
    }

    // Check for resistance risk
    if (engagement_status === 'resistant' && (power >= 4 || influence >= 4)) {
      risk_detected = true;
      risk_level = 'high';
      reason = "High-power stakeholder showing resistance - alignment risk requires attention.";
      evidence.push('Engagement status: resistant');
      evidence.push(`High ${power >= 4 ? 'power' : 'influence'} level`);
      confidence = 0.9;
    }

    // Check risk score
    if (risk_score >= 14 && !risk_detected) {
      risk_detected = true;
      risk_level = 'medium';
      reason = "Risk score indicates relationship may need attention.";
      evidence.push(`Risk score: ${risk_score}/20`);
    }

    const suggested_next_step = risk_detected ?
      risk_level === 'high' ?
        "Schedule a strategic conversation within the next week to address concerns." :
        "Plan a check-in within the next 10-14 days to maintain alignment." :
      "Continue current engagement approach - relationship appears stable.";

    return {
      risk_detected,
      risk_level,
      confidence,
      reason,
      evidence,
      suggested_next_step,
      tone: "This assessment is based on available interaction data and may not reflect the complete relationship context."
    };
  }

  /**
   * Mock: Meeting Prep
   */
  mockMeetingPrep(stakeholderData, interactions) {
    const { name, engagement_status, power, influence } = stakeholderData;
    const hasInteractions = interactions.length > 0;
    const lastInteraction = interactions[0];

    if (!hasInteractions) {
      return {
        relationship_state: "This will be an initial conversation with " + name,
        last_interaction_summary: "No previous interactions recorded.",
        open_concerns: [],
        potential_risks: [],
        context_reminders: [
          "First meeting - focus on building rapport",
          `${name} is ${power >= 4 ? 'high-power' : 'moderate-power'} stakeholder`,
          "Listen for priorities and concerns"
        ],
        suggested_talking_points: [
          "Introduce yourself and establish context",
          "Understand their priorities and concerns",
          "Clarify expectations and next steps",
          "Identify preferred communication channels"
        ],
        tone_recommendation: "Professional and open - focus on building initial rapport and understanding their perspective."
      };
    }

    const relationship_state = engagement_status === 'supportive' ?
      `Strong relationship with ${name} - supportive and engaged.` :
      engagement_status === 'resistant' ?
      `Relationship with ${name} shows some resistance - careful alignment needed.` :
      `Neutral relationship with ${name} - opportunity to deepen engagement.`;

    const open_concerns = [];
    if (lastInteraction.follow_up_needed) {
      open_concerns.push("Follow-up items from last interaction may need addressing");
    }

    const potential_risks = [];
    if (engagement_status === 'resistant') {
      potential_risks.push("Be mindful of resistance - listen actively for underlying concerns");
    }

    return {
      relationship_state,
      last_interaction_summary: lastInteraction.summary || "Recent interaction logged",
      open_concerns,
      potential_risks,
      context_reminders: [
        `Last contact: ${this.formatRelativeDate(lastInteraction.date)}`,
        `Power: ${power}/5, Influence: ${influence}/5`,
        `Current engagement: ${engagement_status}`
      ],
      suggested_talking_points: [
        "Check in on progress since last interaction",
        "Address any outstanding concerns or questions",
        "Share relevant updates on project progress",
        "Clarify next steps and timelines"
      ],
      tone_recommendation: power >= 4 ?
        "Keep it strategic and outcome-focused - respect their time." :
        "Balanced and collaborative - provide context while staying action-oriented."
    };
  }

  /**
   * Mock: Action Generator
   */
  mockActionGenerator(meetingNotes) {
    // Simple extraction logic for demo
    const actions = [];

    // Look for action patterns
    const lines = meetingNotes.split('\n');
    lines.forEach(line => {
      const lowerLine = line.toLowerCase();
      if (lowerLine.includes('will') || lowerLine.includes('should') || lowerLine.includes('need to')) {
        actions.push({
          description: line.trim(),
          owner: null,
          deadline: null,
          priority: 'medium'
        });
      }
    });

    return {
      key_themes: ["Meeting discussion captured"],
      decisions: [],
      risks_identified: [],
      action_items: actions.slice(0, 5),
      follow_up_timing: "2 weeks",
      overall_sentiment: "neutral",
      summary: "Meeting notes have been captured. Review and edit the extracted actions as needed."
    };
  }

  /**
   * Helper: Get seniority label
   */
  getSeniorityLabel(power, influence) {
    const combined = power + influence;
    if (combined >= 9) return 'senior/executive';
    if (combined >= 7) return 'senior';
    if (combined >= 5) return 'mid-level';
    return 'contributor-level';
  }

  /**
   * Helper: Format relative date
   */
  formatRelativeDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const days = Math.floor((now - date) / (1000 * 60 * 60 * 24));

    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
    return `${Math.floor(days / 30)} months ago`;
  }

  /**
   * Get empty state responses
   */
  getEmptyStateResponse(type) {
    const responses = {
      coach: {
        summary: "Not enough activity yet — insights will improve over time 🙂",
        engagement_health: "Insufficient data",
        communication_style: "More interactions needed to suggest communication style",
        key_priorities: "Unknown",
        risks: "Cannot assess - insufficient data",
        suggested_approach: "Log more interactions to enable AI insights"
      },
      risk: {
        risk_detected: false,
        risk_level: 'low',
        confidence: 0,
        reason: "Insufficient data for risk assessment",
        evidence: [],
        suggested_next_step: "Log more interactions to enable risk detection",
        tone: "Not enough interaction data available yet."
      },
      prep: {
        relationship_state: "Insufficient data for meeting prep",
        last_interaction_summary: "No interactions found",
        open_concerns: [],
        potential_risks: [],
        context_reminders: [],
        suggested_talking_points: [],
        tone_recommendation: "More interaction data needed for personalized prep brief"
      },
      actions: {
        key_themes: [],
        decisions: [],
        risks_identified: [],
        action_items: [],
        follow_up_timing: null,
        overall_sentiment: "neutral",
        summary: "Could not extract actions from notes"
      }
    };

    return responses[type] || {};
  }
}

// Singleton instance
const aiService = new AIService();

module.exports = aiService;
