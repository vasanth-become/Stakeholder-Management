import React, { useState } from 'react';
import { commentsAPI } from '../services/api';
import './CommentCard.css';

const CommentCard = ({ comment, onReply, onUpdate, onDelete, currentUserId, depth = 0 }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const isAuthor = currentUserId === comment.author_id;
  const hasReplies = comment.replies && comment.replies.length > 0;

  // Format timestamp
  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Handle edit save
  const handleSaveEdit = async () => {
    try {
      await commentsAPI.updateComment(comment.id, editContent);
      setIsEditing(false);
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Error updating comment:', error);
      alert('Failed to update comment');
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this comment?')) return;

    try {
      setIsDeleting(true);
      await commentsAPI.deleteComment(comment.id);
      if (onDelete) onDelete();
    } catch (error) {
      console.error('Error deleting comment:', error);
      alert('Failed to delete comment');
      setIsDeleting(false);
    }
  };

  // Handle reaction toggle
  const handleReaction = async (reactionType) => {
    try {
      const userReacted = comment.reactions?.some(
        r => r.user_id === currentUserId && r.reaction_type === reactionType
      );

      if (userReacted) {
        await commentsAPI.removeReaction(comment.id, reactionType);
      } else {
        await commentsAPI.addReaction(comment.id, reactionType);
      }

      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Error toggling reaction:', error);
    }
  };

  // Get reaction counts
  const getReactionCount = (reactionType) => {
    return comment.reactions?.filter(r => r.reaction_type === reactionType).length || 0;
  };

  const isReacted = (reactionType) => {
    return comment.reactions?.some(
      r => r.user_id === currentUserId && r.reaction_type === reactionType
    );
  };

  const reactionIcons = {
    thumbs_up: '👍',
    smile: '🙂',
    warning: '⚠️',
    celebrate: '🎉'
  };

  if (isDeleting) {
    return null;
  }

  return (
    <div className={`comment-card depth-${Math.min(depth, 3)}`}>
      <div className="comment-content-wrapper">
        {/* Author Avatar */}
        <div className="comment-avatar">
          {comment.author?.avatar_url ? (
            <img src={comment.author.avatar_url} alt={comment.author.first_name} />
          ) : (
            <div className="avatar-placeholder">
              {comment.author?.first_name?.[0]}{comment.author?.last_name?.[0]}
            </div>
          )}
        </div>

        <div className="comment-main">
          {/* Header */}
          <div className="comment-header">
            <div className="comment-author-info">
              <span className="comment-author-name">
                {comment.author?.first_name} {comment.author?.last_name}
              </span>
              <span className="comment-timestamp">
                {formatTimestamp(comment.created_at)}
              </span>
              {comment.is_edited && (
                <span className="comment-edited-badge">edited</span>
              )}
              {comment.visibility === 'client_visible' && (
                <span className="comment-visibility-badge">Client Visible</span>
              )}
            </div>

            {/* Actions menu */}
            {isAuthor && !isEditing && (
              <div className="comment-actions">
                <button
                  className="comment-action-btn"
                  onClick={() => setIsEditing(true)}
                  title="Edit comment"
                >
                  Edit
                </button>
                <button
                  className="comment-action-btn danger"
                  onClick={handleDelete}
                  title="Delete comment"
                >
                  Delete
                </button>
              </div>
            )}
          </div>

          {/* Content */}
          {isEditing ? (
            <div className="comment-edit-form">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="comment-edit-textarea"
                rows={3}
                autoFocus
              />
              <div className="comment-edit-actions">
                <button
                  className="btn-save"
                  onClick={handleSaveEdit}
                  disabled={!editContent.trim()}
                >
                  Save
                </button>
                <button
                  className="btn-cancel"
                  onClick={() => {
                    setIsEditing(false);
                    setEditContent(comment.content);
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="comment-text">{comment.content}</div>
          )}

          {/* Reactions and Reply */}
          {!isEditing && (
            <div className="comment-footer">
              <div className="comment-reactions">
                {Object.entries(reactionIcons).map(([type, icon]) => {
                  const count = getReactionCount(type);
                  const reacted = isReacted(type);

                  return (
                    <button
                      key={type}
                      className={`reaction-btn ${reacted ? 'reacted' : ''}`}
                      onClick={() => handleReaction(type)}
                      title={type.replace('_', ' ')}
                    >
                      <span className="reaction-icon">{icon}</span>
                      {count > 0 && <span className="reaction-count">{count}</span>}
                    </button>
                  );
                })}
              </div>

              <button
                className="reply-btn"
                onClick={() => setShowReplyInput(!showReplyInput)}
              >
                Reply
              </button>
            </div>
          )}

          {/* Reply Input */}
          {showReplyInput && onReply && (
            <div className="comment-reply-section">
              <CommentInput
                placeholder="Write a reply..."
                onSubmit={(content, visibility) => {
                  onReply(content, visibility, comment.id);
                  setShowReplyInput(false);
                }}
                onCancel={() => setShowReplyInput(false)}
                compact
              />
            </div>
          )}
        </div>
      </div>

      {/* Nested Replies */}
      {hasReplies && (
        <div className="comment-replies">
          {comment.replies.map(reply => (
            <CommentCard
              key={reply.id}
              comment={reply}
              onReply={onReply}
              onUpdate={onUpdate}
              onDelete={onDelete}
              currentUserId={currentUserId}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// Separate CommentInput component for modularity
const CommentInput = ({ placeholder, onSubmit, onCancel, compact = false }) => {
  const [content, setContent] = useState('');
  const [visibility, setVisibility] = useState('internal');

  const handleSubmit = () => {
    if (!content.trim()) return;
    onSubmit(content, visibility);
    setContent('');
    setVisibility('internal');
  };

  return (
    <div className={`comment-input ${compact ? 'compact' : ''}`}>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={placeholder || 'Add a comment...'}
        className="comment-textarea"
        rows={compact ? 2 : 3}
      />
      <div className="comment-input-footer">
        <div className="visibility-toggle">
          <label className="visibility-option">
            <input
              type="radio"
              value="internal"
              checked={visibility === 'internal'}
              onChange={(e) => setVisibility(e.target.value)}
            />
            <span>Internal</span>
          </label>
          <label className="visibility-option">
            <input
              type="radio"
              value="client_visible"
              checked={visibility === 'client_visible'}
              onChange={(e) => setVisibility(e.target.value)}
            />
            <span>Client Visible</span>
          </label>
        </div>
        <div className="comment-input-actions">
          {onCancel && (
            <button className="btn-cancel" onClick={onCancel}>
              Cancel
            </button>
          )}
          <button
            className="btn-submit"
            onClick={handleSubmit}
            disabled={!content.trim()}
          >
            Comment
          </button>
        </div>
      </div>
    </div>
  );
};

export default CommentCard;
export { CommentInput };
