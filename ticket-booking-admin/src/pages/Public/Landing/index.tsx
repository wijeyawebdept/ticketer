import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, LinearProgress } from '@mui/material';
import { ConfirmationNumber as TicketIcon } from '@mui/icons-material';
import './Landing.css';

const Landing: React.FC = () => {
  const navigate = useNavigate();
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const duration = 3000; // 3 seconds
    const interval = 30; // Update every 30ms
    const step = 100 / (duration / interval);

    const timer = setInterval(() => {
      setProgress((oldProgress) => {
        if (oldProgress >= 100) {
          clearInterval(timer);
          return 100;
        }
        return Math.min(oldProgress + step, 100);
      });
    }, interval);

    const redirectTimer = setTimeout(() => {
      navigate('/home');
    }, duration + 500);

    return () => {
      clearInterval(timer);
      clearTimeout(redirectTimer);
    };
  }, [navigate]);

  return (
    <Box className="landing-container">
      <Box className="landing-content">
        <Box className="logo-wrapper">
          <TicketIcon className="landing-logo-icon" />
          <Typography variant="h1" className="landing-title">
            TICKETER
          </Typography>
        </Box>
        
        <Typography variant="h6" className="landing-subtitle">
          Your Premium Event Experience Starts Here
        </Typography>

        <Box sx={{ width: '100%', mt: 4, maxWidth: 400 }}>
          <LinearProgress 
            variant="determinate" 
            value={progress} 
            className="landing-progress"
            sx={{
              height: 4,
              borderRadius: 2,
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              '& .MuiLinearProgress-bar': {
                background: 'linear-gradient(90deg, #1976d2, #42a5f5, #00d2ff)',
                borderRadius: 2,
              }
            }}
          />
          <Box display="flex" justifyContent="space-between" mt={1}>
            <Typography variant="caption" className="loading-text">
              {progress < 100 ? 'Starting services...' : 'Ready!'}
            </Typography>
            <Typography variant="caption" className="loading-text">
              {Math.round(progress)}%
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Decorative background elements */}
      <div className="bg-blob blob-1"></div>
      <div className="bg-blob blob-2"></div>
      <div className="bg-blob blob-3"></div>
    </Box>
  );
};

export default Landing;
