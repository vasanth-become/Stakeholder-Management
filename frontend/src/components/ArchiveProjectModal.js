import React, { useState } from 'react';
import Modal from './Modal';
import { projectAPI } from '../services/api';

function ArchiveProjectModal({ isOpen, onClose, onSuccess, project }) {
  const [isArchiving, setIsArchiving] = useState(false);
  const [error, setError] = useState('');

  const handleArchive = async () => {
    setIsArchiving(true);
    setError('');

    try {
      // Update project status to 'archived' or 'completed'
      await projectAPI.update(project.id, {
        ...project,
        status: 'completed',
      });

      onSuccess();
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to archive project');
    } finally {
      setIsArchiving(false);
    }
  };

  if (!project) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Archive Project" size="medium">
      <div className="confirm-modal-content">
        {error && (
          <div className="form-error-banner" style={{ marginBottom: '1.5rem' }}>
            {error}
          </div>
        )}

        <p className="confirm-message">
          Are you sure you want to archive <strong>"{project.name}"</strong>?
        </p>

        <p className="text-muted" style={{ marginTop: '1rem', fontSize: '0.875rem' }}>
          This will mark the project as completed. You can still view it later, but it will be filtered out of active project lists.
        </p>

        <div className="form-actions" style={{ marginTop: '2rem' }}>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-secondary"
            disabled={isArchiving}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleArchive}
            className="btn btn-danger"
            disabled={isArchiving}
          >
            {isArchiving ? 'Archiving...' : 'Archive Project'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default ArchiveProjectModal;
