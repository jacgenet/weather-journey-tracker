import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  Grid,
  Chip,
  CircularProgress,
  Alert,
  Button,
  IconButton,
  Toolbar,
  AppBar,
} from '@mui/material';
import {
  Home,
  Menu,
  WbSunny,
  Thermostat,
  LocationOn,
  Public,
  CalendarToday,
  Cloud,
  Map,
  People as PeopleIcon,
  Settings,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { peopleService, Person } from '../services/peopleService';
import { weatherService } from '../services/weatherService';
import { usePreferences } from '../contexts/PreferencesContext';

interface PersonStats {
  id: number;
  name: string;
  daysAlive: number;
  highestTemp: number;
  lowestTemp: number;
  totalVisits: number;
  countries: number;
  temperatureUnit: 'C' | 'F';
}

const HomePage: React.FC = () => {
  const [people, setPeople] = useState<Person[]>([]);
  const [personStats, setPersonStats] = useState<PersonStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { temperatureUnit } = usePreferences();

  useEffect(() => {
    fetchPeopleAndStats();
  }, [temperatureUnit]);

  const fetchPeopleAndStats = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all people
      const peopleData = await peopleService.getPeople();
      setPeople(peopleData);

      // Calculate stats for each person
      const statsPromises = peopleData.map(async (person) => {
        try {
          // Get person's timeline events for stats calculation
          const timelineEvents = await getPersonTimelineEvents(person.id);
          
          // Calculate days alive
          const daysAlive = calculateDaysAlive(person.birth_date);
          
          // Calculate temperature stats
          const tempStats = await calculateTemperatureStats(person.id, timelineEvents);
          
          // Calculate visit and country stats
          const visitStats = calculateVisitStats(timelineEvents);
          
          return {
            id: person.id,
            name: person.first_name,
            daysAlive,
            highestTemp: tempStats.highest,
            lowestTemp: tempStats.lowest,
            totalVisits: visitStats.totalVisits,
            countries: visitStats.countries,
            temperatureUnit: temperatureUnit,
          };
        } catch (error) {
          console.error(`Error calculating stats for ${person.first_name}:`, error);
          return {
            id: person.id,
            name: person.first_name,
            daysAlive: 0,
            highestTemp: 0,
            lowestTemp: 0,
            totalVisits: 0,
            countries: 0,
            temperatureUnit: temperatureUnit,
          };
        }
      });

      const stats = await Promise.all(statsPromises);
      setPersonStats(stats);
    } catch (error) {
      console.error('Error fetching people and stats:', error);
      setError('Failed to load people data');
    } finally {
      setLoading(false);
    }
  };

  const getPersonTimelineEvents = async (personId: number) => {
    try {
      // This would need to be implemented in the backend
      // For now, return empty array
      return [];
    } catch (error) {
      console.error('Error fetching timeline events:', error);
      return [];
    }
  };

  const calculateDaysAlive = (birthDate?: string): number => {
    if (!birthDate) return 0;
    const birth = new Date(birthDate);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - birth.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const calculateTemperatureStats = async (personId: number, timelineEvents: any[]) => {
    // This would calculate from weather data
    // For now, return mock data
    return {
      highest: temperatureUnit === 'F' ? 102.5 : 39.2,
      lowest: temperatureUnit === 'F' ? 50.6 : 10.3,
    };
  };

  const calculateVisitStats = (timelineEvents: any[]) => {
    // This would calculate from timeline events
    // For now, return mock data
    return {
      totalVisits: 6,
      countries: 2,
    };
  };

  const formatTemperature = (temp: number, unit: 'C' | 'F'): string => {
    if (unit === 'F') {
      return `${temp.toFixed(1)}°F`;
    } else {
      return `${temp.toFixed(1)}°C`;
    }
  };

  const handlePersonClick = (personId: number) => {
    navigate(`/app/people/${personId}`);
  };

  const handleTitleClick = () => {
    navigate('/');
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  return (
    <Box sx={{ flexGrow: 1, minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      {/* Header */}
      <AppBar position="static" elevation={0} sx={{ backgroundColor: 'white', color: 'black' }}>
        <Toolbar>
          <Button
            onClick={handleTitleClick}
            sx={{
              color: 'black',
              fontSize: '1.5rem',
              fontWeight: 'bold',
              textTransform: 'none',
              '&:hover': {
                backgroundColor: 'rgba(0,0,0,0.04)',
              },
            }}
            startIcon={<WbSunny sx={{ color: '#ff9800' }} />}
          >
            My Sunny Days
          </Button>
          <Box sx={{ flexGrow: 1 }} />
          <Button
            onClick={() => navigate('/app/weather')}
            startIcon={<Cloud />}
            sx={{ color: 'black', mr: 1 }}
          >
            Weather
          </Button>
          <Button
            onClick={() => navigate('/app/locations')}
            startIcon={<Map />}
            sx={{ color: 'black', mr: 1 }}
          >
            Locations
          </Button>
          <Button
            onClick={() => navigate('/app/people')}
            startIcon={<PeopleIcon />}
            sx={{ color: 'black', mr: 1 }}
          >
            People
          </Button>
          <Button
            onClick={() => navigate('/app/profile')}
            startIcon={<Settings />}
            sx={{ color: 'black' }}
          >
            Profile
          </Button>
        </Toolbar>
      </AppBar>

      {/* Main Content */}
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Grid container spacing={3}>
          {personStats.map((person) => (
            <Grid item xs={12} key={person.id}>
              <Card
                sx={{
                  borderRadius: 3,
                  boxShadow: 3,
                  cursor: 'pointer',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: 6,
                  },
                }}
                onClick={() => handlePersonClick(person.id)}
              >
                <CardContent sx={{ p: 3 }}>
                  {/* Person Name */}
                  <Typography
                    variant="h4"
                    component="h2"
                    sx={{
                      fontWeight: 'bold',
                      mb: 3,
                      color: 'primary.main',
                      textTransform: 'uppercase',
                    }}
                  >
                    {person.name}
                  </Typography>

                  {/* Stats Grid */}
                  <Grid container spacing={2}>
                    {/* Days Alive */}
                    <Grid item xs={12} sm={6} md={3}>
                      <Box
                        sx={{
                          p: 2,
                          backgroundColor: 'primary.light',
                          borderRadius: 2,
                          textAlign: 'center',
                        }}
                      >
                        <CalendarToday sx={{ color: 'primary.main', mb: 1 }} />
                        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                          Days Alive
                        </Typography>
                        <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                          {person.daysAlive.toLocaleString()}
                        </Typography>
                      </Box>
                    </Grid>

                    {/* Temperature Stats */}
                    <Grid item xs={12} sm={6} md={3}>
                      <Box
                        sx={{
                          p: 2,
                          backgroundColor: 'warning.light',
                          borderRadius: 2,
                          textAlign: 'center',
                        }}
                      >
                        <Thermostat sx={{ color: 'warning.main', mb: 1 }} />
                        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                          Highest Temp
                        </Typography>
                        <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'warning.main' }}>
                          {formatTemperature(person.highestTemp, person.temperatureUnit)}
                        </Typography>
                      </Box>
                    </Grid>

                    <Grid item xs={12} sm={6} md={3}>
                      <Box
                        sx={{
                          p: 2,
                          backgroundColor: 'info.light',
                          borderRadius: 2,
                          textAlign: 'center',
                        }}
                      >
                        <Thermostat sx={{ color: 'info.main', mb: 1 }} />
                        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                          Lowest Temp
                        </Typography>
                        <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'info.main' }}>
                          {formatTemperature(person.lowestTemp, person.temperatureUnit)}
                        </Typography>
                      </Box>
                    </Grid>

                    {/* Visit Stats */}
                    <Grid item xs={12} sm={6} md={3}>
                      <Box
                        sx={{
                          p: 2,
                          backgroundColor: 'success.light',
                          borderRadius: 2,
                          textAlign: 'center',
                        }}
                      >
                        <LocationOn sx={{ color: 'success.main', mb: 1 }} />
                        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                          Total Visits
                        </Typography>
                        <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'success.main' }}>
                          {person.totalVisits}
                        </Typography>
                      </Box>
                    </Grid>

                    {/* Countries */}
                    <Grid item xs={12} sm={6} md={3}>
                      <Box
                        sx={{
                          p: 2,
                          backgroundColor: 'secondary.light',
                          borderRadius: 2,
                          textAlign: 'center',
                        }}
                      >
                        <Public sx={{ color: 'secondary.main', mb: 1 }} />
                        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                          Countries
                        </Typography>
                        <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'secondary.main' }}>
                          {person.countries}
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
  );
};

export default HomePage;
