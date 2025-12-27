const db = require('../database/db');

class SuggestionEngine {
  // Generate AI-powered suggestions for a stakeholder
  static generateSuggestions(stakeholder, interactions = []) {
    const suggestions = {
      communication_strategy: this.getCommunicationStrategy(stakeholder, interactions),
      risk_assessment: this.getRiskAssessment(stakeholder),
      next_steps: this.getNextSteps(stakeholder, interactions),
      priority_level: this.getPriorityLevel(stakeholder)
    };

    return suggestions;
  }

  // Analyze and suggest communication approach
  static getCommunicationStrategy(stakeholder, interactions) {
    const { power, influence, engagement_status, preferred_channel } = stakeholder;
    const recentInteractions = interactions.slice(0, 3);

    let strategy = {
      approach: '',
      tone: '',
      channel: preferred_channel || 'Email or in-person meeting',
      tips: []
    };

    // Determine approach based on engagement and power
    if (engagement_status === 'resistant') {
      if (power >= 4 || influence >= 4) {
        strategy.approach = 'Diplomatic and data-driven';
        strategy.tone = 'Professional, respectful, and solution-oriented';
        strategy.tips = [
          'Acknowledge their concerns and validate their perspective',
          'Present clear data and evidence to support your position',
          'Focus on mutual benefits and organizational goals',
          'Offer to address specific objections in detail'
        ];
      } else {
        strategy.approach = 'Informative and collaborative';
        strategy.tone = 'Friendly yet professional, open to dialogue';
        strategy.tips = [
          'Understand the root cause of resistance',
          'Provide clear information about benefits',
          'Invite them to participate in shaping solutions',
          'Show how their concerns are being addressed'
        ];
      }
    } else if (engagement_status === 'neutral') {
      if (power >= 4 || influence >= 4) {
        strategy.approach = 'Strategic engagement';
        strategy.tone = 'Confident, informative, and persuasive';
        strategy.tips = [
          'This is a key opportunity to gain support',
          'Highlight wins and positive outcomes',
          'Show how this aligns with their priorities',
          'Request their input on key decisions'
        ];
      } else {
        strategy.approach = 'Regular updates and involvement';
        strategy.tone = 'Warm, inclusive, and transparent';
        strategy.tips = [
          'Keep them informed of progress',
          'Invite feedback and suggestions',
          'Share success stories and milestones',
          'Build rapport through regular touchpoints'
        ];
      }
    } else { // supportive
      if (power >= 4 || influence >= 4) {
        strategy.approach = 'Partnership and collaboration';
        strategy.tone = 'Appreciative, collaborative, and empowering';
        strategy.tips = [
          'Leverage their support to influence others',
          'Keep them closely informed of developments',
          'Ask them to champion initiatives',
          'Recognize and appreciate their advocacy publicly'
        ];
      } else {
        strategy.approach = 'Maintain engagement';
        strategy.tone = 'Appreciative and inclusive';
        strategy.tips = [
          'Continue regular updates to maintain support',
          'Thank them for their continued backing',
          'Involve them in relevant activities',
          'Use them as a sounding board for ideas'
        ];
      }
    }

    // Add context from recent interactions
    if (recentInteractions.length > 0) {
      const lastInteraction = recentInteractions[0];
      const daysSince = this.getDaysSinceInteraction(lastInteraction.date);

      if (daysSince > 14) {
        strategy.tips.unshift('⚠️ No contact in ' + daysSince + ' days - reconnect soon to maintain relationship');
      }
    }

    return strategy;
  }

  // Assess risk level with detailed explanation
  static getRiskAssessment(stakeholder) {
    const { risk_score, power, influence, engagement_status } = stakeholder;

    let assessment = {
      score: risk_score,
      level: risk_score >= 14 ? 'HIGH' : risk_score >= 8 ? 'MEDIUM' : 'LOW',
      factors: [],
      impact: ''
    };

    // Analyze risk factors
    if (power >= 4) {
      assessment.factors.push(`High authority (Power: ${power}/5) - can block or approve decisions`);
    }
    if (influence >= 4) {
      assessment.factors.push(`Strong influence (${influence}/5) - can sway other stakeholders`);
    }
    if (engagement_status === 'resistant') {
      assessment.factors.push('Resistant stance - actively opposing or skeptical');
    } else if (engagement_status === 'neutral') {
      assessment.factors.push('Neutral position - not yet convinced, could go either way');
    }

    // Determine impact
    if (power >= 4 && influence >= 4) {
      if (engagement_status === 'resistant') {
        assessment.impact = '🔴 CRITICAL: High-power, high-influence resistant stakeholder poses significant project risk';
      } else if (engagement_status === 'neutral') {
        assessment.impact = '🟡 IMPORTANT: Influential stakeholder in neutral position - converting them to supportive could be a game-changer';
      } else {
        assessment.impact = '🟢 POSITIVE: Powerful ally who can champion your initiatives';
      }
    } else if (power >= 3 || influence >= 3) {
      assessment.impact = engagement_status === 'resistant'
        ? '🟡 MODERATE RISK: Could create obstacles if not managed properly'
        : '🟢 MANAGEABLE: Continue regular engagement to maintain positive relationship';
    } else {
      assessment.impact = '🟢 LOW IMPACT: Maintain awareness but not a critical focus area';
    }

    return assessment;
  }

