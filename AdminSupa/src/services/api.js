import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { API_URL } from '../config/api';

// Fallback URLs to try if primary fails
const FALLBACK_URLS = [
  'https://supasoka-backend.onrender.com/api', // Production (FIRST PRIORITY)
  'http://localhost:10000/api', // Local development fallback
  'http://127.0.0.1:10000/api', // Local loopback
  'http://10.0.2.2:10000/api', // Android emulator
];

// Start with local development URL for Expo Go
let currentBaseURL = API_URL;

// Flag to prevent token clearing during login
let isLoggingIn = false;

const api = axios.create({
  baseURL: currentBaseURL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Enhanced error handling with fallback URL switching
const tryFallbackURL = async (error, config) => {
  const currentIndex = FALLBACK_URLS.indexOf(currentBaseURL);
  const nextIndex = currentIndex + 1;
  
  if (nextIndex < FALLBACK_URLS.length) {
    currentBaseURL = FALLBACK_URLS[nextIndex];
    console.log(`🔄 Switching to fallback URL: ${currentBaseURL}`);
    
    // Update axios instance base URL
    api.defaults.baseURL = currentBaseURL;
    
    // Retry the request with new base URL
    config.baseURL = currentBaseURL;
    return api.request(config);
  }
  
  throw error;
};

// Request interceptor to add auth token
api.interceptors.request.use(
  async (config) => {
    try {
      // Ensure headers object exists
      if (!config.headers) {
        config.headers = {};
      }
      
      // First check if token is already set in axios defaults (faster)
      const defaultToken = api.defaults.headers.common['Authorization'];
      
      if (defaultToken) {
        config.headers['Authorization'] = defaultToken;
        console.log('🔑 Using token from axios defaults');
      } else {
        // Fallback to SecureStore if not in defaults
        const token = await SecureStore.getItemAsync('adminToken');
        if (token) {
          const bearerToken = `Bearer ${token}`;
          config.headers['Authorization'] = bearerToken;
          // Also set it in defaults for future requests
          api.defaults.headers.common['Authorization'] = bearerToken;
          console.log('🔑 Using token from SecureStore');
        } else {
          console.log('⚠️ No token found in axios defaults or SecureStore');
        }
      }
      
      // Log the final Authorization header (masked)
      if (config.headers['Authorization']) {
        const maskedToken = config.headers['Authorization'].substring(0, 20) + '...';
        console.log(`📤 Request: ${config.method?.toUpperCase()} ${config.url} [Token: ${maskedToken}]`);
      } else {
        console.log(`📤 Request: ${config.method?.toUpperCase()} ${config.url} [No Token]`);
      }
    } catch (error) {
      console.error('❌ Error in request interceptor:', error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling with fallback support
api.interceptors.response.use(
  (response) => {
    console.log(`✅ API Success: ${response.config.method?.toUpperCase()} ${response.config.url}`);
    return response;
  },
  async (error) => {
    const config = error.config;
    
    // Don't retry if it's already a retry or if we've exceeded retry attempts
    if (config._retry) {
      return Promise.reject(error);
    }
    
    // Handle network errors by trying fallback URLs
    if (error.code === 'NETWORK_ERROR' || 
        error.code === 'ECONNREFUSED' || 
        error.message?.includes('Network Error') ||
        !error.response) {
      
      console.log(`❌ Network error, trying fallback URL...`);
      config._retry = true;
      
      try {
        return await tryFallbackURL(error, config);
      } catch (fallbackError) {
        console.error('❌ All fallback URLs failed');
        return Promise.reject(fallbackError);
      }
    }
    
    // Handle 401 Unauthorized
    if (error.response?.status === 401) {
      // Don't clear token if we're in the middle of logging in
      // This prevents race conditions where login succeeds but subsequent requests fail
      if (!isLoggingIn) {
        console.log('❌ Unauthorized (401) - clearing admin token');
        console.log('   Error:', error.response?.data?.error || 'Unknown');
        console.log('   URL:', error.config?.url);
        try {
          await SecureStore.deleteItemAsync('adminToken');
        } catch (e) {
          console.log('   Note: SecureStore token already cleared');
        }
        // Clear token from axios defaults
        delete api.defaults.headers.common['Authorization'];
        delete api.defaults.headers['Authorization'];
        console.log('🗑️ Auth token cleared from axios');
        // You can emit an event here to redirect to login
      } else {
        console.log('⚠️ 401 during login process - NOT clearing token (login flag active)');
        console.log('   This is expected - login flow is still in progress');
      }
    }
    
    // Handle other HTTP errors
    if (error.response?.status >= 500) {
      console.error(`❌ Server error (${error.response.status}):`, error.response.data);
    } else if (error.response?.status >= 400) {
      console.error(`❌ Client error (${error.response.status}):`, error.response.data);
    }
    
    return Promise.reject(error);
  }
);

// Export functions to control login state
export const setLoginInProgress = (value) => {
  isLoggingIn = value;
  console.log(`🔐 Login in progress: ${value}`);
};

// Helper function to set auth token
export const setAuthToken = (token) => {
  if (token) {
    const bearerToken = `Bearer ${token}`;
    api.defaults.headers.common['Authorization'] = bearerToken;
    api.defaults.headers['Authorization'] = bearerToken;
    console.log(`✅ Auth token set globally (first 20 chars): ${bearerToken.substring(0, 20)}...`);
  } else {
    delete api.defaults.headers.common['Authorization'];
    delete api.defaults.headers['Authorization'];
    console.log('🗑️ Auth token cleared');
  }
};

export default api;
