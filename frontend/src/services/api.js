// Use relative URL to leverage webpack dev server proxy
// The proxy in setupProxy.js forwards /api requests to localhost:3001
// If REACT_APP_API_URL is set, use that instead (for production)
const API_BASE_URL = process.env.REACT_APP_API_URL !== undefined && process.env.REACT_APP_API_URL !== ''
  ? process.env.REACT_APP_API_URL
  : '/api';

// Helper function for API calls
async function apiCall(endpoint, options = {}) {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'API request failed' }));
      throw new Error(error.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  } catch (error) {
    // Handle network errors
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error('Unable to connect to server. Please ensure the backend is running.');
    }
    // Re-throw other errors
    throw error;
  }
}

// Project API calls
export const projectAPI = {
  getAll: () => apiCall('/projects'),

  getById: (id) => apiCall(`/projects/${id}`),

  getWithStakeholders: (id) => apiCall(`/projects/${id}/with-stakeholders`),

  create: (data) => apiCall('/projects', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  update: (id, data) => apiCall(`/projects/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),

  delete: (id) => apiCall(`/projects/${id}`, {
    method: 'DELETE',
  }),
};

// Stakeholder API calls
export const stakeholderAPI = {
  getAll: () => apiCall('/stakeholders/all'),

  getByProject: (projectId) => apiCall(`/stakeholders/project/${projectId}`),

  getHighRisk: (projectId) => apiCall(`/stakeholders/project/${projectId}/high-risk`),

  getAllHighRisk: () => apiCall('/stakeholders/high-risk/all'),

  getById: (id) => apiCall(`/stakeholders/${id}`),

  getWithInteractions: (id) => apiCall(`/stakeholders/${id}/with-interactions`),

  getSuggestions: (id) => apiCall(`/stakeholders/${id}/suggestions`),

  create: (data) => apiCall('/stakeholders', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  update: (id, data) => apiCall(`/stakeholders/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),

  delete: (id) => apiCall(`/stakeholders/${id}`, {
    method: 'DELETE',
  }),

  calculateRisk: (data) => apiCall('/stakeholders/calculate-risk', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
};

// Interaction API calls
export const interactionAPI = {
  getByStakeholder: (stakeholderId) => apiCall(`/interactions/stakeholder/${stakeholderId}`),

  getRecent: (stakeholderId, days = 30) =>
    apiCall(`/interactions/stakeholder/${stakeholderId}/recent?days=${days}`),

  getFollowUp: () => apiCall('/interactions/follow-up'),

  getById: (id) => apiCall(`/interactions/${id}`),

  create: (data) => apiCall('/interactions', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  update: (id, data) => apiCall(`/interactions/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),

  delete: (id) => apiCall(`/interactions/${id}`, {
    method: 'DELETE',
  }),
};
