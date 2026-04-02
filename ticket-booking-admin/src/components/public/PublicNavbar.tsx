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
import HistoryIcon from '@mui/icons-material/History';
import LogoutIcon from '@mui/icons-material/Logout';
//import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { profileService } from '../../services/profile.service';
import { EventCategoryService } from '../../services';
import { ProfileDTO, EventCategory } from '../../types';

const PublicNavbar: React.FC = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [eventsAnchor, setEventsAnchor] = useState<null | HTMLElement>(null);
  const [portfolioAnchor, setPortfolioAnchor] = useState<null | HTMLElement>(null);
  const [blogAnchor, setBlogAnchor] = useState<null | HTMLElement>(null);
  const [otherPagesAnchor, setOtherPagesAnchor] = useState<null | HTMLElement>(null);
  const [userMenuAnchor, setUserMenuAnchor] = useState<null | HTMLElement>(null);
  const [profile, setProfile] = useState<ProfileDTO | null>(null);
  const [categories, setCategories] = useState<EventCategory[]>([]);
  
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { user, isAuthenticated, isCustomerUser, logout } = useAuth();

  // Fetch event categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const categoryData = await EventCategoryService.getPublicActiveCategories();
        setCategories(categoryData);
      } catch (error) {
        console.error('Failed to fetch categories:', error);
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
          console.error('Failed to fetch profile:', error);
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
    navigate('/');
  };

  const navItems = [
    { label: 'About', path: '/about' },
    { label: 'Services', path: '/services' },
    { label: 'Contact', path: '/contact' },
  ];

  const portfolioItems = [
    { label: '1 Column Portfolio', path: '/portfolio-1-col' },
    { label: '2 Column Portfolio', path: '/portfolio-2-col' },
    { label: '3 Column Portfolio', path: '/portfolio-3-col' },
    { label: '4 Column Portfolio', path: '/portfolio-4-col' },
    { label: 'Single Portfolio Item', path: '/portfolio-item' },
  ];

  const blogItems = [
    { label: 'Blog Home 1', path: '/blog-home-1' },
    { label: 'Blog Home 2', path: '/blog-home-2' },
    { label: 'Blog Post', path: '/blog-post' },
  ];

  const otherPagesItems = [
    { label: 'Full Width Page', path: '/full-width' },
    { label: 'Sidebar Page', path: '/sidebar' },
    { label: 'FAQ', path: '/faq' },
    { label: '404', path: '/404' },
    { label: 'Pricing Table', path: '/pricing' },
    { label: 'Gallery', path: '/gallery' },
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
        sx={{
          backgroundColor: '#343a40',
          boxShadow: '0 0.125rem 0.25rem rgba(0,0,0,0.075)',
        }}
      >
        <Toolbar sx={{ maxWidth: '1140px', width: '100%', margin: '0 auto', px: { xs: 2, sm: 2 }, py: 1 }}>
          <Typography
            variant="h6"
            component="div"
            onClick={() => navigate('/')}
            sx={{
              flexGrow: 1,
              fontFamily: 'Raleway, sans-serif',
              fontWeight: 700,
              color: '#fcd0a5',
              cursor: 'pointer',
              fontSize: '1.25rem',
              lineHeight: 'inherit',
              paddingTop: '0.3125rem',
              paddingBottom: '0.3125rem',
              marginRight: '1rem',
              '&:hover': {
                opacity: 0.9,
              },
            }}
          >
            Ticketer<span style={{ color: '#ff1955' }}>.lk</span>
          </Typography>

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
                  onClick={(e) => setEventsAnchor(e.currentTarget)}
                  endIcon={<ArrowDropDownIcon />}
                  sx={{
                    color: 'rgba(255, 255, 255, 0.55)',
                    fontFamily: 'Raleway, sans-serif',
                    fontWeight: 400,
                    fontSize: '1rem',
                    lineHeight: 1.5,
                    textTransform: 'none',
                    padding: '0.5rem 1rem',
                    minWidth: 'auto',
                    '&:hover': {
                      color: '#fff',
                      backgroundColor: 'transparent',
                    },
                  }}
                >
                  Events
                </Button>
                <Menu
                  anchorEl={eventsAnchor}
                  open={Boolean(eventsAnchor)}
                  onClose={() => setEventsAnchor(null)}
                  anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                  transformOrigin={{ vertical: 'top', horizontal: 'left' }}
                  PaperProps={{
                    sx: {
                      mt: 1,
                      minWidth: 200,
                      maxHeight: 400,
                    }
                  }}
                >
                  {categories.length === 0 ? (
                    <MenuItem disabled sx={{ fontFamily: 'Raleway, sans-serif', fontSize: '0.95rem' }}>
                      Loading categories...
                    </MenuItem>
                  ) : (
                    categories.map((category) => (
                      <MenuItem 
                        key={category.id} 
                        onClick={() => {
                          navigate(`/events?category=${category.id}`);
                          setEventsAnchor(null);
                        }}
                        sx={{ 
                          fontFamily: 'Raleway, sans-serif',
                          fontSize: '0.95rem',
                          py: 1,
                        }}
                      >
                        {category.categoryName}
                      </MenuItem>
                    ))
                  )}
                  <Divider sx={{ my: 0.5 }} />
                  <MenuItem 
                    onClick={() => {
                      navigate('/events');
                      setEventsAnchor(null);
                    }}
                    sx={{ 
                      fontFamily: 'Raleway, sans-serif',
                      fontSize: '0.95rem',
                      fontWeight: 600,
                      color: '#ff1955',
                      py: 1,
                    }}
                  >
                    All Events
                  </MenuItem>
                </Menu>
              </Box>

              {navItems.map((item) => (
                <Button
                  key={item.label}
                  onClick={() => navigate(item.path)}
                  sx={{
                    color: 'rgba(255, 255, 255, 0.55)',
                    fontFamily: 'Raleway, sans-serif',
                    fontWeight: 400,
                    fontSize: '1rem',
                    lineHeight: 1.5,
                    textTransform: 'none',
                    padding: '0.5rem 1rem',
                    minWidth: 'auto',
                    '&:hover': {
                      color: '#fff',
                      backgroundColor: 'transparent',
                    },
                  }}
                >
                  {item.label}
                </Button>
              ))}

              {/* Portfolio Dropdown */}
              <Box>
                <Button
                  onClick={(e) => setPortfolioAnchor(e.currentTarget)}
                  endIcon={<ArrowDropDownIcon />}
                  sx={{
                    color: 'rgba(255, 255, 255, 0.55)',
                    fontFamily: 'Raleway, sans-serif',
                    fontWeight: 400,
                    fontSize: '1rem',
                    lineHeight: 1.5,
                    textTransform: 'none',
                    padding: '0.5rem 1rem',
                    minWidth: 'auto',
                    '&:hover': {
                      color: '#fff',
                      backgroundColor: 'transparent',
                    },
                  }}
                >
                  Portfolio
                </Button>
                <Menu
                  anchorEl={portfolioAnchor}
                  open={Boolean(portfolioAnchor)}
                  onClose={() => setPortfolioAnchor(null)}
                  anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                  transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                >
                  {portfolioItems.map((item) => (
                    <MenuItem 
                      key={item.label} 
                      onClick={() => {
                        navigate(item.path);
                        setPortfolioAnchor(null);
                      }}
                      sx={{ fontFamily: 'Raleway, sans-serif' }}
                    >
                      {item.label}
                    </MenuItem>
                  ))}
                </Menu>
              </Box>

              {/* Blog Dropdown */}
              <Box>
                <Button
                  onClick={(e) => setBlogAnchor(e.currentTarget)}
                  endIcon={<ArrowDropDownIcon />}
                  sx={{
                    color: 'rgba(255, 255, 255, 0.55)',
                    fontFamily: 'Raleway, sans-serif',
                    fontWeight: 400,
                    fontSize: '1rem',
                    lineHeight: 1.5,
                    textTransform: 'none',
                    padding: '0.5rem 1rem',
                    minWidth: 'auto',
                    '&:hover': {
                      color: '#fff',
                      backgroundColor: 'transparent',
                    },
                  }}
                >
                  Blog
                </Button>
                <Menu
                  anchorEl={blogAnchor}
                  open={Boolean(blogAnchor)}
                  onClose={() => setBlogAnchor(null)}
                  anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                  transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                >
                  {blogItems.map((item) => (
                    <MenuItem 
                      key={item.label} 
                      onClick={() => {
                        navigate(item.path);
                        setBlogAnchor(null);
                      }}
                      sx={{ fontFamily: 'Raleway, sans-serif' }}
                    >
                      {item.label}
                    </MenuItem>
                  ))}
                </Menu>
              </Box>

              {/* Other Pages Dropdown */}
              <Box>
                <Button
                  onClick={(e) => setOtherPagesAnchor(e.currentTarget)}
                  endIcon={<ArrowDropDownIcon />}
                  sx={{
                    color: 'rgba(255, 255, 255, 0.55)',
                    fontFamily: 'Raleway, sans-serif',
                    fontWeight: 400,
                    fontSize: '1rem',
                    lineHeight: 1.5,
                    textTransform: 'none',
                    padding: '0.5rem 1rem',
                    minWidth: 'auto',
                    '&:hover': {
                      color: '#fff',
                      backgroundColor: 'transparent',
                    },
                  }}
                >
                  Other Pages
                </Button>
                <Menu
                  anchorEl={otherPagesAnchor}
                  open={Boolean(otherPagesAnchor)}
                  onClose={() => setOtherPagesAnchor(null)}
                  anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                  transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                >
                  {otherPagesItems.map((item) => (
                    <MenuItem 
                      key={item.label} 
                      onClick={() => {
                        navigate(item.path);
                        setOtherPagesAnchor(null);
                      }}
                      sx={{ fontFamily: 'Raleway, sans-serif' }}
                    >
                      {item.label}
                    </MenuItem>
                  ))}
                </Menu>
              </Box>

              {/* User Menu or Register/Sign In Buttons */}
              {isAuthenticated() && isCustomerUser() ? (
                <Box sx={{ ml: 2 }}>
                  <Button
                    onClick={(e) => setUserMenuAnchor(e.currentTarget)}
                    endIcon={<ArrowDropDownIcon />}
                    startIcon={
                      profile?.profilePicture ? (
                        <Avatar 
                          src={`http://localhost:8081${profile.profilePicture.startsWith('/') ? profile.profilePicture : '/' + profile.profilePicture}`}
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
                        mt: 1,
                      }
                    }}
                  >
                    <MenuItem 
                      onClick={() => {
                        navigate('/profile');
                        setUserMenuAnchor(null);
                      }}
                      sx={{ fontFamily: 'Raleway, sans-serif', py: 1.5 }}
                    >
                      <ListItemIcon>
                        <PersonIcon fontSize="small" />
                      </ListItemIcon>
                      View profile
                    </MenuItem>
                    <MenuItem 
                      onClick={() => {
                        navigate('/bookings');
                        setUserMenuAnchor(null);
                      }}
                      sx={{ fontFamily: 'Raleway, sans-serif', py: 1.5 }}
                    >
                      <ListItemIcon>
                        <HistoryIcon fontSize="small" />
                      </ListItemIcon>
                      Booking history
                    </MenuItem>
                    <MenuItem 
                      onClick={handleLogout}
                      sx={{ fontFamily: 'Raleway, sans-serif', py: 1.5 }}
                    >
                      <ListItemIcon>
                        <LogoutIcon fontSize="small" />
                      </ListItemIcon>
                      Log out
                    </MenuItem>
                  </Menu>
                </Box>
              ) : (
                <Box sx={{ display: 'flex', gap: 1, ml: 2 }}>
                  <Button
                    onClick={() => navigate('/register')}
                    variant="outlined"
                    sx={{
                      color: '#fff',
                      borderColor: 'rgba(255, 255, 255, 0.55)',
                      fontFamily: 'Raleway, sans-serif',
                      fontWeight: 400,
                      fontSize: '0.95rem',
                      textTransform: 'none',
                      padding: '0.375rem 1rem',
                      '&:hover': {
                        borderColor: '#fff',
                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
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
                      fontFamily: 'Raleway, sans-serif',
                      fontWeight: 400,
                      fontSize: '0.95rem',
                      textTransform: 'none',
                      padding: '0.375rem 1rem',
                      boxShadow: 'none',
                      '&:hover': {
                        backgroundColor: '#e01545',
                        boxShadow: 'none',
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
