import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  AppBar,
  Toolbar,
  Button,
  IconButton,
  Menu,
  MenuItem,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Menu as MenuIcon,
  WbSunny,
  Logout as LogoutIcon,
  AccountCircle,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';

const Layout: React.FC = () => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

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
                  color: location.pathname === item.path ? '#FF5A5F' : '#222222', 
                  fontWeight: location.pathname === item.path ? 600 : 500,
                  textTransform: 'none',
                  px: 2,
                  py: 1,
                  borderRadius: '22px',
                  backgroundColor: location.pathname === item.path ? 'rgba(255, 90, 95, 0.08)' : 'transparent',
                  '&:hover': {
                    backgroundColor: location.pathname === item.path ? 'rgba(255, 90, 95, 0.12)' : '#f7f7f7',
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
                  color: location.pathname === item.path ? '#FF5A5F' : '#222222',
                  fontWeight: location.pathname === item.path ? 600 : 500,
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

      {/* Main Content */}
      <Box component="main" sx={{ flexGrow: 1 }}>
        <Outlet />
      </Box>
    </Box>
  );
};

export default Layout; 