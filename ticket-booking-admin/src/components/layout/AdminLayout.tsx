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
  Person as PersonIcon,
  EventNote as EventIcon,
  LocationOn as LocationOnIcon,
  Receipt as ReceiptIcon,
  Settings as SettingsIcon,
  Logout as LogoutIcon,
  AccountCircle as AccountCircleIcon,
  EventSeat as EventSeatIcon,
  RestoreFromTrash as RecycleBinIcon,
  Assignment as AssignmentIcon,
  PersonAdd as PersonAddIcon,
  Collections as CollectionsIcon,
  Description as DescriptionIcon,
  LocalOffer as LocalOfferIcon,
} from '@mui/icons-material';
import { useNavigate, Outlet, Link as RouterLink, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { profileService } from '../../services/profile.service';
import ConfirmDialog from '../ConfirmDialog';

const drawerWidth = 240;

const Main = styled('main', { shouldForwardProp: (prop) => prop !== 'open' })<{
  open?: boolean;
}>(({ theme, open }) => ({
  flexGrow: 1,
  padding: theme.spacing(3),
  transition: theme.transitions.create('margin', {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  marginLeft: `-${drawerWidth}px`,
  ...(open && {
    transition: theme.transitions.create('margin', {
      easing: theme.transitions.easing.easeOut,
      duration: theme.transitions.duration.enteringScreen,
    }),
    marginLeft: 0,
  }),
}));

const AppBarStyled = styled(AppBar, {
  shouldForwardProp: (prop) => prop !== 'open',
})<{
  open?: boolean;
}>(({ theme, open }) => ({
  transition: theme.transitions.create(['margin', 'width'], {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  ...(open && {
    width: `calc(100% - ${drawerWidth}px)`,
    marginLeft: `${drawerWidth}px`,
    transition: theme.transitions.create(['margin', 'width'], {
      easing: theme.transitions.easing.easeOut,
      duration: theme.transitions.duration.enteringScreen,
    }),
  }),
  boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
  background: 'linear-gradient(135deg, #e53935 0%, #c62828 100%)',
}));

const DrawerHeader = styled('div')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  padding: theme.spacing(0, 1),
  ...theme.mixins.toolbar,
  justifyContent: 'flex-end',
}));

const AdminLayout: React.FC = () => {
  const { t } = useTranslation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [open, setOpen] = useState(false);
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
    setOpen(!open);
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
    { text: t('navigation.dashboard'), icon: <DashboardIcon />, path: '/admin/dashboard' },
    { text: t('navigation.users'), icon: <PersonIcon />, path: '/admin/users' },
    { text: t('navigation.admins'), icon: <PersonIcon />, path: '/admin/admins' },
    { text: t('navigation.organizers'), icon: <PersonIcon />, path: '/admin/organizers' },
    { text: t('navigation.organizerEmployees'), icon: <PersonIcon />, path: '/admin/organizer-employees' },
    { text: t('navigation.events'), icon: <EventIcon />, path: '/admin/events' },
    { text: 'Deals', icon: <LocalOfferIcon />, path: '/admin/deals' },
    { text: 'Event Categories', icon: <EventIcon />, path: '/admin/event-categories' },
    { text: 'Gallery Management', icon: <CollectionsIcon />, path: '/admin/gallery' },
    { text: 'Banners', icon: <CollectionsIcon />, path: '/admin/banners' },
    { text: 'Page Content Manager', icon: <DescriptionIcon />, path: '/admin/page-content' },
    { text: 'Employee Assignment', icon: <AssignmentIcon />, path: '/admin/event-assignments' },
    { text: 'Organizer Assignment', icon: <PersonAddIcon />, path: '/admin/organizer-assignment' },
    { text: t('navigation.venues'), icon: <LocationOnIcon />, path: '/admin/venues' },
    { text: t('navigation.seatManagement'), icon: <EventSeatIcon />, path: '/admin/seats' },
    { text: t('navigation.bookings'), icon: <ReceiptIcon />, path: '/admin/bookings' },
    { text: t('navigation.recycleBin'), icon: <RecycleBinIcon />, path: '/admin/recycle-bin' },
    { text: t('navigation.settings'), icon: <SettingsIcon />, path: '/admin/settings' },
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
            {t('header.title')}
          </Typography>
          <div>
            <Tooltip title={userProfile ? `${userProfile.firstName} ${userProfile.lastName}` : "User Profile"}>
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
                    src={`http://localhost:8081/${userProfile.profilePicture}`} 
                    sx={{ width: 40, height: 40, border: '2px solid rgba(255,255,255,0.3)' }}
                  />
                ) : (
                  <Avatar sx={{ width: 40, height: 40, bgcolor: '#4caf50' }}>
                    {userProfile?.firstName?.charAt(0).toUpperCase() || userProfile?.email?.charAt(0).toUpperCase() || 'A'}
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
              <MenuItem onClick={() => { handleClose(); navigate('/admin/settings'); }}>
                <ListItemIcon>
                  <AccountCircleIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText primary={t('navigation.profile')} sx={{ minWidth: 120 }} />
              </MenuItem>
              <MenuItem onClick={handleLogout}>
                <ListItemIcon>
                  <LogoutIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText primary="Logout" sx={{ minWidth: 120 }} />
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
          <IconButton onClick={handleDrawerToggle}>
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

export default AdminLayout;