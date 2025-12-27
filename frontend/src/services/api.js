const API_BASE_URL = 'http://localhost:3001/api';

// Helper function for API calls
async function apiCall(endpoint, options = {}) {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'API request failed');
  }

  return response.json();
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
  getByProject: (projectId) => apiCall(`/stakeholders/project/${projectId}`),

  getHighRisk: (projectId) => apiCall(`/stakeholders/project/${projectId}/high-risk`),

  getAllHighRisk: () => apiCall('/stakeholders/high-risk/all'),

  getById: (id) => apiCall(`/stakeholders/${id}`),

  getWithInteractions: (id) => apiCall(`/stakeholders/${id}/with-interactions`),

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
