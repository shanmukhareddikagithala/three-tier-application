const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const apiFetch = async (endpoint, options = {}) => {
  const url = `${API_URL}${endpoint}`;
  
  const config = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    credentials: 'include', // Ensures HTTP-only cookies are sent and received
  };

  try {
    const response = await fetch(url, config);
    
    let data = {};
    const text = await response.text();
    if (text) {
      try {
        data = JSON.parse(text);
      } catch (e) {
        data = { message: text };
      }
    }

    if (!response.ok) {
      throw {
        status: response.status,
        message: data.error || data.message || 'An unexpected error occurred'
      };
    }

    return data;
  } catch (error) {
    if (error.message === 'Failed to fetch' || error.name === 'TypeError') {
      throw { message: 'Network error. Please ensure the server is running.' };
    }
    throw error;
  }
};

export const api = {
  get: (endpoint) => apiFetch(endpoint, { method: 'GET' }),
  post: (endpoint, body) => apiFetch(endpoint, { method: 'POST', body: JSON.stringify(body) }),
};
