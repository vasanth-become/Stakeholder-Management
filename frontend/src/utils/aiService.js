/**
 * AI Service - Mock AI Intelligence Layer
 *
 * This service simulates AI-powered insights and suggestions.
 * In production, this would call an AI API (OpenAI, Anthropic, etc.)
 */

export const AIService = {
  /**
   * Generate stakeholder insights based on profile data
   */
  generateStakeholderInsights: (stakeholder, interactions = []) => {
    const riskLevel = stakeholder.risk_score >= 12 ? 'high' : stakeholder.risk_score >= 7 ? 'medium' : 'low';
    const engagementMap = {
      supportive: 'positive and collaborative',
      neutral: 'neutral but engaged',
      resistant: 'resistant to change'
    };

    const lastInteraction = interactions.length > 0
      ? new Date(interactions[0].date)
      : null;

    const daysSinceContact = lastInteraction
      ? Math.floor((new Date() - lastInteraction) / (1000 * 60 * 60 * 24))
      : null;

    return {
      relationshipSummary: generateRelationshipSummary(stakeholder, engagementMap),
      riskReasoning: generateRiskReasoning(stakeholder, riskLevel, daysSinceContact),
      whatTheyCareAbout: generateCareAbout(stakeholder),
      communicationTips: generateCommunicationTips(stakeholder, engagementMap),
      mistakesToAvoid: generateMistakesToAvoid(stakeholder),
      suggestedAction: generateSuggestedAction(stakeholder, daysSinceContact, riskLevel)
    };
  },

  /**
   * Generate risk explanation
   */
  explainRisk: (stakeholder, daysSinceContact) => {
    const reasons = [];

    if (stakeholder.power >= 4) {
      reasons.push('High power level means significant decision-making authority');
    }

    if (stakeholder.influence >= 4) {
      reasons.push('High influence can sway other stakeholders');
    }

    if (stakeholder.engagement === 'resistant') {
      reasons.push('Current resistance to project direction');
    }

    if (daysSinceContact && daysSinceContact > 14) {
      reasons.push(`No engagement for ${daysSinceContact} days increases relationship risk`);
    }

    if (reasons.length === 0) {
      reasons.push('Low power and influence with supportive engagement');
    }

    const riskScore = stakeholder.risk_score;
    const action = riskScore >= 12
      ? 'Schedule an urgent check-in within 3 days'
      : riskScore >= 7
        ? 'Plan a structured update within the next week'
        : 'Maintain regular communication cadence';

    return {
      reasons,
      action,
      trend: riskScore >= 12 ? 'critical' : riskScore >= 7 ? 'elevated' : 'stable'
    };
  },

  /**
   * Summarize timeline activity
   */
  summarizeTimeline: (interactions) => {
    if (!interactions || interactions.length === 0) {
      return {
        summary: 'No interactions recorded yet. Consider scheduling an initial meeting to establish the relationship.',
        highlights: [],
        pattern: null
      };
    }

    const recentCount = interactions.slice(0, 5).length;
    const types = [...new Set(interactions.map(i => i.type))];
    const lastInteraction = interactions[0];

    return {
      summary: `${interactions.length} total interactions recorded. Most recent: ${lastInteraction.type} on ${new Date(lastInteraction.date).toLocaleDateString()}.`,
      highlights: [
        `${recentCount} interactions in recent history`,
        `Communication methods used: ${types.join(', ')}`,
        lastInteraction.outcome ? `Last outcome: ${lastInteraction.outcome}` : null
      ].filter(Boolean),
      pattern: detectPattern(interactions)
    };
  },

  /**
   * Generate executive summary for reports
   */
  generateExecutiveSummary: (projects, stakeholders) => {
    const highRisk = stakeholders.filter(s => s.risk_score >= 12).length;
    const mediumRisk = stakeholders.filter(s => s.risk_score >= 7 && s.risk_score < 12).length;
    const supportive = stakeholders.filter(s => s.engagement === 'supportive').length;
    const resistant = stakeholders.filter(s => s.engagement === 'resistant').length;

    return {
      overview: `Managing ${stakeholders.length} stakeholders across ${projects.length} projects.`,
      keyFindings: [
        highRisk > 0 ? `⚠️ ${highRisk} high-risk stakeholders require immediate attention` : null,
        mediumRisk > 0 ? `${mediumRisk} stakeholders at elevated risk` : null,
        supportive > 0 ? `✓ ${supportive} supportive stakeholders showing positive engagement` : null,
        resistant > 0 ? `${resistant} resistant stakeholders need focused strategy` : null
      ].filter(Boolean),
      recommendations: generateRecommendations(highRisk, mediumRisk, resistant),
      nextSteps: generateNextSteps(highRisk, mediumRisk)
    };
  },

  /**
   * Generate email tone guidance
   */
  generateEmailGuidance: (stakeholder) => {
    const toneMap = {
      supportive: {
        tone: 'Warm and collaborative',
        style: 'Express appreciation and maintain momentum',
        example: 'Keep messages positive and solution-focused'
      },
      neutral: {
        tone: 'Professional and clear',
        style: 'Provide structured updates with clear next steps',
        example: 'Use bullet points and concrete timelines'
      },
      resistant: {
        tone: 'Calm and empathetic',
        style: 'Acknowledge concerns and focus on shared goals',
        example: 'Listen more than you speak; validate their perspective'
      }
    };

    const guidance = toneMap[stakeholder.engagement] || toneMap.neutral;

    return {
      ...guidance,
      timing: stakeholder.power >= 4
        ? 'Respond within 24 hours to show priority'
        : 'Respond within 2-3 business days',
      length: stakeholder.influence >= 4
        ? 'Keep concise—respect their time'
        : 'Can be more detailed if needed'
    };
  },

  /**
   * Generate dashboard summary
   */
  generateDashboardSummary: (stats) => {
    const urgentCount = stats.atRiskCount || 0;
    const totalProjects = stats.totalProjects || 0;
    const totalStakeholders = stats.totalStakeholders || 0;

    return {
      headline: urgentCount > 0
        ? `${urgentCount} stakeholder${urgentCount > 1 ? 's' : ''} need your attention today`
        : 'All stakeholder relationships are stable',
      insights: [
        `Actively managing ${totalStakeholders} stakeholders across ${totalProjects} projects`,
        urgentCount > 0 ? 'Focus on high-risk relationships first' : 'Good time to strengthen existing relationships',
        'Maintain regular communication cadence to prevent risk escalation'
      ],
      priority: urgentCount > 0 ? 'high' : 'normal'
    };
  }
};

