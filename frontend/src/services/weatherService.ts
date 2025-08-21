import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: API_BASE_URL,
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

export interface WeatherData {
  id: number;
  location_id: number;
  temperature: number;
  humidity?: number;
  pressure?: number;
  wind_speed?: number;
  wind_direction?: number;
  description?: string;
  icon?: string;
  recorded_at: string;
}

export interface Location {
  id: number;
  name: string;
  city: string;
  country: string;
  latitude: number;
  longitude: number;
  address?: string;
  description?: string;
}

export interface WeatherResponse {
  location: Location;
  weather: WeatherData;
}

export interface WeatherHistoryResponse {
  location: Location;
  weather_history: WeatherData[];
}

export interface WeatherStats {
  total_records: number;
  average_temperature: number;
  temperature_range: {
    min: number;
    max: number;
  };
  most_common_conditions: [string, number][];
}

export interface WeatherStatsResponse {
  location: Location;
  stats: WeatherStats;
}

export interface WeatherPeriodStats {
  start_date: string;
  end_date: string;
  total_records: number;
  average_temperature: number;
  highest_temperature: number;
  lowest_temperature: number;
  temperature_range: {
    min: number;
    max: number;
  };
  most_common_conditions: [string, number][];
}

export interface WeatherPeriodStatsResponse {
  location: Location;
  period_stats: WeatherPeriodStats;
}

export interface DashboardData {
  total_locations: number;
  average_temperature: number;
  recent_weather: {
    location: Location;
    weather: WeatherData;
  }[];
  temperature_trends: {
    date: string;
    average_temp: number;
  }[];
}

export const weatherService = {
  async getLocationWeather(locationId: number): Promise<WeatherResponse> {
    const response = await api.get(`/weather/${locationId}`);
    return response.data;
  },

  async getWeatherHistory(locationId: number): Promise<WeatherHistoryResponse> {
    const response = await api.get(`/weather/history/${locationId}`);
    return response.data;
  },

  async getWeatherStats(locationId: number): Promise<WeatherStatsResponse> {
    const response = await api.get(`/weather/stats/${locationId}`);
    return response.data;
  },

  async getWeatherPeriodStats(locationId: number, startDate: string, endDate: string): Promise<WeatherPeriodStatsResponse> {
    const response = await api.get(`/weather/period-stats/${locationId}?start_date=${encodeURIComponent(startDate)}&end_date=${encodeURIComponent(endDate)}`);
    return response.data;
  },

  async getWeatherDashboard(): Promise<DashboardData> {
    const response = await api.get('/weather/dashboard');
    return response.data;
  },

  async refreshWeatherData(locationId: number): Promise<WeatherData> {
    const response = await api.post(`/weather/refresh/${locationId}`);
    return response.data.weather;
  },
};
