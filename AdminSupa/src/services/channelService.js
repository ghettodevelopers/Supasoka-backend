import api from './api';
import { API_ENDPOINTS } from '../config/api';

class ChannelService {
  // Get all channels
  async getAllChannels(category = 'all', active = 'all') {
    try {
      const params = new URLSearchParams();
      if (category && category !== 'all') params.append('category', category);
      if (active && active !== 'all') params.append('active', active);
      
      const response = await api.get(`${API_ENDPOINTS.CHANNELS}?${params.toString()}`);
      return response.data.channels || [];
    } catch (error) {
      console.error('Error fetching channels:', error);
      console.error('Error details:', error.message);
      if (error.code === 'ERR_NETWORK') {
        console.error('Network error - Backend may not be running or IP address is incorrect');
      }
      throw error;
    }
  }

  // Create new channel
  async createChannel(channelData) {
    try {
      const response = await api.post(
        API_ENDPOINTS.CHANNEL_CREATE,
        channelData
      );
      return response.data.channel;
    } catch (error) {
      console.error('Error creating channel:', error);
      throw error;
    }
  }

  // Update channel
  async updateChannel(channelId, channelData) {
    try {
      const response = await api.put(
        API_ENDPOINTS.CHANNEL_UPDATE(channelId),
        channelData
      );
      return response.data.channel;
    } catch (error) {
      console.error('Error updating channel:', error);
      throw error;
    }
  }

  // Delete channel
  async deleteChannel(channelId) {
    try {
      const response = await api.delete(
        API_ENDPOINTS.CHANNEL_DELETE(channelId)
      );
      return response.data;
    } catch (error) {
      console.error('Error deleting channel:', error);
      throw error;
    }
  }

  // Toggle channel active status
  async toggleChannelStatus(channelId) {
    try {
      const response = await api.patch(
        API_ENDPOINTS.CHANNEL_TOGGLE(channelId)
      );
      return response.data.channel;
    } catch (error) {
      console.error('Error toggling channel status:', error);
      throw error;
    }
  }

  // Get categories
  async getCategories() {
    try {
      const response = await api.get('/channels/meta/categories');
      return response.data.categories || [];
    } catch (error) {
      console.error('Error fetching categories:', error);
      // Return default categories if API fails
      return [
        { id: 'news', name: 'News', icon: '📰' },
        { id: 'sports', name: 'Sports', icon: '⚽' },
        { id: 'entertainment', name: 'Entertainment', icon: '🎬' },
        { id: 'music', name: 'Music', icon: '🎵' },
        { id: 'documentary', name: 'Documentary', icon: '🎥' },
        { id: 'kids', name: 'Kids', icon: '👶' },
        { id: 'lifestyle', name: 'Lifestyle', icon: '🏡' },
        { id: 'religious', name: 'Religious', icon: '🕌' },
      ];
    }
  }
}

export default new ChannelService();