// Helper functions
function generateRelationshipSummary(stakeholder, engagementMap) {
  const engagement = engagementMap[stakeholder.engagement] || 'engaged';
  const powerDesc = stakeholder.power >= 4 ? 'high decision-making authority' : 'moderate influence';

  return `${stakeholder.name} is ${engagement} with ${powerDesc}. Their role as ${stakeholder.role} positions them as a key ${stakeholder.power >= 4 ? 'decision-maker' : 'influencer'} in this project.`;
}

function generateRiskReasoning(stakeholder, riskLevel, daysSinceContact) {
  const reasons = [];

  if (riskLevel === 'high') {
    reasons.push('High power and influence create significant project impact');
  }

  if (stakeholder.engagement === 'resistant') {
    reasons.push('Current resistance requires active management');
  }

  if (daysSinceContact && daysSinceContact > 14) {
    reasons.push('Extended period without contact weakens relationship');
  }

  return reasons.length > 0
    ? reasons.join('. ') + '.'
    : 'Moderate power level with positive engagement maintains stable relationship.';
}

function generateCareAbout(stakeholder) {
  const interests = {
    'CEO': ['Strategic alignment', 'ROI', 'Timeline certainty'],
    'CTO': ['Technical quality', 'Architecture decisions', 'Team capacity'],
    'Product Manager': ['User impact', 'Feature delivery', 'Roadmap alignment'],
    'Engineering Manager': ['Resource allocation', 'Technical debt', 'Team morale']
  };

  const defaultInterests = ['Project success', 'Clear communication', 'Timely updates'];
  return interests[stakeholder.role] || defaultInterests;
}

