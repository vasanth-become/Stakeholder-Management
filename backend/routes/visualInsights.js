/**
 * Visual Insights API Routes
 *
 * Endpoints for premium visual intelligence:
 * - Engagement Heatmap
 * - Risk Timeline
 * - Influence Network
 */

const express = require('express');
const router = express.Router();
const visualInsightsService = require('../services/visualInsightsService');
const analyticsService = require('../services/analyticsService');

/**
 * GET /api/visual-insights/heatmap
 * Get engagement heatmap data
 *
 * Query params:
 * - projectId (optional)
 * - weeks (optional, default 12)
 */
router.get('/heatmap', (req, res) => {
  try {
    const projectId = req.query.projectId ? parseInt(req.query.projectId) : null;
    const weeks = req.query.weeks ? parseInt(req.query.weeks) : 12;

    const heatmapData = visualInsightsService.generateEngagementHeatmap(projectId, weeks);

    // Track analytics
    analyticsService.track('visual_heatmap_viewed', {
      project_id: projectId,
      weeks,
      stakeholder_count: heatmapData.stakeholders?.length || 0
    });

    res.json(heatmapData);
  } catch (error) {
    console.error('[VisualInsights] Error generating heatmap:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/visual-insights/risk-timeline
 * Get risk history timeline data
 *
 * Query params:
 * - projectId (optional)
 * - stakeholderId (optional)
 * - days (optional, default 90)
 */
router.get('/risk-timeline', (req, res) => {
  try {
    const projectId = req.query.projectId ? parseInt(req.query.projectId) : null;
    const stakeholderId = req.query.stakeholderId ? parseInt(req.query.stakeholderId) : null;
    const days = req.query.days ? parseInt(req.query.days) : 90;

    const timelineData = visualInsightsService.generateRiskTimeline(projectId, stakeholderId, days);

    // Track analytics
    analyticsService.track('risk_timeline_viewed', {
      project_id: projectId,
      stakeholder_id: stakeholderId,
      days
    });

    res.json(timelineData);
  } catch (error) {
    console.error('[VisualInsights] Error generating timeline:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/visual-insights/influence-network
 * Get influence network graph data
 *
 * Query params:
 * - projectId (optional)
 */
router.get('/influence-network', (req, res) => {
  try {
    const projectId = req.query.projectId ? parseInt(req.query.projectId) : null;

    const networkData = visualInsightsService.generateInfluenceNetwork(projectId);

    // Track analytics
    analyticsService.track('influence_graph_viewed', {
      project_id: projectId,
      node_count: networkData.nodes?.length || 0
    });

    res.json(networkData);
  } catch (error) {
    console.error('[VisualInsights] Error generating network:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
