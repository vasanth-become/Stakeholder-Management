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

  // Enrichment methods
  enrich: (data) => apiCall('/stakeholders/enrich', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  saveEnrichment: (id, data) => apiCall(`/stakeholders/${id}/enrichment`, {
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

// Insights API calls
export const insightsAPI = {
  getGlobal: (limit) => apiCall(`/insights/global${limit ? `?limit=${limit}` : ''}`),

  getByProject: (projectId, limit) =>
    apiCall(`/insights/project/${projectId}${limit ? `?limit=${limit}` : ''}`),

  getByStakeholder: (stakeholderId, limit) =>
    apiCall(`/insights/stakeholder/${stakeholderId}${limit ? `?limit=${limit}` : ''}`),

  track: (event, insight, metadata) =>
    apiCall('/insights/track', {
      method: 'POST',
      body: JSON.stringify({ event, insight, metadata }),
    }),
};

// AI Intelligence API calls
export const aiAPI = {
  getCoach: (stakeholderId) => apiCall(`/ai/coach/${stakeholderId}`),

  getRiskAnalysis: (stakeholderId) => apiCall(`/ai/risk/${stakeholderId}`),

  getMeetingPrep: (stakeholderId) => apiCall(`/ai/meeting-prep/${stakeholderId}`),

  extractActions: (data) =>
    apiCall('/ai/extract-actions', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  track: (event, metadata) =>
    apiCall('/ai/track', {
      method: 'POST',
      body: JSON.stringify({ event, metadata }),
    }),
};

// Visual Insights API calls
export const visualInsightsAPI = {
  getHeatmap: (projectId, weeks = 8, sortBy = 'influence') =>
    apiCall(`/visual-insights/heatmap?projectId=${projectId}&weeks=${weeks}&sortBy=${sortBy}`),

  getRiskTimeline: (projectId, stakeholderId = null, days = 30) => {
    const params = new URLSearchParams({
      projectId: projectId.toString(),
      days: days.toString()
    });
    if (stakeholderId) {
      params.append('stakeholderId', stakeholderId.toString());
    }
    return apiCall(`/visual-insights/risk-timeline?${params}`);
  },

  getInfluenceNetwork: (projectId) =>
    apiCall(`/visual-insights/influence-network?projectId=${projectId}`),

  track: (event, metadata) =>
    apiCall('/visual-insights/track', {
      method: 'POST',
      body: JSON.stringify({ event, metadata }),
    }),
};

// Comments API calls
export const commentsAPI = {
  getComments: (entityType, entityId, includeThreads = true, visibility = null) => {
    const params = new URLSearchParams({
      entity_type: entityType,
      entity_id: entityId.toString(),
      include_threads: includeThreads.toString()
    });
    if (visibility) {
      params.append('visibility', visibility);
    }
    return apiCall(`/comments?${params}`);
  },

  createComment: (data) =>
    apiCall('/comments', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getComment: (commentId) =>
    apiCall(`/comments/${commentId}`),

  updateComment: (commentId, content) =>
    apiCall(`/comments/${commentId}`, {
      method: 'PUT',
      body: JSON.stringify({ content }),
    }),

  deleteComment: (commentId) =>
    apiCall(`/comments/${commentId}`, {
      method: 'DELETE',
    }),

  addReaction: (commentId, reactionType) =>
    apiCall(`/comments/${commentId}/reactions`, {
      method: 'POST',
      body: JSON.stringify({ reaction_type: reactionType }),
    }),

  removeReaction: (commentId, reactionType) =>
    apiCall(`/comments/${commentId}/reactions/${reactionType}`, {
      method: 'DELETE',
    }),
};

// Notifications API calls
export const notificationsAPI = {
  getNotifications: (limit = 50, offset = 0, unreadOnly = false, type = null) => {
    const params = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString(),
      unread_only: unreadOnly.toString()
    });
    if (type) {
      params.append('type', type);
    }
    return apiCall(`/notifications?${params}`);
  },

  getUnreadCount: () =>
    apiCall('/notifications/unread-count'),

  markAsRead: (notificationId) =>
    apiCall(`/notifications/${notificationId}/read`, {
      method: 'PUT',
    }),

  markAllAsRead: () =>
    apiCall('/notifications/read-all', {
      method: 'PUT',
    }),

  deleteNotification: (notificationId) =>
    apiCall(`/notifications/${notificationId}`, {
      method: 'DELETE',
    }),

  getPreferences: () =>
    apiCall('/notifications/preferences'),

  updatePreferences: (preferences) =>
    apiCall('/notifications/preferences', {
      method: 'PUT',
      body: JSON.stringify(preferences),
    }),
};
