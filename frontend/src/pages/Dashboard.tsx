import React, { useState, useEffect } from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  CircularProgress,
  Alert,
  Paper,
} from '@mui/material';
import {
  Thermostat,
  LocationOn,
  WbSunny,
  TrendingUp,
} from '@mui/icons-material';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface WeatherData {
  location: {
    id: number;
    name: string;
    city: string;
    country: string;
  };
  weather: {
    temperature: number;
    description: string;
    humidity: number;
    recorded_at: string;
  };
}

interface DashboardData {
  total_locations: number;
  average_temperature: number;
  recent_weather: WeatherData[];
  temperature_trends: Array<{
    date: string;
    average_temp: number;
  }>;
}

const Dashboard: React.FC = () => {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await fetch('/api/weather/dashboard', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch dashboard data');
      }
      
      const data = await response.json();
      setDashboardData(data);
    } catch (err) {
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const chartData = {
    labels: dashboardData?.temperature_trends.map(item => 
      new Date(item.date).toLocaleDateString()
    ) || [],
    datasets: [
      {
        label: 'Average Temperature (°C)',
        data: dashboardData?.temperature_trends.map(item => item.average_temp) || [],
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.5)',
        tension: 0.1,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Temperature Trends (Last 7 Days)',
      },
    },
    scales: {
      y: {
        beginAtZero: false,
      },
    },
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
      </Alert>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Dashboard
      </Typography>
      
      <Grid container spacing={3}>
        {/* Statistics Cards */}
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <LocationOn color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">Total Locations</Typography>
              </Box>
              <Typography variant="h4" color="primary">
                {dashboardData?.total_locations || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <Thermostat color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">Avg Temperature</Typography>
              </Box>
              <Typography variant="h4" color="primary">
                {dashboardData?.average_temperature 
                  ? `${dashboardData.average_temperature}°C`
                  : 'N/A'
                }
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <WbSunny color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">Recent Weather</Typography>
              </Box>
              <Typography variant="h4" color="primary">
                {dashboardData?.recent_weather.length || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <TrendingUp color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">Trends</Typography>
              </Box>
              <Typography variant="h4" color="primary">
                {dashboardData?.temperature_trends.length || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Temperature Chart */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Temperature Trends
              </Typography>
              {dashboardData?.temperature_trends.length ? (
                <Line data={chartData} options={chartOptions} />
              ) : (
                <Box display="flex" justifyContent="center" alignItems="center" height={200}>
                  <Typography color="textSecondary">
                    No temperature data available
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Weather */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Recent Weather
              </Typography>
              {dashboardData?.recent_weather.length ? (
                <Box>
                  {dashboardData.recent_weather.slice(0, 5).map((item, index) => (
                    <Box key={index} mb={2} p={2} bgcolor="grey.50" borderRadius={1}>
                      <Typography variant="subtitle2" color="primary">
                        {item.location.name}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        {item.location.city}, {item.location.country}
                      </Typography>
                      <Box display="flex" alignItems="center" mt={1}>
                        <Typography variant="h6" color="primary" sx={{ mr: 1 }}>
                          {item.weather.temperature}°C
                        </Typography>
                        <Chip 
                          label={item.weather.description} 
                          size="small" 
                          color="secondary" 
                        />
                      </Box>
                    </Box>
                  ))}
                </Box>
              ) : (
                <Typography color="textSecondary">
                  No recent weather data
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard; 