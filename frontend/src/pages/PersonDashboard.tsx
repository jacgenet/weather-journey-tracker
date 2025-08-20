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
} from '@mui/material';
import {
  Person,
  LocationOn,
  WbSunny,
  CalendarToday,
  Home,
  ArrowBack,
  Thermostat,
  Cloud,
  Visibility,
  Add,
  Edit,
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { peopleService, Person as PersonType } from '../services/peopleService';
import { locationService, Location as LocationType } from '../services/locationService';
import { weatherService } from '../services/weatherService';
import { countUniqueCountries } from '../utils/countryUtils';

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
  icon: React.ReactElement;
  color: 'primary' | 'secondary' | 'success' | 'info' | 'warning';
}

const PersonDashboard: React.FC = () => {
  const { personId } = useParams<{ personId: string }>();
  const navigate = useNavigate();
  const [person, setPerson] = useState<PersonType | null>(null);
  const [locations, setLocations] = useState<LocationType[]>([]);
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

        const events: TimelineEvent[] = [];

        // Add birth event
        if (personData.birth_date) {
          events.push({
            id: 'birth',
            date: new Date(personData.birth_date),
            type: 'birth',
            title: 'Born',
            description: `${personData.first_name} ${personData.last_name} was born`,
            icon: React.createElement(Person),
            color: 'success'
          });
        }

                 // Add initial home event
         if (personData.home_location_id) {
           console.log('🏠 Looking for home location by ID:', personData.home_location_id);
           const homeLocation = allLocations.find(loc => loc.id === personData.home_location_id);
           console.log('🏠 Found home location:', homeLocation);
           if (homeLocation) {
             events.push({
               id: 'home-initial',
               date: new Date(personData.birth_date || new Date()),
               type: 'home',
               title: 'Home',
               description: `Home: ${homeLocation.name}, ${homeLocation.city}, ${homeLocation.country}`,
               location: homeLocation,
               icon: React.createElement(Home),
               color: 'primary'
             });
             console.log('🏠 Added initial home event');
           } else {
             console.log('❌ Home location not found in locations array');
           }
         }

        // Add visit events and fill gaps with home events
        if (personData.visits && personData.visits.length > 0) {
          console.log('🎯 Processing visits:', personData.visits);
          
          const sortedVisits = [...personData.visits].sort((a, b) => 
            new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
          );

                     sortedVisits.forEach((visit, index) => {
             const visitLocation = allLocations.find(loc => loc.id === visit.location_id);
             if (visitLocation) {
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
                       title: 'Home',
                       description: `Returned home: ${homeLocation.name}, ${homeLocation.city}, ${homeLocation.country}`,
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
              events.push({
                id: `visit-${visit.id}`,
                date: new Date(visit.start_date),
                type: 'visit',
                title: `Visit to ${visitLocation.name}`,
                description: `${visitLocation.city}, ${visitLocation.country}${visit.notes ? ` - ${visit.notes}` : ''}`,
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
                   title: 'Home',
                   description: `Returned home: ${homeLocation.name}, ${homeLocation.city}, ${homeLocation.country}`,
                   location: homeLocation,
                   icon: React.createElement(Home),
                   color: 'primary'
                 });
                 console.log('🏠 Added final home event');
               } else {
                 console.log('❌ Home location not found for final event');
               }
             } else {
               console.log('⏭️ Last visit is ongoing, no final home event needed');
             }
           }
        }

        // Sort events by date
        events.sort((a, b) => a.date.getTime() - b.date.getTime());
        
        console.log('📅 Final timeline events:', events);
        setTimelineEvents(events);

        // Fetch weather data for locations
        await fetchWeatherData(events);

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
    } catch (err) {
      console.error('Failed to fetch weather data:', err);
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
          
          {timelineEvents.length > 0 ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {timelineEvents.map((event, index) => (
                <Box
                  key={event.id}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    p: 2,
                    bgcolor: 'grey.100',
                    borderRadius: 2,
                    boxShadow: 1,
                  }}
                >
                  <Box sx={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Chip
                      icon={event.icon}
                      label={event.type === 'home' && event.id === 'home-initial' ? 'Started at Home' : 
                             event.type === 'home' && event.id.includes('home-final') ? 'Currently at Home' :
                             event.type === 'home' ? 'Returned Home' :
                             formatDate(event.date)}
                      size="small"
                      sx={{ 
                        bgcolor: event.color + '.light',
                        fontWeight: event.type === 'home' ? 'bold' : 'normal'
                      }}
                    />
                    
                    {event.weather && (
                      <Chip
                        icon={<WbSunny fontSize="small" />}
                        label={`${event.weather.temperature}°C`}
                        size="small"
                        sx={{ 
                          bgcolor: 'warning.light',
                          color: 'warning.dark',
                          fontWeight: 'bold'
                        }}
                      />
                    )}
                  </Box>
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="h6" component="span" sx={{ fontWeight: 'bold' }}>
                      {event.type === 'home' && event.id === 'home-initial' ? 'Started at Home' :
                       event.type === 'home' && event.id.includes('home-final') ? 'Currently at Home' :
                       event.type === 'home' ? 'Returned Home' :
                       event.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                      {event.description}
                    </Typography>
                    
                    {event.location && (
                      <Box sx={{ 
                        mt: 1.5, 
                        p: 1, 
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
                    
                    {event.weather && (
                      <Box sx={{ 
                        mt: 2, 
                        p: 1.5, 
                        bgcolor: 'primary.50', 
                        borderRadius: 2, 
                        border: '1px solid',
                        borderColor: 'primary.200'
                      }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                          <Typography variant="subtitle2" color="primary.main" sx={{ fontWeight: 'bold' }}>
                            Weather Conditions
                          </Typography>
                          <WbSunny color="warning" />
                        </Box>
                        
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Box sx={{ textAlign: 'center' }}>
                            <Typography variant="h6" color="primary.main" sx={{ fontWeight: 'bold' }}>
                              {event.weather.temperature}°C
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Temperature
                            </Typography>
                          </Box>
                          
                          <Box sx={{ textAlign: 'center' }}>
                            <Typography variant="body2" color="text.primary" sx={{ fontWeight: 'medium' }}>
                              {event.weather.description}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Conditions
                            </Typography>
                          </Box>
                          
                          <Box sx={{ textAlign: 'center' }}>
                            <Cloud color="info" />
                            <Typography variant="body2" color="text.primary">
                              {event.weather.humidity}%
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Humidity
                            </Typography>
                          </Box>
                        </Box>
                      </Box>
                    )}
                  </Box>
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
                    {Math.max(...timelineEvents.filter(e => e.weather).map(e => e.weather!.temperature))}°C
                  </Typography>
                  <Typography variant="body2" color="text.secondary">Highest Temperature</Typography>
                </Box>
              </Grid>
              
              <Grid item xs={12} sm={6} md={3}>
                <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'info.50', borderRadius: 2 }}>
                  <Typography variant="h4" color="info.main" sx={{ fontWeight: 'bold' }}>
                    {Math.min(...timelineEvents.filter(e => e.weather).map(e => e.weather!.temperature))}°C
                  </Typography>
                  <Typography variant="body2" color="text.secondary">Lowest Temperature</Typography>
                </Box>
              </Grid>
              
              <Grid item xs={12} sm={6} md={3}>
                <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'success.50', borderRadius: 2 }}>
                  <Typography variant="h4" color="success.main" sx={{ fontWeight: 'bold' }}>
                    {Math.round(timelineEvents.filter(e => e.weather).reduce((sum, e) => sum + e.weather!.temperature, 0) / timelineEvents.filter(e => e.weather).length)}°C
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
