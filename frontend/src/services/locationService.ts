import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to include auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export interface Location {
  id: number;
  name: string;
  address?: string;
  city: string;
  country: string;
  latitude: number;
  longitude: number;
  description?: string;
}

export interface CreateLocationData {
  name: string;
  address?: string;
  city: string;
  country: string;
  latitude: number;
  longitude: number;
  description?: string;
}

export interface UpdateLocationData extends Partial<CreateLocationData> {
  id: number;
}

export const locationService = {
  async getLocations(): Promise<Location[]> {
    const response = await api.get('/locations/');
    return response.data.locations;
  },

  async getLocation(id: number): Promise<Location> {
    const response = await api.get(`/locations/${id}`);
    return response.data;
  },

  async createLocation(locationData: CreateLocationData): Promise<Location> {
    const response = await api.post('/locations/', locationData);
    return response.data.location;
  },

  async updateLocation(id: number, locationData: Partial<CreateLocationData>): Promise<Location> {
    const response = await api.put(`/locations/${id}`, locationData);
    return response.data.location;
  },

  async deleteLocation(id: number): Promise<void> {
    await api.delete(`/locations/${id}`);
  },

  async getLocationStats(): Promise<any> {
    const response = await api.get('/locations/stats');
    return response.data;
  },
};
