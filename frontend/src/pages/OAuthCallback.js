import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

/**
 * OAuthCallback Component
 * Handles OAuth callback redirects from providers
 */
function OAuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('processing');
  const [message, setMessage] = useState('Processing OAuth callback...');

  useEffect(() => {
    const success = searchParams.get('success');
    const error = searchParams.get('error');
    const provider = searchParams.get('provider');

    if (success === 'true' && provider) {
      setStatus('success');
      setMessage(`Successfully connected to ${provider.charAt(0).toUpperCase() + provider.slice(1)}!`);

      // Redirect to integrations page after 2 seconds
      setTimeout(() => {
        navigate('/integrations', { replace: true });
      }, 2000);
    } else if (error) {
      setStatus('error');
      setMessage(`OAuth error: ${decodeURIComponent(error)}`);

      // Redirect to integrations page after 4 seconds
      setTimeout(() => {
        navigate('/integrations', { replace: true });
      }, 4000);
    } else {
      setStatus('error');
      setMessage('Invalid OAuth callback');

      setTimeout(() => {
        navigate('/integrations', { replace: true });
      }, 3000);
    }
  }, [searchParams, navigate]);

  return (
    <div className="page">
      <div className="oauth-callback-container">
        <div className={`oauth-callback-card status-${status}`}>
          {status === 'processing' && (
            <>
              <div className="oauth-spinner"></div>
              <h2>Processing...</h2>
              <p className="text-muted">{message}</p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="oauth-success-icon">✓</div>
              <h2>Success!</h2>
              <p>{message}</p>
              <p className="text-muted">Redirecting to integrations...</p>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="oauth-error-icon">✕</div>
              <h2>Connection Failed</h2>
              <p>{message}</p>
              <p className="text-muted">Redirecting...</p>
              <button
                className="btn btn-primary"
                onClick={() => navigate('/integrations')}
                style={{ marginTop: '1rem' }}
              >
                Return to Integrations
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default OAuthCallback;
