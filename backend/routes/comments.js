/**
 * Comments API Routes
 *
 * Endpoints for comment operations:
 * - CRUD for comments
 * - Reactions
 * - Threading
 */

const express = require('express');
const router = express.Router();
const commentService = require('../services/commentService');
const authMiddleware = require('../middleware/auth'); // Assuming auth middleware exists

// Apply auth middleware to all routes
// router.use(authMiddleware.requireAuth);

/**
 * GET /api/comments
 * Get comments for an entity
 *
 * Query params:
 * - entity_type (required): stakeholder, interaction, project, task
 * - entity_id (required): ID of the entity
 * - include_threads (optional): true/false, default true
 * - visibility (optional): internal, client_visible
 */
router.get('/', async (req, res) => {
  try {
    const { entity_type, entity_id, include_threads, visibility } = req.query;

    if (!entity_type || !entity_id) {
      return res.status(400).json({
        error: 'entity_type and entity_id are required'
      });
    }

    const options = {
      includeThreads: include_threads !== 'false', // Default true
      visibility: visibility || null
    };

    const comments = await commentService.getComments(
      entity_type,
      entity_id,
      options
    );

    res.json({
      success: true,
      comments,
      count: comments.length
    });

  } catch (error) {
    console.error('[Comments API] Error fetching comments:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/comments
 * Create a new comment
 *
 * Body:
 * - entity_type (required): stakeholder, interaction, project, task
 * - entity_id (required): ID of the entity
 * - content (required): Comment text
 * - visibility (optional): internal (default), client_visible
 * - parent_id (optional): UUID of parent comment for threading
 */
router.post('/', async (req, res) => {
  try {
    const { entity_type, entity_id, content, visibility, parent_id } = req.body;

    // Validation
    if (!entity_type || !entity_id || !content) {
      return res.status(400).json({
        error: 'entity_type, entity_id, and content are required'
      });
    }

    if (content.trim().length === 0) {
      return res.status(400).json({
        error: 'Comment content cannot be empty'
      });
    }

    // TODO: Get user ID from auth middleware
    // For now, using a mock user ID
    const authorId = req.user?.id || '00000000-0000-0000-0000-000000000001';

    const comment = await commentService.createComment({
      entityType: entity_type,
      entityId: entity_id,
      content: content.trim(),
      authorId,
      visibility: visibility || 'internal',
      parentId: parent_id || null
    });

    res.status(201).json({
      success: true,
      comment
    });

  } catch (error) {
    console.error('[Comments API] Error creating comment:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/comments/:id
 * Get a single comment by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const comment = await commentService.getCommentById(id);

    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    res.json({
      success: true,
      comment
    });

  } catch (error) {
    console.error('[Comments API] Error fetching comment:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/comments/:id
 * Update a comment
 *
 * Body:
 * - content (required): Updated comment text
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({
        error: 'Content is required'
      });
    }

    // TODO: Get user ID from auth middleware
    const userId = req.user?.id || '00000000-0000-0000-0000-000000000001';

    const comment = await commentService.updateComment(id, content.trim(), userId);

    res.json({
      success: true,
      comment
    });

  } catch (error) {
    console.error('[Comments API] Error updating comment:', error);

    if (error.message.includes('Unauthorized')) {
      return res.status(403).json({ error: error.message });
    }

    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/comments/:id
 * Delete a comment (soft delete)
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // TODO: Get user ID from auth middleware
    const userId = req.user?.id || '00000000-0000-0000-0000-000000000001';

    await commentService.deleteComment(id, userId);

    res.json({
      success: true,
      message: 'Comment deleted successfully'
    });

  } catch (error) {
    console.error('[Comments API] Error deleting comment:', error);

    if (error.message.includes('Unauthorized')) {
      return res.status(403).json({ error: error.message });
    }

    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/comments/:id/reactions
 * Add a reaction to a comment
 *
 * Body:
 * - reaction_type (required): thumbs_up, smile, warning, celebrate
 */
router.post('/:id/reactions', async (req, res) => {
  try {
    const { id } = req.params;
    const { reaction_type } = req.body;

    if (!reaction_type) {
      return res.status(400).json({
        error: 'reaction_type is required'
      });
    }

    // TODO: Get user ID from auth middleware
    const userId = req.user?.id || '00000000-0000-0000-0000-000000000001';

    const reaction = await commentService.addReaction(id, userId, reaction_type);

    res.json({
      success: true,
      reaction
    });

  } catch (error) {
    console.error('[Comments API] Error adding reaction:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/comments/:id/reactions/:type
 * Remove a reaction from a comment
 */
router.delete('/:id/reactions/:type', async (req, res) => {
  try {
    const { id, type } = req.params;

    // TODO: Get user ID from auth middleware
    const userId = req.user?.id || '00000000-0000-0000-0000-000000000001';

    await commentService.removeReaction(id, userId, type);

    res.json({
      success: true,
      message: 'Reaction removed successfully'
    });

  } catch (error) {
    console.error('[Comments API] Error removing reaction:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
