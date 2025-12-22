import React, { useState } from 'react';
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
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import { useNavigate } from 'react-router-dom';

const PublicNavbar: React.FC = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [portfolioAnchor, setPortfolioAnchor] = useState<null | HTMLElement>(null);
  const [blogAnchor, setBlogAnchor] = useState<null | HTMLElement>(null);
  const [otherPagesAnchor, setOtherPagesAnchor] = useState<null | HTMLElement>(null);
  
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
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
              color: '#fff',
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
            Tickets.lk
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
