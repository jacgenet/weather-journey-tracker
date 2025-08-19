import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Grid,
  Avatar,
  Divider,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Tooltip,
} from '@mui/material';
import { Person, Email, Lock, Visibility, VisibilityOff } from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { profileService, ProfileUpdateData, PasswordChangeData } from '../services/profileService';

const Profile: React.FC = () => {
  const { user, logout, updateProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    email: user?.email || '',
    bio: user?.bio || '',
  });
  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [stats, setStats] = useState({
    locations: 0,
    weatherRecords: 0,
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      // TODO: Implement actual stats API calls
      // For now, using mock data
      setStats({
        locations: 12,
        weatherRecords: 8,
      });
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPasswordData({
      ...passwordData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      const updateData: ProfileUpdateData = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email,
        bio: formData.bio,
      };

      const response = await profileService.updateProfile(updateData);
      
      // Update the user context with new data
      if (updateProfile) {
        await updateProfile(response.user);
      }
      
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
      setIsEditing(false);
    } catch (error: any) {
      console.error('Profile update failed:', error);
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.error || 'Failed to update profile' 
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSave = async () => {
    if (passwordData.new_password !== passwordData.confirm_password) {
      setMessage({ type: 'error', text: 'New passwords do not match' });
      return;
    }

    if (passwordData.new_password.length < 8) {
      setMessage({ type: 'error', text: 'New password must be at least 8 characters long' });
      return;
    }

    try {
      setLoading(true);
      await profileService.changePassword({
        current_password: passwordData.current_password,
        new_password: passwordData.new_password,
      });
      
      setMessage({ type: 'success', text: 'Password changed successfully!' });
      setShowPasswordDialog(false);
      setPasswordData({
        current_password: '',
        new_password: '',
        confirm_password: '',
      });
    } catch (error: any) {
      console.error('Password change failed:', error);
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.error || 'Failed to change password' 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      first_name: user?.first_name || '',
      last_name: user?.last_name || '',
      email: user?.email || '',
      bio: user?.bio || '',
    });
    setIsEditing(false);
    setMessage(null);
  };

  const handleLogout = () => {
    logout();
  };

  const togglePasswordVisibility = (field: 'current' | 'new' | 'confirm') => {
    setShowPasswords({
      ...showPasswords,
      [field]: !showPasswords[field],
    });
  };

  return (
    <Container maxWidth="md">
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Profile
        </Typography>

        {message && (
          <Alert severity={message.type} sx={{ mb: 3 }}>
            {message.text}
          </Alert>
        )}

        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Avatar
                  sx={{
                    width: 120,
                    height: 120,
                    mx: 'auto',
                    mb: 2,
                    bgcolor: 'primary.main',
                    fontSize: '3rem',
                  }}
                >
                  {user?.username?.charAt(0).toUpperCase() || 'U'}
                </Avatar>
                <Typography variant="h6" gutterBottom>
                  {user?.first_name} {user?.last_name}
                </Typography>
                <Typography color="text.secondary" gutterBottom>
                  @{user?.username}
                </Typography>
                {user?.bio && (
                  <Typography variant="body2" sx={{ mt: 2 }}>
                    {user.bio}
                  </Typography>
                )}
                <Box sx={{ mt: 3 }}>
                  <Button
                    variant="outlined"
                    onClick={() => setIsEditing(!isEditing)}
                    sx={{ mr: 1 }}
                  >
                    {isEditing ? 'Cancel' : 'Edit Profile'}
                  </Button>
                  <Button
                    variant="outlined"
                    color="error"
                    onClick={handleLogout}
                  >
                    Logout
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={8}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Personal Information
                </Typography>
                <Divider sx={{ mb: 3 }} />

                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Username"
                      name="username"
                      value={user?.username || ''}
                      disabled
                      InputProps={{
                        startAdornment: <Person sx={{ mr: 1, color: 'text.secondary' }} />,
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Email"
                      name="email"
                      type="email"
                      value={user?.email || ''}
                      disabled
                      InputProps={{
                        startAdornment: <Email sx={{ mr: 1, color: 'text.secondary' }} />,
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="First Name"
                      name="first_name"
                      value={formData.first_name}
                      onChange={handleChange}
                      disabled={!isEditing}
                      InputProps={{
                        startAdornment: <Person sx={{ mr: 1, color: 'text.secondary' }} />,
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Last Name"
                      name="last_name"
                      value={formData.last_name}
                      onChange={handleChange}
                      disabled={!isEditing}
                      InputProps={{
                        startAdornment: <Person sx={{ mr: 1, color: 'text.secondary' }} />,
                      }}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Bio"
                      name="bio"
                      value={formData.bio}
                      onChange={handleChange}
                      disabled={!isEditing}
                      multiline
                      rows={3}
                      placeholder="Tell us about yourself..."
                    />
                  </Grid>
                </Grid>

                {isEditing && (
                  <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
                    <Button
                      variant="contained"
                      onClick={handleSave}
                      disabled={loading}
                    >
                      Save Changes
                    </Button>
                    <Button
                      variant="outlined"
                      onClick={handleCancel}
                      disabled={loading}
                    >
                      Cancel
                    </Button>
                  </Box>
                )}
              </CardContent>
            </Card>

            <Card sx={{ mt: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Account Statistics
                </Typography>
                <Divider sx={{ mb: 3 }} />

                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h4" color="primary">
                        {stats.locations}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Locations Saved
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h4" color="primary">
                        {stats.weatherRecords}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Weather Records
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            <Card sx={{ mt: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Password Management
                </Typography>
                <Divider sx={{ mb: 3 }} />

                <Button
                  variant="outlined"
                  onClick={() => setShowPasswordDialog(true)}
                  fullWidth
                  sx={{ mb: 2 }}
                >
                  Change Password
                </Button>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>

      <Dialog open={showPasswordDialog} onClose={() => setShowPasswordDialog(false)}>
        <DialogTitle>Change Password</DialogTitle>
        <DialogContent>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Current Password"
                name="current_password"
                type={showPasswords.current ? 'text' : 'password'}
                value={passwordData.current_password}
                onChange={handlePasswordChange}
                InputProps={{
                  startAdornment: <Lock sx={{ mr: 1, color: 'text.secondary' }} />,
                  endAdornment: (
                    <IconButton onClick={() => togglePasswordVisibility('current')} edge="end">
                      {showPasswords.current ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="New Password"
                name="new_password"
                type={showPasswords.new ? 'text' : 'password'}
                value={passwordData.new_password}
                onChange={handlePasswordChange}
                InputProps={{
                  startAdornment: <Lock sx={{ mr: 1, color: 'text.secondary' }} />,
                  endAdornment: (
                    <IconButton onClick={() => togglePasswordVisibility('new')} edge="end">
                      {showPasswords.new ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Confirm New Password"
                name="confirm_password"
                type={showPasswords.confirm ? 'text' : 'password'}
                value={passwordData.confirm_password}
                onChange={handlePasswordChange}
                InputProps={{
                  startAdornment: <Lock sx={{ mr: 1, color: 'text.secondary' }} />,
                  endAdornment: (
                    <IconButton onClick={() => togglePasswordVisibility('confirm')} edge="end">
                      {showPasswords.confirm ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  ),
                }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowPasswordDialog(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handlePasswordSave} disabled={loading}>
            Save Password
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Profile;
