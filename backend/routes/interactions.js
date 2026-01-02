const express = require('express');
const router = express.Router();
const Interaction = require('../models/interaction');
const aiMeetingNotesService = require('../services/aiMeetingNotesService');
const multer = require('multer');

// Configure multer for file uploads (memory storage for text files)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow only text files
    if (file.mimetype === 'text/plain' || file.mimetype === 'text/markdown' || file.originalname.endsWith('.md') || file.originalname.endsWith('.txt')) {
      cb(null, true);
    } else {
      cb(new Error('Only text and markdown files are allowed'));
    }
  }
});

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

// POST process meeting notes with AI
router.post('/process-notes', async (req, res) => {
  try {
    const { notes, stakeholderId } = req.body;

    if (!notes || notes.trim().length === 0) {
      return res.status(400).json({ error: 'Meeting notes are required' });
    }

    // Process notes with AI service
    const result = await aiMeetingNotesService.processNotes(notes, stakeholderId);

    if (!result.success) {
      return res.status(422).json({ error: 'Failed to process meeting notes' });
    }

    // Validate the processed data
    const validation = aiMeetingNotesService.validateProcessedData(result.data);
    if (!validation.isValid) {
      return res.status(422).json({
        error: 'Processed data validation failed',
        details: validation.errors
      });
    }

    // Return structured data for user review
    res.json({
      success: true,
      data: {
        interactionType: result.data.interactionType,
        dateTime: result.data.dateTime,
        stakeholdersInvolved: result.data.stakeholdersInvolved,
        summary: result.data.summary,
        outcomeSentiment: result.data.outcomeSentiment,
        keyConcerns: result.data.keyConcerns,
        actionItems: result.data.actionItems,
        owner: result.data.owner,
        aiConfidence: result.data.aiConfidence,
        suggestedFollowUp: result.data.suggestedFollowUp
      },
      processedAt: result.processedAt
    });
  } catch (error) {
    console.error('[API] Process notes error:', error);
    res.status(500).json({ error: 'Failed to process meeting notes: ' + error.message });
  }
});

// POST upload and process meeting notes file
router.post('/process-notes-file', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Extract text from uploaded file
    const notes = req.file.buffer.toString('utf-8');
    const stakeholderId = req.body.stakeholderId || null;

    if (!notes || notes.trim().length === 0) {
      return res.status(400).json({ error: 'Uploaded file is empty' });
    }

    // Process notes with AI service
    const result = await aiMeetingNotesService.processNotes(notes, stakeholderId);

    if (!result.success) {
      return res.status(422).json({ error: 'Failed to process meeting notes' });
    }

    // Validate the processed data
    const validation = aiMeetingNotesService.validateProcessedData(result.data);
    if (!validation.isValid) {
      return res.status(422).json({
        error: 'Processed data validation failed',
        details: validation.errors
      });
    }

    // Return structured data for user review
    res.json({
      success: true,
      data: {
        interactionType: result.data.interactionType,
        dateTime: result.data.dateTime,
        stakeholdersInvolved: result.data.stakeholdersInvolved,
        summary: result.data.summary,
        outcomeSentiment: result.data.outcomeSentiment,
        keyConcerns: result.data.keyConcerns,
        actionItems: result.data.actionItems,
        owner: result.data.owner,
        aiConfidence: result.data.aiConfidence,
        suggestedFollowUp: result.data.suggestedFollowUp
      },
      processedAt: result.processedAt,
      fileName: req.file.originalname
    });
  } catch (error) {
    console.error('[API] Process notes file error:', error);
    res.status(500).json({ error: 'Failed to process uploaded file: ' + error.message });
  }
});

module.exports = router;