  // Recommend next steps
  static getNextSteps(stakeholder, interactions) {
    const { power, influence, engagement_status, owner, risk_score } = stakeholder;
    const recentInteractions = interactions.slice(0, 5);

    let steps = [];
    let urgency = 'normal';

    // Check for interaction gap
    const daysSinceLastContact = recentInteractions.length > 0
      ? this.getDaysSinceInteraction(recentInteractions[0].date)
      : 999;

    if (daysSinceLastContact > 14) {
      urgency = 'urgent';
      steps.push({
        action: '📅 Schedule immediate meeting',
        reason: `No contact in ${daysSinceLastContact} days - relationship at risk of degrading`,
        timeline: 'Within 3 days',
        priority: 1
      });
    }

    // Risk-based recommendations
    if (risk_score >= 14) {
      urgency = 'urgent';
      steps.push({
        action: '🚨 Develop mitigation strategy',
        reason: 'High risk score requires immediate action plan',
        timeline: 'This week',
        priority: 1
      });

      if (engagement_status === 'resistant' && (power >= 4 || influence >= 4)) {
        steps.push({
          action: '🤝 Executive escalation meeting',
          reason: 'High-power resistant stakeholder needs senior leadership engagement',
          timeline: 'Within 1 week',
          priority: 1
        });
      }
    }

    // Engagement-specific actions
    if (engagement_status === 'resistant') {
      steps.push({
        action: '🎯 Address specific concerns',
        reason: 'Identify and document their objections, create targeted response plan',
        timeline: 'Next 2 weeks',
        priority: 2
      });

      steps.push({
        action: '📊 Prepare evidence package',
        reason: 'Compile data, case studies, and ROI analysis to counter resistance',
        timeline: 'Ongoing',
        priority: 2
      });
    } else if (engagement_status === 'neutral') {
      if (power >= 4 || influence >= 4) {
        steps.push({
          action: '💡 Schedule influence meeting',
          reason: 'High-influence neutral stakeholder - opportunity to convert to supporter',
          timeline: 'Next 1-2 weeks',
          priority: 1
        });
      }

      steps.push({
        action: '📢 Share success stories',
        reason: 'Demonstrate value through concrete examples and quick wins',
        timeline: 'Ongoing',
        priority: 2
      });
    } else { // supportive
      if (power >= 4 || influence >= 4) {
        steps.push({
          action: '🌟 Leverage as champion',
          reason: 'Empower them to advocate and influence other stakeholders',
          timeline: 'Ongoing',
          priority: 2
        });
      }

      steps.push({
        action: '✅ Regular check-ins',
        reason: 'Maintain relationship and keep them informed',
        timeline: 'Every 2 weeks',
        priority: 3
      });
    }

    // Check for follow-up needs from interactions
    const needsFollowUp = recentInteractions.filter(i => i.follow_up_needed);
    if (needsFollowUp.length > 0) {
      steps.push({
        action: '📝 Complete pending follow-ups',
        reason: `${needsFollowUp.length} interaction(s) marked as requiring follow-up`,
        timeline: 'Immediate',
        priority: 1
      });
    }

    // Sort by priority
    steps.sort((a, b) => a.priority - b.priority);

    return {
      urgency,
      recommended_actions: steps.slice(0, 5) // Top 5 actions
    };
  }

  // Determine priority level
  static getPriorityLevel(stakeholder) {
    const { power, influence, risk_score, engagement_status } = stakeholder;
    const combinedPowerInfluence = power + influence;

    if (risk_score >= 14) {
      return 'CRITICAL';
    } else if (risk_score >= 12) {
      return 'HIGH';
    } else if (combinedPowerInfluence >= 8) {
      return 'HIGH';
    } else if (risk_score >= 8 || combinedPowerInfluence >= 6) {
      return 'MEDIUM';
    } else {
      return 'LOW';
    }
  }

  // Helper: Calculate days since interaction
  static getDaysSinceInteraction(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
}

module.exports = SuggestionEngine;
