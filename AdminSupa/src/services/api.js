import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { API_URL } from '../config/api';

// Fallback URLs for AdminSupa (prioritize Render.com production)
const FALLBACK_URLS = [
  'https://supasoka-backend.onrender.com/api', // Primary Render.com production
  'http://localhost:5000/api', // Local development
  'http://127.0.0.1:5000/api', // Local loopback
  'http://10.0.2.2:5000/api', // Android emulator
  'http://192.168.1.100:5000/api', // Common router IP
];

// Always start with Render.com production URL
let currentBaseURL = 'https://supasoka-backend.onrender.com/api';

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
      const token = await SecureStore.getItemAsync('adminToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('Error getting token:', error);
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
      console.log('❌ Unauthorized - clearing admin token');
      await SecureStore.deleteItemAsync('adminToken');
      // You can emit an event here to redirect to login
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

export default api;
