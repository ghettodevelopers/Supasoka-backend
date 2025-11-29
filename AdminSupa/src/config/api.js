import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Helper to read extra configuration from app.json / app.config
const getExtraConfig = () => {
  try {
    // Newer Expo runtime (EAS builds)
    if (Constants?.expoConfig?.extra) {
      return Constants.expoConfig.extra;
    }
    // Classic Expo manifest
    if (Constants?.manifest?.extra) {
      return Constants.manifest.extra;
    }
  } catch (error) {
    console.log('Error reading Expo extra config:', error);
  }
  return {};
};

// Determine the correct API URL with preference for app.json "extra.apiUrl"
const getApiUrl = () => {
  const extra = getExtraConfig();

  // LOCAL DEVELOPMENT URL - Your computer's IP
  const LOCAL_URL = 'http://10.74.21.98:10000/api';
  
  // PRODUCTION URL - Render.com backend
  const PRODUCTION_URL = 'https://supasoka-backend.onrender.com/api';

  // If explicitly configured in app.json -> always prefer that
  if (extra && typeof extra.apiUrl === 'string' && extra.apiUrl.length > 0) {
    return extra.apiUrl;
  }

  // Use production Render.com backend (now has the fix!)
  return PRODUCTION_URL;
};

// Determine the correct Socket URL with preference for app.json "extra.socketUrl"
const getSocketUrl = () => {
  const extra = getExtraConfig();

  // LOCAL DEVELOPMENT SOCKET URL - Your computer's IP
  const LOCAL_SOCKET_URL = 'http://10.74.21.98:10000';
  
  // PRODUCTION SOCKET URL - Render.com backend
  const PRODUCTION_SOCKET_URL = 'https://supasoka-backend.onrender.com';

  if (extra && typeof extra.socketUrl === 'string' && extra.socketUrl.length > 0) {
    return extra.socketUrl;
  }

  // Use production Render.com backend (now has the fix!)
  return PRODUCTION_SOCKET_URL;
};

export const API_URL = getApiUrl();
export const SOCKET_URL = getSocketUrl();

console.log('🔗 API Configuration:');
console.log('   Platform:', Platform.OS);
console.log('   API URL:', API_URL);
console.log('   Socket URL:', SOCKET_URL);

export const API_ENDPOINTS = {
  // Auth
  LOGIN: '/auth/admin/login',
  LOGOUT: '/auth/admin/logout',
  PROFILE: '/admin/profile',

  // Dashboard Stats
  STATS: '/admin/stats',

  // Users
  USERS: '/admin/users',
  USER_ACTIVATE: (userId) => `/users/admin/${userId}/activate`,
  USER_BLOCK: (userId) => `/users/admin/${userId}/block`,
  USER_ACCESS: (userId) => `/users/admin/${userId}/access-level`,
  USER_FIND: (uniqueUserId) => `/users/admin/find/${uniqueUserId}`,

  // Channels
  CHANNELS: '/channels',
  CHANNEL_CREATE: '/channels',
  CHANNEL_UPDATE: (id) => `/channels/${id}`,
  CHANNEL_DELETE: (id) => `/channels/${id}`,
  CHANNEL_TOGGLE: (id) => `/channels/${id}/toggle`,
  CHANNEL_FEATURED: (id) => `/admin/channels/${id}/featured`,

  // Carousel
  // Admin carousel management is under /channels/carousel* in the backend
  CAROUSEL: '/channels/carousel/admin',
  CAROUSEL_CREATE: '/channels/carousel',
  CAROUSEL_UPDATE: (id) => `/channels/carousel/${id}`,
  CAROUSEL_DELETE: (id) => `/channels/carousel/${id}`,

  // Settings
  FREE_TRIAL: '/admin/free-trial',
  CONTACT_SETTINGS: '/admin/contact-settings',
  APP_SETTINGS: '/admin/settings',

  // Notifications
  SEND_NOTIFICATION: '/admin/notifications/send-realtime',
};
