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
    
    try {
      console.log('🔄 Connecting to Render.com backend...');
      console.log('⏳ Please wait - Render.com may take up to 60 seconds to wake up...');
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s for Render cold start

      const response = await fetch('https://supasoka-backend.onrender.com/health', {
        method: 'GET',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        console.log('✅ Connected to Render.com backend successfully');
        this.baseURL = renderUrl;
        return renderUrl;
      }
    } catch (error) {
      console.log('⚠️ Render.com connection issue:', error.message);
      console.log('💡 Render.com may be cold starting - this is normal');
    }

    // Fallback to other URLs only if Render fails
    for (const baseUrl of FALLBACK_URLS.slice(1)) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const response = await fetch(`${baseUrl.replace('/api', '')}/health`, {
          method: 'GET',
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          console.log(`✅ Connection successful: ${baseUrl}`);
          this.baseURL = baseUrl;
          return baseUrl;
        }
      } catch (error) {
        console.log(`❌ Connection failed: ${baseUrl}`);
      }
    }

    console.log('⚠️ Using Render.com URL (may be cold starting)');
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

    console.log(`🔄 API Request: ${config.method || 'GET'} ${endpoint}`);

    for (let urlIndex = 0; urlIndex < FALLBACK_URLS.length; urlIndex++) {
      try {
        const currentUrl = `${FALLBACK_URLS[urlIndex]}${endpoint}`;
        
        const controller = new AbortController();
        // 60 seconds timeout for Render.com cold starts
        const timeoutId = setTimeout(() => controller.abort(), 60000);

        const fetchPromise = fetch(currentUrl, {
          ...requestConfig,
          signal: controller.signal,
        });

        const response = await fetchPromise;
        clearTimeout(timeoutId);

        console.log(`📡 Response: ${response.status} ${response.statusText}`);

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

        console.log(`✅ API Success: ${config.method || 'GET'} ${endpoint}`);
        
        // Update baseURL if we switched
        if (FALLBACK_URLS[urlIndex] !== this.baseURL) {
          console.log(`🔄 Switched to: ${FALLBACK_URLS[urlIndex]}`);
          this.baseURL = FALLBACK_URLS[urlIndex];
        }

        return data;

      } catch (error) {
        console.log(`❌ Request failed (attempt ${urlIndex + 1}): ${error.message}`);
        
        // If it's a network error, try next URL
        if (error.message.includes('fetch') || 
            error.message.includes('timeout') || 
            error.message.includes('Network') ||
            error.message.includes('aborted')) {
          if (urlIndex < FALLBACK_URLS.length - 1) {
            console.log('🔄 Trying next URL...');
            continue;
          }
        }
        
        // If it's an HTTP error or last URL, throw
        throw error;
      }
    }

    throw new Error('All API endpoints failed');
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
