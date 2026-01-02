import React, { useState } from 'react';
import './ImportMeetingNotesModal.css';

function ImportMeetingNotesModal({ isOpen, onClose, onProcess, stakeholderId }) {
  const [activeTab, setActiveTab] = useState('paste'); // 'paste' or 'upload'
  const [notes, setNotes] = useState('');
  const [file, setFile] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);

  const handlePaste = (e) => {
    setNotes(e.target.value);
    setError(null);
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      // Validate file type
      if (selectedFile.type !== 'text/plain' && !selectedFile.name.endsWith('.md')) {
        setError('Please upload a .txt or .md file');
        return;
      }

      // Validate file size (5MB max)
      if (selectedFile.size > 5 * 1024 * 1024) {
        setError('File size must be less than 5MB');
        return;
      }

      setFile(selectedFile);
      setError(null);
    }
  };

  const handleProcess = async () => {
    setError(null);
    setProcessing(true);

    try {
      let result;

      if (activeTab === 'paste') {
        if (!notes.trim()) {
          setError('Please paste meeting notes');
          setProcessing(false);
          return;
        }

        // Call API to process pasted notes
        const response = await fetch('/api/interactions/process-notes', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            notes,
            stakeholderId,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to process notes');
        }

        result = await response.json();
      } else {
        // Upload file
        if (!file) {
          setError('Please select a file');
          setProcessing(false);
          return;
        }

        const formData = new FormData();
        formData.append('file', file);
        formData.append('stakeholderId', stakeholderId);

        const response = await fetch('/api/interactions/process-notes-file', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to process file');
        }

        result = await response.json();
      }

      // Pass processed data to parent
      onProcess(result.data);

      // Reset form
      setNotes('');
      setFile(null);
    } catch (err) {
      console.error('Process error:', err);
      setError(err.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleClose = () => {
    if (!processing) {
      setNotes('');
      setFile(null);
      setError(null);
      setActiveTab('paste');
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content modal-large import-notes-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2>✨ Import from Meeting Notes</h2>
            <p className="modal-subtitle">
              AI will summarize these notes into a structured interaction log
            </p>
          </div>
          <button
            className="modal-close"
            onClick={handleClose}
            aria-label="Close modal"
            disabled={processing}
          >
            ×
          </button>
        </div>

        <div className="modal-body">
          {/* Tab Switcher */}
          <div className="import-tabs">
            <button
              className={`import-tab ${activeTab === 'paste' ? 'active' : ''}`}
              onClick={() => setActiveTab('paste')}
              disabled={processing}
            >
              <span className="tab-icon">📝</span>
              Paste Notes
            </button>
            <button
              className={`import-tab ${activeTab === 'upload' ? 'active' : ''}`}
              onClick={() => setActiveTab('upload')}
              disabled={processing}
            >
              <span className="tab-icon">📄</span>
              Upload File
            </button>
          </div>

          {/* Content Area */}
          <div className="import-content">
            {activeTab === 'paste' ? (
              <div className="paste-section">
                <textarea
                  className="notes-textarea"
                  value={notes}
                  onChange={handlePaste}
                  placeholder="Paste your meeting notes here...

Example:
Meeting with John Smith - Jan 15, 2024

Discussed the Q1 roadmap and timeline. John expressed concerns about the tight deadline for the API release. He's supportive overall but worried about resource allocation.

Action items:
- Review resource plan by Friday
- Schedule follow-up next week
- Share updated timeline with stakeholders"
                  rows="12"
                  disabled={processing}
                />
                <div className="notes-hint">
                  <span className="hint-icon">💡</span>
                  <span>
                    Include details like attendees, dates, discussion points, concerns, and action items
                  </span>
                </div>
              </div>
            ) : (
              <div className="upload-section">
                <div
                  className={`file-drop-zone ${file ? 'has-file' : ''}`}
                  onClick={() => !processing && document.getElementById('file-input').click()}
                >
                  {file ? (
                    <div className="file-selected">
                      <span className="file-icon">📄</span>
                      <span className="file-name">{file.name}</span>
                      <span className="file-size">
                        {(file.size / 1024).toFixed(1)} KB
                      </span>
                      {!processing && (
                        <button
                          className="file-remove"
                          onClick={(e) => {
                            e.stopPropagation();
                            setFile(null);
                          }}
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="file-placeholder">
                      <span className="upload-icon">📤</span>
                      <p>Click to select a file or drag and drop</p>
                      <p className="upload-hint">
                        Supports .txt and .md files (max 5MB)
                      </p>
                    </div>
                  )}
                </div>
                <input
                  id="file-input"
                  type="file"
                  accept=".txt,.md,text/plain,text/markdown"
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                  disabled={processing}
                />
              </div>
            )}
          </div>

          {/* Error Display */}
          {error && (
            <div className="import-error">
              <span className="error-icon">⚠️</span>
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="modal-footer">
          <button
            type="button"
            onClick={handleClose}
            className="btn btn-secondary"
            disabled={processing}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleProcess}
            className="btn btn-primary btn-ai"
            disabled={processing || (activeTab === 'paste' && !notes.trim()) || (activeTab === 'upload' && !file)}
          >
            {processing ? (
              <>
                <span className="spinner"></span>
                Processing with AI...
              </>
            ) : (
              <>
                <span className="ai-icon">✨</span>
                Process with AI
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ImportMeetingNotesModal;
