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
  Avatar,
  Divider,
  Alert,
  Snackbar,
  Fab,
  Tooltip,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  SelectChangeEvent,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Search,
  Person,
  LocationOn,
  CalendarToday,
  Note,
  ExpandMore,
  AddLocation,
  Visibility,
  Timeline,
} from '@mui/icons-material';
import { peopleService, Person as PersonType, CreatePersonData, CreateVisitData, PersonLocation } from '../services/peopleService';
import { locationService, Location as LocationType } from '../services/locationService';
import { locationDataService, Country, State, City } from '../services/locationDataService';
import { usePreferences, TemperatureUnit } from '../contexts/PreferencesContext';

const People: React.FC = () => {
  const [people, setPeople] = useState<PersonType[]>([]);
  const [locations, setLocations] = useState<LocationType[]>([]);
  const [filteredPeople, setFilteredPeople] = useState<PersonType[]>([]);
  const [loading, setLoading] = useState(false);
  const [showPersonDialog, setShowPersonDialog] = useState(false);
  const [showVisitDialog, setShowVisitDialog] = useState(false);
  const [editingPerson, setEditingPerson] = useState<PersonType | null>(null);
  const [selectedPerson, setSelectedPerson] = useState<PersonType | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [personFormData, setPersonFormData] = useState<CreatePersonData>({
    first_name: '',
    last_name: '',
    birth_date: '',
    home_location: '',  // Legacy field
    home_location_id: undefined,  // New field
    notes: '',
  });
  const [visitFormData, setVisitFormData] = useState<CreateVisitData>({
    location_id: 0,
    start_date: '',
    end_date: '',
    notes: '',
  });
  const [showPersonDetailsDialog, setShowPersonDetailsDialog] = useState(false);
  const [personDetails, setPersonDetails] = useState<PersonType | null>(null);
  const [showEditVisitDialog, setShowEditVisitDialog] = useState(false);
  const [editingVisit, setEditingVisit] = useState<PersonLocation | null>(null);
  const [showDeleteVisitDialog, setShowDeleteVisitDialog] = useState(false);
  const [visitToDelete, setVisitToDelete] = useState<PersonLocation | null>(null);
  const [editVisitFormData, setEditVisitFormData] = useState<CreateVisitData>({
    location_id: 0,
    start_date: '',
    end_date: '',
    notes: '',
  });

  // Location data for dropdowns
  const [countries, setCountries] = useState<Country[]>([]);
  const [states, setStates] = useState<State[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  
  // Selected location IDs for dropdowns
  const [selectedCountryId, setSelectedCountryId] = useState<number | ''>('');
  const [selectedStateId, setSelectedStateId] = useState<number | ''>('');
  const [selectedCityId, setSelectedCityId] = useState<number | ''>('');

  const { preferences, setTemperatureUnit } = usePreferences();

  const handleTemperatureUnitChange = (event: SelectChangeEvent<TemperatureUnit>) => {
    setTemperatureUnit(event.target.value as TemperatureUnit);
  };

  useEffect(() => {
    fetchPeople();
    fetchLocations();
    fetchCountries();
  }, []);

  useEffect(() => {
    // Filter people based on search query
    if (searchQuery.trim()) {
      const filtered = people.filter(
        person =>
          person.first_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          person.last_name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredPeople(filtered);
    } else {
      setFilteredPeople(people);
    }
  }, [searchQuery, people]);

  const fetchPeople = async () => {
    try {
      setLoading(true);
      const data = await peopleService.getPeople();
      setPeople(data);
      setFilteredPeople(data);
    } catch (error) {
      console.error('Failed to fetch people:', error);
      setMessage({ type: 'error', text: 'Failed to fetch people' });
    } finally {
      setLoading(false);
    }
  };

  const fetchLocations = async () => {
    try {
      const data = await locationService.getLocations();
      setLocations(data);
    } catch (error) {
      console.error('Failed to fetch locations:', error);
    }
  };

  const fetchCountries = async () => {
    try {
      const fetchedCountries = await locationDataService.getCountries();
      setCountries(fetchedCountries);
    } catch (err) {
      console.error('Failed to fetch countries:', err);
    }
  };

  const fetchStatesByCountry = async (countryId: number) => {
    try {
      const fetchedStates = await locationDataService.getStatesByCountry(countryId);
      setStates(fetchedStates);
    } catch (err) {
      console.error('Failed to fetch states:', err);
    }
  };

  const fetchCitiesByState = async (countryId: number, stateId: number) => {
    try {
      const fetchedCities = await locationDataService.getCitiesByState(countryId, stateId);
      setCities(fetchedCities);
    } catch (err) {
      console.error('Failed to fetch cities:', err);
    }
  };

  const handlePersonSubmit = async () => {
    try {
      setLoading(true);
      
      if (editingPerson) {
        await peopleService.updatePerson(editingPerson.id, personFormData);
        setMessage({ type: 'success', text: 'Person updated successfully!' });
      } else {
        await peopleService.createPerson(personFormData);
        setMessage({ type: 'success', text: 'Person added successfully!' });
      }
      
      setShowPersonDialog(false);
      resetPersonForm();
      fetchPeople();
    } catch (error: any) {
      console.error('Failed to save person:', error);
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.error || 'Failed to save person' 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVisitSubmit = async () => {
    if (!selectedPerson) return;
    
    try {
      setLoading(true);
      await peopleService.addVisit(selectedPerson.id, visitFormData);
      setMessage({ type: 'success', text: 'Visit added successfully!' });
      setShowVisitDialog(false);
      resetVisitForm();
      fetchPeople(); // Refresh to get updated visit data
    } catch (error: any) {
      console.error('Failed to add visit:', error);
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.error || 'Failed to add visit' 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePerson = async (person: PersonType) => {
    if (window.confirm(`Are you sure you want to delete ${person.full_name}?`)) {
      try {
        await peopleService.deletePerson(person.id);
        setMessage({ type: 'success', text: 'Person deleted successfully!' });
        fetchPeople();
      } catch (error: any) {
        console.error('Failed to delete person:', error);
        setMessage({ 
          type: 'error', 
          text: error.response?.data?.error || 'Failed to delete person' 
        });
      }
    }
  };

  const handleEditPerson = (person: PersonType) => {
    setEditingPerson(person);
    setPersonFormData({
      first_name: person.first_name,
      last_name: person.last_name,
      birth_date: person.birth_date || '',
      home_location: person.home_location || '',  // Legacy field
      home_location_id: person.home_location_id,  // New field
      notes: person.notes || '',
    });
    setShowPersonDialog(true);
  };

  const handleViewPerson = async (person: PersonType) => {
    try {
      setLoading(true);
      const fullPerson = await peopleService.getPerson(person.id);
      setPersonDetails(fullPerson);
      setShowPersonDetailsDialog(true);
    } catch (error: any) {
      console.error('Failed to fetch person details:', error);
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.error || 'Failed to fetch person details' 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEditVisit = (visit: PersonLocation) => {
    setEditingVisit(visit);
    setEditVisitFormData({
      location_id: visit.location_id,
      start_date: visit.start_date,
      end_date: visit.end_date || '',
      notes: visit.notes || '',
    });
    setShowEditVisitDialog(true);
  };

  const handleDeleteVisit = async (visit: PersonLocation) => {
    if (!personDetails) return;
    
    setVisitToDelete(visit);
    setShowDeleteVisitDialog(true);
  };

  const confirmDeleteVisit = async () => {
    if (!visitToDelete || !personDetails) return;
    
    try {
      setLoading(true);
      await peopleService.deleteVisit(personDetails.id, visitToDelete.id);
      setMessage({ type: 'success', text: 'Visit deleted successfully!' });
      
      // Refresh person details to show updated visits
      const updatedPerson = await peopleService.getPerson(personDetails.id);
      setPersonDetails(updatedPerson);
      
      // Also refresh the main people list to update visit count
      fetchPeople();
    } catch (error: any) {
      console.error('Failed to delete visit:', error);
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.error || 'Failed to delete visit' 
      });
    } finally {
      setLoading(false);
      setShowDeleteVisitDialog(false);
      setVisitToDelete(null);
    }
  };

  const handleEditVisitSubmit = async () => {
    if (!editingVisit || !personDetails) return;
    
    try {
      setLoading(true);
      await peopleService.updateVisit(personDetails.id, editingVisit.id, editVisitFormData);
      setMessage({ type: 'success', text: 'Visit updated successfully!' });
      setShowEditVisitDialog(false);
      resetEditVisitForm(); // Reset edit visit form
      
      // Refresh person details to show updated visits
      const updatedPerson = await peopleService.getPerson(personDetails.id);
      setPersonDetails(updatedPerson);
      
      // Also refresh the main people list to update visit count
      fetchPeople();
    } catch (error: any) {
      console.error('Failed to update visit:', error);
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.error || 'Failed to update visit' 
      });
    } finally {
      setLoading(false);
    }
  };

  const resetPersonForm = () => {
    setPersonFormData({
      first_name: '',
      last_name: '',
      birth_date: '',
      home_location: '',  // Legacy field
      home_location_id: undefined,  // New field
      notes: '',
    });
    setEditingPerson(null);
    setSelectedCountryId('');
    setSelectedStateId('');
    setSelectedCityId('');
    setStates([]);
    setCities([]);
  };

  const resetVisitForm = () => {
    setVisitFormData({
      location_id: 0,
      start_date: '',
      end_date: '',
      notes: '',
    });
  };

  const resetEditVisitForm = () => {
    setEditVisitFormData({
      location_id: 0,
      start_date: '',
      end_date: '',
      notes: '',
    });
    setEditingVisit(null);
  };

  const handlePersonChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPersonFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handlePersonSelectChange = (e: SelectChangeEvent<number>) => {
    const { name, value } = e.target;
    setPersonFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleCountryChange = (event: SelectChangeEvent<number | string>) => {
    const countryId = event.target.value as number;
    setSelectedCountryId(countryId);
    setSelectedStateId('');
    setSelectedCityId('');
    setStates([]);
    setCities([]);
    
    if (countryId) {
      fetchStatesByCountry(countryId);
    }
  };

  const handleStateChange = (event: SelectChangeEvent<number | string>) => {
    const stateId = event.target.value as number;
    setSelectedStateId(stateId);
    setSelectedCityId('');
    setCities([]);
    
    if (stateId && selectedCountryId) {
      fetchCitiesByState(selectedCountryId as number, stateId);
    }
  };

  const handleCityChange = (event: SelectChangeEvent<number | string>) => {
    const cityId = event.target.value as number;
    setSelectedCityId(cityId);
    
    if (cityId) {
      // Auto-populate coordinates if available
      const city = cities.find(c => c.id === cityId);
      if (city && city.latitude && city.longitude) {
        // We could auto-create a location here or just store the city info
        console.log('City selected with coordinates:', city);
      }
    }
  };

  const handleVisitChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setVisitFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleVisitSelectChange = (e: SelectChangeEvent<number>) => {
    const { name, value } = e.target;
    setVisitFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleEditVisitChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEditVisitFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleEditVisitSelectChange = (e: SelectChangeEvent<number>) => {
    const { name, value } = e.target;
    setEditVisitFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString();
  };

  const calculateAge = (birthDate?: string) => {
    if (!birthDate) return null;
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const getLocationName = (locationId: number) => {
    const location = locations.find(loc => loc.id === locationId);
    return location ? location.name : 'Unknown Location';
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          People Tracker
        </Typography>

        {/* Temperature Unit Selector */}
        <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
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

        {message && (
          <Alert 
            severity={message.type} 
            sx={{ mb: 3 }}
            onClose={() => setMessage(null)}
          >
            {message.text}
          </Alert>
        )}

        {/* Search and Add */}
        <Box sx={{ display: 'flex', gap: 2, mb: 3, alignItems: 'center' }}>
          <TextField
            placeholder="Search people by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />,
            }}
            sx={{ flexGrow: 1 }}
          />
          <Tooltip title="Add New Person">
            <Fab
              color="primary"
              onClick={() => {
                resetPersonForm();
                setShowPersonDialog(true);
              }}
            >
              <Add />
            </Fab>
          </Tooltip>
        </Box>

        {/* People Grid */}
        {filteredPeople.length > 0 ? (
          <Grid container spacing={3}>
            {filteredPeople.map((person) => (
              <Grid item xs={12} sm={6} md={4} key={person.id}>
                <Card sx={{ 
                  height: 'auto', 
                  minHeight: 280,
                  display: 'flex', 
                  flexDirection: 'column',
                  '&:hover': {
                    boxShadow: 3,
                    transform: 'translateY(-2px)',
                    transition: 'all 0.2s ease-in-out'
                  }
                }}>
                  <CardContent sx={{ flexGrow: 1, p: 3 }}>
                    {/* Person Header */}
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <Avatar sx={{ 
                        bgcolor: 'primary.main', 
                        width: 56, 
                        height: 56, 
                        fontSize: '1.5rem',
                        mr: 2
                      }}>
                        {person.first_name.charAt(0)}
                      </Avatar>
                      <Box sx={{ flexGrow: 1 }}>
                        <Typography variant="h6" component="h2" gutterBottom>
                          {person.full_name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {person.visit_count || 0} visits
                        </Typography>
                      </Box>
                    </Box>

                    {/* Person Details */}
                    <Box sx={{ mb: 3 }}>
                      {person.birth_date && (
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                          <CalendarToday sx={{ fontSize: 16, mr: 1, color: 'text.secondary' }} />
                          <Typography variant="body2" color="text.secondary">
                            Born: {formatDate(person.birth_date)}
                          </Typography>
                        </Box>
                      )}
                      {person.home_location && (
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                          <LocationOn sx={{ fontSize: 16, mr: 1, color: 'text.secondary' }} />
                          <Typography variant="body2" color="text.secondary" sx={{ wordBreak: 'break-word' }}>
                            Home: {person.home_location}
                          </Typography>
                        </Box>
                      )}
                      {person.notes && (
                        <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 1 }}>
                          <Note sx={{ fontSize: 16, mr: 1, color: 'text.secondary', mt: 0.2 }} />
                          <Typography variant="body2" color="text.secondary" sx={{ wordBreak: 'break-word' }}>
                            {person.notes}
                          </Typography>
                        </Box>
                      )}
                    </Box>

                    {/* Location Visits Summary */}
                    <Box sx={{ mb: 3 }}>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Location Visits ({person.visit_count || 0})
                      </Typography>
                      {person.visit_count && person.visit_count > 0 ? (
                        <Typography variant="body2" color="text.secondary">
                          {person.visit_count} visit{person.visit_count !== 1 ? 's' : ''} recorded
                        </Typography>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          No visits recorded yet
                        </Typography>
                      )}
                    </Box>

                    {/* Action Buttons */}
                    <Box sx={{ 
                      display: 'flex', 
                      flexDirection: 'column', 
                      gap: 1.5,
                      mt: 'auto'
                    }}>
                      <Button
                        fullWidth
                        variant="contained"
                        startIcon={<Timeline />}
                        onClick={() => window.location.href = `/people/${person.id}`}
                        size="medium"
                        sx={{ mb: 1 }}
                      >
                        View Dashboard
                      </Button>
                      <Button
                        fullWidth
                        variant="outlined"
                        startIcon={<Visibility />}
                        onClick={() => handleViewPerson(person)}
                        size="medium"
                      >
                        View Details
                      </Button>
                      <Button
                        fullWidth
                        variant="outlined"
                        startIcon={<AddLocation />}
                        onClick={() => {
                          setSelectedPerson(person);
                          setShowVisitDialog(true);
                        }}
                        size="medium"
                      >
                        Add Visit
                      </Button>
                      <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                        <Button
                          variant="outlined"
                          startIcon={<Edit />}
                          onClick={() => handleEditPerson(person)}
                          size="small"
                          sx={{ flex: 1 }}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="outlined"
                          color="error"
                          startIcon={<Delete />}
                          onClick={() => handleDeletePerson(person)}
                          size="small"
                          sx={{ flex: 1 }}
                        >
                          Delete
                        </Button>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        ) : (
          <Box sx={{ 
            textAlign: 'center', 
            py: 8, 
            color: 'text.secondary',
            border: '2px dashed #e0e0e0',
            borderRadius: 2
          }}>
            <Person sx={{ fontSize: 64, mb: 2, opacity: 0.5 }} />
            <Typography variant="h6" gutterBottom>
              No people found
            </Typography>
            <Typography variant="body2">
              {searchQuery ? 'Try adjusting your search terms' : 'Start by adding your first person to track'}
            </Typography>
          </Box>
        )}

        {/* Add/Edit Person Dialog */}
      <Dialog 
        open={showPersonDialog} 
        onClose={() => setShowPersonDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {editingPerson ? 'Edit Person' : 'Add New Person'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="First Name *"
                name="first_name"
                value={personFormData.first_name}
                onChange={handlePersonChange}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Last Name *"
                name="last_name"
                value={personFormData.last_name}
                onChange={handlePersonChange}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Birth Date"
                name="birth_date"
                type="date"
                value={personFormData.birth_date}
                onChange={handlePersonChange}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Home Location Selection
              </Typography>
            </Grid>
            
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Country</InputLabel>
                <Select
                  value={selectedCountryId}
                  onChange={handleCountryChange}
                  disabled={loading}
                  label="Country"
                >
                  <MenuItem value="">
                    <em>Select a country</em>
                  </MenuItem>
                  {countries.map((country) => (
                    <MenuItem key={country.id} value={country.id}>
                      {country.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {selectedCountryId && states.length > 0 && (
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>State/Province</InputLabel>
                  <Select
                    value={selectedStateId}
                    onChange={handleStateChange}
                    disabled={loading}
                    label="State/Province"
                  >
                    <MenuItem value="">
                      <em>Select a state</em>
                    </MenuItem>
                    {states.map((state) => (
                      <MenuItem key={state.id} value={state.id}>
                        {state.name} {state.abbreviation ? `(${state.abbreviation})` : ''}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            )}

            {selectedStateId && cities.length > 0 && (
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>City</InputLabel>
                  <Select
                    value={selectedCityId}
                    onChange={handleCityChange}
                    disabled={loading}
                    label="City"
                  >
                    <MenuItem value="">
                      <em>Select a city</em>
                    </MenuItem>
                    {cities.map((city) => (
                      <MenuItem key={city.id} value={city.id}>
                        {city.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            )}

            <Grid item xs={12}>
              <Typography variant="caption" color="text.secondary">
                Or select from existing locations:
              </Typography>
            </Grid>

            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Existing Location (Optional)</InputLabel>
                <Select
                  name="home_location_id"
                  value={personFormData.home_location_id || ''}
                  onChange={handlePersonSelectChange}
                  label="Existing Location (Optional)"
                >
                  <MenuItem value="">
                    <em>Select an existing location</em>
                  </MenuItem>
                  {locations.map((location) => (
                    <MenuItem key={location.id} value={location.id}>
                      {location.name} - {location.city}, {location.country}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Notes"
                name="notes"
                value={personFormData.notes}
                onChange={handlePersonChange}
                multiline
                rows={3}
                placeholder="Add any notes about this person..."
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowPersonDialog(false)} disabled={loading}>
            Cancel
          </Button>
          <Button 
            onClick={handlePersonSubmit} 
            variant="contained" 
            disabled={loading || !personFormData.first_name.trim() || !personFormData.last_name.trim()}
          >
            {loading ? 'Saving...' : editingPerson ? 'Update' : 'Add Person'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Visit Dialog */}
      <Dialog 
        open={showVisitDialog} 
        onClose={() => setShowVisitDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Add Location Visit for {selectedPerson?.full_name}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Location *</InputLabel>
                <Select
                  name="location_id"
                  value={visitFormData.location_id}
                  onChange={handleVisitSelectChange}
                  label="Location *"
                  required
                >
                  {locations.map((location) => (
                    <MenuItem key={location.id} value={location.id}>
                      {location.name} - {location.city}, {location.country}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Start Date *"
                name="start_date"
                type="date"
                value={visitFormData.start_date}
                onChange={handleVisitChange}
                InputLabelProps={{ shrink: true }}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="End Date"
                name="end_date"
                type="date"
                value={visitFormData.end_date}
                onChange={handleVisitChange}
                InputLabelProps={{ shrink: true }}
                helperText="Leave empty for ongoing visit"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Notes"
                name="notes"
                value={visitFormData.notes}
                onChange={handleVisitChange}
                multiline
                rows={3}
                placeholder="Add any notes about this visit..."
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowVisitDialog(false)} disabled={loading}>
            Cancel
          </Button>
          <Button 
            onClick={handleVisitSubmit} 
            variant="contained" 
            disabled={loading || !visitFormData.location_id || !visitFormData.start_date}
          >
            {loading ? 'Adding...' : 'Add Visit'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Visit Dialog */}
      <Dialog 
        open={showEditVisitDialog} 
        onClose={() => setShowEditVisitDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Edit Visit for {personDetails?.full_name}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Location *</InputLabel>
                <Select
                  name="location_id"
                  value={editVisitFormData.location_id}
                  onChange={handleEditVisitSelectChange}
                  label="Location *"
                  required
                >
                  {locations.map((location) => (
                    <MenuItem key={location.id} value={location.id}>
                      {location.name} - {location.city}, {location.country}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Start Date *"
                name="start_date"
                type="date"
                value={editVisitFormData.start_date}
                onChange={handleEditVisitChange}
                InputLabelProps={{ shrink: true }}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="End Date"
                name="end_date"
                type="date"
                value={editVisitFormData.end_date}
                onChange={handleEditVisitChange}
                InputLabelProps={{ shrink: true }}
                helperText="Leave empty for ongoing visit"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Notes"
                name="notes"
                value={editVisitFormData.notes}
                onChange={handleEditVisitChange}
                multiline
                rows={3}
                placeholder="Add any notes about this visit..."
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setShowEditVisitDialog(false);
            resetEditVisitForm();
          }} disabled={loading}>
            Cancel
          </Button>
          <Button 
            onClick={handleEditVisitSubmit} 
            variant="contained" 
            disabled={loading || !editVisitFormData.location_id || !editVisitFormData.start_date}
          >
            {loading ? 'Updating...' : 'Update Visit'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Person Details Dialog */}
      <Dialog 
        open={showPersonDetailsDialog} 
        onClose={() => setShowPersonDetailsDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {personDetails?.full_name} - Details
        </DialogTitle>
        <DialogContent>
          {personDetails && (
            <Grid container spacing={3} sx={{ mt: 1 }}>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  First Name
                </Typography>
                <Typography variant="body1" gutterBottom>
                  {personDetails.first_name}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Last Name
                </Typography>
                <Typography variant="body1" gutterBottom>
                  {personDetails.last_name}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Birth Date
                </Typography>
                <Typography variant="body1" gutterBottom>
                  {personDetails.birth_date ? formatDate(personDetails.birth_date) : 'Not set'}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Age
                </Typography>
                <Typography variant="body1" gutterBottom>
                  {personDetails.birth_date ? calculateAge(personDetails.birth_date) : 'Unknown'}
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="text.secondary">
                  Home Location
                </Typography>
                <Typography variant="body1" gutterBottom>
                  {personDetails.home_location || 'Not set'}
                </Typography>
              </Grid>
              {personDetails.notes && (
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Notes
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    {personDetails.notes}
                  </Typography>
                </Grid>
              )}
              
              {/* Location Visits */}
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                  Location Visits ({personDetails.visits?.length || 0})
                </Typography>
                {personDetails.visits && personDetails.visits.length > 0 ? (
                  <List>
                    {personDetails.visits.map((visit) => (
                      <ListItem key={visit.id} sx={{ 
                        border: '1px solid #e0e0e0', 
                        borderRadius: 1, 
                        mb: 1,
                        '&:hover': {
                          backgroundColor: '#f5f5f5',
                          '& .MuiListItemSecondaryAction-root': {
                            opacity: 1,
                          }
                        }
                      }}>
                        <ListItemText
                          primary={getLocationName(visit.location_id)}
                          secondary={
                            <Box>
                              <Typography variant="body2">
                                {formatDate(visit.start_date)}
                                {visit.end_date ? ` - ${formatDate(visit.end_date)}` : ''}
                              </Typography>
                              {visit.notes && (
                                <Typography variant="body2" color="text.secondary">
                                  {visit.notes}
                                </Typography>
                              )}
                            </Box>
                          }
                        />
                        <ListItemSecondaryAction sx={{ opacity: 0.7, transition: 'opacity 0.2s' }}>
                          <IconButton 
                            edge="end" 
                            aria-label="edit" 
                            onClick={() => handleEditVisit(visit)}
                            size="small"
                            sx={{ mr: 1 }}
                          >
                            <Edit fontSize="small" />
                          </IconButton>
                          <IconButton 
                            edge="end" 
                            aria-label="delete" 
                            onClick={() => handleDeleteVisit(visit)}
                            size="small"
                            color="error"
                          >
                            <Delete fontSize="small" />
                          </IconButton>
                        </ListItemSecondaryAction>
                      </ListItem>
                    ))}
                  </List>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    No visits recorded yet
                  </Typography>
                )}
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowPersonDetailsDialog(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Visit Confirmation Dialog */}
      <Dialog
        open={showDeleteVisitDialog}
        onClose={() => setShowDeleteVisitDialog(false)}
        aria-labelledby="delete-visit-dialog-title"
        aria-describedby="delete-visit-dialog-description"
      >
        <DialogTitle id="delete-visit-dialog-title">Confirm Delete Visit</DialogTitle>
        <DialogContent>
          <Typography id="delete-visit-dialog-description">
            Are you sure you want to delete this visit? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDeleteVisitDialog(false)} disabled={loading}>
            Cancel
          </Button>
          <Button 
            onClick={confirmDeleteVisit} 
            variant="contained" 
            color="error" 
            disabled={loading}
          >
            {loading ? 'Deleting...' : 'Delete Visit'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
    </Container>
  );
};

export default People;
