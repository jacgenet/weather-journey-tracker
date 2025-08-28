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
  CircularProgress,
  Button,
  Chip,
  Divider,
  Alert,
  IconButton,
  Tooltip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  LinearProgress,
} from '@mui/material';
import {
  WbSunny,
  Cloud,
  Opacity,
  Air,
  Refresh,
  TrendingUp,
  LocationOn,
  Thermostat,
  Visibility,
  Compress,
  History,
  Upload,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { usePreferences } from '../contexts/PreferencesContext';
import { weatherService, WeatherResponse, WeatherStatsResponse, DashboardData } from '../services/weatherService';
import { locationService, Location } from '../services/locationService';

const Weather: React.FC = () => {
  const [selectedLocationId, setSelectedLocationId] = useState<number | ''>('');
  const [locations, setLocations] = useState<Location[]>([]);
  const [weatherData, setWeatherData] = useState<WeatherResponse | null>(null);
  const [weatherStats, setWeatherStats] = useState<WeatherStatsResponse | null>(null);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  // Historical data upload states
  const [uploadLocationId, setUploadLocationId] = useState<number | ''>('');
  const [jsonFile, setJsonFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadResult, setUploadResult] = useState<any>(null);
  
  const { user } = useAuth();
  const { preferences, formatTemperature } = usePreferences();

  useEffect(() => {
    fetchLocations();
    fetchDashboardData();
  }, []);

  useEffect(() => {
    if (selectedLocationId) {
      fetchWeatherData(selectedLocationId as number);
      fetchWeatherStats(selectedLocationId as number);
    }
  }, [selectedLocationId]);

  const fetchLocations = async () => {
    try {
      const data = await locationService.getLocations();
      setLocations(data);
      if (data.length > 0 && !selectedLocationId) {
        setSelectedLocationId(data[0].id);
      }
    } catch (error) {
      console.error('Failed to fetch locations:', error);
      setMessage({ type: 'error', text: 'Failed to fetch locations' });
    }
  };

  const fetchWeatherData = async (locationId: number) => {
    try {
      setLoading(true);
      const data = await weatherService.getLocationWeather(locationId);
      setWeatherData(data);
    } catch (error: any) {
      console.error('Failed to fetch weather data:', error);
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.error || 'Failed to fetch weather data' 
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchWeatherStats = async (locationId: number) => {
    try {
      const data = await weatherService.getWeatherStats(locationId);
      setWeatherStats(data);
    } catch (error: any) {
      console.error('Failed to fetch weather stats:', error);
    }
  };

  const fetchDashboardData = async () => {
    try {
      const data = await weatherService.getWeatherDashboard();
      setDashboardData(data);
    } catch (error: any) {
      console.error('Failed to fetch dashboard data:', error);
    }
  };

  const handleRefreshWeather = async () => {
    if (!selectedLocationId) return;
    
    try {
      setRefreshing(true);
      const newWeather = await weatherService.refreshWeatherData(selectedLocationId as number);
      
      // Update the weather data
      if (weatherData) {
        setWeatherData({
          ...weatherData,
          weather: newWeather
        });
      }
      
      // Refresh stats and dashboard
      await fetchWeatherStats(selectedLocationId as number);
      await fetchDashboardData();
      
      setMessage({ type: 'success', text: 'Weather data refreshed successfully!' });
    } catch (error: any) {
      console.error('Failed to refresh weather:', error);
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.error || 'Failed to refresh weather data' 
      });
    } finally {
      setRefreshing(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setJsonFile(event.target.files[0]);
    }
  };

     const handleUpload = async () => {
     if (!uploadLocationId || !jsonFile) return;

     try {
       setUploading(true);
       setUploadProgress(0);
       setUploadResult(null);

       // Read and parse the JSON file
       const text = await jsonFile.text();
       const jsonData = JSON.parse(text);

       const response = await weatherService.uploadHistoricalData(uploadLocationId, jsonData);
       setUploadResult(response);

       if (response.success) {
         // Refresh dashboard data after successful upload
         await fetchDashboardData();
         setMessage({ type: 'success', text: 'Historical weather data uploaded successfully!' });
         
         // Reset form
         setJsonFile(null);
         setUploadLocationId('');
       } else {
         setMessage({ type: 'error', text: response.error || 'Upload failed' });
       }
     } catch (error: any) {
       console.error('Failed to upload historical weather data:', error);
       setMessage({ 
         type: 'error', 
         text: error.response?.data?.error || 'Failed to upload historical weather data' 
       });
     } finally {
       setUploading(false);
     }
   };

  const clearUploadResult = () => {
    setUploadResult(null);
  };

  const getWeatherIcon = (icon?: string, description?: string) => {
    if (!icon && !description) return <WbSunny sx={{ fontSize: 40, color: '#FFD700' }} />;
    
    const desc = description?.toLowerCase() || '';
    
    if (desc.includes('sunny') || desc.includes('clear')) {
      return <WbSunny sx={{ fontSize: 40, color: '#FFD700' }} />;
    } else if (desc.includes('cloud') || desc.includes('overcast')) {
      return <Cloud sx={{ fontSize: 40, color: '#87CEEB' }} />;
    } else if (desc.includes('rain') || desc.includes('drizzle')) {
      return <Opacity sx={{ fontSize: 40, color: '#87CEEB' }} />;
    } else if (desc.includes('snow') || desc.includes('blizzard')) {
      return <Cloud sx={{ fontSize: 40, color: '#FFFFFF' }} />;
    } else {
      return <WbSunny sx={{ fontSize: 40, color: '#FFD700' }} />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getWindDirection = (degrees?: number) => {
    if (!degrees) return 'N/A';
    
    const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    const index = Math.round(degrees / 22.5) % 16;
    return directions[index];
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Weather Information
        </Typography>

        {message && (
          <Alert 
            severity={message.type} 
            sx={{ mb: 3 }}
            onClose={() => setMessage(null)}
          >
            {message.text}
          </Alert>
        )}

        {/* Location Selection */}
        <Box sx={{ display: 'flex', gap: 2, mb: 3, alignItems: 'center' }}>
          <FormControl sx={{ minWidth: 300 }}>
            <InputLabel>Select Location</InputLabel>
            <Select
              value={selectedLocationId}
              label="Select Location"
              onChange={(e) => setSelectedLocationId(e.target.value as number | '')}
            >
              {locations.map((location) => (
                <MenuItem key={location.id} value={location.id}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <LocationOn fontSize="small" />
                    {location.name} - {location.city}, {location.country}
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          
          {selectedLocationId && (
            <Tooltip title="Refresh Weather Data">
              <IconButton
                onClick={handleRefreshWeather}
                disabled={refreshing}
                color="primary"
              >
                <Refresh />
              </IconButton>
            </Tooltip>
          )}
        </Box>

        {/* Weather Dashboard Overview */}
        {dashboardData && (
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Weather Dashboard Overview
              </Typography>
              <Grid container spacing={3}>
                <Grid item xs={12} sm={4}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" color="primary">
                      {dashboardData.total_locations}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total Locations
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" color="primary">
                      {dashboardData.average_temperature ? formatTemperature(dashboardData.average_temperature) : 'N/A'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Average Temperature
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" color="primary">
                      {dashboardData.recent_weather.length}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Active Weather Records
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        )}

        {/* Current Weather */}
        {selectedLocationId && weatherData && (
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    {getWeatherIcon(weatherData.weather.icon, weatherData.weather.description)}
                    <Box sx={{ ml: 2 }}>
                      <Typography variant="h3" component="div">
                        {formatTemperature(weatherData.weather.temperature)}
                      </Typography>
                      <Typography variant="h6" color="text.secondary">
                        {weatherData.weather.description || 'Unknown'}
                      </Typography>
                    </Box>
                  </Box>
                  <Typography variant="h6" gutterBottom>
                    {weatherData.location.name} - {weatherData.location.city}, {weatherData.location.country}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Last updated: {formatDate(weatherData.weather.recorded_at)}
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
                        {weatherData.weather.humidity || 'N/A'}%
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
                        {weatherData.weather.wind_speed ? `${weatherData.weather.wind_speed} m/s` : 'N/A'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Wind Speed
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={6}>
                  <Card>
                    <CardContent sx={{ textAlign: 'center' }}>
                      <Compress sx={{ fontSize: 30, color: '#8B4513', mb: 1 }} />
                      <Typography variant="h6">
                        {weatherData.weather.pressure ? `${weatherData.weather.pressure} hPa` : 'N/A'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Pressure
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={6}>
                  <Card>
                    <CardContent sx={{ textAlign: 'center' }}>
                      <Visibility sx={{ fontSize: 30, color: '#4682B4', mb: 1 }} />
                      <Typography variant="h6">
                        {getWindDirection(weatherData.weather.wind_direction)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Wind Direction
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </Grid>
          </Grid>
        )}

        {/* Weather Statistics */}
        {weatherStats && (
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Weather Statistics for {weatherStats.location.name}
              </Typography>
              <Grid container spacing={3}>
                <Grid item xs={12} sm={3}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" color="primary">
                      {weatherStats.stats.total_records}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total Records
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={3}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" color="primary">
                      {weatherStats.stats.average_temperature ? formatTemperature(weatherStats.stats.average_temperature) : 'N/A'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Average Temperature
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'info.50', borderRadius: 2 }}>
                    <Typography variant="h4" color="primary">
                      {weatherStats.stats.temperature_range ? 
                        `${formatTemperature(weatherStats.stats.temperature_range.min)} - ${formatTemperature(weatherStats.stats.temperature_range.max)}` : 
                        'N/A'
                      }
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Temperature Range
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={3}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" color="primary">
                      {weatherStats.stats.most_common_conditions.length > 0 ? 
                        weatherStats.stats.most_common_conditions[0][0] : 
                        'N/A'
                      }
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Most Common
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
              
              {weatherStats.stats.most_common_conditions.length > 0 && (
                <Box sx={{ mt: 3 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Most Common Weather Conditions:
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {weatherStats.stats.most_common_conditions.map(([condition, count], index) => (
                      <Chip
                        key={index}
                        label={`${condition} (${count})`}
                        variant="outlined"
                        size="small"
                      />
                    ))}
                  </Box>
                </Box>
              )}
            </CardContent>
          </Card>
        )}

        {/* Temperature Trends */}
        {dashboardData?.temperature_trends && dashboardData.temperature_trends.length > 0 && (
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Temperature Trends (Last 7 Days)
              </Typography>
              <Box sx={{ mt: 2 }}>
                {dashboardData.temperature_trends.map((trend, index) => (
                  <Box key={index} sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2">
                        {new Date(trend.date).toLocaleDateString()}
                      </Typography>
                      <Typography variant="body2" color="primary">
                        {formatTemperature(trend.average_temp)}
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={((trend.average_temp + 20) / 50) * 100} // Normalize to 0-100 scale
                      sx={{ height: 8, borderRadius: 4 }}
                    />
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        )}

        {/* Recent Weather for All Locations */}
        {dashboardData?.recent_weather && dashboardData.recent_weather.length > 0 && (
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Recent Weather for All Locations
              </Typography>
              <TableContainer component={Paper} variant="outlined">
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Location</TableCell>
                      <TableCell>Temperature</TableCell>
                      <TableCell>Conditions</TableCell>
                      <TableCell>Humidity</TableCell>
                      <TableCell>Wind</TableCell>
                      <TableCell>Last Updated</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {dashboardData.recent_weather.map((item) => (
                      <TableRow key={item.location.id}>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <LocationOn fontSize="small" />
                            {item.location.name}
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="primary">
                            {formatTemperature(item.weather.temperature)}°{preferences.temperatureUnit}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {getWeatherIcon(item.weather.icon, item.weather.description)}
                            <Typography variant="body2">
                              {item.weather.description || 'Unknown'}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          {item.weather.humidity ? `${item.weather.humidity}%` : 'N/A'}
                        </TableCell>
                        <TableCell>
                          {item.weather.wind_speed ? `${item.weather.wind_speed} m/s` : 'N/A'}
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">
                            {formatDate(item.weather.recorded_at)}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        )}

        {/* Historical Weather Data Upload */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <History fontSize="small" />
              Upload Historical Weather Data
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Upload a JSON file with historical weather data to improve the accuracy of your weather statistics.
            </Typography>
            
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Select Location</InputLabel>
                  <Select
                    value={uploadLocationId}
                    onChange={(e) => setUploadLocationId(e.target.value as number)}
                    label="Select Location"
                  >
                    {locations.map((location) => (
                      <MenuItem key={location.id} value={location.id}>
                        {location.name}, {location.city}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Button
                  variant="outlined"
                  component="label"
                  fullWidth
                  startIcon={<Upload />}
                  disabled={uploading}
                >
                  {jsonFile ? jsonFile.name : 'Choose JSON File'}
                  <input
                    type="file"
                    hidden
                    accept=".json"
                    onChange={handleFileSelect}
                  />
                </Button>
              </Grid>
              
              <Grid item xs={12}>
                <Button
                  variant="contained"
                  onClick={handleUpload}
                  disabled={!uploadLocationId || !jsonFile || uploading}
                  fullWidth
                  startIcon={uploading ? <CircularProgress size={20} /> : <Upload />}
                >
                  {uploading ? 'Uploading...' : 'Upload Historical Data'}
                </Button>
              </Grid>
            </Grid>

            {/* Upload Progress */}
            {uploading && (
              <Box sx={{ mt: 2 }}>
                <LinearProgress variant="determinate" value={uploadProgress} />
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Uploading... {uploadProgress}%
                </Typography>
              </Box>
            )}

            {/* Upload Result */}
            {uploadResult && (
              <Box sx={{ mt: 3, p: 2, bgcolor: 'success.light', borderRadius: 1 }}>
                <Typography variant="h6" color="success.dark" gutterBottom>
                  Upload Successful!
                </Typography>
                <Typography variant="body2" color="success.dark">
                  Total records: {uploadResult.upload_stats.total_records} | 
                  Stored: {uploadResult.upload_stats.stored_records} | 
                  Skipped: {uploadResult.upload_stats.skipped_records}
                </Typography>
                {uploadResult.upload_stats.errors_count > 0 && (
                  <Typography variant="body2" color="warning.dark" sx={{ mt: 1 }}>
                    {uploadResult.upload_stats.errors_count} records had errors
                  </Typography>
                )}
                <Button
                  size="small"
                  onClick={clearUploadResult}
                  sx={{ mt: 1 }}
                >
                  Clear
                </Button>
              </Box>
            )}

            {/* File Format Instructions */}
            <Box sx={{ mt: 3, p: 2, bgcolor: 'info.light', borderRadius: 1 }}>
              <Typography variant="subtitle2" color="info.dark" gutterBottom>
                Expected JSON Format:
              </Typography>
              <Typography variant="body2" color="info.dark" component="pre" sx={{ fontSize: '0.8rem', overflow: 'auto' }}>
{`[
  {
    "date": "2024-01-15",
    "temperature": 22.5,
    "humidity": 65,
    "pressure": 1013,
    "wind_speed": 5.2,
    "wind_direction": 180,
    "description": "Partly cloudy",
    "icon": "02d"
  }
]`}
              </Typography>
              <Typography variant="caption" color="info.dark">
                Required fields: date, temperature. Optional: humidity, pressure, wind_speed, wind_direction, description, icon.
              </Typography>
            </Box>
          </CardContent>
        </Card>

        {/* Loading State */}
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        )}

        {/* No Location Selected */}
        {!selectedLocationId && !loading && (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <Typography variant="h6" color="text.secondary">
              Select a location to view weather information
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Choose from your saved locations to see current weather conditions
            </Typography>
          </Box>
        )}

        {/* No Locations Available */}
        {locations.length === 0 && !loading && (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <Typography variant="h6" color="text.secondary">
              No locations available
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Add some locations first to view weather information
            </Typography>
          </Box>
        )}
      </Box>
    </Container>
  );
};

export default Weather;
