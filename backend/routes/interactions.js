const express = require('express');
const router = express.Router();
const Interaction = require('../models/interaction');

// GET all interactions for a stakeholder
router.get('/stakeholder/:stakeholderId', (req, res) => {
  try {
    const interactions = Interaction.findByStakeholder(req.params.stakeholderId);
    res.json(interactions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET recent interactions (last 30 days)
router.get('/stakeholder/:stakeholderId/recent', (req, res) => {
  try {
    const days = req.query.days || 30;
    const interactions = Interaction.findRecent(req.params.stakeholderId, days);
    res.json(interactions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET interactions requiring follow-up
router.get('/follow-up', (req, res) => {
  try {
    const interactions = Interaction.findFollowUpNeeded();
    res.json(interactions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET interactions requiring follow-up for a specific stakeholder
router.get('/stakeholder/:stakeholderId/follow-up', (req, res) => {
  try {
    const interactions = Interaction.findFollowUpNeeded(req.params.stakeholderId);
    res.json(interactions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET single interaction by ID
router.get('/:id', (req, res) => {
  try {
    const interaction = Interaction.findById(req.params.id);
    if (!interaction) {
      return res.status(404).json({ error: 'Interaction not found' });
    }
    res.json(interaction);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST log new interaction
router.post('/', (req, res) => {
  try {
    const { stakeholder_id, interaction_type, date, summary, outcome, follow_up_needed } = req.body;

    if (!stakeholder_id) {
      return res.status(400).json({ error: 'Stakeholder ID is required' });
    }

    const interaction = Interaction.create(stakeholder_id, req.body);
    res.status(201).json(interaction);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT update interaction
router.put('/:id', (req, res) => {
  try {
    const interaction = Interaction.update(req.params.id, req.body);
    if (!interaction) {
      return res.status(404).json({ error: 'Interaction not found' });
    }

    res.json(interaction);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE interaction
router.delete('/:id', (req, res) => {
  try {
    const deleted = Interaction.delete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Interaction not found' });
    }
    res.json({ message: 'Interaction deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
