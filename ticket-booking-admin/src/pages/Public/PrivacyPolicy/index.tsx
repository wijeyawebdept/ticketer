import React from 'react';
import { Box, Container, Typography } from '@mui/material';
import PublicNavbar from '../../../components/public/PublicNavbar';
import PublicFooter from '../../../components/public/PublicFooter';

const PrivacyPolicy: React.FC = () => {
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
          Privacy Policy
        </Typography>

        <Box sx={{ color: '#cbd5e1', fontFamily: 'Raleway, sans-serif', lineHeight: 1.8 }}>
          <Typography variant="h6" sx={{ color: '#fcd0a5', mb: 2, fontWeight: 600 }}>
            Introduction
          </Typography>
          <Typography paragraph>
            Ticketer.lk ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website and use our services.
          </Typography>

          <Typography variant="h6" sx={{ color: '#fcd0a5', mb: 2, fontWeight: 600, mt: 4 }}>
            Information We Collect
          </Typography>
          <Typography paragraph>
            We may collect information about you in a variety of ways. The information we may collect on the Site includes:
          </Typography>
          <Box component="ul" sx={{ pl: 2, mb: 2 }}>
            <li>Personal Data: Personally identifiable information, such as your name, shipping address, email address, and telephone number, that you voluntarily give to us when you register with the Site or when you choose to participate in various activities related to the Site.</li>
            <li>Financial Data: Financial information, such as data related to your payment method (e.g., valid credit card number, card brand, expiration date) that we may collect when you purchase or attempt to purchase tickets or services from the Site.</li>
            <li>Data From Social Networks: User information from social networks, including your name, your social network username, location, gender, birth date, email address, profile picture, and public data for contacts.</li>
          </Box>

          <Typography variant="h6" sx={{ color: '#fcd0a5', mb: 2, fontWeight: 600, mt: 4 }}>
            Use of Your Information
          </Typography>
          <Typography paragraph>
            Having accurate information about you permits us to provide you with a smooth, efficient, and customized experience. Specifically, we may use information collected about you via the Site to:
          </Typography>
          <Box component="ul" sx={{ pl: 2, mb: 2 }}>
            <li>Generate a personal profile about you so that future visits to the Site will be personalized as possible.</li>
            <li>Increase the efficiency and operation of the Site.</li>
            <li>Monitor and analyze usage and trends to improve your experience with the Site.</li>
            <li>Process your transactions and send related information.</li>
            <li>Email you regarding your account or order.</li>
          </Box>

          <Typography variant="h6" sx={{ color: '#fcd0a5', mb: 2, fontWeight: 600, mt: 4 }}>
            Disclosure of Your Information
          </Typography>
          <Typography paragraph>
            We may share your information in the following situations:
          </Typography>
          <Box component="ul" sx={{ pl: 2, mb: 2 }}>
            <li>By Law or to Protect Rights: If we believe the release of information is necessary to comply with the law.</li>
            <li>Third-Party Service Providers: We may share your information with third parties that perform services for us, including payment processors, data analysis providers, email delivery services, hosting providers, and customer service providers.</li>
          </Box>

          <Typography variant="h6" sx={{ color: '#fcd0a5', mb: 2, fontWeight: 600, mt: 4 }}>
            Security of Your Information
          </Typography>
          <Typography paragraph>
            We use administrative, technical, and physical security measures to protect your personal information. However, perfect security is not guaranteed, and we cannot ensure or warrant the security of any information you transmit to us or receive from us.
          </Typography>

          <Typography variant="h6" sx={{ color: '#fcd0a5', mb: 2, fontWeight: 600, mt: 4 }}>
            Contact Us
          </Typography>
          <Typography paragraph>
            If you have questions or comments about this Privacy Policy, please contact us at:
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

export default PrivacyPolicy;
