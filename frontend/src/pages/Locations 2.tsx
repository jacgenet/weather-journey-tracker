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
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';

interface Location {
  id: number;
  name: string;
  city: string;
  country: string;
  latitude: number;
  longitude: number;
  description?: string;
  visited_date?: string;
}

const Locations: React.FC = () => {
  const [locations, setLocations] = useState<Location[]>([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    city: '',
    country: '',
    latitude: '',
    longitude: '',
    description: '',
    visited_date: '',
  });
  const { user } = useAuth();

  useEffect(() => {
    // TODO: Fetch locations from API
    // For now, using mock data
    setLocations([
      {
        id: 1,
        name: 'Central Park',
        city: 'New York',
        country: 'USA',
        latitude: 40.785091,
        longitude: -73.968285,
        description: 'Beautiful urban park in Manhattan',
        visited_date: '2023-06-15',
      },
    ]);
  }, []);

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
        visited_date: location.visited_date || '',
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
        visited_date: '',
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
      visited_date: '',
    });
  };

  const handleSubmit = () => {
    if (editingLocation) {
      // Update existing location
      setLocations(locations.map(loc =>
        loc.id === editingLocation.id
          ? {
              ...loc,
              ...formData,
              latitude: parseFloat(formData.latitude),
              longitude: parseFloat(formData.longitude),
            }
          : loc
      ));
    } else {
      // Add new location
      const newLocation: Location = {
        id: Date.now(),
        ...formData,
        latitude: parseFloat(formData.latitude),
        longitude: parseFloat(formData.longitude),
      };
      setLocations([...locations, newLocation]);
    }
    handleCloseDialog();
  };

  const handleDelete = (id: number) => {
    setLocations(locations.filter(loc => loc.id !== id));
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
          >
            Add Location
          </Button>
        </Box>

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
                  {location.visited_date && (
                    <Chip
                      label={`Visited: ${new Date(location.visited_date).toLocaleDateString()}`}
                      size="small"
                      sx={{ mt: 1 }}
                    />
                  )}
                </CardContent>
                <CardActions>
                  <IconButton
                    size="small"
                    onClick={() => handleOpenDialog(location)}
                  >
                    <EditIcon />
                  </IconButton>
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => handleDelete(location.id)}
                  >
                    <DeleteIcon />
                  </IconButton>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>

        {locations.length === 0 && (
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
            />
            <TextField
              fullWidth
              label="City"
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              margin="normal"
              required
            />
            <TextField
              fullWidth
              label="Country"
              value={formData.country}
              onChange={(e) => setFormData({ ...formData, country: e.target.value })}
              margin="normal"
              required
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
            />
            <TextField
              fullWidth
              label="Date Visited (optional)"
              type="date"
              value={formData.visited_date}
              onChange={(e) => setFormData({ ...formData, visited_date: e.target.value })}
              margin="normal"
              InputLabelProps={{ shrink: true }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained">
            {editingLocation ? 'Update' : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Locations;
