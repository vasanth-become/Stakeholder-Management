/**
 * Comment Service
 *
 * Handles all comment-related operations:
 * - CRUD for comments
 * - Threading support
 * - @mention extraction and notifications
 * - Reactions
 * - Visibility control
 */

const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

class CommentService {
  /**
   * Create a new comment
   */
  async createComment({
    entityType,
    entityId,
    content,
    authorId,
    visibility = 'internal',
    parentId = null
  }) {
    const client = await pool.connect();

    try {
      // Extract @mentions from content
      const mentionedUsers = this.extractMentions(content);

      // Insert comment
      const query = `
        INSERT INTO comments (
          entity_type,
          entity_id,
          content,
          author_id,
          visibility,
          parent_id,
          mentioned_users
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `;

      const result = await client.query(query, [
        entityType,
        entityId.toString(),
        content,
        authorId,
        visibility,
        parentId,
        mentionedUsers
      ]);

      const comment = result.rows[0];

      // Get author details
      const authorQuery = 'SELECT id, email, first_name, last_name, display_name, avatar_url FROM users WHERE id = $1';
      const authorResult = await client.query(authorQuery, [authorId]);
      comment.author = authorResult.rows[0];

      // Create notifications for mentioned users
      if (mentionedUsers && mentionedUsers.length > 0) {
        await this.notifyMentionedUsers(comment, mentionedUsers, client);
      }

      // If this is a reply, notify the parent comment author
      if (parentId) {
        await this.notifyParentCommentAuthor(comment, parentId, client);
      }

      // Log activity
      await this.logActivity(client, authorId, 'comment_created', comment);

      return comment;

    } finally {
      client.release();
    }
  }

  /**
   * Get comments for an entity
   */
  async getComments(entityType, entityId, options = {}) {
    const { includeThreads = true, visibility = null } = options;

    let query = `
      SELECT
        c.*,
        json_build_object(
          'id', u.id,
          'email', u.email,
          'first_name', u.first_name,
          'last_name', u.last_name,
          'display_name', u.display_name,
          'avatar_url', u.avatar_url
        ) as author,
        (
          SELECT json_agg(
            json_build_object(
              'id', r.id,
              'user_id', r.user_id,
              'reaction_type', r.reaction_type,
              'created_at', r.created_at
            )
          )
          FROM comment_reactions r
          WHERE r.comment_id = c.id
        ) as reactions
      FROM comments c
      JOIN users u ON c.author_id = u.id
      WHERE c.entity_type = $1
        AND c.entity_id = $2
        AND c.is_deleted = FALSE
    `;

    const params = [entityType, entityId.toString()];

    // Filter by visibility if specified
    if (visibility) {
      query += ` AND c.visibility = $${params.length + 1}`;
      params.push(visibility);
    }

    // Only root comments if not including threads
    if (!includeThreads) {
      query += ` AND c.parent_id IS NULL`;
    }

    query += ` ORDER BY c.created_at ASC`;

    const result = await pool.query(query, params);

    if (includeThreads) {
      // Organize into threaded structure
      return this.buildThreadStructure(result.rows);
    }

    return result.rows;
  }

  /**
   * Get a single comment by ID
   */
  async getCommentById(commentId) {
    const query = `
      SELECT
        c.*,
        json_build_object(
          'id', u.id,
          'email', u.email,
          'first_name', u.first_name,
          'last_name', u.last_name,
          'display_name', u.display_name,
          'avatar_url', u.avatar_url
        ) as author,
        (
          SELECT json_agg(
            json_build_object(
              'id', r.id,
              'user_id', r.user_id,
              'reaction_type', r.reaction_type,
              'created_at', r.created_at
            )
          )
          FROM comment_reactions r
          WHERE r.comment_id = c.id
        ) as reactions
      FROM comments c
      JOIN users u ON c.author_id = u.id
      WHERE c.id = $1 AND c.is_deleted = FALSE
    `;

    const result = await pool.query(query, [commentId]);
    return result.rows[0] || null;
  }

