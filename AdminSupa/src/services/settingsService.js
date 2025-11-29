import api from './api';
import { API_ENDPOINTS } from '../config/api';

class SettingsService {
  // Get free trial settings
  async getFreeTrialSettings() {
    try {
      const response = await api.get(API_ENDPOINTS.FREE_TRIAL);
      return response.data;
    } catch (error) {
      console.error('Error fetching free trial settings:', error);
      throw error;
    }
  }

  // Update free trial settings
  async updateFreeTrialSettings(timeData) {
    try {
      const response = await api.put(API_ENDPOINTS.FREE_TRIAL, timeData);
      return response.data;
    } catch (error) {
      console.error('Error updating free trial settings:', error);
      throw error;
    }
  }

  // Get contact settings
  async getContactSettings() {
    try {
      const response = await api.get(API_ENDPOINTS.CONTACT_SETTINGS);
      return response.data;
    } catch (error) {
      console.error('Error fetching contact settings:', error);
      throw error;
    }
  }

  // Update contact settings
  async updateContactSettings(contactData) {
    try {
      const response = await api.put(API_ENDPOINTS.CONTACT_SETTINGS, contactData);
      return response.data;
    } catch (error) {
      console.error('Error updating contact settings:', error);
      throw error;
    }
  }

  // Get app settings
  async getAppSettings() {
    try {
      const response = await api.get(API_ENDPOINTS.APP_SETTINGS);
      return response.data;
    } catch (error) {
      console.error('Error fetching app settings:', error);
      throw error;
    }
  }

  // Update app setting
  async updateAppSetting(key, value) {
    try {
      const response = await api.put(`${API_ENDPOINTS.APP_SETTINGS}/${key}`, { value });
      return response.data;
    } catch (error) {
      console.error('Error updating app setting:', error);
      throw error;
    }
  }
}

export default new SettingsService();
