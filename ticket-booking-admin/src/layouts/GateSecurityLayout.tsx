import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Button,
  Chip,
  Tooltip,
  Container,
} from '@mui/material';
import {
  Security as SecurityIcon,
  Fullscreen as FullscreenIcon,
  FullscreenExit as FullscreenExitIcon,
  Logout as LogoutIcon,
  Sensors as LiveIcon,
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
    navigate('/login');
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#0b0f19', color: '#f8fafc', display: 'flex', flexDirection: 'column' }}>
      {/* Top Standalone Gate Bar */}
      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          bgcolor: '#111827',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          backdropFilter: 'blur(10px)',
        }}
      >
        <Toolbar sx={{ justifyContent: 'space-between', px: { xs: 2, sm: 3 } }}>
          {/* Brand & Gate Identity */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 38,
                height: 38,
                borderRadius: 2,
                bgcolor: 'rgba(255, 25, 85, 0.15)',
                border: '1px solid rgba(255, 25, 85, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ff1955',
              }}
            >
              <SecurityIcon />
            </Box>
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="h6" sx={{ fontWeight: 800, color: '#fff', fontSize: '1.05rem', letterSpacing: 0.5 }}>
                  GATE CONTROL
                </Typography>
                <Chip
                  icon={<LiveIcon sx={{ color: '#10b981 !important', fontSize: '14px !important' }} />}
                  label="LIVE"
                  size="small"
                  sx={{
                    bgcolor: 'rgba(16, 185, 129, 0.15)',
                    color: '#10b981',
                    fontWeight: 800,
                    fontSize: '0.68rem',
                    height: 22,
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                  }}
                />
              </Box>
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', display: 'block', fontSize: '0.72rem' }}>
                Secure QR Ticket Verification & Fast Gate Entry
              </Typography>
            </Box>
          </Box>

          {/* Right Action Tools: Live Clock, Guard Tag, Fullscreen, Logout */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 2 } }}>
            <Box sx={{ display: { xs: 'none', md: 'block' }, textAlign: 'right' }}>
              <Typography sx={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.95rem', color: '#fcd0a5' }}>
                {currentTime}
              </Typography>
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem' }}>
                {user ? `${user.email} (${user.role})` : 'Gate Staff Terminal'}
              </Typography>
            </Box>

            <Tooltip title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}>
              <IconButton onClick={toggleFullscreen} sx={{ color: 'rgba(255,255,255,0.7)', '&:hover': { color: '#fff' } }}>
                {isFullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
              </IconButton>
            </Tooltip>

            <Button
              variant="outlined"
              size="small"
              startIcon={<LogoutIcon />}
              onClick={handleLogout}
              sx={{
                borderColor: 'rgba(255,255,255,0.2)',
                color: 'rgba(255,255,255,0.8)',
                borderRadius: 2,
                textTransform: 'none',
                fontSize: '0.8rem',
                '&:hover': {
                  borderColor: '#ff1955',
                  color: '#ff1955',
                  bgcolor: 'rgba(255,25,85,0.08)',
                },
              }}
            >
              Exit Gate
            </Button>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Main Gate Scanner Outlet */}
      <Container maxWidth="xl" sx={{ flexGrow: 1, py: { xs: 2, sm: 3 }, px: { xs: 1.5, sm: 3 } }}>
        <Outlet />
      </Container>
    </Box>
  );
};

export default GateSecurityLayout;
