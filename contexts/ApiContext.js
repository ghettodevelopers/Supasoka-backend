import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiService from '../services/api';
import drmService from '../services/drmService';

const ApiContext = createContext();

export const ApiProvider = ({ children }) => {
  const [channels, setChannels] = useState([]);
  const [carouselImages, setCarouselImages] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    initializeApi();
  }, []);

  const initializeApi = async () => {
    try {
      await apiService.init();
      await loadData();
    } catch (err) {
      console.log('⚠️ API initialization failed, using offline mode');
      setLoading(false);
    }
  };

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Load cached data first for instant display
      const cachedChannels = await AsyncStorage.getItem('channels');
      const cachedCategories = await AsyncStorage.getItem('categories');
      const cachedCarousel = await AsyncStorage.getItem('carouselImages');
      
      if (cachedChannels) {
        setChannels(JSON.parse(cachedChannels));
        console.log('📦 Loaded cached channels');
      }
      
      if (cachedCategories) {
        setCategories(JSON.parse(cachedCategories));
        console.log('📦 Loaded cached categories');
      }

      if (cachedCarousel) {
        const parsedCarousel = JSON.parse(cachedCarousel);
        setCarouselImages(parsedCarousel);
        console.log(`📦 Loaded ${parsedCarousel.length} cached carousel images`);
      }

      // Fetch fresh data from Render.com backend
      console.log('🔄 Fetching fresh data from backend...');
      await Promise.all([
        loadChannels(),
        loadCarouselImages(),
        loadCategories(),
      ]);

    } catch (err) {
      console.error('Error loading data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadChannels = async (retryCount = 0) => {
    try {
      console.log('🔄 Fetching channels from Render.com backend...');
      if (retryCount > 0) {
        console.log(`🔄 Retry attempt ${retryCount}/3...`);
      }
      
      // Fetch from correct backend endpoint
      const response = await apiService.get('/channels');
      
      // Backend returns { channels: [...] }
      let channelsData = response?.channels || response?.data || response;
      
      // Ensure it's an array
      if (!Array.isArray(channelsData)) {
        channelsData = [];
      }

      if (channelsData && channelsData.length > 0) {
        const freeCount = channelsData.filter(ch => ch.isFree === true).length;
        const premiumCount = channelsData.length - freeCount;
        
        setChannels(channelsData);
        await AsyncStorage.setItem('channels', JSON.stringify(channelsData));
        
        // Preload DRM configs in background
        drmService.preloadDRMConfigs(channelsData).catch(err => {
          console.log('DRM preload failed:', err);
        });

        console.log(`✅ Loaded ${channelsData.length} channels from Render.com (${freeCount} free, ${premiumCount} premium)`);
        console.log('📺 Free channels:', channelsData.filter(ch => ch.isFree).map(ch => ch.name).join(', '));
      } else {
        console.log('⚠️ No channels from backend');
      }
    } catch (error) {
      console.error('❌ Error loading channels:', error.message);
      
      // Retry up to 3 times for timeout/network errors
      if (retryCount < 3 && (error.message.includes('aborted') || error.message.includes('timeout') || error.message.includes('Network'))) {
        console.log('🔄 Retrying channel load...');
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
        return loadChannels(retryCount + 1);
      }
      
      // Keep using cached data if available
      console.log('💾 Using cached channels if available');
    }
  };

  const loadCarouselImages = async () => {
    try {
      console.log('🔄 Fetching carousel from Render.com backend...');
      console.log('📍 Using endpoint: /channels/carousel-images');
      
      // Use the new carousel-images endpoint
      let response = await apiService.get('/channels/carousel-images');
      console.log('📦 Raw carousel response:', JSON.stringify(response).substring(0, 300));
      
      // Backend returns { images: [...] }
      let carouselData = response?.images || response?.data || response;
      
      // Ensure it's an array
      if (!Array.isArray(carouselData)) {
        console.log('⚠️ Carousel data is not an array:', typeof carouselData);
        carouselData = [];
      }
      
      console.log(`📊 Total carousel items received from backend: ${carouselData.length}`);
      
      if (carouselData && carouselData.length > 0) {
        // Backend already filters active items, but double-check
        const activeCarousel = carouselData.filter(item => item.isActive !== false);
        console.log(`✅ Loaded ${activeCarousel.length} active carousel images from Render.com:`);
        activeCarousel.forEach((item, index) => {
          console.log(`   ${index + 1}. "${item.title || 'No title'}"`);
          console.log(`      - imageUrl: ${item.imageUrl || 'MISSING'}`);
          console.log(`      - isActive: ${item.isActive}`);
          console.log(`      - order: ${item.order}`);
        });
        
        // Update state with fresh data
        setCarouselImages(activeCarousel);
        console.log('🎨 Carousel state updated with', activeCarousel.length, 'images');
        
        // Save to cache
        await AsyncStorage.setItem('carouselImages', JSON.stringify(activeCarousel));
        console.log('💾 Carousel images saved to cache');
      } else {
        console.log('⚠️ No carousel images in backend yet');
        console.log('📝 Please add carousel images in AdminSupa admin panel');
        // Clear carousel to show nothing
        setCarouselImages([]);
        console.log('🎨 Carousel state cleared (no images)');
        await AsyncStorage.removeItem('carouselImages');
      }
    } catch (error) {
      console.error('❌ Could not load carousel from server:', error.message);
      console.log('💡 This may be due to Render.com cold start - wait 60 seconds');
      console.log('🔍 Error details:', error);
      
      // Try to use cached data if available
      try {
        const cached = await AsyncStorage.getItem('carouselImages');
        if (cached) {
          const cachedData = JSON.parse(cached);
          console.log(`📦 Using ${cachedData.length} cached carousel images`);
          setCarouselImages(cachedData);
        } else {
          console.log('📭 No cached carousel images available');
          setCarouselImages([]);
        }
      } catch (cacheError) {
        console.error('❌ Error loading cached carousel:', cacheError);
        setCarouselImages([]);
      }
    }
  };

  const loadCategories = async () => {
    try {
      console.log('🔄 Fetching categories from AdminSupa backend...');
      const response = await apiService.get('/channels/meta/categories');
      
      // Backend returns { categories: [...] }
      let categoriesData = response?.categories || response?.data || response;
      
      // Ensure it's an array
      if (!Array.isArray(categoriesData)) {
        categoriesData = [];
      }
      
      if (categoriesData && categoriesData.length > 0) {
        // Add 'All' category at the beginning
        const allCategories = [{ id: 'all', name: 'All', nameSwahili: 'Vyote' }, ...categoriesData];
        console.log(`✅ Loaded ${categoriesData.length} categories from AdminSupa:`, categoriesData.map(c => c.name).join(', '));
        setCategories(allCategories);
        await AsyncStorage.setItem('categories', JSON.stringify(allCategories));
      } else {
        console.log('⚠️ No categories from backend, using defaults');
        setCategories([{ id: 'all', name: 'All', nameSwahili: 'Vyote' }]);
      }
    } catch (error) {
      console.log('⚠️ Could not load categories from server:', error.message);
      // Use default categories
      setCategories([{ id: 'all', name: 'All', nameSwahili: 'Vyote' }]);
    }
  };

  const refreshData = async () => {
    console.log('🔄 Refreshing data...');
    await loadData();
  };

  const getChannelById = (channelId) => {
    return channels.find(ch => ch.id === channelId);
  };

  const getChannelsByCategory = (category) => {
    if (!category || category === 'All') {
      return channels;
    }
    return channels.filter(ch => ch.category === category);
  };

  const getFreeChannels = () => {
    return channels.filter(ch => ch.isFree === true);
  };

  const getPremiumChannels = () => {
    return channels.filter(ch => ch.isFree !== true);
  };

  const value = {
    channels,
    carouselImages,
    categories,
    loading,
    error,
    loadChannels,
    loadCarouselImages,
    loadCategories,
    refreshData,
    getChannelById,
    getChannelsByCategory,
    getFreeChannels,
    getPremiumChannels,
  };

  return (
    <ApiContext.Provider value={value}>
      {children}
    </ApiContext.Provider>
  );
};

export const useApi = () => {
  const context = useContext(ApiContext);
  if (!context) {
    throw new Error('useApi must be used within ApiProvider');
  }
  return context;
};

export default ApiContext;