  /**
   * Update a comment
   */
  async updateComment(commentId, content, userId) {
    const client = await pool.connect();

    try {
      // Check ownership
      const ownerCheck = await client.query(
        'SELECT author_id FROM comments WHERE id = $1',
        [commentId]
      );

      if (!ownerCheck.rows[0] || ownerCheck.rows[0].author_id !== userId) {
        throw new Error('Unauthorized: You can only edit your own comments');
      }

      // Extract new mentions
      const mentionedUsers = this.extractMentions(content);

      // Update comment
      const query = `
        UPDATE comments
        SET content = $1,
            mentioned_users = $2,
            is_edited = TRUE,
            edited_at = NOW(),
            updated_at = NOW()
        WHERE id = $3
        RETURNING *
      `;

      const result = await client.query(query, [content, mentionedUsers, commentId]);
      const comment = result.rows[0];

      // Log activity
      await this.logActivity(client, userId, 'comment_edited', comment);

      return comment;

    } finally {
      client.release();
    }
  }

  /**
   * Delete a comment (soft delete)
   */
  async deleteComment(commentId, userId) {
    const client = await pool.connect();

    try {
      // Check ownership or admin permission
      const ownerCheck = await client.query(
        'SELECT author_id FROM comments WHERE id = $1',
        [commentId]
      );

      if (!ownerCheck.rows[0] || ownerCheck.rows[0].author_id !== userId) {
        // TODO: Check if user is admin
        throw new Error('Unauthorized: You can only delete your own comments');
      }

      // Soft delete
      const query = `
        UPDATE comments
        SET is_deleted = TRUE,
            deleted_at = NOW(),
            deleted_by = $1
        WHERE id = $2
        RETURNING *
      `;

      const result = await client.query(query, [userId, commentId]);

      // Log activity
      await this.logActivity(client, userId, 'comment_deleted', result.rows[0]);

      return { success: true };

    } finally {
      client.release();
    }
  }

  /**
   * Add reaction to comment
   */
  async addReaction(commentId, userId, reactionType) {
    const validReactions = ['thumbs_up', 'smile', 'warning', 'celebrate'];

    if (!validReactions.includes(reactionType)) {
      throw new Error('Invalid reaction type');
    }

    const query = `
      INSERT INTO comment_reactions (comment_id, user_id, reaction_type)
      VALUES ($1, $2, $3)
      ON CONFLICT (comment_id, user_id, reaction_type) DO NOTHING
      RETURNING *
    `;

    const result = await pool.query(query, [commentId, userId, reactionType]);

    // Log activity if reaction was added (not duplicate)
    if (result.rows.length > 0) {
      await this.logActivity(null, userId, 'reaction_added', {
        comment_id: commentId,
        reaction_type: reactionType
      });
    }

    return result.rows[0] || { message: 'Reaction already exists' };
  }

  /**
   * Remove reaction from comment
   */
  async removeReaction(commentId, userId, reactionType) {
    const query = `
      DELETE FROM comment_reactions
      WHERE comment_id = $1 AND user_id = $2 AND reaction_type = $3
      RETURNING *
    `;

    const result = await pool.query(query, [commentId, userId, reactionType]);

    if (result.rows.length > 0) {
      await this.logActivity(null, userId, 'reaction_removed', {
        comment_id: commentId,
        reaction_type: reactionType
      });
    }

    return { success: true };
  }

  /**
   * Extract @mentions from comment content
   * Returns array of user IDs
   */
  extractMentions(content) {
    // Match @username or @email patterns
    const mentionPattern = /@(\w+(?:\.\w+)*@[\w.-]+\.\w+|\w+)/g;
    const matches = content.match(mentionPattern);

    if (!matches) return [];

    // TODO: Look up users by username or email and return UUIDs
    // For now, return empty array - will implement user lookup
    return [];
  }

  /**
   * Notify users who were mentioned
   */
  async notifyMentionedUsers(comment, mentionedUsers, client) {
    if (!mentionedUsers || mentionedUsers.length === 0) return;

    const notificationService = require('./notificationService');

    for (const userId of mentionedUsers) {
      // Don't notify the comment author
      if (userId === comment.author_id) continue;

      await notificationService.createNotification({
        userId,
        type: 'mention',
        title: 'You were mentioned',
        message: `${comment.author.first_name} ${comment.author.last_name} mentioned you in a comment`,
        relatedEntityType: comment.entity_type,
        relatedEntityId: comment.entity_id,
        actionUrl: this.getCommentUrl(comment),
        metadata: {
          comment_id: comment.id,
          author_id: comment.author_id
        }
      }, client);
    }
  }

