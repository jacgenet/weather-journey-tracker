import { authService } from './authService';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:9000/api';

export interface Country {
  id: number;
  name: string;
  iso_code: string;
  iso_code_3?: string;
  phone_code?: string;
  currency?: string;
}

export interface State {
  id: number;
  name: string;
  abbreviation?: string;
  country_id: number;
  type: string;
}

export interface City {
  id: number;
  name: string;
  country_id: number;
  state_id?: number;
  latitude?: number;
  longitude?: number;
  population?: number;
  timezone?: string;
}

class LocationDataService {
  private getHeaders() {
    const token = authService.getToken();
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  }

  async getCountries(): Promise<Country[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/location-data/countries`, {
        headers: this.getHeaders()
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching countries:', error);
      throw error;
    }
  }

  async getStatesByCountry(countryId: number): Promise<State[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/location-data/states/${countryId}`, {
        headers: this.getHeaders()
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching states:', error);
      throw error;
    }
  }

  async getCitiesByCountry(countryId: number): Promise<City[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/location-data/cities/${countryId}`, {
        headers: this.getHeaders()
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching cities:', error);
      throw error;
    }
  }

  async getCitiesByState(countryId: number, stateId: number): Promise<City[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/location-data/cities/${countryId}/${stateId}`, {
        headers: this.getHeaders()
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching cities by state:', error);
      throw error;
    }
  }

  async searchCities(query: string): Promise<City[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/location-data/search/cities?q=${encodeURIComponent(query)}`, {
        headers: this.getHeaders()
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error searching cities:', error);
      throw error;
    }
  }
}

export const locationDataService = new LocationDataService();
