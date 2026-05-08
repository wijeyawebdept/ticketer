import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography } from '@mui/material';
import { ConfirmationNumber as TicketIcon } from '@mui/icons-material';
import './Landing.css';

const Landing: React.FC = () => {
  const navigate = useNavigate();
  useEffect(() => {
    const duration = 1500; // 1.5 seconds

    const redirectTimer = setTimeout(() => {
      navigate('/home');
    }, duration);

    return () => {
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
      </Box>

      {/* Decorative background elements */}
      <div className="bg-blob blob-1"></div>
      <div className="bg-blob blob-2"></div>
      <div className="bg-blob blob-3"></div>
    </Box>
  );
};

export default Landing;