  /**
   * Notify parent comment author of reply
   */
  async notifyParentCommentAuthor(comment, parentId, client) {
    // Get parent comment
    const parentResult = await client.query(
      'SELECT author_id FROM comments WHERE id = $1',
      [parentId]
    );

    if (!parentResult.rows[0]) return;

    const parentAuthorId = parentResult.rows[0].author_id;

    // Don't notify if replying to own comment
    if (parentAuthorId === comment.author_id) return;

    const notificationService = require('./notificationService');

    await notificationService.createNotification({
      userId: parentAuthorId,
      type: 'comment_reply',
      title: 'New reply to your comment',
      message: `${comment.author.first_name} ${comment.author.last_name} replied to your comment`,
      relatedEntityType: comment.entity_type,
      relatedEntityId: comment.entity_id,
      actionUrl: this.getCommentUrl(comment),
      metadata: {
        comment_id: comment.id,
        parent_id: parentId,
        author_id: comment.author_id
      }
    }, client);
  }

  /**
   * Build threaded structure from flat comment list
   */
  buildThreadStructure(comments) {
    const commentMap = new Map();
    const rootComments = [];

    // First pass: create map and add replies array
    comments.forEach(comment => {
      comment.replies = [];
      commentMap.set(comment.id, comment);
    });

    // Second pass: build tree
    comments.forEach(comment => {
      if (comment.parent_id) {
        const parent = commentMap.get(comment.parent_id);
        if (parent) {
          parent.replies.push(comment);
        }
      } else {
        rootComments.push(comment);
      }
    });

    return rootComments;
  }

  /**
   * Get URL for comment based on entity type
   */
  getCommentUrl(comment) {
    const baseUrl = '/';

    switch (comment.entity_type) {
      case 'stakeholder':
        return `${baseUrl}stakeholder/${comment.entity_id}#comment-${comment.id}`;
      case 'interaction':
        return `${baseUrl}interaction/${comment.entity_id}#comment-${comment.id}`;
      case 'project':
        return `${baseUrl}project/${comment.entity_id}#comment-${comment.id}`;
      case 'task':
        return `${baseUrl}tasks/${comment.entity_id}#comment-${comment.id}`;
      default:
        return baseUrl;
    }
  }

  /**
   * Log activity to activity_log table
   */
  async logActivity(client, userId, actionType, data) {
    const useClient = client || await pool.connect();
    const shouldRelease = !client;

    try {
      // Get user details
      const userResult = await useClient.query(
        'SELECT email, first_name, last_name FROM users WHERE id = $1',
        [userId]
      );

      if (!userResult.rows[0]) return;

      const user = userResult.rows[0];

      let description, entityType, entityId;

      if (actionType === 'comment_created') {
        description = `${user.first_name} ${user.last_name} added a comment on ${data.entity_type}`;
        entityType = 'comment';
        entityId = data.id;
      } else if (actionType === 'comment_edited') {
        description = `${user.first_name} ${user.last_name} edited a comment`;
        entityType = 'comment';
        entityId = data.id;
      } else if (actionType === 'comment_deleted') {
        description = `${user.first_name} ${user.last_name} deleted a comment`;
        entityType = 'comment';
        entityId = data.id;
      } else if (actionType === 'reaction_added') {
        description = `${user.first_name} ${user.last_name} reacted to a comment`;
        entityType = 'comment';
        entityId = data.comment_id;
      }

      await useClient.query(`
        INSERT INTO activity_log (user_id, user_email, user_name, action_type, entity_type, entity_id, description, metadata)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        userId,
        user.email,
        `${user.first_name} ${user.last_name}`,
        actionType,
        entityType,
        entityId,
        description,
        JSON.stringify(data)
      ]);

    } finally {
      if (shouldRelease) {
        useClient.release();
      }
    }
  }
}

module.exports = new CommentService();
