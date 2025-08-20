import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type TemperatureUnit = 'celsius' | 'fahrenheit';

interface UserPreferences {
  temperatureUnit: TemperatureUnit;
}

interface PreferencesContextType {
  preferences: UserPreferences;
  setTemperatureUnit: (unit: TemperatureUnit) => void;
  convertTemperature: (celsius: number) => number;
  formatTemperature: (celsius: number) => string;
}

const PreferencesContext = createContext<PreferencesContextType | undefined>(undefined);

export const usePreferences = () => {
  const context = useContext(PreferencesContext);
  if (context === undefined) {
    throw new Error('usePreferences must be used within a PreferencesProvider');
  }
  return context;
};

interface PreferencesProviderProps {
  children: ReactNode;
}

const defaultPreferences: UserPreferences = {
  temperatureUnit: 'celsius'
};

export const PreferencesProvider: React.FC<PreferencesProviderProps> = ({ children }) => {
  const [preferences, setPreferences] = useState<UserPreferences>(() => {
    // Load preferences from localStorage
    const saved = localStorage.getItem('weather_tracker_preferences');
    if (saved) {
      try {
        return { ...defaultPreferences, ...JSON.parse(saved) };
      } catch (error) {
        console.warn('Failed to parse saved preferences, using defaults');
      }
    }
    return defaultPreferences;
  });

  // Save preferences to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('weather_tracker_preferences', JSON.stringify(preferences));
  }, [preferences]);

  const setTemperatureUnit = (unit: TemperatureUnit) => {
    setPreferences(prev => ({ ...prev, temperatureUnit: unit }));
  };

  const convertTemperature = (celsius: number): number => {
    if (preferences.temperatureUnit === 'fahrenheit') {
      return (celsius * 9/5) + 32;
    }
    return celsius;
  };

  const formatTemperature = (celsius: number): string => {
    const converted = convertTemperature(celsius);
    const unit = preferences.temperatureUnit === 'celsius' ? '°C' : '°F';
    return `${converted.toFixed(1)}${unit}`;
  };

  const value: PreferencesContextType = {
    preferences,
    setTemperatureUnit,
    convertTemperature,
    formatTemperature
  };

  return (
    <PreferencesContext.Provider value={value}>
      {children}
    </PreferencesContext.Provider>
  );
};
