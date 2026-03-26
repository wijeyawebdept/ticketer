import React from 'react';
import { Box, Container, Typography } from '@mui/material';
import PublicNavbar from '../../../components/public/PublicNavbar';
import PublicFooter from '../../../components/public/PublicFooter';

const CookiePolicy: React.FC = () => {
  return (
    <Box sx={{ backgroundColor: '#242a33', minHeight: '100vh' }}>
      <PublicNavbar />
      
      <Container maxWidth="lg" sx={{ py: 6 }}>
        <Typography
          variant="h3"
          sx={{
            color: '#fcd0a5',
            fontFamily: 'Raleway, sans-serif',
            fontWeight: 700,
            mb: 4,
            fontSize: { xs: '1.75rem', md: '2.5rem' },
          }}
        >
          Cookie Policy
        </Typography>

        <Box sx={{ color: '#cbd5e1', fontFamily: 'Raleway, sans-serif', lineHeight: 1.8 }}>
          <Typography variant="h6" sx={{ color: '#fcd0a5', mb: 2, fontWeight: 600 }}>
            What Are Cookies?
          </Typography>
          <Typography paragraph>
            Cookies are small pieces of data stored on your device (computer or mobile device) when you visit our website. They help us recognize you, remember your preferences, and improve your user experience.
          </Typography>

          <Typography variant="h6" sx={{ color: '#fcd0a5', mb: 2, fontWeight: 600, mt: 4 }}>
            Types of Cookies We Use
          </Typography>
          <Typography paragraph>
            <strong style={{ color: '#ff1955' }}>Essential Cookies:</strong> These cookies are necessary for the website to function properly. They enable you to navigate the website and use its features.
          </Typography>
          <Typography paragraph>
            <strong style={{ color: '#ff1955' }}>Performance Cookies:</strong> These cookies collect information about how you use our website, such as which pages you visit and if you encounter any errors. These cookies don't identify you personally.
          </Typography>
          <Typography paragraph>
            <strong style={{ color: '#ff1955' }}>Functional Cookies:</strong> These cookies remember your preferences and settings to provide a personalized experience when you visit our site again.
          </Typography>
          <Typography paragraph>
            <strong style={{ color: '#ff1955' }}>Marketing Cookies:</strong> These cookies are used to track your activity across websites and display relevant advertisements to you based on your interests.
          </Typography>

          <Typography variant="h6" sx={{ color: '#fcd0a5', mb: 2, fontWeight: 600, mt: 4 }}>
            How We Use Cookies
          </Typography>
          <Box component="ul" sx={{ pl: 2, mb: 2 }}>
            <li>To maintain your session and remember your login information</li>
            <li>To understand how you use our website</li>
            <li>To personalize your experience on our site</li>
            <li>To deliver targeted advertising</li>
            <li>To analyze website performance and improve our services</li>
          </Box>

          <Typography variant="h6" sx={{ color: '#fcd0a5', mb: 2, fontWeight: 600, mt: 4 }}>
            Managing Cookies
          </Typography>
          <Typography paragraph>
            Most web browsers allow you to control cookies through their settings. You can choose to accept or reject cookies, or set your browser to notify you when a cookie is being set. Please note that disabling certain cookies may affect the functionality of our website.
          </Typography>

          <Typography variant="h6" sx={{ color: '#fcd0a5', mb: 2, fontWeight: 600, mt: 4 }}>
            Third-Party Cookies
          </Typography>
          <Typography paragraph>
            We may allow third-party service providers to place cookies on your device for analytics, advertising, and other purposes. These third parties have their own privacy policies governing the use of cookies from their services.
          </Typography>

          <Typography variant="h6" sx={{ color: '#fcd0a5', mb: 2, fontWeight: 600, mt: 4 }}>
            Changes to This Cookie Policy
          </Typography>
          <Typography paragraph>
            We may update this Cookie Policy from time to time to reflect changes in our practices or for other operational, legal, or regulatory reasons. We will notify you of any significant changes by posting the new Cookie Policy on our website.
          </Typography>

          <Typography variant="h6" sx={{ color: '#fcd0a5', mb: 2, fontWeight: 600, mt: 4 }}>
            Contact Us
          </Typography>
          <Typography paragraph>
            If you have any questions about this Cookie Policy, please contact us at:
          </Typography>
          <Typography paragraph>
            Email: <span style={{ color: '#ff1955' }}>support@ticketer.lk</span>
          </Typography>
        </Box>
      </Container>

      <PublicFooter />
    </Box>
  );
};

export default CookiePolicy;
