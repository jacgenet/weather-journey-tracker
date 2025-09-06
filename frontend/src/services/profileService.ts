import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:9000/api';

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

export interface ProfileUpdateData {
  first_name?: string;
  last_name?: string;
  email?: string;
  bio?: string;
}

export interface PasswordChangeData {
  current_password: string;
  new_password: string;
}

export const profileService = {
  async getProfile() {
    const response = await api.get('/auth/profile');
    return response.data;
  },

  async updateProfile(profileData: ProfileUpdateData) {
    const response = await api.put('/auth/profile', profileData);
    return response.data;
  },

  async changePassword(passwordData: PasswordChangeData) {
    const response = await api.post('/auth/change-password', passwordData);
    return response.data;
  },
};
