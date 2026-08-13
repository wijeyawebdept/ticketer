import React, { useState, useEffect } from 'react';
import { styled, useTheme } from '@mui/material/styles';
import {
  Box,
  CssBaseline,
  Drawer,
  AppBar,
  Toolbar,
  List,
  Typography,
  Divider,
  IconButton,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Avatar,
  Menu,
  MenuItem,
  CircularProgress,
  Tooltip,
  useMediaQuery
} from '@mui/material';
import {
  Menu as MenuIcon,
  ChevronLeft as ChevronLeftIcon,
  Dashboard as DashboardIcon,
  EventNote as EventIcon,
  LocationOn as LocationOnIcon,
  Receipt as ReceiptIcon,
  Settings as SettingsIcon,
  Logout as LogoutIcon,
  AccountCircle as AccountCircleIcon,
  EventSeat as EventSeatIcon,
  People as PeopleIcon,
  Assignment as AssignmentIcon,
  Delete as DeleteIcon,
  LocalOffer as LocalOfferIcon,
  Assessment as AssessmentIcon,
} from '@mui/icons-material';
import { useNavigate, Outlet, Link as RouterLink, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getProfilePictureUrl } from '../../utils/formatters';
import { useAuth } from '../../context/AuthContext';
import { profileService } from '../../services/profile.service';
import ConfirmDialog from '../ConfirmDialog';

const drawerWidth = 240;

