import React, { useState, useEffect } from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  CircularProgress,
  Alert,
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Divider,
  Button,
} from '@mui/material';
import {
  Thermostat,
  LocationOn,
  WbSunny,
  People,
  CalendarToday,
  Visibility,
  Add,
  Person,
  Timeline,
} from '@mui/icons-material';
import { Line, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { useAuth } from '../contexts/AuthContext';
import { peopleService } from '../services/peopleService';
import { locationService } from '../services/locationService';
import { weatherService } from '../services/weatherService';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

interface DashboardData {
  total_locations: number;
  total_people: number;
  total_visits: number;
  countries_visited: number;
  cities_visited: number;
  average_temperature: number;
  recent_weather: any[];
  temperature_trends: Array<{
    date: string;
    average_temp: number;
  }>;
  people_stats: {
    total_people: number;
    people_with_visits: number;
    average_visits_per_person: number;
    most_visited_location: string;
  };
  location_stats: {
    total_locations: number;
    countries_visited: number;
    cities_visited: number;
    most_visited_country: string;
  };
  recent_activity: Array<{
    type: 'visit' | 'location' | 'person';
    description: string;
    timestamp: string;
    icon: string;
  }>;
}

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [recentPeople, setRecentPeople] = useState<any[]>([]);
  const [recentLocations, setRecentLocations] = useState<any[]>([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch data from multiple services
      const [people, locations, weatherData] = await Promise.all([
        peopleService.getPeople(),
        locationService.getLocations(),
        weatherService.getWeatherDashboard().catch(() => null)
      ]);

      // Calculate statistics
      const totalVisits = people.reduce((sum, person) => sum + (person.visit_count || 0), 0);
      const peopleWithVisits = people.filter(person => (person.visit_count || 0) > 0).length;
      const averageVisitsPerPerson = people.length > 0 ? (totalVisits / people.length).toFixed(1) : 0;
      
      // Get unique countries and cities
      const countries = new Set(locations.map(loc => loc.country));
      const cities = new Set(locations.map(loc => `${loc.city}, ${loc.country}`));
      
      // Find most visited country
      const countryCounts = locations.reduce((acc, loc) => {
        acc[loc.country] = (acc[loc.country] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      const mostVisitedCountry = Object.entries(countryCounts)
        .sort(([,a], [,b]) => b - a)[0]?.[0] || 'None';

      // Create recent activity
      const recentActivity = [
        ...people.slice(0, 3).map(person => ({
          type: 'person' as const,
          description: `Added ${person.full_name}`,
          timestamp: person.created_at || new Date().toISOString(),
          icon: '👤'
        })),
        ...locations.slice(0, 3).map(location => ({
          type: 'location' as const,
          description: `Added ${location.name}`,
          timestamp: new Date().toISOString(), // Use current date since locations don't have created_at
          icon: '📍'
        }))
      ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
       .slice(0, 5);

      const dashboardData: DashboardData = {
        total_locations: locations.length,
        total_people: people.length,
        total_visits: totalVisits,
        countries_visited: countries.size,
        cities_visited: cities.size,
        average_temperature: weatherData?.average_temperature || 0,
        recent_weather: weatherData?.recent_weather || [],
        temperature_trends: weatherData?.temperature_trends || [],
        people_stats: {
          total_people: people.length,
          people_with_visits: peopleWithVisits,
          average_visits_per_person: parseFloat(averageVisitsPerPerson.toString()),
          most_visited_location: 'Coming Soon'
        },
        location_stats: {
          total_locations: locations.length,
          countries_visited: countries.size,
          cities_visited: cities.size,
          most_visited_country: mostVisitedCountry
        },
        recent_activity: recentActivity
      };

      setDashboardData(dashboardData);
      setRecentPeople(people.slice(0, 3));
      setRecentLocations(locations.slice(0, 3));
      
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
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

  const peopleChartData = {
    labels: ['People with Visits', 'People without Visits'],
    datasets: [
      {
        data: [
          dashboardData?.people_stats.people_with_visits || 0,
          (dashboardData?.people_stats.total_people || 0) - (dashboardData?.people_stats.people_with_visits || 0)
        ],
        backgroundColor: [
          'rgba(54, 162, 235, 0.8)',
          'rgba(201, 201, 201, 0.8)'
        ],
        borderColor: [
          'rgba(54, 162, 235, 1)',
          'rgba(201, 201, 201, 1)'
        ],
        borderWidth: 1,
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

  const peopleChartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'bottom' as const,
      },
      title: {
        display: true,
        text: 'People Overview',
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
    <Box sx={{ p: 3 }}>
      {/* Welcome Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h3" gutterBottom sx={{ fontWeight: 'bold', color: 'primary.main' }}>
          Welcome back, {user?.first_name || 'Weather Explorer'}! 🌤️
        </Typography>
        <Typography variant="h6" color="text.secondary">
          Here's what's happening with your weather journey today
        </Typography>
      </Box>

      {/* Main Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ 
            height: '100%',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white'
          }}>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <People sx={{ mr: 1, fontSize: 28 }} />
                <Typography variant="h6">People</Typography>
              </Box>
              <Typography variant="h3" sx={{ fontWeight: 'bold' }}>
                {dashboardData?.total_people || 0}
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.8 }}>
                {dashboardData?.people_stats.people_with_visits || 0} with visits
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ 
            height: '100%',
            background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
            color: 'white'
          }}>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <LocationOn sx={{ mr: 1, fontSize: 28 }} />
                <Typography variant="h6">Locations</Typography>
              </Box>
              <Typography variant="h3" sx={{ fontWeight: 'bold' }}>
                {dashboardData?.total_locations || 0}
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.8 }}>
                {dashboardData?.countries_visited || 0} countries
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ 
            height: '100%',
            background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
            color: 'white'
          }}>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <CalendarToday sx={{ mr: 1, fontSize: 28 }} />
                <Typography variant="h6">Visits</Typography>
              </Box>
              <Typography variant="h3" sx={{ fontWeight: 'bold' }}>
                {dashboardData?.total_visits || 0}
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.8 }}>
                {dashboardData?.people_stats.average_visits_per_person || 0} avg per person
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ 
            height: '100%',
            background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
            color: 'white'
          }}>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <Thermostat sx={{ mr: 1, fontSize: 28 }} />
                <Typography variant="h6">Weather</Typography>
              </Box>
              <Typography variant="h3" sx={{ fontWeight: 'bold' }}>
                {dashboardData?.recent_weather.length || 0}
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.8 }}>
                Recent records
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Charts and Detailed Stats */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Temperature Chart */}
        <Grid item xs={12} lg={8}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold' }}>
                Temperature Trends
              </Typography>
              {dashboardData?.temperature_trends.length ? (
                <Line data={chartData} options={chartOptions} />
              ) : (
                <Box display="flex" justifyContent="center" alignItems="center" height={300}>
                  <Box textAlign="center">
                    <WbSunny sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                    <Typography variant="h6" color="textSecondary" gutterBottom>
                      No temperature data yet
                    </Typography>
                    <Typography color="textSecondary">
                      Start tracking weather at your locations to see trends
                    </Typography>
                  </Box>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* People Distribution Chart */}
        <Grid item xs={12} lg={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold' }}>
                People Overview
              </Typography>
              {dashboardData?.total_people ? (
                <Box sx={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Doughnut data={peopleChartData} options={peopleChartOptions} />
                </Box>
              ) : (
                <Box display="flex" justifyContent="center" alignItems="center" height={300}>
                  <Box textAlign="center">
                    <Person sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                    <Typography variant="h6" color="textSecondary" gutterBottom>
                      No people yet
                    </Typography>
                    <Typography color="textSecondary">
                      Add people to start tracking visits
                    </Typography>
                  </Box>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Recent Activity and Quick Actions */}
      <Grid container spacing={3}>
        {/* Recent Activity */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                  Recent Activity
                </Typography>
                <Timeline color="primary" />
              </Box>
              {dashboardData?.recent_activity.length ? (
                <List>
                  {dashboardData.recent_activity.map((activity, index) => (
                    <React.Fragment key={index}>
                      <ListItem sx={{ px: 0 }}>
                        <ListItemAvatar>
                          <Avatar sx={{ bgcolor: 'primary.main' }}>
                            {activity.icon}
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={activity.description}
                          secondary={new Date(activity.timestamp).toLocaleDateString()}
                        />
                      </ListItem>
                      {index < dashboardData.recent_activity.length - 1 && <Divider />}
                    </React.Fragment>
                  ))}
                </List>
              ) : (
                <Box textAlign="center" py={3}>
                  <Typography color="textSecondary">
                    No recent activity
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Quick Actions */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold' }}>
                Quick Actions
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Button
                    variant="contained"
                    fullWidth
                    startIcon={<Add />}
                    sx={{ mb: 2 }}
                    onClick={() => window.location.href = '/people'}
                  >
                    Add Person
                  </Button>
                  <Button
                    variant="outlined"
                    fullWidth
                    startIcon={<LocationOn />}
                    onClick={() => window.location.href = '/locations'}
                  >
                    Add Location
                  </Button>
                </Grid>
                <Grid item xs={6}>
                  <Button
                    variant="outlined"
                    fullWidth
                    startIcon={<CalendarToday />}
                    sx={{ mb: 2 }}
                    onClick={() => window.location.href = '/people'}
                  >
                    Record Visit
                  </Button>
                  <Button
                    variant="outlined"
                    fullWidth
                    startIcon={<WbSunny />}
                    onClick={() => window.location.href = '/weather'}
                  >
                    Check Weather
                  </Button>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Recent People and Locations */}
      <Grid container spacing={3} sx={{ mt: 2 }}>
        {/* Recent People */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                  Recent People
                </Typography>
                <Button
                  size="small"
                  onClick={() => window.location.href = '/people'}
                  endIcon={<Visibility />}
                >
                  View All
                </Button>
              </Box>
              {recentPeople.length > 0 ? (
                <List>
                  {recentPeople.map((person, index) => (
                    <React.Fragment key={person.id}>
                      <ListItem sx={{ px: 0 }}>
                        <ListItemAvatar>
                          <Avatar sx={{ bgcolor: 'primary.main' }}>
                            {person.first_name.charAt(0)}
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={person.full_name}
                          secondary={`${person.visit_count || 0} visits • ${person.home_location || 'No home location'}`}
                        />
                      </ListItem>
                      {index < recentPeople.length - 1 && <Divider />}
                    </React.Fragment>
                  ))}
                </List>
              ) : (
                <Box textAlign="center" py={3}>
                  <Typography color="textSecondary">
                    No people added yet
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Locations */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                  Recent Locations
                </Typography>
                <Button
                  size="small"
                  onClick={() => window.location.href = '/locations'}
                  endIcon={<Visibility />}
                >
                  View All
                </Button>
              </Box>
              {recentLocations.length > 0 ? (
                <List>
                  {recentLocations.map((location, index) => (
                    <React.Fragment key={location.id}>
                      <ListItem sx={{ px: 0 }}>
                        <ListItemAvatar>
                          <Avatar sx={{ bgcolor: 'secondary.main' }}>
                            <LocationOn />
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={location.name}
                          secondary={`${location.city}, ${location.country}`}
                        />
                      </ListItem>
                      {index < recentLocations.length - 1 && <Divider />}
                    </React.Fragment>
                  ))}
                </List>
              ) : (
                <Box textAlign="center" py={3}>
                  <Typography color="textSecondary">
                    No locations added yet
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard; 