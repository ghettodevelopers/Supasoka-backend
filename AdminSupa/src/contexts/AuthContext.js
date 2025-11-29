import React, { createContext, useState, useContext, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import api from '../services/api';
import { API_ENDPOINTS } from '../config/api';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = await SecureStore.getItemAsync('adminToken');
      if (token) {
        const response = await api.get(API_ENDPOINTS.PROFILE);
        setAdmin(response.data.admin);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      // Only clear token if it's a 401 (invalid token), not for network errors
      if (error.response?.status === 401) {
        await SecureStore.deleteItemAsync('adminToken');
      }
      // For 503 or network errors, keep token and let user try again
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      console.log('🔐 Attempting login for:', email);
      const response = await api.post(API_ENDPOINTS.LOGIN, { email, password });
      const { token, admin: adminData } = response.data;
      
      console.log('✅ Login successful, saving token...');
      await SecureStore.setItemAsync('adminToken', token);
      setAdmin(adminData);
      
      console.log('✅ Admin logged in:', adminData.email);
      return { success: true };
    } catch (error) {
      console.error('❌ Login error:', error.response?.data || error.message);
      
      // Provide specific error messages
      let errorMessage = 'Login failed';
      
      if (error.response?.status === 503) {
        errorMessage = 'Backend service unavailable (503)';
      } else if (error.response?.status === 401) {
        errorMessage = error.response?.data?.error || 'Invalid credentials';
      } else if (error.code === 'NETWORK_ERROR' || !error.response) {
        errorMessage = 'Network error - Cannot reach server';
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      }
      
      return {
        success: false,
        error: errorMessage,
      };
    }
  };

  const logout = async () => {
    try {
      await api.post(API_ENDPOINTS.LOGOUT);
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      await SecureStore.deleteItemAsync('adminToken');
      setAdmin(null);
    }
  };

  return (
    <AuthContext.Provider value={{ admin, loading, login, logout, checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
