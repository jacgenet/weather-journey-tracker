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
  Star,
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { peopleService, Person as PersonType } from '../services/peopleService';
import { locationService, Location as LocationType } from '../services/locationService';
import { weatherService } from '../services/weatherService';
import { countUniqueCountries } from '../utils/countryUtils';
import { usePreferences, TemperatureUnit } from '../contexts/PreferencesContext';
import PersonLocationMap from '../components/PersonLocationMap';

interface TimelineEvent {
  id: string;
  date: Date;
  startDate: Date;  // Add start date for date range display
  endDate: Date;    // Add end date for date range display
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

  // Parse dates consistently without timezone conversion
  const parseDateConsistent = (dateString: string): Date => {
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day);
  };

  // Format dates consistently using explicit date parsing
  const formatDateConsistent = (dateString: string) => {
    // Parse ISO date string and ensure consistent formatting
    const date = parseDateConsistent(dateString);
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
          const birthDate = parseDateConsistent(personData.birth_date);
          const homeLocation = allLocations.find(loc => loc.id === personData.home_location_id);
          if (homeLocation) {
            events.push({
              id: 'birth',
              date: birthDate,
              startDate: birthDate,
              endDate: birthDate,
              type: 'home',
              title: 'Started at Home',
              description: `Started living at: ${homeLocation.name}, ${homeLocation.city}, ${homeLocation.country} • ${formatDateConsistent(personData.birth_date)}`,
              location: homeLocation,
              icon: React.createElement(Home),
              color: 'primary'
            });
          }
        }

        // Add visit events and home events between visits
        const sortedVisits = personData.visits?.sort((a, b) => 
          parseDateConsistent(a.start_date).getTime() - parseDateConsistent(b.start_date).getTime()
        ) || [];
        
        // Note: Birth event already covers the period from birth to first visit
        // No need to create a separate "home-initial" event
        
        console.log('📅 Sorted visits for timeline creation:', sortedVisits.map(v => ({
          id: v.id,
          start: v.start_date,
          end: v.end_date,
          location: allLocations.find(loc => loc.id === v.location_id)?.name
        })));
        
        // Debug: Log the chronological order of visits
        console.log('🔍 Chronological visit order:');
        sortedVisits.forEach((visit, index) => {
          const visitLocation = allLocations.find(loc => loc.id === visit.location_id);
          console.log(`  ${index + 1}. ${visitLocation?.name || 'Unknown'}: ${visit.start_date}${visit.end_date && visit.end_date !== visit.start_date ? ` to ${visit.end_date}` : ''}`);
        });
        
        // Debug: Log the exact dates being used for gap calculation
        console.log('🔍 Visit dates for gap calculation:');
        sortedVisits.forEach((visit, index) => {
          const visitLocation = allLocations.find(loc => loc.id === visit.location_id);
          const startDate = parseDateConsistent(visit.start_date);
          const endDate = visit.end_date ? parseDateConsistent(visit.end_date) : parseDateConsistent(visit.start_date);
          console.log(`  ${index + 1}. ${visitLocation?.name || 'Unknown'}:`);
          console.log(`    Start: ${visit.start_date} → ${startDate.toISOString()}`);
          console.log(`    End: ${visit.end_date || visit.start_date} → ${endDate.toISOString()}`);
        });
        
        // FORCED GAP-FILLING: Ensure all gaps between visits are filled with home events
        console.log('🏠 Starting forced gap-filling for all visits...');
        for (let i = 0; i < sortedVisits.length - 1; i++) {
          const currentVisit = sortedVisits[i];
          const nextVisit = sortedVisits[i + 1];
          
          const currentVisitEnd = parseDateConsistent(currentVisit.end_date || currentVisit.start_date);
          const nextVisitStart = parseDateConsistent(nextVisit.start_date);
          
          console.log(`🔍 Checking gap between visit ${i + 1} and ${i + 2}:`);
          console.log(`  Current visit end: ${currentVisitEnd.toISOString()} (${formatDateConsistent(currentVisit.end_date || currentVisit.start_date)})`);
          console.log(`  Next visit start: ${nextVisitStart.toISOString()} (${formatDateConsistent(nextVisit.start_date)})`);
          
          // Calculate gap in days
          const gapDays = Math.floor((nextVisitStart.getTime() - currentVisitEnd.getTime()) / (1000 * 60 * 60 * 24));
          console.log(`  Gap: ${gapDays} days`);
          
          if (gapDays > 0) {
            console.log(`🏠 Gap detected! Creating "Returned Home" event for ${gapDays} days`);
            const homeLocation = allLocations.find(loc => loc.id === personData.home_location_id);
            if (homeLocation) {
              // Check if we already have a home event for this exact time period to prevent duplicates
              const existingHomeEvent = events.find(event => 
                event.type === 'home' && 
                event.startDate.getTime() === currentVisitEnd.getTime() &&
                event.endDate.getTime() === nextVisitStart.getTime()
              );
              
              if (!existingHomeEvent) {
                events.push({
                  id: `home-forced-${currentVisit.id}-${nextVisit.id}`,
                  date: nextVisitStart, // Sort by when they left home (next visit start)
                  startDate: currentVisitEnd, // When they returned home
                  endDate: nextVisitStart, // When they left home for next visit
                  type: 'home',
                  title: 'Returned Home',
                  description: `Returned home: ${homeLocation.name}, ${homeLocation.city}, ${homeLocation.country} • ${formatDateConsistent(currentVisit.end_date || currentVisit.start_date)} to ${formatDateConsistent(nextVisit.start_date)}`,
                  location: homeLocation,
                  icon: React.createElement(Home),
                  color: 'primary'
                });
                console.log('✅ Forced gap-filling: Added "Returned Home" event');
              } else {
                console.log('⚠️ Home event already exists for this time period, skipping duplicate');
              }
            } else {
              console.log('❌ Home location not found for forced gap-filling');
            }
          } else {
            console.log(`⏭️ No gap (${gapDays} days), skipping home event`);
          }
        }

        sortedVisits.forEach((visit, index) => {
          const visitLocation = allLocations.find(loc => loc.id === visit.location_id);
          if (visitLocation) {
            console.log(`📅 Processing visit ${index + 1}/${sortedVisits.length}: ${visitLocation.name} (ID: ${visit.id})`);
            console.log(`  Raw dates: start=${visit.start_date}, end=${visit.end_date || 'same as start'}`);
            console.log(`  Parsed dates: start=${parseDateConsistent(visit.start_date).toISOString()}, end=${visit.end_date ? parseDateConsistent(visit.end_date).toISOString() : 'same as start'}`);
            
            // DISABLED: Original gap-filling logic - now handled by forced gap-filling above
            // This prevents duplicate home events from being created
            if (index > 0) {
              console.log(`⏭️ Skipping original gap-filling for visit ${index} (handled by forced gap-filling)`);
            }

           // Add the visit event
           const visitStartDate = parseDateConsistent(visit.start_date);
           const visitEndDate = visit.end_date ? parseDateConsistent(visit.end_date) : null;
           
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
           const testStartDate = parseDateConsistent(visit.start_date);
           const testEndDate = visit.end_date ? parseDateConsistent(visit.end_date) : null;
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
             startDate: visitStartDate,
             endDate: visitEndDate || visitStartDate,
             type: 'visit',
             title: `Visit to ${visitLocation.name}`,
             description: `${visitLocation.city}, ${visitLocation.country}${visit.end_date && visit.end_date !== visit.start_date ? ` • ${formatDateConsistent(visit.start_date)} to ${formatDateConsistent(visit.end_date)}` : ` • ${formatDateConsistent(visit.start_date)}`}${visit.notes ? ` • ${visit.notes}` : ''}`,
             location: visitLocation,
             icon: React.createElement(LocationOn),
             color: 'info'
           });
         }
       });

                // Add final home event after the last visit (only if not already added as a gap-filler)
        const lastVisit = sortedVisits[sortedVisits.length - 1];
        if (lastVisit) {
          const lastVisitEnd = parseDateConsistent(lastVisit.end_date || lastVisit.start_date);
          const today = new Date();
          
          console.log(`🏁 Last visit ended: ${lastVisitEnd.toISOString()}, today: ${today.toISOString()}`);
          
          // Check if we already added a home event for this exact date (from gap-filling)
          const alreadyHasHomeEvent = events.some(event => 
            event.type === 'home' && 
            event.date.getTime() === lastVisitEnd.getTime()
          );
          
                      if (lastVisitEnd < today && !alreadyHasHomeEvent) {
            console.log('🏠 Adding final home event');
            const homeLocation = allLocations.find(loc => loc.id === personData.home_location_id);
            if (homeLocation) {
              events.push({
                id: `home-final-${lastVisit.id}`,
                date: today,
                startDate: lastVisitEnd, // When they returned home from last visit
                endDate: today, // Currently ongoing, so end date is today
                type: 'home',
                title: 'Currently at Home',
                description: `Currently at home: ${homeLocation.name}, ${homeLocation.city}, ${homeLocation.country} • since ${formatDateConsistent(lastVisit.end_date || lastVisit.start_date)}`,
                location: homeLocation,
                icon: React.createElement(Home),
                color: 'primary',
                isCurrentLocation: true
              });
              console.log('🏠 Added final home event');
            } else {
              console.log('❌ Home location not found for final event');
            }
          } else if (alreadyHasHomeEvent) {
            console.log('⏭️ Home event already exists for this date, updating existing event to "Currently at Home"');
            // Update the existing home event to be the current location
            const existingHomeEvent = events.find(event => 
              event.type === 'home' && 
              event.date.getTime() === lastVisitEnd.getTime()
            );
            if (existingHomeEvent && existingHomeEvent.location) {
              existingHomeEvent.title = 'Currently at Home';
              existingHomeEvent.description = `Currently at home: ${existingHomeEvent.location.name}, ${existingHomeEvent.location.city}, ${existingHomeEvent.location.country} • since ${formatDateConsistent(lastVisit.end_date || lastVisit.start_date)}`;
              existingHomeEvent.isCurrentLocation = true;
              existingHomeEvent.startDate = lastVisitEnd;
              existingHomeEvent.endDate = new Date(); // Currently ongoing, so end date is today
              console.log('🔄 Updated existing home event to "Currently at Home"');
            }
          } else {
            console.log('⏭️ Last visit is ongoing, no final home event needed');
          }
        }

        // Sort events by chronological occurrence (newest first - current location at top)
        // All events should be sorted by when they actually occurred in time
        events.sort((a, b) => {
          // For home events, use the start date (when they returned home)
          // For visits, use the start date (when the visit started)
          // For birth, use the birth date
          const aDate = a.startDate;
          const bDate = b.startDate;
          return bDate.getTime() - aDate.getTime();
        });
        
        console.log('📅 Final timeline events:', events);
        
        // Fetch weather data for locations
        const eventsWithWeather = await fetchWeatherData(events);
        
        // Fetch period weather statistics for timeline events
        const eventsWithPeriodStats = await fetchPeriodWeatherStats(eventsWithWeather, personData);
        
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

  const fetchPeriodWeatherStats = async (events: TimelineEvent[], personData: PersonType) => {
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
                // For home events, use a more focused period that's realistic for "home" weather
                const eventDate = event.date; // event.date is already a Date object
                // Use a 7-day period centered on the event date for more realistic home weather
                startDate = new Date(eventDate.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(); // 3 days before
                endDate = new Date(eventDate.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString(); // 3 days after
                console.log(`🏠 Home event - using focused 7-day period: ${startDate} to ${endDate}`);
              } else if (event.type === 'visit' && personData && personData.visits) {
                // For visit events, find the actual visit data to get start/end dates
                console.log(`🔍 DEBUG: Event type is 'visit', checking person.visits...`);
                console.log(`🔍 DEBUG: person.visits:`, personData.visits);
                console.log(`�� DEBUG: Looking for visit with location_id: ${event.location!.id}`);
                
                const visit = personData.visits.find(v => v.location_id === event.location!.id);
                console.log(`🔍 DEBUG: Found visit:`, visit);
                
                if (visit) {
                  const startDateObj = parseDateConsistent(visit.start_date);
                  const endDateObj = visit.end_date ? parseDateConsistent(visit.end_date) : parseDateConsistent(visit.start_date);
                  
                  // For single-day visits, ensure we cover the entire 24-hour period
                  if (startDateObj.toDateString() === endDateObj.toDateString()) {
                    // Same day - set start to beginning of day, end to end of day
                    startDate = new Date(startDateObj.getFullYear(), startDateObj.getMonth(), startDateObj.getDate(), 0, 0, 0).toISOString();
                    endDate = new Date(endDateObj.getFullYear(), endDateObj.getMonth(), endDateObj.getDate(), 23, 59, 59).toISOString();
                  } else {
                    // Different days - use exact dates
                    startDate = startDateObj.toISOString();
                    endDate = endDateObj.toISOString();
                  }
                  
                  console.log(`🎯 Visit event - using date range: ${startDate} to ${endDate}`);
                } else {
                  // Fallback to default period if visit not found
                  const eventDate = event.date; // event.date is already a Date object
                  startDate = new Date(eventDate.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString();
                  endDate = new Date(eventDate.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString();
                  console.log(`⚠️ Visit event - fallback to default period: ${startDate} to ${endDate}`);
                }
              } else {
                // Fallback to default period
                console.log(`🔍 DEBUG: Event type is NOT 'visit' or person.visits not found`);
                console.log(`🔍 DEBUG: Event type: ${event.type}`);
                console.log(`🔍 DEBUG: person:`, personData);
                console.log(`🔍 DEBUG: person.visits:`, personData?.visits);
                
                const eventDate = event.date; // event.date is already a Date object
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
    const birth = parseDateConsistent(birthDate);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    
    return age;
  };

  const formatDateRange = (startDate: Date, endDate: Date) => {
    const start = formatDate(startDate);
    const end = endDate ? formatDate(endDate) : 'Present';
    return `${start} - ${end}`;
  };

  // Render weather data state indicator based on data existence
  const renderWeatherDataState = (periodStats: TimelineEvent['periodWeatherStats'], event: TimelineEvent) => {
    if (!periodStats) return null;

    if (periodStats.data_exists && periodStats.data_coverage === 'complete') {
      return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <CheckCircle color="success" fontSize="small" />
          <Typography variant="caption" color="success.main" sx={{ fontWeight: 'medium' }}>
            Verified Data
          </Typography>
          <Typography variant="caption" color="text.secondary">
            ({event.startDate.getTime() === event.endDate.getTime() ? 'Single day' : 'Multi-day period'})
          </Typography>
        </Box>
      );
    } else if (periodStats.data_exists && periodStats.data_coverage === 'partial') {
      // Check if this is a future date
      const isFutureDate = event.startDate > new Date();
      
      return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <Warning color="warning" fontSize="small" />
          <Typography variant="caption" color="warning.main" sx={{ fontWeight: 'medium' }}>
            {isFutureDate ? 'Simulated Data' : 'Historical Data'} ({periodStats.coverage_percentage}% coverage)
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {isFutureDate 
              ? '(Simulated weather data for future dates)'
              : `(Based on historical weather patterns for ${periodStats.total_days} days)`
            }
          </Typography>
        </Box>
      );
    } else {
      // Fallback state - no data exists for the exact period
      const isFutureDate = event.startDate > new Date();
      
      return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <Info color="info" fontSize="small" />
          <Typography variant="caption" color="info.main" sx={{ fontWeight: 'medium' }}>
            {isFutureDate ? 'Future Date' : 'Limited Data'}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {isFutureDate 
              ? '(Weather data not available for future dates)'
              : '(Weather data not available for this period)'
            }
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
    <Box sx={{ flexGrow: 1, minHeight: '100vh', backgroundColor: '#ffffff' }}>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* Back Button and Temperature Selector */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
          <Button
            onClick={() => navigate('/app/people')}
            sx={{
              color: '#222222',
              fontSize: '1rem',
              fontWeight: 500,
              textTransform: 'none',
              px: 2,
              py: 1,
              borderRadius: '22px',
              '&:hover': {
                backgroundColor: '#f7f7f7',
              },
            }}
            startIcon={<ArrowBack />}
          >
            Back to People
          </Button>
          
          {/* Temperature Unit Selector */}
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <Select
              value={preferences.temperatureUnit}
              onChange={handleTemperatureUnitChange}
              size="small"
              sx={{
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#e0e0e0',
                },
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#222222',
                },
              }}
            >
              <MenuItem value="celsius">°C (Celsius)</MenuItem>
              <MenuItem value="fahrenheit">°F (Fahrenheit)</MenuItem>
            </Select>
          </FormControl>
        </Box>
        {/* Person Header Card - Airbnb Style */}
        <Card 
          sx={{ 
            mb: 4, 
            borderRadius: '16px',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
            border: '1px solid #e0e0e0',
            overflow: 'hidden'
          }}
        >
          <Box
            sx={{
              background: 'linear-gradient(135deg, #FF5A5F 0%, #FF8A80 100%)',
              p: 4,
              color: 'white'
            }}
          >
            <Box display="flex" alignItems="center" mb={2}>
              <Avatar 
                sx={{ 
                  width: 80, 
                  height: 80, 
                  mr: 3, 
                  bgcolor: 'rgba(255, 255, 255, 0.2)',
                  color: 'white',
                  fontSize: '2rem',
                  fontWeight: 'bold'
                }}
              >
                {person.first_name.charAt(0)}
              </Avatar>
              <Box>
                <Typography variant="h3" sx={{ fontWeight: 800, mb: 1 }}>
                  {person.first_name} {person.last_name}
                </Typography>
                <Box display="flex" alignItems="center" gap={1}>
                  <Star sx={{ color: '#FFD700', fontSize: '1.2rem' }} />
                  <Typography variant="h6" sx={{ opacity: 0.9, fontWeight: 500 }}>
                    Weather Explorer
                  </Typography>
                </Box>
              </Box>
            </Box>
            
            <Typography variant="h6" sx={{ opacity: 0.9, fontWeight: 500 }}>
              {person.birth_date ? `${getAge(person.birth_date)} years old` : 'Age not specified'}
              {person.home_location && ` • Home: ${person.home_location}`}
            </Typography>
          </Box>
          
          {person.notes && (
            <Box sx={{ p: 3, bgcolor: '#f8f9fa' }}>
              <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 500 }}>
                <strong>Notes:</strong> {person.notes}
              </Typography>
            </Box>
          )}

          {/* Life Timeline - Integrated into Header */}
          <Box sx={{ p: 3, bgcolor: 'white' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
              <Typography variant="h5" sx={{ fontWeight: 700, color: '#222222' }}>
                Life Timeline
              </Typography>
              
              {timelineEvents.some(e => e.weather) && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <WbSunny sx={{ color: '#f57c00', fontSize: '1.2rem' }} />
                  <Typography variant="body2" sx={{ color: '#717171', fontWeight: 500 }}>
                    Weather data available for {timelineEvents.filter(e => e.weather).length} events
                  </Typography>
                </Box>
              )}
            </Box>

            {/* Timeline Summary */}
            <Box sx={{ mb: 3, p: 2, bgcolor: '#f8f9fa', borderRadius: 2, border: '1px solid #e9ecef' }}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={3}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h6" color="primary.main" sx={{ fontWeight: 'bold' }}>
                      {timelineEvents.length}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total Events
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={3}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h6" color="primary.main" sx={{ fontWeight: 'bold' }}>
                      {timelineEvents.filter(e => e.startDate.getTime() !== e.endDate.getTime() && e.type !== 'home').length}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Multi-day Visits
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={3}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h6" color="primary.main" sx={{ fontWeight: 'bold' }}>
                      {timelineEvents.filter(e => e.type === 'home').length}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Home Events
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={3}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h6" color="primary.main" sx={{ fontWeight: 'bold' }}>
                      {timelineEvents.filter(e => e.isCurrentLocation).length}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Current Locations
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </Box>

            {/* Statistics Cards - Integrated into Timeline */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ 
                  borderRadius: '16px',
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
                  border: '1px solid #e0e0e0',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    boxShadow: '0 8px 30px rgba(0, 0, 0, 0.12)',
                    transform: 'translateY(-2px)',
                  }
                }}>
                  <CardContent sx={{ p: 3 }}>
                    <Box display="flex" alignItems="center" mb={2}>
                      <Box
                        sx={{
                          width: 48,
                          height: 48,
                          borderRadius: '12px',
                          bgcolor: '#e3f2fd',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          mr: 2
                        }}
                      >
                        <Person sx={{ color: '#1976d2', fontSize: '1.5rem' }} />
                      </Box>
                      <Typography variant="h6" sx={{ fontWeight: 600, color: '#222222' }}>
                        Days Alive
                      </Typography>
                    </Box>
                    <Typography variant="h3" sx={{ fontWeight: 800, color: '#222222', mb: 1 }}>
                      {person.birth_date ? (() => {
                        const birth = parseDateConsistent(person.birth_date);
                        const today = new Date();
                        const timeDiff = today.getTime() - birth.getTime();
                        const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
                        return daysDiff.toLocaleString();
                      })() : 'N/A'
                      }
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#717171', fontWeight: 500 }}>
                      Since {person.birth_date ? formatDateConsistent(person.birth_date) : 'birth'}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} sm={6} md={2.4}>
                <Card sx={{ 
                  borderRadius: '16px',
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
                  border: '1px solid #e0e0e0',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    boxShadow: '0 8px 30px rgba(0, 0, 0, 0.12)',
                    transform: 'translateY(-2px)',
                  }
                }}>
                  <CardContent sx={{ p: 3 }}>
                    <Box display="flex" alignItems="center" mb={2}>
                      <Box
                        sx={{
                          width: 48,
                          height: 48,
                          borderRadius: '12px',
                          bgcolor: '#f3e5f5',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          mr: 2
                        }}
                      >
                        <CalendarToday sx={{ color: '#7b1fa2', fontSize: '1.5rem' }} />
                      </Box>
                      <Typography variant="h6" sx={{ fontWeight: 600, color: '#222222' }}>
                        Total Visits
                      </Typography>
                    </Box>
                    <Typography variant="h3" sx={{ fontWeight: 800, color: '#222222', mb: 1 }}>
                      {person.visits?.length || 0}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} sm={6} md={2.4}>
                <Card sx={{ 
                  borderRadius: '16px',
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
                  border: '1px solid #e0e0e0',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    boxShadow: '0 8px 30px rgba(0, 0, 0, 0.12)',
                    transform: 'translateY(-2px)',
                  }
                }}>
                  <CardContent sx={{ p: 3 }}>
                    <Box display="flex" alignItems="center" mb={2}>
                      <Box
                        sx={{
                          width: 48,
                          height: 48,
                          borderRadius: '12px',
                          bgcolor: '#fff3e0',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          mr: 2
                        }}
                      >
                        <LocationOn sx={{ color: '#f57c00', fontSize: '1.5rem' }} />
                      </Box>
                      <Typography variant="h6" sx={{ fontWeight: 600, color: '#222222' }}>
                        Locations Visited
                      </Typography>
                    </Box>
                    <Typography variant="h3" sx={{ fontWeight: 800, color: '#f57c00', mb: 1 }}>
                      {person.visits ? countUniqueCountries(
                        person.visits
                          .map(v => v.location?.country)
                          .filter((country): country is string => Boolean(country))
                      ) : 0}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} sm={6} md={2.4}>
                <Card sx={{ 
                  borderRadius: '16px',
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
                  border: '1px solid #e0e0e0',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    boxShadow: '0 8px 30px rgba(0, 0, 0, 0.12)',
                    transform: 'translateY(-2px)',
                  }
                }}>
                  <CardContent sx={{ p: 3 }}>
                    <Box display="flex" alignItems="center" mb={2}>
                      <Box
                        sx={{
                          width: 48,
                          height: 48,
                          borderRadius: '12px',
                          bgcolor: '#fff3e0',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          mr: 2
                        }}
                      >
                        <WbSunny sx={{ color: '#f57c00', fontSize: '1.5rem' }} />
                      </Box>
                      <Typography variant="h6" sx={{ fontWeight: 600, color: '#222222' }}>
                        Highest Temperature
                      </Typography>
                    </Box>
                    <Typography variant="h3" sx={{ fontWeight: 800, color: '#f57c00', mb: 1 }}>
                      {timelineEvents.some(e => e.periodWeatherStats?.data_exists) 
                        ? `${Math.max(...timelineEvents
                            .filter(e => e.periodWeatherStats?.data_exists)
                            .map(e => e.periodWeatherStats!.highest_temperature)).toFixed(1)}°F`
                        : 'N/A'
                      }
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} sm={6} md={2.4}>
                <Card sx={{ 
                  borderRadius: '16px',
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
                  border: '1px solid #e0e0e0',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    boxShadow: '0 8px 30px rgba(0, 0, 0, 0.12)',
                    transform: 'translateY(-2px)',
                  }
                }}>
                  <CardContent sx={{ p: 3 }}>
                    <Box display="flex" alignItems="center" mb={2}>
                      <Box
                        sx={{
                          width: 48,
                          height: 48,
                          borderRadius: '12px',
                          bgcolor: '#fff3e0',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          mr: 2
                        }}
                      >
                        <Cloud sx={{ color: '#f57c00', fontSize: '1.5rem' }} />
                      </Box>
                      <Typography variant="h6" sx={{ fontWeight: 600, color: '#222222' }}>
                        Lowest Temperature
                      </Typography>
                    </Box>
                    <Typography variant="h3" sx={{ fontWeight: 800, color: '#f57c00', mb: 1 }}>
                      {timelineEvents.some(e => e.periodWeatherStats?.data_exists) 
                        ? `${Math.min(...timelineEvents
                            .filter(e => e.periodWeatherStats?.data_exists)
                            .map(e => e.periodWeatherStats!.lowest_temperature)).toFixed(1)}°F`
                        : 'N/A'
                      }
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {/* Additional Weather Stats Row */}
            {timelineEvents.some(e => e.periodWeatherStats?.data_exists) && (
              <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid item xs={12} sm={6} md={3}>
                  <Card sx={{ 
                    borderRadius: '16px',
                    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
                    border: '1px solid #e0e0e0',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      boxShadow: '0 8px 30px rgba(0, 0, 0, 0.12)',
                      transform: 'translateY(-2px)',
                    }
                  }}>
                    <CardContent sx={{ p: 3 }}>
                      <Box display="flex" alignItems="center" mb={2}>
                        <Box
                          sx={{
                            width: 48,
                            height: 48,
                            borderRadius: '12px',
                            bgcolor: '#f3e5f5',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            mr: 2
                          }}
                        >
                          <Thermostat sx={{ color: '#7b1fa2', fontSize: '1.5rem' }} />
                        </Box>
                        <Typography variant="h6" sx={{ fontWeight: 600, color: '#222222' }}>
                          Average Temperature
                        </Typography>
                      </Box>
                      <Typography variant="h3" sx={{ fontWeight: 800, color: '#7b1fa2', mb: 1 }}>
                        {(() => {
                          const eventsWithData = timelineEvents.filter(e => e.periodWeatherStats?.data_exists);
                          if (eventsWithData.length === 0) return 'N/A';
                          
                          const totalTemp = eventsWithData.reduce((sum, e) => sum + e.periodWeatherStats!.average_temperature, 0);
                          const avgTemp = totalTemp / eventsWithData.length;
                          return `${Math.round(avgTemp)}°F`;
                        })()}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                  <Card sx={{ 
                    borderRadius: '16px',
                    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
                    border: '1px solid #e0e0e0',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      boxShadow: '0 8px 30px rgba(0, 0, 0, 0.12)',
                      transform: 'translateY(-2px)',
                    }
                  }}>
                    <CardContent sx={{ p: 3 }}>
                      <Box display="flex" alignItems="center" mb={2}>
                        <Box
                          sx={{
                            width: 48,
                            height: 48,
                            borderRadius: '12px',
                            bgcolor: '#e3f2fd',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            mr: 2
                          }}
                        >
                          <WbSunny sx={{ color: '#1976d2', fontSize: '1.5rem' }} />
                        </Box>
                        <Typography variant="h6" sx={{ fontWeight: 600, color: '#222222' }}>
                          Weather Records
                        </Typography>
                      </Box>
                      <Typography variant="h3" sx={{ fontWeight: 800, color: '#1976d2', mb: 1 }}>
                        {timelineEvents.reduce((total, e) => total + (e.periodWeatherStats?.total_records || 0), 0)}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                  <Card sx={{ 
                    borderRadius: '16px',
                    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
                    border: '1px solid #e0e0e0',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      boxShadow: '0 8px 30px rgba(0, 0, 0, 0.12)',
                      transform: 'translateY(-2px)',
                    }
                  }}>
                    <CardContent sx={{ p: 3 }}>
                      <Box display="flex" alignItems="center" mb={2}>
                        <Box
                          sx={{
                            width: 48,
                            height: 48,
                            borderRadius: '12px',
                            bgcolor: '#f3e5f5',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            mr: 2
                          }}
                        >
                          <CheckCircle sx={{ color: '#7b1fa2', fontSize: '1.5rem' }} />
                        </Box>
                        <Typography variant="h6" sx={{ fontWeight: 600, color: '#222222' }}>
                          Data Coverage
                        </Typography>
                      </Box>
                      <Typography variant="h3" sx={{ fontWeight: 800, color: '#7b1fa2', mb: 1 }}>
                        {(() => {
                          const eventsWithData = timelineEvents.filter(e => e.periodWeatherStats?.data_exists);
                          if (eventsWithData.length === 0) return '0%';
                          
                          const completeData = eventsWithData.filter(e => e.periodWeatherStats!.data_coverage === 'complete').length;
                          const percentage = Math.round((completeData / eventsWithData.length) * 100);
                          return `${percentage}%`;
                        })()}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                  <Card sx={{ 
                    borderRadius: '16px',
                    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
                    border: '1px solid #e0e0e0',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      boxShadow: '0 8px 30px rgba(0, 0, 0, 0.12)',
                      transform: 'translateY(-2px)',
                    }
                  }}>
                    <CardContent sx={{ p: 3 }}>
                      <Box display="flex" alignItems="center" mb={2}>
                        <Box
                          sx={{
                            width: 48,
                            height: 48,
                            borderRadius: '12px',
                            bgcolor: '#fff3e0',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            mr: 2
                          }}
                        >
                          <Visibility sx={{ color: '#f57c00', fontSize: '1.5rem' }} />
                        </Box>
                        <Typography variant="h6" sx={{ fontWeight: 600, color: '#222222' }}>
                          Active Visits
                        </Typography>
                      </Box>
                      <Typography variant="h3" sx={{ fontWeight: 800, color: '#f57c00', mb: 1 }}>
                        {timelineEvents.filter(e => e.periodWeatherStats?.data_exists).length}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            )}

            {/* Countries Visited Card - Full Width */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
              <Grid item xs={12}>
                <Card sx={{ 
                  borderRadius: '16px',
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
                  border: '1px solid #e0e0e0',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    boxShadow: '0 8px 30px rgba(0, 0, 0, 0.12)',
                    transform: 'translateY(-2px)',
                  }
                }}>
                  <CardContent sx={{ p: 3 }}>
                    <Box display="flex" alignItems="center" mb={2}>
                      <Box
                        sx={{
                          width: 48,
                          height: 48,
                          borderRadius: '12px',
                          bgcolor: '#e8f5e8',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          mr: 2
                        }}
                      >
                        <LocationOn sx={{ color: '#2e7d32', fontSize: '1.5rem' }} />
                      </Box>
                      <Typography variant="h6" sx={{ fontWeight: 600, color: '#222222' }}>
                        Countries Visited
                      </Typography>
                    </Box>
                    <Typography variant="h3" sx={{ fontWeight: 800, color: '#2e7d32', mb: 1 }}>
                      {person.visits ? countUniqueCountries(
                        person.visits
                          .map(v => v.location?.country)
                          .filter((country): country is string => Boolean(country))
                      ) : 0}
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#717171', fontWeight: 500 }}>
                      Unique countries
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {/* Journey Map */}
            <PersonLocationMap 
              timelineEvents={timelineEvents}
              personName={person.first_name}
            />

            {/* Timeline Events */}
            {timelineEvents.length > 0 ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {timelineEvents.map((event, index) => (
                  <Card
                    key={event.id}
                    sx={{
                      borderRadius: '12px',
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
                      border: event.isCurrentLocation ? '2px solid #FF5A5F' : '1px solid #e0e0e0',
                      transition: 'all 0.2s ease',
                      position: 'relative',
                      overflow: 'hidden',
                      '&:hover': {
                        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.1)',
                        transform: 'translateY(-1px)',
                      },
                      '&::before': event.isCurrentLocation ? {
                        content: '""',
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        height: '3px',
                        background: 'linear-gradient(90deg, #FF5A5F 0%, #FF8A80 100%)',
                      } : {},
                    }}
                  >
                    <CardContent sx={{ p: 2.5 }}>
                      {/* Header Row */}
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2 }}>
                        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                          {/* Event Title */}
                          <Typography 
                            variant="h6" 
                            sx={{ 
                              fontWeight: 600, 
                              color: '#222222',
                              mb: 0.5,
                              fontSize: '1.1rem'
                            }}
                          >
                            {event.type === 'home' && event.id === 'birth' ? 'Started at Home' :
                             event.type === 'home' && event.id.includes('home-final') ? 'Currently at Home' :
                             event.type === 'home' ? 'Returned Home' :
                             event.title}
                          </Typography>
                          
                          {/* Date and Duration */}
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                              {event.type === 'home' && event.id === 'birth'
                                ? formatDateConsistent(event.startDate.toISOString().split('T')[0])
                                : event.type === 'home' && event.id.includes('home-final')
                                ? `Since ${formatDateConsistent(event.startDate.toISOString().split('T')[0])}`
                                : event.type === 'home'
                                ? `${formatDateConsistent(event.startDate.toISOString().split('T')[0])} - ${formatDateConsistent(event.endDate.toISOString().split('T')[0])}`
                                : event.startDate.getTime() === event.endDate.getTime() 
                                ? formatDateConsistent(event.startDate.toISOString().split('T')[0])
                                : `${formatDateConsistent(event.startDate.toISOString().split('T')[0])} - ${formatDateConsistent(event.endDate.toISOString().split('T')[0])}`
                              }
                            </Typography>
                            
                            {/* Duration */}
                            {event.startDate.getTime() !== event.endDate.getTime() && (
                              <Typography 
                                variant="body2" 
                                sx={{ 
                                  color: event.isCurrentLocation ? '#FF5A5F' : '#717171',
                                  fontWeight: 500,
                                  fontSize: '0.85rem'
                                }}
                              >
                                ({Math.ceil((event.endDate.getTime() - event.startDate.getTime()) / (1000 * 60 * 60 * 24))} days)
                              </Typography>
                            )}
                          </Box>
                          
                          {/* Status Badges */}
                          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
                            {event.isCurrentLocation && (
                              <Chip
                                icon={<LocationOn fontSize="small" />}
                                label="Current Location"
                                size="small"
                                sx={{ 
                                  backgroundColor: '#FF5A5F',
                                  color: 'white',
                                  fontWeight: 500,
                                  fontSize: '0.75rem',
                                  height: '24px',
                                  '& .MuiChip-icon': { color: 'white', fontSize: '0.9rem' }
                                }}
                              />
                            )}
                            
                            {event.weather && (
                              <Chip
                                icon={<WbSunny fontSize="small" />}
                                label={formatTemperature(event.weather.temperature)}
                                size="small"
                                sx={{ 
                                  backgroundColor: '#f0f0f0',
                                  color: '#222222',
                                  fontWeight: 500,
                                  fontSize: '0.75rem',
                                  height: '24px',
                                  '& .MuiChip-icon': { color: '#FF5A5F', fontSize: '0.9rem' }
                                }}
                              />
                            )}
                          </Box>
                          
                          {/* Event Description */}
                          {event.description && (
                            <Typography 
                              variant="body2" 
                              color="text.secondary" 
                              sx={{ 
                                mt: 1.5,
                                fontStyle: 'italic',
                                fontSize: '0.9rem',
                                lineHeight: 1.4
                              }}
                            >
                              {event.description}
                            </Typography>
                          )}
                        </Box>
                      </Box>

                      {/* Weather Data Section */}
                      {event.periodWeatherStats && (
                        <Box sx={{ 
                          bgcolor: '#f8f9fa', 
                          borderRadius: '8px', 
                          p: 2, 
                          mb: 2,
                          border: '1px solid #e9ecef'
                        }}>
                          {/* Weather Data State Indicator */}
                          {renderWeatherDataState(event.periodWeatherStats, event)}
                          
                          {/* Weather Statistics */}
                          {event.periodWeatherStats.total_records > 0 && (
                            <Box sx={{ mt: 1.5 }}>
                              <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5, fontWeight: 500 }}>
                                Weather data for {event.startDate.getTime() === event.endDate.getTime() ? 'this day' : 'this period'}
                              </Typography>
                              
                              {/* Temperature Stats - Clean Grid Layout */}
                              <Box sx={{ 
                                display: 'grid', 
                                gridTemplateColumns: 'repeat(3, 1fr)', 
                                gap: 1.5 
                              }}>
                                <Box sx={{ textAlign: 'center' }}>
                                  <Box sx={{ 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    justifyContent: 'center',
                                    width: 32,
                                    height: 32,
                                    borderRadius: '8px',
                                    backgroundColor: '#10B981',
                                    mx: 'auto',
                                    mb: 0.5
                                  }}>
                                    <Thermostat sx={{ color: 'white', fontSize: '1.2rem' }} />
                                  </Box>
                                  <Typography variant="body2" sx={{ fontWeight: 600, color: '#222222', mb: 0.25 }}>
                                    {event.periodWeatherStats.average_temperature}°F
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                                    Average
                                  </Typography>
                                </Box>
                                
                                <Box sx={{ textAlign: 'center' }}>
                                  <Box sx={{ 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    justifyContent: 'center',
                                    width: 32,
                                    height: 32,
                                    borderRadius: '8px',
                                    backgroundColor: '#F59E0B',
                                    mx: 'auto',
                                    mb: 0.5
                                  }}>
                                    <WbSunny sx={{ color: 'white', fontSize: '1.2rem' }} />
                                  </Box>
                                  <Typography variant="body2" sx={{ fontWeight: 600, color: '#222222', mb: 0.25 }}>
                                    {event.periodWeatherStats.highest_temperature}°F
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                                    High
                                  </Typography>
                                </Box>
                                
                                <Box sx={{ textAlign: 'center' }}>
                                  <Box sx={{ 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    justifyContent: 'center',
                                    width: 32,
                                    height: 32,
                                    borderRadius: '8px',
                                    backgroundColor: '#3B82F6',
                                    mx: 'auto',
                                    mb: 0.5
                                  }}>
                                    <Cloud sx={{ color: 'white', fontSize: '1.2rem' }} />
                                  </Box>
                                  <Typography variant="body2" sx={{ fontWeight: 600, color: '#222222', mb: 0.25 }}>
                                    {event.periodWeatherStats.lowest_temperature}°F
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                                    Low
                                  </Typography>
                                </Box>
                              </Box>
                            </Box>
                          )}
                        </Box>
                      )}

                      {/* Location Details */}
                      {event.location && (
                        <Box sx={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: 1.5,
                          p: 1.5,
                          bgcolor: '#f8f9fa',
                          borderRadius: '8px',
                          border: '1px solid #e9ecef'
                        }}>
                          <LocationOn sx={{ color: '#717171', fontSize: '1.1rem' }} />
                          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                            <Typography variant="body2" sx={{ fontWeight: 600, color: '#222222', mb: 0.25 }}>
                              {event.location.name}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.85rem' }}>
                              {event.location.city}, {event.location.country}
                            </Typography>
                          </Box>
                          
                          {event.location.latitude && event.location.longitude && (
                            <Typography 
                              variant="caption" 
                              color="text.secondary" 
                              sx={{ 
                                fontSize: '0.7rem',
                                fontFamily: 'monospace',
                                bgcolor: 'white',
                                px: 1,
                                py: 0.5,
                                borderRadius: '4px',
                                border: '1px solid #e0e0e0'
                              }}
                            >
                              {event.location.latitude.toFixed(4)}, {event.location.longitude.toFixed(4)}
                            </Typography>
                          )}
                        </Box>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </Box>
            ) : (
              <Box textAlign="center" py={4}>
                <Typography variant="h6" sx={{ fontWeight: 600, color: '#222222', mb: 2 }}>
                  No timeline events yet
                </Typography>
                <Typography sx={{ color: '#717171', fontWeight: 500 }}>
                  Add visits to see {person.first_name}'s journey through time
                </Typography>
              </Box>
            )}
          </Box>
        </Card>



        {/* Quick Actions - Airbnb Style */}
        <Box display="flex" gap={2} justifyContent="center" sx={{ mt: 4 }}>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => navigate(`/people?addVisit=${person.id}`)}
            sx={{
              backgroundColor: '#FF5A5F',
              color: 'white',
              fontWeight: 600,
              textTransform: 'none',
              px: 3,
              py: 1.5,
              borderRadius: '25px',
              '&:hover': {
                backgroundColor: '#E04A4F',
              }
            }}
          >
            Add Visit
          </Button>
          <Button
            variant="outlined"
            startIcon={<Edit />}
            onClick={() => navigate(`/people?editPerson=${person.id}`)}
            sx={{
              borderColor: '#e0e0e0',
              color: '#222222',
              fontWeight: 600,
              textTransform: 'none',
              px: 3,
              py: 1.5,
              borderRadius: '25px',
              '&:hover': {
                borderColor: '#FF5A5F',
                color: '#FF5A5F',
                backgroundColor: 'rgba(255, 90, 95, 0.04)',
              }
            }}
          >
            Edit Profile
          </Button>
        </Box>
      </Container>
    </Box>
  );
};

export default PersonDashboard;
