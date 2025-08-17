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
    city: '',
    country: '',
    latitude: '',
    longitude: '',
    description: '',
    start_date: '',
    end_date: '',
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
        city: location.city,
        country: location.country,
        latitude: location.latitude.toString(),
        longitude: location.longitude.toString(),
        description: location.description || '',
        start_date: location.start_date || '',
        end_date: location.end_date || '',
      });
    } else {
      setEditingLocation(null);
      setFormData({
        name: '',
        city: '',
        country: '',
        latitude: '',
        longitude: '',
        description: '',
        start_date: '',
        end_date: '',
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingLocation(null);
    setFormData({
      name: '',
      city: '',
      country: '',
      latitude: '',
      longitude: '',
      description: '',
      start_date: '',
      end_date: '',
    });
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      
      if (editingLocation) {
        // Update existing location
        const updatedLocation = await locationService.updateLocation(
          editingLocation.id,
          {
            name: formData.name,
            city: formData.city,
            country: formData.country,
            latitude: parseFloat(formData.latitude),
            longitude: parseFloat(formData.longitude),
            description: formData.description || undefined,
            start_date: formData.start_date || undefined,
            end_date: formData.end_date || undefined,
          }
        );
        
        setLocations(locations.map(loc =>
          loc.id === editingLocation.id ? updatedLocation : loc
        ));
        setSuccess('Location updated successfully!');
      } else {
        // Create new location
        const newLocation = await locationService.createLocation({
          name: formData.name,
          city: formData.city,
          country: formData.country,
          latitude: parseFloat(formData.latitude),
          longitude: parseFloat(formData.longitude),
          description: formData.description || undefined,
          start_date: formData.start_date || undefined,
          end_date: formData.end_date || undefined,
        });
        
        setLocations([...locations, newLocation]);
        setSuccess('Location added successfully!');
      }
      
      handleCloseDialog();
    } catch (err) {
      console.error('Failed to save location:', err);
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

  const formatDateRange = (startDate?: string, endDate?: string) => {
    if (!startDate) return '';
    if (!endDate || startDate === endDate) {
      return new Date(startDate).toLocaleDateString();
    }
    return `${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}`;
  };

  const handleCloseSnackbar = () => {
    setError(null);
    setSuccess(null);
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
                  {(location.start_date || location.end_date) && (
                    <Chip
                      label={`Visited: ${formatDateRange(location.start_date, location.end_date)}`}
                      size="small"
                      sx={{ mt: 1 }}
                    />
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
            <Typography variant="subtitle2" sx={{ mt: 2, mb: 1, color: 'text.secondary' }}>
              Visit Date Range (optional)
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Start Date"
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  margin="normal"
                  InputLabelProps={{ shrink: true }}
                  disabled={loading}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="End Date"
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  margin="normal"
                  InputLabelProps={{ shrink: true }}
                  disabled={loading}
                />
              </Grid>
            </Grid>
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
