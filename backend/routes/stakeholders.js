const express = require('express');
const router = express.Router();
const Stakeholder = require('../models/stakeholder');

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

// GET single stakeholder by ID
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

// GET stakeholder with interactions
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

// GET calculate risk score (utility endpoint)
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

module.exports = router;