const Main = styled('main', { shouldForwardProp: (prop) => prop !== 'open' })<{
  open?: boolean;
}>(({ theme, open }) => ({
  flexGrow: 1,
  padding: theme.spacing(3),
  width: '100%',
  maxWidth: '100%',
  minHeight: '100dvh',
  boxSizing: 'border-box',
  overflowX: 'auto',
  transition: theme.transitions.create(['margin', 'width'], {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  marginLeft: 0,
  [theme.breakpoints.down('sm')]: {
    padding: theme.spacing(1.5),
  },
  [theme.breakpoints.up('md')]: {
    marginLeft: `-${drawerWidth}px`,
    ...(open && {
      transition: theme.transitions.create(['margin', 'width'], {
        easing: theme.transitions.easing.easeOut,
        duration: theme.transitions.duration.enteringScreen,
      }),
      marginLeft: 0,
    }),
  },
}));

const AppBarStyled = styled(AppBar, {
  shouldForwardProp: (prop) => prop !== 'open',
})<{ open?: boolean }>(({ theme, open }) => ({
  transition: theme.transitions.create(['margin', 'width'], {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  [theme.breakpoints.up('md')]: {
    ...(open && {
      width: `calc(100% - ${drawerWidth}px)`,
      marginLeft: `${drawerWidth}px`,
      transition: theme.transitions.create(['margin', 'width'], {
        easing: theme.transitions.easing.easeOut,
        duration: theme.transitions.duration.enteringScreen,
      }),
    }),
  },
  boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
  background: 'linear-gradient(135deg, #ff9800 0%, #f57c00 100%)',
}));

const DrawerHeader = styled('div')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  padding: theme.spacing(0, 1),
  ...theme.mixins.toolbar,
  justifyContent: 'flex-end',
}));

const OrganizerLayout: React.FC = () => {
  const { t } = useTranslation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const [open, setOpen] = useState(() => {
    const saved = localStorage.getItem('ticket_organizer_sidebar_open');
    if (saved !== null) return saved === 'true';
    return window.innerWidth >= 960;
  });
  
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const profile = await profileService.getProfile();
        setUserProfile(profile);
      } catch (error) {
      } finally {
        setLoadingProfile(false);
      }
    };

    fetchUserProfile();
  }, []);

  const handleDrawerToggle = () => {
    setOpen((prev) => {
      const next = !prev;
      localStorage.setItem('ticket_organizer_sidebar_open', String(next));
      return next;
    });
  };

  const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    setLogoutConfirmOpen(true);
  };

  const handleLogoutConfirm = () => {
    setLogoutConfirmOpen(false);
    logout();
    navigate('/login');
  };

  const handleLogoutCancel = () => {
    setLogoutConfirmOpen(false);
  };

  const handleMenuItemClick = () => {
    if (isMobile) {
      setOpen(false);
    }
  };

  const menuItems = [
    { text: t('navigation.dashboard'), icon: <DashboardIcon />, path: '/organizer/dashboard' },
    { text: t('navigation.events'), icon: <EventIcon />, path: '/organizer/events' },
    { text: 'Deals', icon: <LocalOfferIcon />, path: '/organizer/deals' },
    { text: t('navigation.venues'), icon: <LocationOnIcon />, path: '/organizer/venues' },
    { text: t('navigation.seatManagement'), icon: <EventSeatIcon />, path: '/organizer/seats' },
    { text: t('navigation.bookings'), icon: <ReceiptIcon />, path: '/organizer/bookings' },
    { text: t('navigation.organizerEmployees'), icon: <PeopleIcon />, path: '/organizer/employees' },
    { text: 'Event Assignments', icon: <AssignmentIcon />, path: '/organizer/event-assignments' },
    { text: t('navigation.recycleBin'), icon: <DeleteIcon />, path: '/organizer/recycle-bin' },
    { text: 'Activity Logs', icon: <AssignmentIcon />, path: '/organizer/audit-logs' },
    { text: t('navigation.profile'), icon: <AccountCircleIcon />, path: '/organizer/profile' },
    { text: 'Event Reports', icon: <AssessmentIcon />, path: '/organizer/reports' },
    { text: t('navigation.settings'), icon: <SettingsIcon />, path: '/organizer/settings' },
  ];

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      <AppBarStyled position="fixed" open={open}>
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            onClick={handleDrawerToggle}
            edge="start"
            sx={{ mr: 2 }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1, fontWeight: 600 }}>
            {t('header.organizerTitle')}
          </Typography>
          <div>
            <Tooltip title={userProfile ? `${userProfile.firstName} ${userProfile.lastName}` : "Organizer Profile"}>
              <IconButton
                size="large"
                aria-label="account of current user"
                aria-controls="menu-appbar"
                aria-haspopup="true"
                onClick={handleMenu}
                color="inherit"
              >
                {loadingProfile ? (
                  <CircularProgress size={32} color="inherit" />
                ) : userProfile?.profilePicture ? (
                  <Avatar 
                    src={getProfilePictureUrl(userProfile.profilePicture)} 
                    sx={{ width: 40, height: 40, border: '2px solid rgba(255,255,255,0.3)' }}
                  />
                ) : (
                  <Avatar sx={{ width: 40, height: 40, bgcolor: '#ff9800' }}>
                    {userProfile?.firstName?.charAt(0).toUpperCase() || userProfile?.email?.charAt(0).toUpperCase() || 'O'}
                  </Avatar>
                )}
              </IconButton>
            </Tooltip>
            <Menu
              id="menu-appbar"
              anchorEl={anchorEl}
              keepMounted
              open={Boolean(anchorEl)}
              onClose={handleClose}
              sx={{ mt: 1 }}
            >
              <MenuItem onClick={() => { navigate('/organizer/profile'); handleClose(); }}>
                <AccountCircleIcon sx={{ mr: 1 }} />
                Profile
              </MenuItem>
              <MenuItem onClick={() => { handleClose(); handleLogout(); }}>
                <LogoutIcon sx={{ mr: 1 }} />
                Logout
              </MenuItem>
            </Menu>
          </div>
        </Toolbar>
      </AppBarStyled>
      <Drawer
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
            background: 'linear-gradient(135deg, #f5f7fa 0%, #e4e7f1 100%)',
            borderRight: '1px solid rgba(0,0,0,0.05)',
          },
        }}
        variant={isMobile ? "temporary" : "persistent"}
        anchor="left"
        open={open}
        onClose={() => setOpen(false)}
        ModalProps={{
          keepMounted: true, // Better mobile performance
        }}
      >
        <DrawerHeader>
          <IconButton onClick={() => setOpen(false)}>
            <ChevronLeftIcon />
          </IconButton>
        </DrawerHeader>
        <Divider />
        <List>
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <ListItem key={item.text} disablePadding sx={{ mb: 0.5 }}>
                <ListItemButton 
                  component={RouterLink} 
                  to={item.path}
                  onClick={handleMenuItemClick}
                  sx={{
                    borderRadius: '8px',
                    mx: 1,
                    backgroundColor: isActive ? 'rgba(25, 118, 210, 0.15)' : 'transparent',
                    '&:hover': {
                      backgroundColor: isActive ? 'rgba(25, 118, 210, 0.2)' : 'rgba(25, 118, 210, 0.08)',
                    }
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 40, color: isActive ? '#1976d2' : '#666' }}>
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText 
                    primary={item.text} 
                    primaryTypographyProps={{ 
                      fontWeight: isActive ? 600 : 500,
                      color: isActive ? '#1976d2' : '#333'
                    }} 
                  />
                </ListItemButton>
              </ListItem>
            );
          })}
        </List>
      </Drawer>
      <Main open={open}>
        <DrawerHeader />
        <Outlet />
      </Main>
      <ConfirmDialog
        open={logoutConfirmOpen}
        title="Confirm Logout"
        content="Are you sure you want to logout?"
        onClose={handleLogoutCancel}
        onConfirm={handleLogoutConfirm}
        confirmText="Logout"
        cancelText="Cancel"
      />
    </Box>
  );
};

export default OrganizerLayout;
