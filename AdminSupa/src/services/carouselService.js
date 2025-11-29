import api from './api';
import { API_ENDPOINTS } from '../config/api';

class CarouselService {
  // Helper to extract meaningful error messages
  extractErrorMessage(error) {
    if (error.response?.data?.error) {
      return error.response.data.error;
    }
    if (error.response?.data?.message) {
      return error.response.data.message;
    }
    if (error.message) {
      return error.message;
    }
    return 'Unknown error occurred';
  }

  // Helper for retry logic
  async retryOperation(operation, maxRetries = 3, delayMs = 1000) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        if (attempt === maxRetries) {
          throw error;
        }
        console.log(`Retry attempt ${attempt}/${maxRetries} after ${delayMs}ms...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }

  // Get all carousel images (admin view - includes inactive)
  async getAllCarousels() {
    try {
      const response = await this.retryOperation(async () => {
        return await api.get(`${API_ENDPOINTS.CAROUSEL}`);
      });
      return response.data.images || [];
    } catch (error) {
      console.error('Error fetching carousels:', error);
      const message = this.extractErrorMessage(error);
      throw new Error(`Failed to load carousels: ${message}`);
    }
  }

  // Create new carousel image
  async createCarousel(carouselData) {
    try {
      const response = await api.post(
        API_ENDPOINTS.CAROUSEL_CREATE,
        carouselData
      );
      return response.data.image;
    } catch (error) {
      console.error('Error creating carousel:', error);
      const message = this.extractErrorMessage(error);
      throw new Error(`Failed to create carousel: ${message}`);
    }
  }

  // Update carousel image
  async updateCarousel(carouselId, carouselData) {
    try {
      const response = await api.put(
        API_ENDPOINTS.CAROUSEL_UPDATE(carouselId),
        carouselData
      );
      return response.data.image;
    } catch (error) {
      console.error('Error updating carousel:', error);
      const message = this.extractErrorMessage(error);
      throw new Error(`Failed to update carousel: ${message}`);
    }
  }

  // Delete carousel image
  async deleteCarousel(carouselId) {
    try {
      const response = await api.delete(
        API_ENDPOINTS.CAROUSEL_DELETE(carouselId)
      );
      return response.data;
    } catch (error) {
      console.error('Error deleting carousel:', error);
      const message = this.extractErrorMessage(error);
      throw new Error(`Failed to delete carousel: ${message}`);
    }
  }

  // Reorder carousel images
  async reorderCarousels(imageIds) {
    try {
      const response = await api.patch(
        `${API_ENDPOINTS.CAROUSEL}/reorder`,
        { imageIds }
      );
      return response.data;
    } catch (error) {
      console.error('Error reordering carousels:', error);
      const message = this.extractErrorMessage(error);
      throw new Error(`Failed to reorder carousels: ${message}`);
    }
  }
}

export default new CarouselService();
