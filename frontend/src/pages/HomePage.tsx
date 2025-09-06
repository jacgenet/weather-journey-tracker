import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  Grid,
  CircularProgress,
  Alert,
  Avatar,
  Button,
  AppBar,
  Toolbar,
  IconButton,
  Menu,
  MenuItem,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  WbSunny,
  Thermostat,
  LocationOn,
  Public,
  CalendarToday,
  Star,
  Air,
  Menu as MenuIcon,
  Logout as LogoutIcon,
  AccountCircle,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { peopleService } from '../services/peopleService';
import { usePreferences } from '../contexts/PreferencesContext';
import { useAuth } from '../contexts/AuthContext';

interface PersonStats {
  id: number;
  name: string;
  daysAlive: number;
  highestTemp: number;
  lowestTemp: number;
  avgTemp: number;
  totalVisits: number;
  countries: number;
  temperatureUnit: 'celsius' | 'fahrenheit';
}

const HomePage: React.FC = () => {
  const [personStats, setPersonStats] = useState<PersonStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const navigate = useNavigate();
  const { preferences } = usePreferences();
  const { logout } = useAuth();
  const temperatureUnit = preferences.temperatureUnit;
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  useEffect(() => {
    fetchPeopleAndStats();
  }, [temperatureUnit]);

  const fetchPeopleAndStats = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get basic stats and dashboard temperatures in parallel
      const [homepageData, dashboardTemps] = await Promise.all([
        peopleService.getHomepageStats(),
        peopleService.getDashboardTemps()
      ]);
      
      const { people } = homepageData;
      const { people_temps } = dashboardTemps;
      
      // Create a map of person_id to dashboard temperatures
      const tempMap = new Map();
      people_temps.forEach(temp => {
        tempMap.set(temp.person_id, {
          highest_temp: temp.highest_temp,
          lowest_temp: temp.lowest_temp,
          avg_temp: temp.avg_temp
        });
      });
      
      // Convert to the format expected by the UI
      const stats = people.map(person => {
        // Convert temperatures from Celsius to user's preferred unit
        const convertTemperature = (celsius: number): number => {
          if (temperatureUnit === 'fahrenheit') {
            return (celsius * 9/5) + 32;
          }
          return celsius;
        };
        
        // Use dashboard temperatures if available, otherwise fall back to homepage temps
        const temps = tempMap.get(person.id) || {
          highest_temp: person.highest_temp || 0,
          lowest_temp: person.lowest_temp || 0,
          avg_temp: 0  // No fallback for avg_temp since it's not in homepage data
        };
        
        return {
          id: person.id,
          name: person.first_name,
          daysAlive: person.days_alive,
          highestTemp: convertTemperature(temps.highest_temp),
          lowestTemp: convertTemperature(temps.lowest_temp),
          avgTemp: convertTemperature(temps.avg_temp),
          totalVisits: person.total_visits,
          countries: person.countries,
          temperatureUnit: temperatureUnit,
        };
      });

      setPersonStats(stats);
    } catch (error) {
      console.error('Error fetching people and stats:', error);
      setError('Failed to load people data');
    } finally {
      setLoading(false);
    }
  };



  const formatTemperature = (temp: number, unit: 'celsius' | 'fahrenheit'): string => {
    if (unit === 'fahrenheit') {
      return `${temp.toFixed(1)}°F`;
    } else {
      return `${temp.toFixed(1)}°C`;
    }
  };

  const handlePersonClick = (personId: number) => {
    navigate(`/app/people/${personId}`);
  };

  const handleProfileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleProfileMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleTitleClick = () => {
    navigate('/');
  };

  const menuItems = [
    // { text: 'Dashboard', path: '/app/dashboard' },
    { text: 'People', path: '/app/people' },
    { text: 'Locations', path: '/app/locations' },
    { text: 'Weather', path: '/app/weather' },
    { text: 'Profile', path: '/app/profile' },
  ];

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
    <Box sx={{ flexGrow: 1, minHeight: '100vh', backgroundColor: '#ffffff' }}>
      {/* Header - Airbnb Style */}
      <AppBar 
        position="sticky" 
        elevation={0} 
        sx={{ 
          backgroundColor: 'white', 
          color: 'black',
          borderBottom: '1px solid #e0e0e0',
          backdropFilter: 'blur(10px)',
        }}
      >
        <Toolbar sx={{ px: { xs: 2, sm: 3 }, py: 1 }}>
          <Button
            onClick={handleTitleClick}
            sx={{
              color: '#FF5A5F',
              fontSize: '1.8rem',
              fontWeight: 800,
              textTransform: 'none',
              letterSpacing: '-0.5px',
              '&:hover': {
                backgroundColor: 'rgba(255, 90, 95, 0.04)',
              },
            }}
            startIcon={<WbSunny sx={{ color: '#FF5A5F', fontSize: '1.5rem' }} />}
          >
            SunnyDays
          </Button>
          <Box sx={{ flexGrow: 1 }} />
          
          {/* Navigation Menu - Airbnb Style */}
          <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 1, alignItems: 'center' }}>
            {menuItems.map((item) => (
              <Button
                key={item.text}
                onClick={() => navigate(item.path)}
                sx={{ 
                  color: '#222222', 
                  fontWeight: 500,
                  textTransform: 'none',
                  px: 2,
                  py: 1,
                  borderRadius: '22px',
                  '&:hover': {
                    backgroundColor: '#f7f7f7',
                  }
                }}
              >
                {item.text}
              </Button>
            ))}
          </Box>

          {/* Mobile Menu Button */}
          <IconButton
            sx={{ display: { xs: 'block', md: 'none' }, ml: 2 }}
            onClick={handleProfileMenuOpen}
          >
            <MenuIcon sx={{ color: '#222222' }} />
          </IconButton>

          {/* Desktop Profile Menu */}
          <IconButton
            size="large"
            edge="end"
            aria-label="account of current user"
            aria-controls="menu-appbar"
            aria-haspopup="true"
            onClick={handleProfileMenuOpen}
            sx={{ 
              ml: 2,
              display: { xs: 'none', md: 'block' }
            }}
          >
            <AccountCircle sx={{ color: '#222222' }} />
          </IconButton>

          <Menu
            id="menu-appbar"
            anchorEl={anchorEl}
            anchorOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
            keepMounted
            transformOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
            open={Boolean(anchorEl)}
            onClose={handleProfileMenuClose}
            sx={{
              '& .MuiPaper-root': {
                borderRadius: '12px',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
                border: '1px solid #e0e0e0',
                mt: 1,
              }
            }}
          >
            {/* Mobile Navigation Items */}
            {isMobile && menuItems.map((item) => (
              <MenuItem 
                key={item.text}
                onClick={() => { 
                  navigate(item.path); 
                  handleProfileMenuClose(); 
                }}
                sx={{
                  color: '#222222',
                  fontWeight: 500,
                }}
              >
                {item.text}
              </MenuItem>
            ))}
            {isMobile && <Box sx={{ borderTop: '1px solid #e0e0e0', my: 1 }} />}
            <MenuItem onClick={() => { navigate('/app/profile'); handleProfileMenuClose(); }}>
              Profile
            </MenuItem>
            <MenuItem onClick={handleLogout}>
              <LogoutIcon sx={{ mr: 1 }} />
              Logout
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      {/* Main Content - Airbnb Style */}
      <Box sx={{ backgroundColor: '#f7f7f7', minHeight: '100vh' }}>
        <Container maxWidth="xl" sx={{ py: 6 }}>
          {/* Welcome Section */}
          <Box sx={{ mb: 6, textAlign: 'center' }}>
            <Typography
              variant="h3"
              sx={{
                fontWeight: 600,
                color: '#222222',
                mb: 2,
                fontSize: { xs: '2rem', md: '2.5rem' },
                letterSpacing: '-0.5px',
              }}
            >
              Welcome to your weather journey
            </Typography>
            <Typography
              variant="h6"
              sx={{
                color: '#717171',
                fontWeight: 400,
                maxWidth: '600px',
                mx: 'auto',
                lineHeight: 1.5,
              }}
            >
              Track your life's weather patterns and discover the climate stories of your travels
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {personStats.map((person) => (
              <Box key={person.id}>
                <Card
                  sx={{
                    borderRadius: '16px',
                    boxShadow: 'none',
                    border: '1px solid #e0e0e0',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease-in-out',
                    overflow: 'hidden',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: '0 8px 25px rgba(0,0,0,0.1)',
                      border: '1px solid #FF5A5F',
                    },
                  }}
                  onClick={() => handlePersonClick(person.id)}
                >
                  {/* Card Header with Avatar */}
                  <Box
                    sx={{
                      background: 'linear-gradient(135deg, #FF5A5F 0%, #FF8A80 100%)',
                      p: 3,
                      color: 'white',
                      position: 'relative',
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <Avatar
                        sx={{
                          width: 60,
                          height: 60,
                          backgroundColor: 'rgba(255,255,255,0.2)',
                          mr: 2,
                          fontSize: '1.5rem',
                          fontWeight: 600,
                        }}
                      >
                        {person.name.charAt(0).toUpperCase()}
                      </Avatar>
                      <Box>
                        <Typography
                          variant="h5"
                          sx={{
                            fontWeight: 600,
                            color: 'white',
                            mb: 0.5,
                          }}
                        >
                          {person.name}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Star sx={{ fontSize: '1rem', mr: 0.5, color: '#FFD700' }} />
                          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.9)' }}>
                            Weather Explorer
                          </Typography>
                        </Box>
                      </Box>
                    </Box>
                  </Box>

                  {/* Stats Section - Horizontal Layout */}
                  <CardContent sx={{ p: 3, backgroundColor: 'white' }}>
                    <Grid container spacing={3}>
                      {/* Days Alive */}
                      <Grid item xs={6} sm={4} md={2.4}>
                        <Box sx={{ textAlign: 'center' }}>
                          <Box
                            sx={{
                              width: 48,
                              height: 48,
                              borderRadius: '12px',
                              backgroundColor: '#E8F5E8',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              mx: 'auto',
                              mb: 1.5,
                            }}
                          >
                            <CalendarToday sx={{ color: '#00A699', fontSize: '1.5rem' }} />
                          </Box>
                          <Typography 
                            variant="h4" 
                            sx={{ 
                              fontWeight: 600, 
                              color: '#222222',
                              mb: 0.5,
                              fontSize: '1.8rem',
                            }}
                          >
                            {person.daysAlive.toLocaleString()}
                          </Typography>
                          <Typography 
                            variant="body2" 
                            sx={{ 
                              color: '#717171',
                              fontWeight: 500,
                              fontSize: '0.875rem',
                            }}
                          >
                            Days Alive
                          </Typography>
                        </Box>
                      </Grid>

                      {/* Highest Temperature */}
                      <Grid item xs={6} sm={4} md={2.4}>
                        <Box sx={{ textAlign: 'center' }}>
                          <Box
                            sx={{
                              width: 48,
                              height: 48,
                              borderRadius: '12px',
                              backgroundColor: '#FFF2E8',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              mx: 'auto',
                              mb: 1.5,
                            }}
                          >
                            <Thermostat sx={{ color: '#FF5A5F', fontSize: '1.5rem' }} />
                          </Box>
                          <Typography 
                            variant="h4" 
                            sx={{ 
                              fontWeight: 600, 
                              color: '#222222',
                              mb: 0.5,
                              fontSize: '1.8rem',
                            }}
                          >
                            {formatTemperature(person.highestTemp, person.temperatureUnit)}
                          </Typography>
                          <Typography 
                            variant="body2" 
                            sx={{ 
                              color: '#717171',
                              fontWeight: 500,
                              fontSize: '0.875rem',
                            }}
                          >
                            Highest Temp
                          </Typography>
                        </Box>
                      </Grid>

                      {/* Lowest Temperature */}
                      <Grid item xs={6} sm={4} md={2.4}>
                        <Box sx={{ textAlign: 'center' }}>
                          <Box
                            sx={{
                              width: 48,
                              height: 48,
                              borderRadius: '12px',
                              backgroundColor: '#E8F4FD',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              mx: 'auto',
                              mb: 1.5,
                            }}
                          >
                            <Air sx={{ color: '#0088CC', fontSize: '1.5rem' }} />
                          </Box>
                          <Typography 
                            variant="h4" 
                            sx={{ 
                              fontWeight: 600, 
                              color: '#222222',
                              mb: 0.5,
                              fontSize: '1.8rem',
                            }}
                          >
                            {formatTemperature(person.lowestTemp, person.temperatureUnit)}
                          </Typography>
                          <Typography 
                            variant="body2" 
                            sx={{ 
                              color: '#717171',
                              fontWeight: 500,
                              fontSize: '0.875rem',
                            }}
                          >
                            Lowest Temp
                          </Typography>
                        </Box>
                      </Grid>

                      {/* Average Temperature */}
                      <Grid item xs={6} sm={4} md={2.4}>
                        <Box sx={{ textAlign: 'center' }}>
                          <Box
                            sx={{
                              width: 48,
                              height: 48,
                              borderRadius: '12px',
                              backgroundColor: '#F0FDF4',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              mx: 'auto',
                              mb: 1.5,
                            }}
                          >
                            <Thermostat sx={{ color: '#10B981', fontSize: '1.5rem' }} />
                          </Box>
                          <Typography 
                            variant="h4" 
                            sx={{ 
                              fontWeight: 600, 
                              color: '#222222',
                              mb: 0.5,
                              fontSize: '1.8rem',
                            }}
                          >
                            {formatTemperature(person.avgTemp, person.temperatureUnit)}
                          </Typography>
                          <Typography 
                            variant="body2" 
                            sx={{ 
                              color: '#717171',
                              fontWeight: 500,
                              fontSize: '0.875rem',
                            }}
                          >
                            Average Temp
                          </Typography>
                        </Box>
                      </Grid>

                      {/* Total Visits */}
                      <Grid item xs={6} sm={4} md={2.4}>
                        <Box sx={{ textAlign: 'center' }}>
                          <Box
                            sx={{
                              width: 48,
                              height: 48,
                              borderRadius: '12px',
                              backgroundColor: '#F0F8FF',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              mx: 'auto',
                              mb: 1.5,
                            }}
                          >
                            <LocationOn sx={{ color: '#9148FF', fontSize: '1.5rem' }} />
                          </Box>
                          <Typography 
                            variant="h4" 
                            sx={{ 
                              fontWeight: 600, 
                              color: '#222222',
                              mb: 0.5,
                              fontSize: '1.8rem',
                            }}
                          >
                            {person.totalVisits}
                          </Typography>
                          <Typography 
                            variant="body2" 
                            sx={{ 
                              color: '#717171',
                              fontWeight: 500,
                              fontSize: '0.875rem',
                            }}
                          >
                            Total Visits
                          </Typography>
                        </Box>
                      </Grid>

                      {/* Countries Visited */}
                      <Grid item xs={6} sm={4} md={2.4}>
                        <Box sx={{ textAlign: 'center' }}>
                          <Box
                            sx={{
                              width: 48,
                              height: 48,
                              borderRadius: '12px',
                              backgroundColor: '#FFF8E1',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              mx: 'auto',
                              mb: 1.5,
                            }}
                          >
                            <Public sx={{ color: '#FFB400', fontSize: '1.5rem' }} />
                          </Box>
                          <Typography 
                            variant="h4" 
                            sx={{ 
                              fontWeight: 600, 
                              color: '#222222',
                              mb: 0.5,
                              fontSize: '1.8rem',
                            }}
                          >
                            {person.countries}
                          </Typography>
                          <Typography 
                            variant="body2" 
                            sx={{ 
                              color: '#717171',
                              fontWeight: 500,
                              fontSize: '0.875rem',
                            }}
                          >
                            Countries
                          </Typography>
                        </Box>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Box>
            ))}
          </Box>

          {/* Empty State */}
          {personStats.length === 0 && (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <Box
                sx={{
                  width: 120,
                  height: 120,
                  borderRadius: '50%',
                  backgroundColor: '#f7f7f7',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mx: 'auto',
                  mb: 3,
                }}
              >
                <WbSunny sx={{ fontSize: '3rem', color: '#717171' }} />
              </Box>
              <Typography
                variant="h5"
                sx={{
                  fontWeight: 600,
                  color: '#222222',
                  mb: 2,
                }}
              >
                No weather data yet
              </Typography>
              <Typography
                variant="body1"
                sx={{
                  color: '#717171',
                  mb: 4,
                  maxWidth: '400px',
                  mx: 'auto',
                }}
              >
                Start tracking your weather journey by adding locations and people to your account.
              </Typography>
              <Button
                variant="contained"
                onClick={() => navigate('/app/people')}
                sx={{
                  backgroundColor: '#FF5A5F',
                  borderRadius: '8px',
                  px: 4,
                  py: 1.5,
                  fontWeight: 600,
                  textTransform: 'none',
                  '&:hover': {
                    backgroundColor: '#E00007',
                  },
                }}
              >
                Get Started
              </Button>
            </Box>
          )}
        </Container>
      </Box>
    </Box>
  );
};

export default HomePage;
