/**
 * Axios Configuration and Interceptors
 * Sets up automatic auth header injection for all API requests
 */

import axios from 'axios';

const API_BASE = 'http://localhost:3000';

// Create axios instance with base config
const apiClient = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - automatically add auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('minecraft_tracker_auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log('🔐 [Axios] Auth token injected for request to', config.url);
    }
    return config;
  },
  (error) => {
    console.error('❌ [Axios] Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor - handle auth errors
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Handle 401 Unauthorized errors
    if (error.response?.status === 401) {
      console.warn('⚠️ [Axios] Unauthorized (401) - token may be expired');
      // Clear invalid token
      localStorage.removeItem('minecraft_tracker_auth_token');
      // Could dispatch logout action here if using Redux/Context
    }
    return Promise.reject(error);
  }
);

export default apiClient;