function generateCommunicationTips(stakeholder, engagementMap) {
  const tips = [];

  if (stakeholder.power >= 4) {
    tips.push('Schedule meetings well in advance—respect their calendar');
    tips.push('Lead with outcomes and impact, not process details');
  }

  if (stakeholder.engagement === 'resistant') {
    tips.push('Listen to concerns before presenting solutions');
    tips.push('Find common ground and shared objectives');
  } else if (stakeholder.engagement === 'supportive') {
    tips.push('Leverage their enthusiasm to influence others');
    tips.push('Keep them informed of wins to maintain momentum');
  }

  tips.push(`Preferred channel: ${stakeholder.preferred_channel || 'Email'}`);

  return tips;
}

function generateMistakesToAvoid(stakeholder) {
  const mistakes = [];

  if (stakeholder.power >= 4) {
    mistakes.push("Don't surprise them—no last-minute changes");
    mistakes.push("Don't over-communicate minor details");
  }

  if (stakeholder.engagement === 'resistant') {
    mistakes.push("Don't dismiss their concerns as 'just resistance'");
    mistakes.push("Don't push too hard—give them time to process");
  }

  mistakes.push("Don't go silent—maintain consistent communication rhythm");

  return mistakes;
}

function generateSuggestedAction(stakeholder, daysSinceContact, riskLevel) {
  if (riskLevel === 'high') {
    return {
      action: 'Schedule urgent 1:1 meeting',
      timing: 'Within 2-3 days',
      reason: 'High risk requires immediate attention and relationship repair'
    };
  }

  if (daysSinceContact && daysSinceContact > 21) {
    return {
      action: 'Send a brief check-in email',
      timing: 'Today',
      reason: 'Re-establish communication before relationship deteriorates further'
    };
  }

  if (stakeholder.engagement === 'resistant') {
    return {
      action: 'Schedule listening session',
      timing: 'Within 1 week',
      reason: 'Understanding concerns is the first step to alignment'
    };
  }

  return {
    action: 'Send project update',
    timing: 'Every 10-14 days',
    reason: 'Maintain visibility and sustain positive relationship'
  };
}

function detectPattern(interactions) {
  if (interactions.length < 3) return null;

  const recent = interactions.slice(0, 3);
  const types = recent.map(i => i.type);

  if (types.every(t => t === types[0])) {
    return `Consistent ${types[0]} communication pattern`;
  }

  return 'Varied communication methods—good adaptive approach';
}

function generateRecommendations(highRisk, mediumRisk, resistant) {
  const recs = [];

  if (highRisk > 0) {
    recs.push('Prioritize immediate outreach to high-risk stakeholders');
  }

  if (resistant > 0) {
    recs.push('Develop targeted engagement strategies for resistant stakeholders');
  }

  if (mediumRisk > 0) {
    recs.push('Monitor elevated-risk stakeholders to prevent escalation');
  }

  recs.push('Maintain regular communication cadence with supportive stakeholders');

  return recs;
}

function generateNextSteps(highRisk, mediumRisk) {
  const steps = [];

  if (highRisk > 0) {
    steps.push('Schedule check-ins with all high-risk stakeholders this week');
  }

  if (mediumRisk > 0) {
    steps.push('Review engagement history for medium-risk stakeholders');
  }

  steps.push('Update project timelines and communicate proactively');
  steps.push('Leverage supportive stakeholders to build coalition');

  return steps;
}

export default AIService;
