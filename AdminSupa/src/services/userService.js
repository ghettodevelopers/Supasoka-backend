import api from './api';
import { API_ENDPOINTS } from '../config/api';

class UserService {
  // Get all users with pagination and filters
  async getAllUsers(page = 1, limit = 50, filters = {}) {
    try {
      const params = new URLSearchParams();
      params.append('page', page);
      params.append('limit', limit);
      
      if (filters.search) params.append('search', filters.search);
      if (filters.subscribed !== undefined) params.append('subscribed', filters.subscribed);
      
      const response = await api.get(`${API_ENDPOINTS.USERS}?${params.toString()}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching users:', error);
      throw error;
    }
  }

  // Get user by unique ID
  async getUserByUniqueId(uniqueUserId) {
    try {
      const response = await api.get(API_ENDPOINTS.USER_FIND(uniqueUserId));
      return response.data.user;
    } catch (error) {
      console.error('Error fetching user:', error);
      throw error;
    }
  }

  // Activate user with time allocation (legacy - use grantSubscription instead)
  async activateUser(uniqueUserId, timeData) {
    try {
      const response = await api.patch(
        API_ENDPOINTS.USER_ACTIVATE(uniqueUserId),
        timeData
      );
      return response.data;
    } catch (error) {
      console.error('Error activating user:', error);
      throw error;
    }
  }

  // Grant subscription to user with timestamp-based expiration
  async grantSubscription(userId, duration, unit, reason = '') {
    try {
      const response = await api.post(
        API_ENDPOINTS.USER_GRANT_SUBSCRIPTION(userId),
        { duration, unit, reason }
      );
      return response.data;
    } catch (error) {
      console.error('Error granting subscription:', error);
      throw error;
    }
  }

  // Check and expire old subscriptions
  async checkExpiredSubscriptions() {
    try {
      const response = await api.post(API_ENDPOINTS.CHECK_EXPIRED_SUBSCRIPTIONS);
      return response.data;
    } catch (error) {
      console.error('Error checking expired subscriptions:', error);
      throw error;
    }
  }

  // Block/Unblock user
  async toggleBlockUser(uniqueUserId, isBlocked, blockReason = '') {
    try {
      const response = await api.patch(
        API_ENDPOINTS.USER_BLOCK(uniqueUserId),
        { isBlocked, blockReason }
      );
      return response.data;
    } catch (error) {
      console.error('Error toggling user block:', error);
      throw error;
    }
  }

  // Update user access level
  async updateAccessLevel(uniqueUserId, accessLevel, timeInMinutes = 0) {
    try {
      const response = await api.patch(
        API_ENDPOINTS.USER_ACCESS(uniqueUserId),
        { accessLevel, timeInMinutes }
      );
      return response.data;
    } catch (error) {
      console.error('Error updating access level:', error);
      throw error;
    }
  }

  // Get user stats
  async getUserStats() {
    try {
      const response = await api.get('/users/admin/stats');
      return response.data;
    } catch (error) {
      console.error('Error fetching user stats:', error);
      throw error;
    }
  }
}

export default new UserService();
