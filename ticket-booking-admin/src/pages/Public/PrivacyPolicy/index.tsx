import React, { useState, useEffect } from 'react';
import { Box, Container, Typography, CircularProgress } from '@mui/material';
import PublicNavbar from '../../../components/public/PublicNavbar';
import PublicFooter from '../../../components/public/PublicFooter';
import PageContentService from '../../../services/pageContent.service';

const PrivacyPolicy: React.FC = () => {
  const [content, setContent] = useState<string>('');
  const [title, setTitle] = useState('Privacy Policy');
  const [loading, setLoading] = useState(true);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [error, setError] = useState(false);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    loadContent();
  }, []);

  const loadContent = async () => {
    try {
      setLoading(true);
      const data = await PageContentService.getPageContent('PRIVACY_POLICY');
      setTitle(data.title);
      setContent(data.content);
    } catch (err) {
      setError(true);
      // Set default content if API fails
      setContent(getDefaultContent());
    } finally {
      setLoading(false);
    }
  };

  const getDefaultContent = () => {
    return `
      <h4>Introduction</h4>
      <p>Ticketer.lk ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website and use our services.</p>
      
      <h4>Information We Collect</h4>
      <p>We may collect information about you in a variety of ways. The information we may collect on the Site includes:</p>
      <ul>
        <li>Personal Data: Personally identifiable information, such as your name, shipping address, email address, and telephone number</li>
        <li>Financial Data: Financial information related to your payment method</li>
        <li>Data From Social Networks: User information from social networks</li>
      </ul>
      
      <h4>Use of Your Information</h4>
      <p>Having accurate information about you permits us to provide you with a smooth, efficient, and customized experience.</p>
      
      <h4>Contact Us</h4>
      <p>If you have questions about this Privacy Policy, please contact us at support@ticketer.lk</p>
    `;
  };

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
          {title}
        </Typography>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Box
            sx={{
              color: '#cbd5e1',
              fontFamily: 'Raleway, sans-serif',
              lineHeight: 1.8,
              '& h4': {
                color: '#fcd0a5',
                fontWeight: 600,
                mt: 4,
                mb: 2,
              },
              '& p': {
                mb: 2,
              },
              '& ul': {
                pl: 2,
                mb: 2,
              },
              '& li': {
                mb: 1,
              },
            }}
            dangerouslySetInnerHTML={{ __html: content }}
          />
        )}
      </Container>

      <PublicFooter />
    </Box>
  );
};

export default PrivacyPolicy;
