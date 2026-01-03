const express = require('express');
const router = express.Router();
const Stakeholder = require('../models/stakeholder');
const SuggestionEngine = require('../models/suggestionEngine');
const enrichmentService = require('../services/profileEnrichmentService');
const analyticsService = require('../services/analyticsService');

// GET all stakeholders across all projects
router.get('/all', (req, res) => {
  try {
    const stakeholders = Stakeholder.findAll();
    res.json(stakeholders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET all stakeholders for a project
router.get('/project/:projectId', (req, res) => {
  try {
    const stakeholders = Stakeholder.findByProject(req.params.projectId);
    res.json(stakeholders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET high-risk stakeholders for a project
router.get('/project/:projectId/high-risk', (req, res) => {
  try {
    const stakeholders = Stakeholder.findHighRisk(req.params.projectId);
    res.json(stakeholders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET all high-risk stakeholders (AT RISK - score >= 12)
router.get('/high-risk/all', (req, res) => {
  try {
    const stakeholders = Stakeholder.findAllHighRisk();
    res.json(stakeholders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST create new stakeholder
router.post('/', (req, res) => {
  try {
    const { project_id, name, role, power, influence, engagement_status, owner, preferred_channel, notes } = req.body;

    // Validation
    if (!project_id || !name) {
      return res.status(400).json({ error: 'Project ID and name are required' });
    }

    if (power < 1 || power > 5 || influence < 1 || influence > 5) {
      return res.status(400).json({ error: 'Power and influence must be between 1 and 5' });
    }

    if (!['supportive', 'neutral', 'resistant'].includes(engagement_status)) {
      return res.status(400).json({ error: 'Engagement status must be supportive, neutral, or resistant' });
    }

    const stakeholder = Stakeholder.create(project_id, req.body);
    res.status(201).json(stakeholder);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT update stakeholder
router.put('/:id', (req, res) => {
  try {
    const { name, role, power, influence, engagement_status, owner, preferred_channel, notes } = req.body;

    // Validation
    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    if (power < 1 || power > 5 || influence < 1 || influence > 5) {
      return res.status(400).json({ error: 'Power and influence must be between 1 and 5' });
    }

    if (!['supportive', 'neutral', 'resistant'].includes(engagement_status)) {
      return res.status(400).json({ error: 'Engagement status must be supportive, neutral, or resistant' });
    }

    const stakeholder = Stakeholder.update(req.params.id, req.body);
    if (!stakeholder) {
      return res.status(404).json({ error: 'Stakeholder not found' });
    }

    res.json(stakeholder);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE stakeholder
router.delete('/:id', (req, res) => {
  try {
    const deleted = Stakeholder.delete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Stakeholder not found' });
    }
    res.json({ message: 'Stakeholder deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST calculate risk score (utility endpoint)
router.post('/calculate-risk', (req, res) => {
  try {
    const { power, influence, engagement_status } = req.body;

    if (power < 1 || power > 5 || influence < 1 || influence > 5) {
      return res.status(400).json({ error: 'Power and influence must be between 1 and 5' });
    }

    if (!['supportive', 'neutral', 'resistant'].includes(engagement_status)) {
      return res.status(400).json({ error: 'Engagement status must be supportive, neutral, or resistant' });
    }

    const riskScore = Stakeholder.calculateRiskScore(power, influence, engagement_status);
    res.json({ risk_score: parseFloat(riskScore) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET stakeholder with interactions
// IMPORTANT: This must come before /:id to match first
router.get('/:id/with-interactions', (req, res) => {
  try {
    const stakeholder = Stakeholder.findByIdWithInteractions(req.params.id);
    if (!stakeholder) {
      return res.status(404).json({ error: 'Stakeholder not found' });
    }
    res.json(stakeholder);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET AI suggestions for stakeholder
// IMPORTANT: This must come before /:id to match first
router.get('/:id/suggestions', (req, res) => {
  try {
    const stakeholder = Stakeholder.findByIdWithInteractions(req.params.id);
    if (!stakeholder) {
      return res.status(404).json({ error: 'Stakeholder not found' });
    }

    const suggestions = SuggestionEngine.generateSuggestions(
      stakeholder,
      stakeholder.interactions || []
    );

    res.json(suggestions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST enrich stakeholder profile
// IMPORTANT: This must come before /:id to match first
router.post('/enrich', async (req, res) => {
  try {
    const { email, linkedinUrl, name, company } = req.body;

    console.log('[Enrichment] Request received:', { email, linkedinUrl, name, company });

    // Enrich profile using the enrichment service
    const result = await enrichmentService.enrichProfile({
      email,
      linkedinUrl,
      name,
      company
    });

    // Track analytics event
    if (result.success) {
      analyticsService.trackEnrichmentSuggested({
        suggestions: result.suggestions,
        has_email: !!email,
        has_linkedin: !!linkedinUrl,
        has_name_company: !!(name && company),
        sources: result.metadata?.sources
      });
    } else {
      analyticsService.trackEnrichmentError({
        message: result.message,
        has_email: !!email,
        has_linkedin: !!linkedinUrl,
        has_name_company: !!(name && company)
      });
    }

    res.json(result);
  } catch (error) {
    console.error('[Enrichment] Error:', error);

    // Track error event
    analyticsService.trackEnrichmentError({
      error: error.message,
      has_email: !!req.body.email,
      has_linkedin: !!req.body.linkedinUrl,
      has_name_company: !!(req.body.name && req.body.company)
    });

    res.status(500).json({
      success: false,
      message: 'Enrichment service error',
      suggestions: null
    });
  }
});

// POST save enrichment metadata
// IMPORTANT: This must come before /:id to match first
router.post('/:id/enrichment', async (req, res) => {
  try {
    const { suggestions, acceptedFields, userId } = req.body;

    // Verify stakeholder exists
    const stakeholder = Stakeholder.findById(req.params.id);
    if (!stakeholder) {
      return res.status(404).json({ error: 'Stakeholder not found' });
    }

    // Track analytics - check if accepting or rejecting
    const allFields = Object.keys(suggestions || {});
    const isAccepting = acceptedFields && acceptedFields.length > 0;

    if (isAccepting) {
      analyticsService.trackEnrichmentAccepted({
        stakeholder_id: req.params.id,
        acceptedFields,
        total_suggestions: allFields.length,
        acceptance_rate: (acceptedFields.length / allFields.length) * 100,
        userId: userId || 'system'
      });
    } else {
      analyticsService.trackEnrichmentRejected({
        stakeholder_id: req.params.id,
        total_suggestions: allFields.length,
        userId: userId || 'system'
      });
    }

    // Save enrichment metadata
    await enrichmentService.saveEnrichmentMetadata(
      req.params.id,
      suggestions,
      acceptedFields,
      userId || 'system'
    );

    res.json({
      success: true,
      message: 'Enrichment metadata saved successfully'
    });
  } catch (error) {
    console.error('[Enrichment] Error saving metadata:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET single stakeholder by ID
// IMPORTANT: Keep this at the bottom - it's a catch-all route
router.get('/:id', (req, res) => {
  try {
    const stakeholder = Stakeholder.findById(req.params.id);
    if (!stakeholder) {
      return res.status(404).json({ error: 'Stakeholder not found' });
    }
    res.json(stakeholder);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
