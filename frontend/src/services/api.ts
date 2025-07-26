import axios from 'axios';
import { Coordinates, ChatRequest, AIResponse } from '@shared/types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 seconds for AI requests
});

// Add request interceptor for logging
api.interceptors.request.use(
  (config) => {
    console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('API Request Error:', error);
    return Promise.reject(error);
  }
);

// Add response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    console.error('API Response Error:', error);
    
    if (error.code === 'ECONNABORTED') {
      throw new Error('Request timeout - please try again');
    }
    
    if (error.response?.status === 413) {
      throw new Error('File too large - maximum size is 10MB');
    }
    
    if (error.response?.status >= 500) {
      throw new Error('Server error - please try again later');
    }
    
    throw new Error(error.response?.data?.message || 'Something went wrong');
  }
);

export const chatAPI = {
  sendTextMessage: async (message: string, location: Coordinates): Promise<AIResponse> => {
    const response = await api.post('/chat/text', {
      message,
      location,
      inputType: 'text',
    });
    return response.data.response;
  },

  sendVoiceMessage: async (message: string, location: Coordinates): Promise<AIResponse> => {
    const response = await api.post('/chat/voice', {
      message,
      location,
      inputType: 'voice',
    });
    return response.data.response;
  },

  sendPhoto: async (image: File, location: Coordinates): Promise<AIResponse> => {
    const formData = new FormData();
    formData.append('image', image);
    formData.append('location', JSON.stringify(location));

    const response = await api.post('/chat/photo', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data.response;
  },
};

export const locationAPI = {
  getNearbyPOIs: async (
    lat: number, 
    lon: number, 
    radius: number = 1000, 
    categories?: string[]
  ) => {
    const params = new URLSearchParams({
      lat: lat.toString(),
      lon: lon.toString(),
      radius: radius.toString(),
    });
    
    if (categories) {
      params.append('categories', categories.join(','));
    }

    const response = await api.get(`/location/nearby?${params}`);
    return response.data;
  },

  getLocationInfo: async (lat: number, lon: number) => {
    const response = await api.get(`/location/info?lat=${lat}&lon=${lon}`);
    return response.data;
  },

  getLocationContext: async (lat: number, lon: number) => {
    const response = await api.get(`/location/context?lat=${lat}&lon=${lon}`);
    return response.data;
  },

  searchLocations: async (query: string, lat?: number, lon?: number, radius?: number) => {
    const params = new URLSearchParams({ q: query });
    
    if (lat && lon) {
      params.append('lat', lat.toString());
      params.append('lon', lon.toString());
      if (radius) {
        params.append('radius', radius.toString());
      }
    }

    const response = await api.get(`/location/search?${params}`);
    return response.data;
  },

  getRecommendations: async (lat: number, lon: number, preferences?: string[]) => {
    const params = new URLSearchParams({
      lat: lat.toString(),
      lon: lon.toString(),
    });
    
    if (preferences) {
      params.append('preferences', preferences.join(','));
    }

    const response = await api.get(`/location/recommendations?${params}`);
    return response.data;
  },
};

export const navigationAPI = {
  getRoute: async (from: Coordinates, to: Coordinates) => {
    const response = await api.post('/navigation/route', { from, to });
    return response.data;
  },

  getDirections: async (from: Coordinates, to: Coordinates, mode: string = 'walking') => {
    const params = new URLSearchParams({
      fromLat: from.lat.toString(),
      fromLon: from.lon.toString(),
      toLat: to.lat.toString(),
      toLon: to.lon.toString(),
      mode,
    });

    const response = await api.get(`/navigation/directions?${params}`);
    return response.data;
  },
};

export default api; 