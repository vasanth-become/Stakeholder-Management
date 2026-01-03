/**
 * Insights API Routes
 *
 * Endpoints for fetching auto-generated insights
 */

const express = require('express');
const router = express.Router();
const insightEngine = require('../services/insightEngine');
const insightScoring = require('../services/insightScoring');
const analyticsService = require('../services/analyticsService');

/**
 * GET /api/insights/global
 * Get insights across all projects
 */
router.get('/global', async (req, res) => {
  try {
    const rawInsights = await insightEngine.generateGlobalInsights();
    const scoredInsights = insightScoring.scoreAndRank(rawInsights, {
      maxInsights: parseInt(req.query.limit) || 8
    });

    // Track analytics
    const stats = insightScoring.getInsightStats(scoredInsights);
    analyticsService.track('insights_generated', {
      scope: 'global',
      count: scoredInsights.length,
      stats
    });

    res.json({
      insights: scoredInsights,
      stats,
      healthScore: insightScoring.calculateHealthScore(scoredInsights)
    });
  } catch (error) {
    console.error('[Insights] Error generating global insights:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/insights/project/:projectId
 * Get insights for a specific project
 */
router.get('/project/:projectId', async (req, res) => {
  try {
    const projectId = parseInt(req.params.projectId);
    const rawInsights = await insightEngine.generateProjectInsights(projectId);
    const scoredInsights = insightScoring.scoreAndRank(rawInsights, {
      maxInsights: parseInt(req.query.limit) || 8,
      projectId
    });

    // Track analytics
    const stats = insightScoring.getInsightStats(scoredInsights);
    analyticsService.track('insights_generated', {
      scope: 'project',
      project_id: projectId,
      count: scoredInsights.length,
      stats
    });

    res.json({
      insights: scoredInsights,
      stats,
      healthScore: insightScoring.calculateHealthScore(scoredInsights)
    });
  } catch (error) {
    console.error('[Insights] Error generating project insights:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/insights/stakeholder/:stakeholderId
 * Get insights for a specific stakeholder
 */
router.get('/stakeholder/:stakeholderId', async (req, res) => {
  try {
    const stakeholderId = parseInt(req.params.stakeholderId);
    const rawInsights = await insightEngine.generateStakeholderInsights(stakeholderId);
    const scoredInsights = insightScoring.scoreAndRank(rawInsights, {
      maxInsights: parseInt(req.query.limit) || 5
    });

    // Track analytics
    const stats = insightScoring.getInsightStats(scoredInsights);
    analyticsService.track('insights_generated', {
      scope: 'stakeholder',
      stakeholder_id: stakeholderId,
      count: scoredInsights.length,
      stats
    });

    res.json({
      insights: scoredInsights,
      stats
    });
  } catch (error) {
    console.error('[Insights] Error generating stakeholder insights:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/insights/track
 * Track insight interaction events
 */
router.post('/track', (req, res) => {
  try {
    const { event, insight, metadata } = req.body;

    // Validate event type
    const validEvents = ['insight_viewed', 'insight_action_clicked', 'insight_dismissed'];
    if (!validEvents.includes(event)) {
      return res.status(400).json({ error: 'Invalid event type' });
    }

    // Track the event
    analyticsService.track(event, {
      insight_type: insight?.type,
      insight_category: insight?.category,
      ...metadata
    });

    res.json({ success: true });
  } catch (error) {
    console.error('[Insights] Error tracking event:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
