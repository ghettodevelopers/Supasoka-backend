import AsyncStorage from '@react-native-async-storage/async-storage';

const FALLBACK_URLS = [
  'https://supasoka-backend.onrender.com/api', // PRODUCTION - Primary
  'http://10.0.2.2:10000/api', // Android emulator fallback
  'http://localhost:10000/api', // Local development fallback
  'http://127.0.0.1:10000/api', // Local loopback fallback
  'http://192.168.1.100:10000/api', // Common router IP
  'http://192.168.0.100:10000/api', // Alternative router IP
  'http://192.168.43.1:10000/api', // Mobile hotspot
  'http://172.20.10.2:10000/api', // Mobile hotspot alt
];

class ApiService {
  constructor() {
    this.baseURL = FALLBACK_URLS[0];
    this.token = null;
    this.initialized = false;
  }

  async init() {
    console.log('🔍 Initializing API Service...');
    
    // Try to load saved token
    try {
      const savedToken = await AsyncStorage.getItem('authToken');
      if (savedToken) {
        this.token = savedToken;
        console.log('✅ Token loaded from storage');
      }
    } catch (error) {
      console.log('⚠️ No saved token found');
    }

    // Test connections
    await this.testConnection();
    this.initialized = true;
  }

  async testConnection() {
    console.log('🔍 Testing API connections...');
    
    // Always use Render.com as primary
    const renderUrl = 'https://supasoka-backend.onrender.com/api';
    
    // Quick test with short timeout
    try {
      console.log('🔄 Quick connection test to Render.com...');
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s quick test

      const response = await fetch('https://supasoka-backend.onrender.com/health', {
        method: 'GET',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        console.log('✅ Render.com backend ready!');
        this.baseURL = renderUrl;
        return renderUrl;
      }
    } catch (error) {
      console.log('⚠️ Render.com quick test failed - may be cold starting');
    }

    // If quick test fails, just use Render.com anyway
    // It will wake up on first request
    console.log('💡 Using Render.com (will wake up on first request)');
    this.baseURL = renderUrl;
    return this.baseURL;
  }

  async request(endpoint, config = {}) {
    const url = `${this.baseURL}${endpoint}`;
    
    const headers = {
      'Content-Type': 'application/json',
      ...config.headers,
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const requestConfig = {
      ...config,
      headers,
    };

    console.log(`🔄 ${config.method || 'GET'} ${endpoint}`);

    // Try primary URL first with longer timeout for cold starts
    try {
      const controller = new AbortController();
      // 30 seconds timeout - balance between cold start and responsiveness
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const response = await fetch(`${this.baseURL}${endpoint}`, {
        ...requestConfig,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const contentType = response.headers.get('content-type');
      let data;
      
      if (contentType && contentType.includes('application/json')) {
        const text = await response.text();
        data = text ? JSON.parse(text) : {};
      } else {
        data = await response.text();
      }

      console.log(`✅ ${config.method || 'GET'} ${endpoint}`);
      return data;

    } catch (error) {
      console.log(`⚠️ Request failed: ${error.message}`);
      throw error;
    }
  }

  async get(endpoint, config = {}) {
    return this.request(endpoint, { ...config, method: 'GET' });
  }

  async post(endpoint, data, config = {}) {
    return this.request(endpoint, {
      ...config,
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async put(endpoint, data, config = {}) {
    return this.request(endpoint, {
      ...config,
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async patch(endpoint, data, config = {}) {
    return this.request(endpoint, {
      ...config,
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async delete(endpoint, config = {}) {
    return this.request(endpoint, { ...config, method: 'DELETE' });
  }

  setToken(token) {
    this.token = token;
    if (token) {
      AsyncStorage.setItem('authToken', token);
    } else {
      AsyncStorage.removeItem('authToken');
    }
  }

  getToken() {
    return this.token;
  }

  clearToken() {
    this.token = null;
    AsyncStorage.removeItem('authToken');
  }
}

const apiService = new ApiService();
export default apiService;
