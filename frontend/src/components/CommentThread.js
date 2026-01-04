import React, { useState, useEffect } from 'react';
import { commentsAPI } from '../services/api';
import CommentCard, { CommentInput } from './CommentCard';
import './CommentThread.css';

const CommentThread = ({
  entityType,
  entityId,
  currentUserId = '00000000-0000-0000-0000-000000000001', // TODO: Get from auth context
  title = 'Comments'
}) => {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showInput, setShowInput] = useState(false);

  useEffect(() => {
    loadComments();
  }, [entityType, entityId]);

  const loadComments = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await commentsAPI.getComments(entityType, entityId, true);
      setComments(response.comments || []);

    } catch (err) {
      console.error('Error loading comments:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateComment = async (content, visibility, parentId = null) => {
    try {
      await commentsAPI.createComment({
        entity_type: entityType,
        entity_id: entityId,
        content,
        visibility,
        parent_id: parentId
      });

      // Reload comments
      await loadComments();
      setShowInput(false);

    } catch (err) {
      console.error('Error creating comment:', err);
      alert('Failed to create comment. Please try again.');
    }
  };

  const handleReply = async (content, visibility, parentId) => {
    await handleCreateComment(content, visibility, parentId);
  };

  if (loading) {
    return (
      <div className="comment-thread">
        <div className="comment-thread-header">
          <h3>{title}</h3>
        </div>
        <div className="comment-thread-loading">
          <div className="loading-spinner"></div>
          <p>Loading comments...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="comment-thread">
        <div className="comment-thread-header">
          <h3>{title}</h3>
        </div>
        <div className="comment-thread-error">
          <p>Unable to load comments</p>
          <button onClick={loadComments} className="retry-button">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="comment-thread">
      <div className="comment-thread-header">
        <div className="header-left">
          <h3>{title}</h3>
          <span className="comment-count">
            {comments.length} {comments.length === 1 ? 'comment' : 'comments'}
          </span>
        </div>
        <button
          className="add-comment-btn"
          onClick={() => setShowInput(!showInput)}
        >
          {showInput ? 'Cancel' : '+ Add Comment'}
        </button>
      </div>

      {showInput && (
        <div className="comment-thread-input">
          <CommentInput
            placeholder="Share your thoughts..."
            onSubmit={handleCreateComment}
            onCancel={() => setShowInput(false)}
          />
        </div>
      )}

      {comments.length === 0 ? (
        <div className="comment-thread-empty">
          <div className="empty-icon">💬</div>
          <p>No comments yet</p>
          <span className="empty-hint">
            Be the first to share your thoughts
          </span>
        </div>
      ) : (
        <div className="comment-thread-list">
          {comments.map(comment => (
            <CommentCard
              key={comment.id}
              comment={comment}
              onReply={handleReply}
              onUpdate={loadComments}
              onDelete={loadComments}
              currentUserId={currentUserId}
              depth={0}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default CommentThread;
