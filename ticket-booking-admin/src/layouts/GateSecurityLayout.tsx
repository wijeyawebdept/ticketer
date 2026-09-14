import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Button,
  Tooltip,
  Container,
} from '@mui/material';
import {
  Security as SecurityIcon,
  Fullscreen as FullscreenIcon,
  FullscreenExit as FullscreenExitIcon,
  Logout as LogoutIcon,
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';

export const GateSecurityLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login/gate');
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f8fafc', color: '#1e293b', display: 'flex', flexDirection: 'column' }}>
      {/* Top Standalone Gate Bar */}
      <AppBar
        position="sticky"
        elevation={1}
        sx={{
          bgcolor: '#1e293b',
          borderBottom: '1px solid #334155',
        }}
      >
        <Toolbar sx={{ justifyContent: 'space-between', px: { xs: 1.5, sm: 3 }, minHeight: { xs: 52, sm: 64 } }}>
          {/* Brand & Gate Identity */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 1.5 }, minWidth: 0 }}>
            <Box
              sx={{
                width: { xs: 30, sm: 36 },
                height: { xs: 30, sm: 36 },
                borderRadius: 1.5,
                bgcolor: 'rgba(255, 25, 85, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ff1955',
                flexShrink: 0,
              }}
            >
              <SecurityIcon sx={{ fontSize: { xs: 18, sm: 22 } }} />
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography
                variant="h6"
                noWrap
                sx={{
                  fontWeight: 800,
                  color: '#ffffff',
                  fontSize: { xs: '0.9rem', sm: '1.05rem' },
                  letterSpacing: 0.2,
                }}
              >
                Gate Terminal
              </Typography>
              <Typography
                variant="caption"
                noWrap
                sx={{
                  color: 'rgba(255,255,255,0.7)',
                  display: { xs: 'none', sm: 'block' },
                  fontSize: '0.72rem',
                }}
              >
                QR Ticket Verification & Entry Management
              </Typography>
            </Box>
          </Box>

          {/* Right Action Tools: Live Clock, Guard Tag, Fullscreen, Logout */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.5, sm: 1.5 }, flexShrink: 0 }}>
            <Box sx={{ display: { xs: 'none', md: 'block' }, textAlign: 'right' }}>
              <Typography sx={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.85rem', color: '#ffffff' }}>
                {currentTime}
              </Typography>
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.68rem' }}>
                {user ? `${user.email}` : 'Gate Staff'}
              </Typography>
            </Box>

            <Tooltip title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}>
              <IconButton
                size="small"
                onClick={toggleFullscreen}
                sx={{ color: 'rgba(255,255,255,0.8)', p: { xs: 0.8, sm: 1 }, '&:hover': { color: '#ffffff' } }}
              >
                {isFullscreen ? <FullscreenExitIcon fontSize="small" /> : <FullscreenIcon fontSize="small" />}
              </IconButton>
            </Tooltip>

            <Button
              variant="outlined"
              size="small"
              startIcon={<LogoutIcon sx={{ fontSize: '1rem !important' }} />}
              onClick={handleLogout}
              sx={{
                borderColor: 'rgba(255,255,255,0.3)',
                color: '#ffffff',
                borderRadius: 1.5,
                textTransform: 'none',
                fontSize: { xs: '0.75rem', sm: '0.8rem' },
                py: { xs: 0.4, sm: 0.6 },
                px: { xs: 1, sm: 1.5 },
                minWidth: 'auto',
                '&:hover': {
                  borderColor: '#ff1955',
                  color: '#ff1955',
                  bgcolor: 'rgba(255,25,85,0.1)',
                },
              }}
            >
              Exit
            </Button>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Main Gate Scanner Outlet */}
      <Container maxWidth="xl" sx={{ flexGrow: 1, py: { xs: 1.5, sm: 2.5 }, px: { xs: 1, sm: 2, md: 3 } }}>
        <Outlet />
      </Container>
    </Box>
  );
};

export default GateSecurityLayout;
