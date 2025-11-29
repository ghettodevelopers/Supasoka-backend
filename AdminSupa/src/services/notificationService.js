import api from './api';
import { API_ENDPOINTS } from '../config/api';

class NotificationService {
  // Send notification to all users or specific users
  async sendNotification(notificationData) {
    try {
      const response = await api.post(
        `${API_ENDPOINTS.SEND_NOTIFICATION}`,
        notificationData
      );
      return response.data;
    } catch (error) {
      console.error('Error sending notification:', error);
      throw error;
    }
  }

  // Get all notifications (admin view)
  async getAllNotifications(page = 1, limit = 20, type = null) {
    try {
      const params = new URLSearchParams();
      params.append('page', page);
      params.append('limit', limit);
      if (type) params.append('type', type);
      
      const response = await api.get(`/notifications/admin/all?${params.toString()}`);
      
      // Add _count field for compatibility if not present
      const notifications = response.data.notifications || [];
      const notificationsWithCount = notifications.map(notif => ({
        ...notif,
        _count: notif._count || { userNotifications: notif.analytics?.totalSent || 0 }
      }));
      
      return {
        ...response.data,
        notifications: notificationsWithCount
      };
    } catch (error) {
      console.error('Error fetching notifications:', error);
      throw error;
    }
  }

  // Delete notification
  async deleteNotification(notificationId) {
    try {
      const response = await api.delete(`/notifications/${notificationId}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting notification:', error);
      throw error;
    }
  }

  // Get notification stats
  async getNotificationStats() {
    try {
      const response = await api.get('/notifications/admin/stats');
      return response.data;
    } catch (error) {
      console.error('Error fetching notification stats:', error);
      throw error;
    }
  }
}

export default new NotificationService();
