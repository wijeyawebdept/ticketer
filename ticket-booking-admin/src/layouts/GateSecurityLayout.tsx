import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  ThemeProvider,
  createTheme,
} from '@mui/material';
import {
  Security as SecurityIcon,
  Fullscreen as FullscreenIcon,
  FullscreenExit as FullscreenExitIcon,
  Logout as LogoutIcon,
  DarkMode as DarkModeIcon,
  LightMode as LightModeIcon,
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';

export interface GateThemeContextType {
  isDarkMode: boolean;
  toggleDarkMode: () => void;
}

export const GateSecurityLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString());

  // Dark Mode state for Gate Scanner terminal with localStorage persistence
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('ticketer_gate_dark_mode') === 'true';
  });

  const toggleDarkMode = useCallback(() => {
    setIsDarkMode((prev) => {
      const next = !prev;
      localStorage.setItem('ticketer_gate_dark_mode', String(next));
      window.dispatchEvent(new CustomEvent('gate-dark-mode-change', { detail: next }));
      return next;
    });
  }, []);

  // Synchronize across components or tabs
  useEffect(() => {
    const handleSync = (e: any) => {
      if (typeof e.detail === 'boolean') {
        setIsDarkMode(e.detail);
      }
    };
    window.addEventListener('gate-dark-mode-change', handleSync);
    return () => window.removeEventListener('gate-dark-mode-change', handleSync);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    document.title = 'Ticketer - Gate Terminal';
    return () => {
      document.title = 'Ticketer.lk - Book Your Tickets Online';
    };
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

  const gateMuiTheme = useMemo(() => {
    return createTheme({
      palette: {
        mode: isDarkMode ? 'dark' : 'light',
        primary: {
          main: '#3b82f6',
        },
        background: {
          default: isDarkMode ? '#090d16' : '#f8fafc',
          paper: isDarkMode ? '#0f172a' : '#ffffff',
        },
        text: {
          primary: isDarkMode ? '#f8fafc' : '#0f172a',
          secondary: isDarkMode ? '#94a3b8' : '#64748b',
        },
        divider: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
      },
      components: {
        MuiPaper: {
          styleOverrides: {
            root: {
              backgroundImage: 'none',
              ...(isDarkMode && {
                backgroundColor: '#0f172a',
                color: '#f8fafc',
                border: '1px solid #1e293b',
              }),
            },
          },
        },
        MuiMenu: {
          styleOverrides: {
            paper: {
              ...(isDarkMode && {
                backgroundColor: '#0f172a !important',
                color: '#f8fafc !important',
                border: '1px solid #1e293b',
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.6)',
              }),
            },
          },
        },
        MuiMenuItem: {
          styleOverrides: {
            root: {
              fontSize: '0.82rem',
              ...(isDarkMode && {
                color: '#f8fafc',
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.08) !important',
                },
                '&.Mui-selected': {
                  backgroundColor: 'rgba(59, 130, 246, 0.15) !important',
                  color: '#3b82f6 !important',
                  fontWeight: 700,
                  '&:hover': {
                    backgroundColor: 'rgba(59, 130, 246, 0.25) !important',
                  },
                },
              }),
            },
          },
        },
        MuiOutlinedInput: {
          styleOverrides: {
            root: {
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                borderColor: '#3b82f6 !important',
                borderWidth: '1.5px !important',
              },
            },
            notchedOutline: {
              borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.15)',
            },
          },
        },
        MuiInputLabel: {
          styleOverrides: {
            root: {
              '&.Mui-focused': {
                color: '#3b82f6 !important',
              },
            },
          },
        },
      },
    });
  }, [isDarkMode]);

  return (
    <ThemeProvider theme={gateMuiTheme}>
      <Box
      sx={{
        minHeight: '100vh',
        bgcolor: isDarkMode ? '#090d16' : '#f8fafc',
        color: isDarkMode ? '#f8fafc' : '#1e293b',
        display: 'flex',
        flexDirection: 'column',
        transition: 'background-color 0.25s ease, color 0.25s ease',
        overflowX: 'hidden',
      }}
    >
      {/* Top Standalone Gate Bar */}
      <AppBar
        position="sticky"
        elevation={1}
        sx={{
          bgcolor: isDarkMode ? '#0b1120' : '#1e293b',
          borderBottom: isDarkMode ? '1px solid #1e293b' : '1px solid #334155',
          transition: 'background-color 0.25s ease',
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

          {/* Right Action Tools: Live Clock, Guard Tag, Dark Mode, Fullscreen, Logout */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.5, sm: 1.2 }, flexShrink: 0 }}>
            <Box sx={{ display: { xs: 'none', md: 'block' }, textAlign: 'right' }}>
              <Typography sx={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.85rem', color: '#ffffff' }}>
                {currentTime}
              </Typography>
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.68rem' }}>
                {user ? `${user.email}` : 'Gate Staff'}
              </Typography>
            </Box>

            {/* Dark Mode Toggle */}
            <Tooltip title={isDarkMode ? 'Switch to Light Mode' : 'Night Mode (Dark Theme for Low-Light Scanning)'}>
              <IconButton
                size="small"
                onClick={toggleDarkMode}
                sx={{
                  color: isDarkMode ? '#f59e0b' : 'rgba(255,255,255,0.85)',
                  bgcolor: isDarkMode ? 'rgba(245, 158, 11, 0.15)' : 'rgba(255, 255, 255, 0.08)',
                  borderRadius: 1.5,
                  p: { xs: 0.8, sm: 1 },
                  border: isDarkMode ? '1px solid rgba(245, 158, 11, 0.3)' : '1px solid rgba(255, 255, 255, 0.15)',
                  '&:hover': {
                    color: isDarkMode ? '#fbbf24' : '#ffffff',
                    bgcolor: isDarkMode ? 'rgba(245, 158, 11, 0.25)' : 'rgba(255, 255, 255, 0.15)',
                  },
                }}
              >
                {isDarkMode ? <LightModeIcon fontSize="small" /> : <DarkModeIcon fontSize="small" />}
              </IconButton>
            </Tooltip>

            <Tooltip title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}>
              <IconButton
                size="small"
                onClick={toggleFullscreen}
                sx={{
                  color: 'rgba(255,255,255,0.85)',
                  p: { xs: 0.8, sm: 1 },
                  bgcolor: 'rgba(255, 255, 255, 0.08)',
                  borderRadius: 1.5,
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  '&:hover': { color: '#ffffff', bgcolor: 'rgba(255, 255, 255, 0.15)' },
                }}
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
      <Container maxWidth="xl" sx={{ flexGrow: 1, py: { xs: 1.5, sm: 2.5 }, px: { xs: 1.5, sm: 2.5, md: 3 } }}>
        <Outlet context={{ isDarkMode, toggleDarkMode }} />
      </Container>
    </Box>
  </ThemeProvider>
);
};

export default GateSecurityLayout;
