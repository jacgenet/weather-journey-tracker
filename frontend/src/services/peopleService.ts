import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:9000/api';

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

export interface Person {
  id: number;
  user_id: number;
  first_name: string;
  last_name: string;
  full_name: string;
  birth_date?: string;
  home_location?: string;  // Legacy field for backward compatibility
  home_location_id?: number;  // New field referencing location ID
  notes?: string;
  created_at?: string;
  updated_at?: string;
  visits?: PersonLocation[];
  visit_count?: number;
}

export interface PersonLocation {
  id: number;
  person_id: number;
  location_id: number;
  start_date: string;
  end_date?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
  location?: Location;
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

export interface CreatePersonData {
  first_name: string;
  last_name: string;
  birth_date?: string;
  home_location?: string;  // Legacy field
  home_location_id?: number;  // New field
  notes?: string;
}

export interface UpdatePersonData extends Partial<CreatePersonData> {}

export interface CreateVisitData {
  location_id: number;
  start_date: string;
  end_date?: string;
  notes?: string;
}

export interface UpdateVisitData extends Partial<CreateVisitData> {}

export const peopleService = {
  async getPeople(): Promise<Person[]> {
    const response = await api.get('/people');
    return response.data;
  },

  async getPerson(id: number): Promise<Person> {
    const response = await api.get(`/people/${id}`);
    return response.data;
  },

  async createPerson(personData: CreatePersonData): Promise<Person> {
    const response = await api.post('/people', personData);
    return response.data.person;
  },

  async updatePerson(id: number, personData: UpdatePersonData): Promise<Person> {
    const response = await api.put(`/people/${id}`, personData);
    return response.data.person;
  },

  async deletePerson(id: number): Promise<void> {
    await api.delete(`/people/${id}`);
  },

  async searchPeople(query: string): Promise<Person[]> {
    const response = await api.get(`/people/search?q=${encodeURIComponent(query)}`);
    return response.data;
  },

  // Visit management
  async addVisit(personId: number, visitData: CreateVisitData): Promise<PersonLocation> {
    const response = await api.post(`/people/${personId}/visits`, visitData);
    return response.data.visit;
  },

  async updateVisit(personId: number, visitId: number, visitData: UpdateVisitData): Promise<PersonLocation> {
    const response = await api.put(`/people/${personId}/visits/${visitId}`, visitData);
    return response.data.visit;
  },

  async deleteVisit(personId: number, visitId: number): Promise<void> {
    await api.delete(`/people/${personId}/visits/${visitId}`);
  },

  // Homepage stats - efficient single call
  async getHomepageStats(): Promise<{ people: any[], locations: any[] }> {
    const response = await api.get('/people/homepage-stats');
    return response.data;
  },

  async getDashboardTemps(): Promise<{ people_temps: any[] }> {
    const response = await api.get('/people/dashboard-temps');
    return response.data;
  }
};
