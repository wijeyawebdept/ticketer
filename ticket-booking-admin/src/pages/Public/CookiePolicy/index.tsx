import React, { useState, useEffect } from 'react';
import { Box, Container, Typography, CircularProgress } from '@mui/material';
import PublicNavbar from '../../../components/public/PublicNavbar';
import PublicFooter from '../../../components/public/PublicFooter';
import PageContentService from '../../../services/pageContent.service';

const CookiePolicy: React.FC = () => {
  const [content, setContent] = useState<string>('');
  const [title, setTitle] = useState('Cookie Policy');
  const [loading, setLoading] = useState(true);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    loadContent();
  }, []);

  const loadContent = async () => {
    try {
      setLoading(true);
      const data = await PageContentService.getPageContent('COOKIE_POLICY');
      setTitle(data.title);
      setContent(data.content);
    } catch (err) {
      setContent(getDefaultContent());
    } finally {
      setLoading(false);
    }
  };

  const getDefaultContent = () => {
    return `
      <h4>What Are Cookies?</h4>
      <p>Cookies are small pieces of data stored on your device when you visit our website.</p>
      
      <h4>Types of Cookies We Use</h4>
      <p><strong>Essential Cookies:</strong> These cookies are necessary for the website to function properly.</p>
      <p><strong>Performance Cookies:</strong> These collect information about how you use our website.</p>
      <p><strong>Functional Cookies:</strong> These remember your preferences and settings.</p>
      <p><strong>Marketing Cookies:</strong> These are used to display relevant advertisements.</p>
      
      <h4>Contact Us</h4>
      <p>If you have questions about this Cookie Policy, please contact us at support@ticketer.lk</p>
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
            }}
            dangerouslySetInnerHTML={{ __html: content }}
          />
        )}
      </Container>

      <PublicFooter />
    </Box>
  );
};

export default CookiePolicy;
