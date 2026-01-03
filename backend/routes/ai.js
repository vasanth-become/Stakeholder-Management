/**
 * AI Intelligence API Routes
 *
 * Endpoints for AI-powered relationship intelligence features
 */

const express = require('express');
const router = express.Router();
const aiService = require('../services/ai/aiService');
const Stakeholder = require('../models/stakeholder');
const db = require('../database/db');
const analyticsService = require('../services/analyticsService');

/**
 * GET /api/ai/coach/:stakeholderId
 * Get AI relationship coach insights for a stakeholder
 */
router.get('/coach/:stakeholderId', async (req, res) => {
  try {
    const stakeholderId = parseInt(req.params.stakeholderId);

    // Get stakeholder data
    const stakeholder = Stakeholder.findById(stakeholderId);
    if (!stakeholder) {
      return res.status(404).json({ error: 'Stakeholder not found' });
    }

    // Get interactions
    const interactions = db.prepare(`
      SELECT * FROM interactions
      WHERE stakeholder_id = ?
      ORDER BY date DESC
    `).all(stakeholderId);

    // Generate insights
    const insights = await aiService.generateRelationshipCoach(stakeholder, interactions);

    // Track analytics
    analyticsService.track('ai_coach_viewed', {
      stakeholder_id: stakeholderId,
      interaction_count: interactions.length
    });

    res.json({
      success: true,
      insights,
      stakeholder: {
        name: stakeholder.name,
        role: stakeholder.role
      }
    });
  } catch (error) {
    console.error('[AI] Error generating coach insights:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/ai/risk/:stakeholderId
 * Detect alignment risks for a stakeholder
 */
router.get('/risk/:stakeholderId', async (req, res) => {
  try {
    const stakeholderId = parseInt(req.params.stakeholderId);

    const stakeholder = Stakeholder.findById(stakeholderId);
    if (!stakeholder) {
      return res.status(404).json({ error: 'Stakeholder not found' });
    }

    const interactions = db.prepare(`
      SELECT * FROM interactions
      WHERE stakeholder_id = ?
      ORDER BY date DESC
    `).all(stakeholderId);

    // Calculate trends
    const trends = calculateTrends(interactions);

    // Detect risks
    const riskAnalysis = await aiService.detectRisks(stakeholder, interactions, trends);

    // Track analytics if risk detected
    if (riskAnalysis.risk_detected) {
      analyticsService.track('ai_risk_detected', {
        stakeholder_id: stakeholderId,
        risk_level: riskAnalysis.risk_level,
        confidence: riskAnalysis.confidence
      });
    }

    res.json({
      success: true,
      riskAnalysis,
      stakeholder: {
        name: stakeholder.name,
        role: stakeholder.role
      }
    });
  } catch (error) {
    console.error('[AI] Error detecting risks:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/ai/meeting-prep/:stakeholderId
 * Generate meeting preparation brief
 */
router.get('/meeting-prep/:stakeholderId', async (req, res) => {
  try {
    const stakeholderId = parseInt(req.params.stakeholderId);

    const stakeholder = Stakeholder.findById(stakeholderId);
    if (!stakeholder) {
      return res.status(404).json({ error: 'Stakeholder not found' });
    }

    const interactions = db.prepare(`
      SELECT * FROM interactions
      WHERE stakeholder_id = ?
      ORDER BY date DESC
      LIMIT 10
    `).all(stakeholderId);

    // Get project context
    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(stakeholder.project_id);

    // Generate prep brief
    const prepBrief = await aiService.generateMeetingPrep(stakeholder, interactions, project);

    // Track analytics
    analyticsService.track('ai_meeting_prep_viewed', {
      stakeholder_id: stakeholderId
    });

    res.json({
      success: true,
      prepBrief,
      stakeholder: {
        name: stakeholder.name,
        role: stakeholder.role
      }
    });
  } catch (error) {
    console.error('[AI] Error generating meeting prep:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/ai/extract-actions
 * Extract action items from meeting notes
 */
router.post('/extract-actions', async (req, res) => {
  try {
    const { meetingNotes, stakeholderName, stakeholderId } = req.body;

    if (!meetingNotes) {
      return res.status(400).json({ error: 'Meeting notes are required' });
    }

    // Generate actions
    const actions = await aiService.generateActions(meetingNotes, stakeholderName);

    // Track analytics
    analyticsService.track('ai_followup_generated', {
      stakeholder_id: stakeholderId,
      action_count: actions.action_items.length
    });

    res.json({
      success: true,
      actions,
      editable: true, // User can edit before saving
      message: "Review and edit the extracted actions before saving"
    });
  } catch (error) {
    console.error('[AI] Error extracting actions:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/ai/track
 * Track AI feature usage
 */
router.post('/track', (req, res) => {
  try {
    const { event, metadata } = req.body;

    const validEvents = [
      'ai_coach_viewed',
      'ai_risk_detected',
      'ai_meeting_prep_viewed',
      'ai_followup_generated',
      'ai_suggestion_used',
      'ai_suggestion_edited'
    ];

    if (!validEvents.includes(event)) {
      return res.status(400).json({ error: 'Invalid event type' });
    }

    analyticsService.track(event, metadata);

    res.json({ success: true });
  } catch (error) {
    console.error('[AI] Error tracking event:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Helper: Calculate interaction trends
 */
function calculateTrends(interactions) {
  if (interactions.length === 0) {
    return {
      daysSinceContact: 999,
      interactionFrequency: 0,
      engagementPattern: 'no_data'
    };
  }

  const now = new Date();
  const lastInteraction = new Date(interactions[0].date);
  const daysSinceContact = Math.floor((now - lastInteraction) / (1000 * 60 * 60 * 24));

  // Calculate frequency over last 90 days
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  const recentInteractions = interactions.filter(i => new Date(i.date) > ninetyDaysAgo);
  const interactionFrequency = recentInteractions.length / 90; // per day

  // Determine engagement pattern
  let engagementPattern = 'stable';
  if (recentInteractions.length >= 10) {
    engagementPattern = 'active';
  } else if (recentInteractions.length <= 2) {
    engagementPattern = 'declining';
  }

  return {
    daysSinceContact,
    interactionFrequency,
    engagementPattern,
    totalInteractions: interactions.length,
    recentInteractions: recentInteractions.length
  };
}

module.exports = router;
