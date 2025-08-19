import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  CardActions,
  Button,
  Grid,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Chip,
  Alert,
  Snackbar,
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { locationService, Location, CreateLocationData } from '../services/locationService';

const Locations: React.FC = () => {
  const [locations, setLocations] = useState<Location[]>([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    city: '',
    country: '',
    latitude: '',
    longitude: '',
    description: '',
  });
  const { user } = useAuth();

  useEffect(() => {
    fetchLocations();
  }, []);

  const fetchLocations = async () => {
    try {
      setLoading(true);
      const fetchedLocations = await locationService.getLocations();
      setLocations(fetchedLocations);
    } catch (err) {
      console.error('Failed to fetch locations:', err);
      setError('Failed to load locations');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (location?: Location) => {
    if (location) {
      setEditingLocation(location);
      setFormData({
        name: location.name,
        address: location.address || '',
        city: location.city,
        country: location.country,
        latitude: location.latitude.toString(),
        longitude: location.longitude.toString(),
        description: location.description || '',
      });
    } else {
      setEditingLocation(null);
      setFormData({
        name: '',
        address: '',
        city: '',
        country: '',
        latitude: '',
        longitude: '',
        description: '',
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingLocation(null);
    setFormData({
      name: '',
      address: '',
      city: '',
      country: '',
      latitude: '',
      longitude: '',
      description: '',
    });
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      
      // Debug: Check JWT token
      const token = localStorage.getItem('access_token');
      console.log('JWT Token:', token ? token.substring(0, 50) + '...' : 'No token found');
      
      // Validate required fields
      if (!formData.name.trim()) {
        setError('Location name is required');
        setLoading(false);
        return;
      }
      
      if (!formData.city.trim()) {
        setError('City is required');
        setLoading(false);
        return;
      }
      
      if (!formData.country.trim()) {
        setError('Country is required');
        setLoading(false);
        return;
      }
      
      if (!formData.latitude || !formData.longitude) {
        setError('Latitude and longitude are required');
        setLoading(false);
        return;
      }
      
      // Debug: Log what we're about to send
      const locationData = {
        name: formData.name,
        address: formData.address || undefined,
        city: formData.city,
        country: formData.country,
        latitude: parseFloat(formData.latitude),
        longitude: parseFloat(formData.longitude),
        description: formData.description || undefined,
      };
      
      console.log('About to send location data:', locationData);
      
      if (editingLocation) {
        // Update existing location
        const updatedLocation = await locationService.updateLocation(
          editingLocation.id,
          locationData
        );
        
        setLocations(locations.map(loc =>
          loc.id === editingLocation.id ? updatedLocation : loc
        ));
        setSuccess('Location updated successfully!');
      } else {
        // Create new location
        const newLocation = await locationService.createLocation(locationData);
        
        setLocations([...locations, newLocation]);
        setSuccess('Location added successfully!');
      }
      
      handleCloseDialog();
    } catch (err: any) {
      console.error('Failed to save location:', err);
      console.error('Error details:', err.response?.data);
      setError('Failed to save location. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      setLoading(true);
      await locationService.deleteLocation(id);
      setLocations(locations.filter(loc => loc.id !== id));
      setSuccess('Location deleted successfully!');
    } catch (err) {
      console.error('Failed to delete location:', err);
      setError('Failed to delete location. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCloseSnackbar = () => {
    setError(null);
    setSuccess(null);
  };

  const handleGeocode = async () => {
    if (!formData.address && !formData.city && !formData.country) {
      setError('Please enter an address, city, or country to geocode');
      return;
    }

    try {
      setLoading(true);
      const query = formData.address || `${formData.city}, ${formData.country}`;
      
      // Call the backend geocoding service
      const response = await fetch(`http://localhost:5001/api/geocode?query=${encodeURIComponent(query)}`);
      const data = await response.json();
      
      if (data.latitude && data.longitude) {
        setFormData(prev => ({
          ...prev,
          latitude: data.latitude.toString(),
          longitude: data.longitude.toString()
        }));
        setSuccess('Coordinates found! You can adjust them if needed.');
      } else {
        setError('Could not find coordinates for this location');
      }
    } catch (err) {
      console.error('Geocoding failed:', err);
      setError('Failed to get coordinates. Please enter them manually.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ my: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" component="h1">
            My Locations
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
            disabled={loading}
          >
            Add Location
          </Button>
        </Box>

        {loading && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography>Loading locations...</Typography>
          </Box>
        )}

        <Grid container spacing={3}>
          {locations.map((location) => (
            <Grid item xs={12} sm={6} md={4} key={location.id}>
              <Card>
                <CardContent>
                  <Typography variant="h6" component="h2" gutterBottom>
                    {location.name}
                  </Typography>
                  {location.address && (
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      {location.address}
                    </Typography>
                  )}
                  <Typography color="text.secondary" gutterBottom>
                    {location.city}, {location.country}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
                  </Typography>
                  {location.description && (
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      {location.description}
                    </Typography>
                  )}
                </CardContent>
                <CardActions>
                  <IconButton
                    size="small"
                    onClick={() => handleOpenDialog(location)}
                    disabled={loading}
                  >
                    <EditIcon />
                  </IconButton>
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => handleDelete(location.id)}
                    disabled={loading}
                  >
                    <DeleteIcon />
                  </IconButton>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>

        {!loading && locations.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <Typography variant="h6" color="text.secondary">
              No locations added yet
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Start by adding your first location to track weather patterns
            </Typography>
          </Box>
        )}
      </Box>

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingLocation ? 'Edit Location' : 'Add New Location'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <TextField
              fullWidth
              label="Location Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              margin="normal"
              required
              disabled={loading}
            />
            <TextField
              fullWidth
              label="Address (optional)"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              margin="normal"
              disabled={loading}
            />
            <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
              <Button
                variant="outlined"
                onClick={handleGeocode}
                disabled={loading || (!formData.address && !formData.city && !formData.country)}
                size="small"
              >
                Get Coordinates
              </Button>
              <Typography variant="caption" color="text.secondary" sx={{ alignSelf: 'center' }}>
                Automatically get coordinates from address
              </Typography>
            </Box>
            <TextField
              fullWidth
              label="City"
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              margin="normal"
              required
              disabled={loading}
            />
            <TextField
              fullWidth
              label="Country"
              value={formData.country}
              onChange={(e) => setFormData({ ...formData, country: e.target.value })}
              margin="normal"
              required
              disabled={loading}
            />
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Latitude"
                  type="number"
                  value={formData.latitude}
                  onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                  margin="normal"
                  required
                  disabled={loading}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Longitude"
                  type="number"
                  value={formData.longitude}
                  onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                  margin="normal"
                  required
                  disabled={loading}
                />
              </Grid>
            </Grid>
            <TextField
              fullWidth
              label="Description (optional)"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              margin="normal"
              multiline
              rows={3}
              disabled={loading}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} variant="contained" disabled={loading}>
            {loading ? 'Saving...' : (editingLocation ? 'Update' : 'Add')}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={!!error} autoHideDuration={6000} onClose={handleCloseSnackbar}>
        <Alert onClose={handleCloseSnackbar} severity="error" sx={{ width: '100%' }}>
          {error}
        </Alert>
      </Snackbar>

      <Snackbar open={!!success} autoHideDuration={6000} onClose={handleCloseSnackbar}>
        <Alert onClose={handleCloseSnackbar} severity="success" sx={{ width: '100%' }}>
          {success}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default Locations;
