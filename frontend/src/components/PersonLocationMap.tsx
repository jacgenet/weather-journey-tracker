import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Box, Typography, Card, CardContent, Chip, Divider } from '@mui/material';
import { LocationOn, Home, WbSunny, CalendarToday } from '@mui/icons-material';
import { Location } from '../services/locationService';
import { usePreferences } from '../contexts/PreferencesContext';

// Fix for default markers in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

// Custom icons
const homeIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;base64,' + btoa(`
    <svg width="25" height="41" viewBox="0 0 25 41" xmlns="http://www.w3.org/2000/svg">
      <path d="M12.5 0C5.6 0 0 5.6 0 12.5c0 12.5 12.5 28.5 12.5 28.5s12.5-16 12.5-28.5C25 5.6 19.4 0 12.5 0zm0 17c-2.5 0-4.5-2-4.5-4.5s2-4.5 4.5-4.5 4.5 2 4.5 4.5-2 4.5-4.5 4.5z" fill="#1976d2"/>
    </svg>
  `),
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

const visitIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;base64,' + btoa(`
    <svg width="25" height="41" viewBox="0 0 25 41" xmlns="http://www.w3.org/2000/svg">
      <path d="M12.5 0C5.6 0 0 5.6 0 12.5c0 12.5 12.5 28.5 12.5 28.5s12.5-16 12.5-28.5C25 5.6 19.4 0 12.5 0zm0 17c-2.5 0-4.5-2-4.5-4.5s2-4.5 4.5-4.5 4.5 2 4.5 4.5-2 4.5-4.5 4.5z" fill="#4caf50"/>
    </svg>
  `),
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

interface TimelineEvent {
  id: string;
  type: 'birth' | 'home' | 'visit';
  title: string;
  description: string;
  location?: Location;
  weather?: {
    temperature: number;
    description: string;
    humidity: number;
  };
  startDate: Date;
  endDate: Date;
  isCurrentLocation?: boolean;
}

interface PersonLocationMapProps {
  timelineEvents: TimelineEvent[];
  personName: string;
}

// Component to fit map bounds to show all markers
const FitBounds: React.FC<{ locations: Location[] }> = ({ locations }) => {
  const map = useMap();

  useEffect(() => {
    if (locations.length > 0) {
      const bounds = L.latLngBounds(
        locations.map(loc => [loc.latitude, loc.longitude])
      );
      map.fitBounds(bounds, { padding: [20, 20] });
    }
  }, [locations, map]);

  return null;
};

const PersonLocationMap: React.FC<PersonLocationMapProps> = ({ 
  timelineEvents, 
  personName 
}) => {
  const { formatTemperature } = usePreferences();
  const [mapCenter, setMapCenter] = useState<[number, number]>([0, 0]);

  // Get unique locations from timeline events
  const locations = timelineEvents
    .filter(event => event.location)
    .map(event => event.location!)
    .filter((location, index, self) => 
      index === self.findIndex(l => l.id === location.id)
    );

  // Calculate map center based on locations
  useEffect(() => {
    if (locations.length > 0) {
      const avgLat = locations.reduce((sum, loc) => sum + loc.latitude, 0) / locations.length;
      const avgLng = locations.reduce((sum, loc) => sum + loc.longitude, 0) / locations.length;
      setMapCenter([avgLat, avgLng]);
    }
  }, [locations]);

  // Get events for each location
  const getLocationEvents = (locationId: number) => {
    return timelineEvents.filter(event => event.location?.id === locationId);
  };

  // Get the most recent event for a location to determine icon
  const getLocationIcon = (locationId: number) => {
    const events = getLocationEvents(locationId);
    const hasHomeEvent = events.some(event => event.type === 'home');
    const hasCurrentLocation = events.some(event => event.isCurrentLocation);
    
    if (hasCurrentLocation || hasHomeEvent) {
      return homeIcon;
    }
    return visitIcon;
  };

  if (locations.length === 0) {
    return (
      <Card>
        <CardContent>
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <LocationOn sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No locations to display
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Add visits to see {personName}'s locations on the map
            </Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <LocationOn color="primary" />
          <Typography variant="h6" component="h2">
            {personName}'s Journey Map
          </Typography>
        </Box>
        
        <Box sx={{ height: 400, width: '100%', borderRadius: 1, overflow: 'hidden' }}>
          <MapContainer
            center={mapCenter}
            zoom={locations.length === 1 ? 10 : 3}
            style={{ height: '100%', width: '100%' }}
            scrollWheelZoom={true}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            
            <FitBounds locations={locations} />
            
            {locations.map((location) => {
              const events = getLocationEvents(location.id);
              const icon = getLocationIcon(location.id);
              const hasCurrentLocation = events.some(event => event.isCurrentLocation);
              const hasHomeEvent = events.some(event => event.type === 'home');
              const visitEvents = events.filter(event => event.type === 'visit');
              
              return (
                <Marker
                  key={location.id}
                  position={[location.latitude, location.longitude]}
                  icon={icon}
                >
                  <Popup maxWidth={300}>
                    <Box sx={{ minWidth: 250 }}>
                      <Typography variant="h6" gutterBottom>
                        {location.name}
                      </Typography>
                      
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        {location.city}, {location.country}
                      </Typography>
                      
                      {location.address && (
                        <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                          {location.address}
                        </Typography>
                      )}
                      
                      <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                        {hasCurrentLocation && (
                          <Chip
                            icon={<Home fontSize="small" />}
                            label="Current Location"
                            size="small"
                            color="primary"
                            variant="filled"
                          />
                        )}
                        {hasHomeEvent && !hasCurrentLocation && (
                          <Chip
                            icon={<Home fontSize="small" />}
                            label="Home"
                            size="small"
                            color="primary"
                            variant="outlined"
                          />
                        )}
                        {visitEvents.length > 0 && (
                          <Chip
                            icon={<CalendarToday fontSize="small" />}
                            label={`${visitEvents.length} visit${visitEvents.length > 1 ? 's' : ''}`}
                            size="small"
                            color="success"
                            variant="outlined"
                          />
                        )}
                      </Box>
                      
                      <Divider sx={{ my: 1 }} />
                      
                      <Typography variant="subtitle2" gutterBottom>
                        Timeline Events:
                      </Typography>
                      
                      {events.slice(0, 3).map((event, index) => (
                        <Box key={event.id} sx={{ mb: 1 }}>
                          <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                            {event.title}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {event.startDate.toLocaleDateString()}
                            {event.startDate.getTime() !== event.endDate.getTime() && 
                              ` - ${event.endDate.toLocaleDateString()}`
                            }
                          </Typography>
                          
                          {event.weather && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                              <WbSunny fontSize="small" color="warning" />
                              <Typography variant="caption" color="text.secondary">
                                {formatTemperature(event.weather.temperature)} • {event.weather.description}
                              </Typography>
                            </Box>
                          )}
                        </Box>
                      ))}
                      
                      {events.length > 3 && (
                        <Typography variant="caption" color="text.secondary">
                          +{events.length - 3} more events
                        </Typography>
                      )}
                    </Box>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        </Box>
        
        <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Chip
            icon={<Home fontSize="small" />}
            label="Home/Current"
            size="small"
            color="primary"
            variant="filled"
          />
          <Chip
            icon={<CalendarToday fontSize="small" />}
            label="Visits"
            size="small"
            color="success"
            variant="outlined"
          />
          <Typography variant="caption" color="text.secondary" sx={{ alignSelf: 'center' }}>
            {locations.length} unique location{locations.length !== 1 ? 's' : ''}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
};

export default PersonLocationMap;
