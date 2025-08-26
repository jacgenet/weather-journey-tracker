import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  Grid,
  Avatar,
  Chip,
  CircularProgress,
  Alert,
  Paper,
  Button,
  IconButton,
  FormControl,
  Select,
  MenuItem,
  SelectChangeEvent,
} from '@mui/material';
import {
  Person,
  LocationOn,
  WbSunny,
  CalendarToday,
  Home,
  ArrowBack,
  Cloud,
  Visibility,
  Add,
  Edit,
  Thermostat,
  CheckCircle,
  Warning,
  Info,
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { peopleService, Person as PersonType } from '../services/peopleService';
import { locationService, Location as LocationType } from '../services/locationService';
import { weatherService } from '../services/weatherService';
import { countUniqueCountries } from '../utils/countryUtils';
import { usePreferences, TemperatureUnit } from '../contexts/PreferencesContext';

interface TimelineEvent {
  id: string;
  date: Date;
  type: 'birth' | 'home' | 'visit';
  title: string;
  description: string;
  location?: LocationType;
  weather?: {
    temperature: number;
    description: string;
    humidity: number;
  };
  periodWeatherStats?: {
    average_temperature: number;
    highest_temperature: number;
    lowest_temperature: number;
    total_records: number;
    data_exists: boolean;
    data_coverage: 'complete' | 'partial' | 'fallback';
    days_with_data?: number;
    total_days?: number;
    coverage_percentage?: number;
  };
  icon: React.ReactElement;
  color: 'primary' | 'secondary' | 'success' | 'info' | 'warning';
  isCurrentLocation?: boolean;
}

const PersonDashboard: React.FC = () => {
  const { personId } = useParams<{ personId: string }>();
  const navigate = useNavigate();
  const [person, setPerson] = useState<PersonType | null>(null);
  const [locations, setLocations] = useState<LocationType[]>([]);
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { preferences, formatTemperature, setTemperatureUnit } = usePreferences();

  // Format dates consistently using explicit date parsing
  const formatDateConsistent = (dateString: string) => {
    // Parse ISO date string and ensure consistent formatting
    const date = new Date(dateString + 'T00:00:00'); // Add time to avoid timezone issues
    return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
  };

  const handleTemperatureUnitChange = (event: SelectChangeEvent<TemperatureUnit>) => {
    setTemperatureUnit(event.target.value as TemperatureUnit);
  };

  useEffect(() => {
    const fetchPersonData = async () => {
      if (!personId) return;
      
      try {
        setLoading(true);
        console.log('🔍 Fetching person data for ID:', personId);
        
        const personData = await peopleService.getPerson(parseInt(personId));
        const allLocations = await locationService.getLocations();
        
        console.log('👤 Person data:', personData);
        console.log('📍 All locations:', allLocations);
        
        setPerson(personData);
        setLocations(allLocations);

        // Create timeline events
        const events: TimelineEvent[] = [];
        
        // Add birth event
        if (personData.birth_date) {
          const birthDate = new Date(personData.birth_date);
          const homeLocation = allLocations.find(loc => loc.id === personData.home_location_id);
          if (homeLocation) {
            events.push({
              id: 'birth',
              date: birthDate,
              type: 'birth',
              title: 'Started at Home',
              description: `Started living at: ${homeLocation.name}, ${homeLocation.city}, ${homeLocation.country} - ${formatDateConsistent(personData.birth_date)}`,
              location: homeLocation,
              icon: React.createElement(Home),
              color: 'primary'
            });
          }
        }

        // Add visit events and home events between visits
        const sortedVisits = personData.visits?.sort((a, b) => 
          new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
        ) || [];

        sortedVisits.forEach((visit, index) => {
          const visitLocation = allLocations.find(loc => loc.id === visit.location_id);
          if (visitLocation) {
            console.log(`📅 Processing visit ${visit.id}:`, {
              start_date: visit.start_date,
              end_date: visit.end_date,
              parsed_start: new Date(visit.start_date),
              parsed_end: visit.end_date ? new Date(visit.end_date) : 'No end date'
            });
            
            // Add home event before this visit (if not the first visit)
            if (index > 0) {
              const previousVisit = sortedVisits[index - 1];
              const previousVisitEnd = new Date(previousVisit.end_date || previousVisit.start_date);
              const currentVisitStart = new Date(visit.start_date);
              
              console.log(`🔄 Visit ${index}: Previous visit ended ${previousVisitEnd.toISOString()}, current visit starts ${currentVisitStart.toISOString()}`);
              
              if (previousVisitEnd < currentVisitStart) {
                console.log('🏠 Gap detected, adding returned home event');
                const homeLocation = allLocations.find(loc => loc.id === personData.home_location_id);
                if (homeLocation) {
                  events.push({
                    id: `home-${previousVisit.id}-${visit.id}`,
                    date: previousVisitEnd,
                    type: 'home',
                    title: 'Returned Home',
                    description: `Returned home: ${homeLocation.name}, ${homeLocation.city}, ${homeLocation.country} - ${formatDateConsistent(previousVisit.end_date || previousVisit.start_date)}`,
                    location: homeLocation,
                    icon: React.createElement(Home),
                    color: 'primary'
                  });
                  console.log('🏠 Added returned home event');
                } else {
                  console.log('❌ Home location not found for gap-filling');
                }
              } else {
                console.log('⏭️ No gap between visits, skipping home event');
              }
            }

           // Add the visit event
           const visitStartDate = new Date(visit.start_date);
           const visitEndDate = visit.end_date ? new Date(visit.end_date) : null;
           
           // Log the raw date strings and parsed dates for debugging
           console.log(`🔍 Raw dates for ${visitLocation.name}:`, {
             start_date_raw: visit.start_date,
             end_date_raw: visit.end_date,
             start_date_type: typeof visit.start_date,
             end_date_type: typeof visit.end_date,
             start_date_iso: visit.start_date + 'T00:00:00',
             end_date_iso: visit.end_date ? visit.end_date + 'T00:00:00' : 'No end date'
           });
           
           // Test the date parsing
           const testStartDate = new Date(visit.start_date + 'T00:00:00');
           const testEndDate = visit.end_date ? new Date(visit.end_date + 'T00:00:00') : null;
           console.log(`🧪 Test date parsing for ${visitLocation.name}:`, {
             start_iso: visit.start_date + 'T00:00:00',
             start_parsed: testStartDate,
             start_formatted: formatDateConsistent(visit.start_date),
             end_iso: visit.end_date ? visit.end_date + 'T00:00:00' : 'No end date',
             end_parsed: testEndDate,
             end_formatted: visit.end_date ? formatDateConsistent(visit.end_date) : 'No end date'
           });
           
           console.log(`🎯 Creating visit event for ${visitLocation.name}:`, {
              original_start: visit.start_date,
              original_end: visit.end_date,
              parsed_start: visitStartDate,
              parsed_end: visitEndDate,
              start_formatted: formatDateConsistent(visit.start_date),
              end_formatted: visit.end_date ? formatDateConsistent(visit.end_date) : 'No end date'
            });
           
           events.push({
             id: `visit-${visit.id}`,
             date: visitStartDate,
             type: 'visit',
             title: `Visit to ${visitLocation.name}`,
             description: `${visitLocation.city}, ${visitLocation.country} - ${formatDateConsistent(visit.start_date)}${visit.end_date && visit.end_date !== visit.start_date ? ` to ${formatDateConsistent(visit.end_date)}` : ''}${visit.notes ? ` - ${visit.notes}` : ''}`,
             location: visitLocation,
             icon: React.createElement(LocationOn),
             color: 'info'
           });
         }
       });

                // Add final home event after the last visit
        const lastVisit = sortedVisits[sortedVisits.length - 1];
        if (lastVisit) {
          const lastVisitEnd = new Date(lastVisit.end_date || lastVisit.start_date);
          const today = new Date();
          
          console.log(`🏁 Last visit ended: ${lastVisitEnd.toISOString()}, today: ${today.toISOString()}`);
          
          if (lastVisitEnd < today) {
            console.log('🏠 Adding final home event');
            const homeLocation = allLocations.find(loc => loc.id === personData.home_location_id);
            if (homeLocation) {
              events.push({
                id: `home-final-${lastVisit.id}`,
                date: lastVisitEnd,
                type: 'home',
                title: 'Currently at Home',
                description: `Currently at home: ${homeLocation.name}, ${homeLocation.city}, ${homeLocation.country} - since ${formatDateConsistent(lastVisit.end_date || lastVisit.start_date)}`,
                location: homeLocation,
                icon: React.createElement(Home),
                color: 'primary',
                isCurrentLocation: true
              });
              console.log('🏠 Added final home event');
            } else {
              console.log('❌ Home location not found for final event');
            }
          } else {
            console.log('⏭️ Last visit is ongoing, no final home event needed');
          }
        }

        // Sort events by date (newest first - current location at top)
        events.sort((a, b) => b.date.getTime() - a.date.getTime());
        
        console.log('📅 Final timeline events:', events);
        
        // Fetch weather data for locations
        const eventsWithWeather = await fetchWeatherData(events);
        
        // Fetch period weather statistics for timeline events
        const eventsWithPeriodStats = await fetchPeriodWeatherStats(eventsWithWeather);
        
        setTimelineEvents(eventsWithPeriodStats);

      } catch (err) {
        console.error('Failed to fetch person data:', err);
        setError('Failed to load person data');
      } finally {
        setLoading(false);
      }
    };

    fetchPersonData();
  }, [personId]);

  const fetchWeatherData = async (events: TimelineEvent[]) => {
    try {
      const eventsWithWeather = await Promise.all(
        events.map(async (event) => {
          if (event.location) {
            try {
              const weatherData = await weatherService.getLocationWeather(event.location.id);
              
              return {
                ...event,
                weather: {
                  temperature: weatherData.weather.temperature,
                  description: weatherData.weather.description || 'Unknown',
                  humidity: weatherData.weather.humidity || 0
                }
              };
            } catch (weatherErr) {
              console.warn(`Could not fetch weather for ${event.location.name}:`, weatherErr);
              return event;
            }
          }
          return event;
        })
      );

      setTimelineEvents(eventsWithWeather);
      return eventsWithWeather; // Return the array with weather data
    } catch (err) {
      console.error('Failed to fetch weather data:', err);
      return events; // Return the original events array if weather fetching fails
    }
  };

  const fetchPeriodWeatherStats = async (events: TimelineEvent[]) => {
    try {
      console.log('🔍 Starting fetchPeriodWeatherStats with events:', events);
      
      // IMPORTANT: Weather API date ranges should match the dates displayed in the timeline UI
      // This ensures weather averages are calculated for the exact same period users see
      
      const eventsWithPeriodStats = await Promise.all(
        events.map(async (event) => {
          if (event.location && event.type !== 'birth') {
            try {
              console.log(`🌤️ Processing event: ${event.title} at location: ${event.location.name}`);
              
              // For home events, we need to determine the time period
              let startDate: string;
              let endDate: string;
              
              if (event.type === 'home') {
                // For home events, use a more realistic period that includes actual weather data
                const eventDate = new Date(event.date);
                // Use a 30-day period centered on the event date to match realistic expectations
                startDate = new Date(eventDate.getTime() - 15 * 24 * 60 * 60 * 1000).toISOString(); // 15 days before
                endDate = new Date(eventDate.getTime() + 15 * 24 * 60 * 60 * 1000).toISOString(); // 15 days after
                console.log(`🏠 Home event - using centered 30-day period: ${startDate} to ${endDate}`);
              } else if (event.type === 'visit' && person && person.visits) {
                // For visit events, find the actual visit data to get start/end dates
                const visit = person.visits.find(v => v.location_id === event.location!.id);
                if (visit) {
                  startDate = new Date(visit.start_date).toISOString();
                  // Use EXACT visit dates - no buffer to match timeline display
                  const visitEnd = visit.end_date ? new Date(visit.end_date) : new Date(visit.start_date);
                  endDate = visitEnd.toISOString();
                  console.log(`🎯 Visit event - using EXACT visit dates: ${startDate} to ${endDate}`);
                } else {
                  // Fallback to default period if visit not found
                  const eventDate = new Date(event.date);
                  startDate = new Date(eventDate.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString();
                  endDate = new Date(eventDate.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString();
                  console.log(`⚠️ Visit event - fallback to default period: ${startDate} to ${endDate}`);
                }
              } else {
                // Fallback to default period
                const eventDate = new Date(event.date);
                startDate = new Date(eventDate.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString();
                endDate = new Date(eventDate.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString();
                console.log(`⚠️ Unknown event type - fallback to default period: ${startDate} to ${endDate}`);
              }
              
              console.log(`📡 Calling API for location ${event.location.id}: ${startDate} to ${endDate}`);
              
              const periodStats = await weatherService.getWeatherPeriodStats(
                event.location.id,
                startDate,
                endDate
              );
              
              console.log(`✅ Got period stats for ${event.location.name}:`, periodStats.period_stats);
              
              return {
                ...event,
                periodWeatherStats: {
                  average_temperature: periodStats.period_stats.average_temperature,
                  highest_temperature: periodStats.period_stats.highest_temperature,
                  lowest_temperature: periodStats.period_stats.lowest_temperature,
                  total_records: periodStats.period_stats.total_records,
                  data_exists: periodStats.period_stats.data_exists,
                  data_coverage: periodStats.period_stats.data_coverage,
                  days_with_data: periodStats.period_stats.days_with_data,
                  total_days: periodStats.period_stats.total_days,
                  coverage_percentage: periodStats.period_stats.coverage_percentage
                }
              };
            } catch (statsErr) {
              console.warn(`❌ Could not fetch period stats for ${event.location.name}:`, statsErr);
              return event;
            }
          }
          return event;
        })
      );
      
      console.log('🎉 Final events with period stats:', eventsWithPeriodStats);
      setTimelineEvents(eventsWithPeriodStats);
      return eventsWithPeriodStats;
    } catch (err) {
      console.error('❌ Failed to fetch period weather stats:', err);
      return events;
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getAge = (birthDate: string) => {
    const birth = new Date(birthDate);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    
    return age;
  };

  // Render weather data state indicator based on data existence
  const renderWeatherDataState = (periodStats: TimelineEvent['periodWeatherStats']) => {
    if (!periodStats) return null;

    if (periodStats.data_exists && periodStats.data_coverage === 'complete') {
      return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <CheckCircle color="success" fontSize="small" />
          <Typography variant="caption" color="success.main" sx={{ fontWeight: 'medium' }}>
            Verified Data
          </Typography>
        </Box>
      );
    } else if (periodStats.data_exists && periodStats.data_coverage === 'partial') {
      return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <Warning color="warning" fontSize="small" />
          <Typography variant="caption" color="warning.main" sx={{ fontWeight: 'medium' }}>
            Partial Data ({periodStats.coverage_percentage}% coverage)
          </Typography>
        </Box>
      );
    } else {
      // Fallback state - no data exists for the exact period
      return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <Info color="info" fontSize="small" />
          <Typography variant="caption" color="info.main" sx={{ fontWeight: 'medium' }}>
            Estimated Data
          </Typography>
          <Typography variant="caption" color="text.secondary">
            (Based on {periodStats.total_days || 0} days around visit)
          </Typography>
        </Box>
      );
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error || !person) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error || 'Person not found'}
      </Alert>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Box display="flex" alignItems="center" mb={2}>
          <IconButton onClick={() => navigate('/people')} sx={{ mr: 2 }}>
            <ArrowBack />
          </IconButton>
          <Avatar sx={{ width: 64, height: 64, mr: 3, bgcolor: 'primary.main' }}>
            {person.first_name.charAt(0)}
          </Avatar>
          <Box>
            <Typography variant="h3" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
              {person.first_name} {person.last_name}
            </Typography>
            <Typography variant="h6" color="text.secondary">
              {person.birth_date ? `${getAge(person.birth_date)} years old` : 'Age not specified'}
              {person.home_location && ` • Home: ${person.home_location}`}
            </Typography>
          </Box>
        </Box>
        
        {person.notes && (
          <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
            <Typography variant="body1" color="text.secondary">
              <strong>Notes:</strong> {person.notes}
            </Typography>
          </Paper>
        )}

        {/* Temperature Unit Selector */}
        <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Temperature Units:
          </Typography>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <Select
              value={preferences.temperatureUnit}
              onChange={handleTemperatureUnitChange}
              size="small"
            >
              <MenuItem value="celsius">°C (Celsius)</MenuItem>
              <MenuItem value="fahrenheit">°F (Fahrenheit)</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Box>

      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <CalendarToday color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">Total Visits</Typography>
              </Box>
              <Typography variant="h4" color="primary">
                {person.visits?.length || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <LocationOn color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">Locations Visited</Typography>
              </Box>
              <Typography variant="h4" color="primary">
                {new Set(person.visits?.map(v => v.location_id) || []).size}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <WbSunny color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">Countries Visited</Typography>
              </Box>
              <Typography variant="h4" color="primary">
                {countUniqueCountries(
                  person.visits?.map(v => {
                    const loc = locations.find(l => l.id === v.location_id);
                    return loc?.country;
                  }).filter((country): country is string => Boolean(country)) || []
                )}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ 
            background: 'linear-gradient(135deg, #ff9800 0%, #ff5722 100%)',
            color: 'white'
          }}>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <WbSunny sx={{ mr: 1, color: 'white' }} />
                <Typography variant="h6" sx={{ color: 'white' }}>Weather Records</Typography>
              </Box>
              <Typography variant="h4" sx={{ color: 'white', fontWeight: 'bold' }}>
                {timelineEvents.filter(e => e.weather).length}
              </Typography>
              <Typography variant="body2" sx={{ color: 'white', opacity: 0.9 }}>
                Temperature & conditions tracked
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Life Timeline */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
            <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
              Life Timeline
            </Typography>
            
            {timelineEvents.some(e => e.weather) && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <WbSunny color="warning" />
                <Typography variant="body2" color="text.secondary">
                  Weather data available for {timelineEvents.filter(e => e.weather).length} events
                </Typography>
              </Box>
            )}
          </Box>
          
          {/* Timeline Order Explanation */}
          <Box sx={{ mb: 2, p: 2, bgcolor: 'info.50', borderRadius: 2, border: '1px solid', borderColor: 'info.200' }}>
            <Typography variant="body2" color="info.main" sx={{ fontWeight: 'medium', display: 'flex', alignItems: 'center', gap: 1 }}>
              <Info fontSize="small" />
              Timeline shows current location at top, with journey flowing chronologically from newest to oldest
            </Typography>
          </Box>
          
          {timelineEvents.length > 0 ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {timelineEvents.map((event, index) => (
                <Box
                  key={event.id}
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2,
                    p: 3,
                    bgcolor: event.isCurrentLocation ? 'primary.50' : 'grey.100',
                    borderRadius: 2,
                    boxShadow: event.isCurrentLocation ? 3 : 1,
                    border: event.isCurrentLocation ? '2px solid' : 'none',
                    borderColor: event.isCurrentLocation ? 'primary.main' : 'transparent',
                    position: 'relative',
                    '&::before': event.isCurrentLocation ? {
                      content: '""',
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      height: '4px',
                      bgcolor: 'primary.main',
                      borderRadius: '2px 2px 0 0'
                    } : {},
                    animation: event.isCurrentLocation ? 'pulse 2s infinite' : 'none',
                    '@keyframes pulse': {
                      '0%': { boxShadow: '0 0 0 0 rgba(25, 118, 210, 0.7)' },
                      '70%': { boxShadow: '0 0 0 10px rgba(25, 118, 210, 0)' },
                      '100%': { boxShadow: '0 0 0 0 rgba(25, 118, 210, 0)' }
                    }
                  }}
                >
                  {/* Top Row: Event Info and Basic Weather */}
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                      <Chip
                        icon={event.icon}
                        label={event.type === 'home' && event.id === 'home-initial' ? 'Started at Home' : 
                               event.type === 'home' && event.id.includes('home-final') ? 'Currently at Home' :
                               event.type === 'home' ? 'Returned Home' :
                               formatDateConsistent(event.date.toISOString().split('T')[0])}
                        size="small"
                        sx={{ 
                          bgcolor: event.color + '.light',
                          fontWeight: event.type === 'home' ? 'bold' : 'normal'
                        }}
                      />
                      
                      {/* Current Location Badge */}
                      {event.isCurrentLocation && (
                        <Chip
                          icon={<LocationOn fontSize="small" />}
                          label="Current Location"
                          size="small"
                          sx={{ 
                            backgroundColor: 'primary.main',
                            color: 'white',
                            fontWeight: 'bold',
                            '& .MuiChip-icon': { color: 'white' }
                          }}
                        />
                      )}
                      
                      {event.weather && (
                        <Chip
                          icon={<WbSunny fontSize="small" />}
                          label={formatTemperature(event.weather.temperature)}
                          size="small"
                          sx={{ 
                            backgroundColor: 'primary.main',
                            color: 'white',
                            '& .MuiChip-icon': { color: 'white' }
                          }}
                        />
                      )}
                    </Box>
                    
                    {/* Event Title and Description */}
                    <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                      <Typography variant="h6" component="span" sx={{ fontWeight: 'bold', display: 'block', mb: 0.5 }}>
                        {event.type === 'home' && event.id === 'home-initial' ? 'Started at Home' :
                         event.type === 'home' && event.id.includes('home-final') ? 'Currently at Home' :
                         event.type === 'home' ? 'Returned Home' :
                         event.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {event.description}
                      </Typography>
                    </Box>
                  </Box>

                  {/* Second Row: Weather Data State and Statistics */}
                  {event.periodWeatherStats && (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                      {/* Weather Data State Indicator */}
                      {renderWeatherDataState(event.periodWeatherStats)}
                      
                      {/* Period Weather Statistics Chips */}
                      {event.periodWeatherStats.total_records > 0 && (
                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                          <Chip
                            icon={<Thermostat fontSize="small" />}
                            label={`Avg: ${formatTemperature(event.periodWeatherStats.average_temperature)}`}
                            size="small"
                            sx={{ 
                              backgroundColor: 'success.main',
                              color: 'white',
                              '& .MuiChip-icon': { color: 'white' }
                            }}
                          />
                          <Chip
                            icon={<WbSunny fontSize="small" />}
                            label={`High: ${formatTemperature(event.periodWeatherStats.highest_temperature)}`}
                            size="small"
                            sx={{ 
                              backgroundColor: 'warning.main',
                              color: 'white',
                              '& .MuiChip-icon': { color: 'white' }
                            }}
                          />
                          <Chip
                            icon={<Cloud fontSize="small" />}
                            label={`Low: ${formatTemperature(event.periodWeatherStats.lowest_temperature)}`}
                            size="small"
                            sx={{ 
                              backgroundColor: 'info.main',
                              color: 'white',
                              '& .MuiChip-icon': { color: 'white' }
                            }}
                          />
                        </Box>
                      )}
                    </Box>
                  )}

                  {/* Location Details */}
                  {event.location && (
                    <Box sx={{ 
                      p: 1.5, 
                      bgcolor: 'secondary.50', 
                      borderRadius: 1.5, 
                      border: '1px solid',
                      borderColor: 'secondary.200'
                    }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                        <LocationOn fontSize="small" color="secondary" />
                        <Typography variant="body2" color="secondary.main" sx={{ fontWeight: 'medium' }}>
                          {event.location.name}
                        </Typography>
                      </Box>
                      
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Typography variant="body2" color="text.secondary">
                          {event.location.city}, {event.location.country}
                        </Typography>
                        
                        {event.location.latitude && event.location.longitude && (
                          <Chip
                            icon={<Visibility fontSize="small" />}
                            label={`${event.location.latitude.toFixed(4)}, ${event.location.longitude.toFixed(4)}`}
                            size="small"
                            variant="outlined"
                            color="secondary"
                          />
                        )}
                      </Box>
                    </Box>
                  )}
                </Box>
              ))}
            </Box>
          ) : (
            <Box textAlign="center" py={4}>
              <Typography variant="h6" color="textSecondary" gutterBottom>
                No timeline events yet
              </Typography>
              <Typography color="textSecondary">
                Add visits to see {person.first_name}'s journey through time
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Weather Summary */}
      {timelineEvents.some(e => e.weather) && (
        <Card sx={{ mb: 4 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
              <WbSunny color="warning" />
              Weather Summary
            </Typography>
            
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={3}>
                <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'warning.50', borderRadius: 2 }}>
                  <Typography variant="h4" color="warning.main" sx={{ fontWeight: 'bold' }}>
                    {formatTemperature(Math.max(...timelineEvents.filter(e => e.weather).map(e => e.weather!.temperature)))}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">Highest Temperature</Typography>
                </Box>
              </Grid>
              
              <Grid item xs={12} sm={6} md={3}>
                <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'info.50', borderRadius: 2 }}>
                  <Typography variant="h4" color="info.main" sx={{ fontWeight: 'bold' }}>
                    {formatTemperature(Math.min(...timelineEvents.filter(e => e.weather).map(e => e.weather!.temperature)))}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">Lowest Temperature</Typography>
                </Box>
              </Grid>
              
              <Grid item xs={12} sm={6} md={3}>
                <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'success.50', borderRadius: 2 }}>
                  <Typography variant="h4" color="success.main" sx={{ fontWeight: 'bold' }}>
                    {formatTemperature(Math.round(timelineEvents.filter(e => e.weather).reduce((sum, e) => sum + e.weather!.temperature, 0) / timelineEvents.filter(e => e.weather).length))}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">Average Temperature</Typography>
                </Box>
              </Grid>
              
              <Grid item xs={12} sm={6} md={3}>
                <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'secondary.50', borderRadius: 2 }}>
                  <Typography variant="h4" color="secondary.main" sx={{ fontWeight: 'bold' }}>
                    {new Set(timelineEvents.filter(e => e.weather).map(e => e.weather!.description)).size}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">Weather Conditions</Typography>
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <Box display="flex" gap={2} justifyContent="center">
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => navigate(`/people?addVisit=${person.id}`)}
        >
          Add Visit
        </Button>
        <Button
          variant="outlined"
          startIcon={<Edit />}
          onClick={() => navigate(`/people?editPerson=${person.id}`)}
        >
          Edit Profile
        </Button>
      </Box>
    </Container>
  );
};

export default PersonDashboard;
