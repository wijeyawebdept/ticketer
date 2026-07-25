import React, { useState, useEffect } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemText,
  Box,
  useMediaQuery,
  useTheme,
  Menu,
  MenuItem,
  Avatar,
  ListItemIcon,
  Divider,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import PersonIcon from '@mui/icons-material/Person';
import LogoutIcon from '@mui/icons-material/Logout';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
//import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { profileService } from '../../services/profile.service';
import { EventCategoryService } from '../../services';
import { getProfilePictureUrl } from '../../utils/formatters';
import { ProfileDTO, EventCategory } from '../../types';
import EventsMegaMenu from './EventsMegaMenu';

const PublicNavbar: React.FC = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [eventsAnchor, setEventsAnchor] = useState<null | HTMLElement>(null);
  const [userMenuAnchor, setUserMenuAnchor] = useState<null | HTMLElement>(null);
  const [profile, setProfile] = useState<ProfileDTO | null>(null);
  const [categories, setCategories] = useState<EventCategory[]>([]);
  const menuTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { user, isAuthenticated, isCustomerUser, logout } = useAuth();

  const handleEventsMouseEnter = (e: React.MouseEvent<HTMLElement>) => {
    if (menuTimeoutRef.current) {
      clearTimeout(menuTimeoutRef.current);
      menuTimeoutRef.current = null;
    }
    if (!eventsAnchor) {
      setEventsAnchor(e.currentTarget);
    }
  };

  const handleMenuMouseEnter = () => {
    if (menuTimeoutRef.current) {
      clearTimeout(menuTimeoutRef.current);
      menuTimeoutRef.current = null;
    }
  };

  const handleEventsMouseLeave = () => {
    menuTimeoutRef.current = setTimeout(() => {
      setEventsAnchor(null);
    }, 150);
  };

  const isActive = (path: string) => {
    if (path === '/events' && location.pathname.startsWith('/event')) return true;
    return location.pathname === path || (path !== '/' && location.pathname.startsWith(path));
  };

  // Fetch event categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const categoryData = await EventCategoryService.getPublicActiveCategories();
        setCategories(categoryData);
      } catch (error) {
      }
    };

    fetchCategories();
  }, []);

  // Fetch user profile when authenticated
  useEffect(() => {
    const fetchProfile = async () => {
      if (isAuthenticated() && isCustomerUser()) {
        try {
          const profileData = await profileService.getProfile();
          setProfile(profileData);
        } catch (error) {
        }
      } else {
        setProfile(null);
      }
    };

    fetchProfile();
  }, [isAuthenticated, isCustomerUser]);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleLogout = () => {
    logout();
    setUserMenuAnchor(null);
    navigate('/', { state: { loggedOut: true } });
  };

  const navItems = [
    { label: 'About', path: '/about' },
    { label: 'Services', path: '/services' },
    { label: 'Contact', path: '/contact' },
  ];


  const drawer = (
    <Box onClick={handleDrawerToggle} sx={{ textAlign: 'center', pt: 2 }}>
      <List>
        {navItems.map((item) => (
          <ListItem key={item.label} onClick={() => navigate(item.path)}>
            <ListItemText 
              primary={item.label} 
              sx={{ 
                color: '#fff',
                '& .MuiTypography-root': {
                  fontFamily: 'Raleway, sans-serif',
                  fontWeight: 300,
                }
              }} 
            />
          </ListItem>
        ))}
      </List>
    </Box>
  );

  return (
    <>
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          top: { xs: 0, sm: 12 },
          left: '50%',
          transform: 'translateX(-50%)',
          width: { xs: '100%', sm: 'calc(100% - 32px)' },
          maxWidth: '1200px',
          backgroundColor: 'rgba(36, 42, 51, 0.92)',
          backdropFilter: 'blur(16px)',
          borderRadius: { xs: 0, sm: '16px' },
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 12px 36px rgba(0, 0, 0, 0.45), 0 0 1px rgba(255, 255, 255, 0.1)',
          transition: 'all 0.3s ease',
          zIndex: (theme) => theme.zIndex.drawer + 1,
        }}
      >
        <Toolbar sx={{ maxWidth: '1140px', width: '100%', margin: '0 auto', px: { xs: 2, sm: 3 }, py: 0.5 }}>
          <Box
            onClick={() => navigate('/')}
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              cursor: 'pointer',
              userSelect: 'none',
              transition: 'opacity 0.2s ease',
              '&:hover': {
                opacity: 0.9,
              },
            }}
          >
            <ConfirmationNumberIcon
              sx={{
                color: '#ff1955',
                fontSize: '1.6rem',
                transform: 'rotate(-10deg)',
                mr: 1,
              }}
            />
            <Typography
              variant="h6"
              component="div"
              sx={{
                fontFamily: 'Raleway, sans-serif',
                fontWeight: 700,
                color: '#fcd0a5',
                fontSize: '1.25rem',
                lineHeight: 'inherit',
                paddingTop: '0.3125rem',
                paddingBottom: '0.3125rem',
              }}
            >
              Ticketer<span style={{ color: '#ff1955' }}>.lk</span>
            </Typography>
          </Box>
          <Box sx={{ flexGrow: 1 }} />

          {isMobile ? (
            <IconButton
              color="inherit"
              aria-label="open drawer"
              edge="end"
              onClick={handleDrawerToggle}
            >
              <MenuIcon />
            </IconButton>
          ) : (
            <Box sx={{ display: 'flex', gap: 0, alignItems: 'center' }}>
              {/* Events Dropdown */}
              <Box>
                <Button
                  onClick={(e) => handleEventsMouseEnter(e)}
                  onMouseEnter={handleEventsMouseEnter}
                  onMouseLeave={handleEventsMouseLeave}
                  endIcon={<ArrowDropDownIcon />}
                  sx={{
                    color: isActive('/events') ? '#ff1955' : 'rgba(255, 255, 255, 0.55)',
                    backgroundColor: isActive('/events') ? 'rgba(255, 25, 85, 0.08)' : 'transparent',
                    fontFamily: 'Raleway, sans-serif',
                    fontWeight: isActive('/events') ? 600 : 400,
                    fontSize: '1rem',
                    lineHeight: 1.5,
                    textTransform: 'none',
                    padding: '0.5rem 1rem',
                    minWidth: 'auto',
                    '&:hover': {
                      color: isActive('/events') ? '#ff1955' : '#fff',
                      backgroundColor: isActive('/events') ? 'rgba(255, 25, 85, 0.12)' : 'rgba(255, 255, 255, 0.1)',
                    },
                  }}
                >
                  Events
                </Button>
                <EventsMegaMenu
                  anchorEl={eventsAnchor}
                  isOpen={Boolean(eventsAnchor)}
                  onClose={() => setEventsAnchor(null)}
                  categories={categories}
                  onMouseEnter={handleMenuMouseEnter}
                  onMouseLeave={handleEventsMouseLeave}
                />
              </Box>

              {navItems.map((item) => (
                <Button
                  key={item.label}
                  onClick={() => navigate(item.path)}
                  sx={{
                    color: isActive(item.path) ? '#ff1955' : 'rgba(255, 255, 255, 0.55)',
                    backgroundColor: isActive(item.path) ? 'rgba(255, 25, 85, 0.08)' : 'transparent',
                    fontFamily: 'Raleway, sans-serif',
                    fontWeight: isActive(item.path) ? 600 : 400,
                    fontSize: '1rem',
                    lineHeight: 1.5,
                    textTransform: 'none',
                    padding: '0.5rem 1rem',
                    minWidth: 'auto',
                    '&:hover': {
                      color: isActive(item.path) ? '#ff1955' : '#fff',
                      backgroundColor: isActive(item.path) ? 'rgba(255, 25, 85, 0.12)' : 'rgba(255, 255, 255, 0.1)',
                    },
                  }}
                >
                  {item.label}
                </Button>
              ))}

              {/* Deals Button */}
              <Button
                onClick={() => navigate('/deals')}
                sx={{
                  color: isActive('/deals') ? '#00e676' : '#00c853',
                  backgroundColor: isActive('/deals') ? 'rgba(0, 200, 83, 0.1)' : 'transparent',
                  fontFamily: 'Raleway, sans-serif',
                  fontWeight: 700,
                  fontSize: '1rem',
                  lineHeight: 1.5,
                  textTransform: 'none',
                  padding: '0.5rem 1rem',
                  minWidth: 'auto',
                  '&:hover': {
                    color: '#00e676',
                    backgroundColor: 'rgba(0, 200, 83, 0.15)',
                  },
                }}
              >
                Deals
              </Button>

              {/* Gallery Button */}
              <Button
                onClick={() => navigate('/gallery')}
                sx={{
                  color: isActive('/gallery') ? '#ff1955' : 'rgba(255, 255, 255, 0.55)',
                  backgroundColor: isActive('/gallery') ? 'rgba(255, 25, 85, 0.08)' : 'transparent',
                  fontFamily: 'Raleway, sans-serif',
                  fontWeight: isActive('/gallery') ? 600 : 400,
                  fontSize: '1rem',
                  lineHeight: 1.5,
                  textTransform: 'none',
                  padding: '0.5rem 1rem',
                  minWidth: 'auto',
                  '&:hover': {
                    color: isActive('/gallery') ? '#ff1955' : '#fff',
                    backgroundColor: isActive('/gallery') ? 'rgba(255, 25, 85, 0.12)' : 'rgba(255, 255, 255, 0.1)',
                  },
                }}
              >
                Gallery
              </Button>

              {/* Blog Button */}
              <Button
                onClick={() => navigate('/blog')}
                sx={{
                  color: isActive('/blog') ? '#ff1955' : 'rgba(255, 255, 255, 0.55)',
                  backgroundColor: isActive('/blog') ? 'rgba(255, 25, 85, 0.08)' : 'transparent',
                  fontFamily: 'Raleway, sans-serif',
                  fontWeight: isActive('/blog') ? 600 : 400,
                  fontSize: '1rem',
                  lineHeight: 1.5,
                  textTransform: 'none',
                  padding: '0.5rem 1rem',
                  minWidth: 'auto',
                  '&:hover': {
                    color: isActive('/blog') ? '#ff1955' : '#fff',
                    backgroundColor: isActive('/blog') ? 'rgba(255, 25, 85, 0.12)' : 'rgba(255, 255, 255, 0.1)',
                  },
                }}
              >
                Blog
              </Button>


              {/* User Menu or Register/Sign In Buttons */}
              {isAuthenticated() && isCustomerUser() ? (
                <Box sx={{ ml: 2 }}>
                  <Button
                    onClick={(e) => setUserMenuAnchor(e.currentTarget)}
                    endIcon={<ArrowDropDownIcon />}
                    startIcon={
                      profile?.profilePicture ? (
                        <Avatar 
                          src={getProfilePictureUrl(profile.profilePicture)}
                          alt={profile.firstName}
                          sx={{ 
                            width: 32, 
                            height: 32,
                            border: '2px solid rgba(255, 25, 85, 0.5)'
                          }}
                        />
                      ) : (
                        <Avatar 
                          sx={{ 
                            width: 32, 
                            height: 32,
                            bgcolor: '#ff1955',
                            fontSize: '1rem'
                          }}
                        >
                          {profile?.firstName?.[0] || user?.email?.[0] || 'U'}
                        </Avatar>
                      )
                    }
                    sx={{
                      color: '#fff',
                      fontFamily: 'Raleway, sans-serif',
                      fontWeight: 400,
                      fontSize: '1rem',
                      textTransform: 'none',
                      padding: '0.5rem 1rem',
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      '&:hover': {
                        backgroundColor: 'rgba(255, 255, 255, 0.2)',
                      },
                    }}
                  >
                    {profile?.firstName || user?.email?.split('@')[0] || 'User'}
                  </Button>
                  <Menu
                    anchorEl={userMenuAnchor}
                    open={Boolean(userMenuAnchor)}
                    onClose={() => setUserMenuAnchor(null)}
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                    transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                    PaperProps={{
                      sx: {
                        minWidth: 200,
                        mt: 1.5,
                        backgroundColor: '#1b222c',
                        color: '#fff',
                        borderRadius: '16px',
                        border: '1px solid rgba(255, 25, 85, 0.3)',
                        boxShadow: '0 16px 40px rgba(0, 0, 0, 0.8)',
                        backdropFilter: 'blur(16px)',
                        overflow: 'hidden',
                        py: 0.5,
                        '& .MuiMenuItem-root': {
                          fontFamily: 'Raleway, sans-serif',
                          fontWeight: 600,
                          fontSize: '0.9rem',
                          py: 1.2,
                          px: 2,
                          color: 'rgba(255, 255, 255, 0.9)',
                          transition: 'all 0.2s ease',
                          '&:hover': {
                            backgroundColor: 'rgba(255, 25, 85, 0.15)',
                            color: '#ff1955',
                            '& .MuiListItemIcon-root': {
                              color: '#ff1955',
                            },
                          },
                        },
                        '& .MuiListItemIcon-root': {
                          color: 'rgba(255, 255, 255, 0.7)',
                          minWidth: '36px !important',
                        },
                      }
                    }}
                  >
                    <MenuItem 
                      onClick={() => {
                        navigate('/profile');
                        setUserMenuAnchor(null);
                      }}
                    >
                      <ListItemIcon>
                        <PersonIcon fontSize="small" />
                      </ListItemIcon>
                      View Profile
                    </MenuItem>
                    <Divider sx={{ my: 0.5, borderColor: 'rgba(255, 255, 255, 0.1)' }} />
                    <MenuItem 
                      onClick={handleLogout}
                      sx={{
                        '&:hover': {
                          backgroundColor: 'rgba(244, 67, 54, 0.15) !important',
                          color: '#ff4d4d !important',
                          '& .MuiListItemIcon-root': {
                            color: '#ff4d4d !important',
                          },
                        }
                      }}
                    >
                      <ListItemIcon>
                        <LogoutIcon fontSize="small" />
                      </ListItemIcon>
                      Log Out
                    </MenuItem>
                  </Menu>
                </Box>
              ) : (
                <Box sx={{ display: 'flex', gap: 1.5, ml: 2 }}>
                  <Button
                    onClick={() => navigate('/register')}
                    variant="outlined"
                    sx={{
                      color: '#fff',
                      borderColor: 'rgba(255, 255, 255, 0.3)',
                      borderRadius: '20px',
                      fontFamily: 'Raleway, sans-serif',
                      fontWeight: 600,
                      fontSize: '0.9rem',
                      textTransform: 'none',
                      padding: '0.4rem 1.2rem',
                      transition: 'all 0.2s ease-in-out',
                      '&:hover': {
                        borderColor: '#ff1955',
                        color: '#ff1955',
                        backgroundColor: 'rgba(255, 25, 85, 0.08)',
                      },
                    }}
                  >
                    Register
                  </Button>
                  <Button
                    onClick={() => navigate('/login')}
                    variant="contained"
                    sx={{
                      backgroundColor: '#ff1955',
                      color: '#fff',
                      borderRadius: '20px',
                      fontFamily: 'Raleway, sans-serif',
                      fontWeight: 700,
                      fontSize: '0.9rem',
                      textTransform: 'none',
                      padding: '0.4rem 1.3rem',
                      boxShadow: '0 4px 14px rgba(255, 25, 85, 0.4)',
                      transition: 'all 0.2s ease-in-out',
                      '&:hover': {
                        backgroundColor: '#e01545',
                        boxShadow: '0 6px 18px rgba(255, 25, 85, 0.6)',
                        transform: 'translateY(-1px)',
                      },
                    }}
                  >
                    Sign In
                  </Button>
                </Box>
              )}
            </Box>
          )}
        </Toolbar>
      </AppBar>

      <Drawer
        variant="temporary"
        anchor="right"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{
          keepMounted: true,
        }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': {
            boxSizing: 'border-box',
            width: 240,
            backgroundColor: '#343a40',
          },
        }}
      >
        {drawer}
      </Drawer>

      {/* Spacer for fixed navbar */}
      <Toolbar />
    </>
  );
};

export default PublicNavbar;
