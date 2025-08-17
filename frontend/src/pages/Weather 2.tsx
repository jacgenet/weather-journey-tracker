import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  Grid,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  CircularProgress,
} from '@mui/material';
import { WbSunny, Cloud, Opacity, Air } from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';

interface WeatherData {
  location: string;
  temperature: number;
  description: string;
  humidity: number;
  windSpeed: number;
  icon: string;
}

const Weather: React.FC = () => {
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  // Mock locations - in real app, these would come from the Locations page
  const mockLocations = [
    'Central Park, New York',
    'Times Square, New York',
    'Brooklyn Bridge, New York',
  ];

  // Mock weather data - in real app, this would come from a weather API
  const mockWeatherData: WeatherData = {
    location: 'Central Park, New York',
    temperature: 72,
    description: 'Partly Cloudy',
    humidity: 65,
    windSpeed: 8,
    icon: 'partly-cloudy',
  };

  useEffect(() => {
    if (selectedLocation) {
      fetchWeatherData(selectedLocation);
    }
  }, [selectedLocation]);

  const fetchWeatherData = async (location: string) => {
    setLoading(true);
    // Simulate API call delay
    setTimeout(() => {
      setWeatherData({
        ...mockWeatherData,
        location,
        temperature: Math.floor(Math.random() * 30) + 50, // Random temp between 50-80
      });
      setLoading(false);
    }, 1000);
  };

  const getWeatherIcon = (icon: string) => {
    switch (icon) {
      case 'sunny':
        return <WbSunny sx={{ fontSize: 40, color: '#FFD700' }} />;
      case 'cloudy':
        return <Cloud sx={{ fontSize: 40, color: '#87CEEB' }} />;
      case 'partly-cloudy':
        return <WbSunny sx={{ fontSize: 40, color: '#FFD700' }} />;
      default:
        return <WbSunny sx={{ fontSize: 40, color: '#FFD700' }} />;
    }
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Weather Information
        </Typography>
        
        <FormControl fullWidth sx={{ mb: 3 }}>
          <InputLabel>Select Location</InputLabel>
          <Select
            value={selectedLocation}
            label="Select Location"
            onChange={(e) => setSelectedLocation(e.target.value)}
          >
            {mockLocations.map((location) => (
              <MenuItem key={location} value={location}>
                {location}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        )}

        {weatherData && !loading && (
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    {getWeatherIcon(weatherData.icon)}
                    <Box sx={{ ml: 2 }}>
                      <Typography variant="h3" component="div">
                        {weatherData.temperature}°F
                      </Typography>
                      <Typography variant="h6" color="text.secondary">
                        {weatherData.description}
                      </Typography>
                    </Box>
                  </Box>
                  <Typography variant="h6" gutterBottom>
                    {weatherData.location}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Card>
                    <CardContent sx={{ textAlign: 'center' }}>
                      <Opacity sx={{ fontSize: 30, color: '#87CEEB', mb: 1 }} />
                      <Typography variant="h6">
                        {weatherData.humidity}%
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Humidity
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={6}>
                  <Card>
                    <CardContent sx={{ textAlign: 'center' }}>
                      <Air sx={{ fontSize: 30, color: '#A9A9A9', mb: 1 }} />
                      <Typography variant="h6">
                        {weatherData.windSpeed} mph
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Wind Speed
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </Grid>
          </Grid>
        )}

        {!selectedLocation && !loading && (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <Typography variant="h6" color="text.secondary">
              Select a location to view weather information
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Choose from your saved locations to see current weather conditions
            </Typography>
          </Box>
        )}
      </Box>
    </Container>
  );
};

export default Weather;
