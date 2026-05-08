import React, { useState, useEffect } from 'react';
import { Box, Container, Typography, CircularProgress } from '@mui/material';
import PublicNavbar from '../../../components/public/PublicNavbar';
import PublicFooter from '../../../components/public/PublicFooter';
import PageContentService from '../../../services/pageContent.service';

const RefundPolicy: React.FC = () => {
  const [content, setContent] = useState<string>('');
  const [title, setTitle] = useState('Refund Policy');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    loadContent();
  }, []);

  const loadContent = async () => {
    try {
      setLoading(true);
      const data = await PageContentService.getPageContent('REFUND_POLICY');
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
    return '';
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

export default RefundPolicy;
