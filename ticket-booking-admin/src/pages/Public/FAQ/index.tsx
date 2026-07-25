import React, { useState, useEffect } from 'react';
import { Box, Container, Typography, CircularProgress } from '@mui/material';
import PublicNavbar from '../../../components/public/PublicNavbar';
import PublicFooter from '../../../components/public/PublicFooter';
import PageContentService from '../../../services/pageContent.service';

const FAQ: React.FC = () => {
  const [content, setContent] = useState<string>('');
  const [title, setTitle] = useState('Frequently Asked Questions');
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
      setError(false);
      const data = await PageContentService.getPageContent('FAQ');
      setTitle(data.title);
      setContent(data.content);
    } catch (err) {
      setError(true);
      setContent(getDefaultContent());
    } finally {
      setLoading(false);
    }
  };

  const getDefaultContent = () => {
    return `
      <h2>General Questions</h2>
      <p>This is the default FAQ content. Please update this from the Admin Panel &gt; Page Content Manager.</p>
      
      <h3>What is this platform?</h3>
      <p>This platform allows you to browse, book, and manage event tickets online.</p>
      
      <h3>How do I create an account?</h3>
      <p>Click on the 'Register' button on the login page and fill in your details.</p>
      
      <h2>Bookings & Payments</h2>
      
      <h3>How do I book tickets?</h3>
      <p>Browse available events, select your preferred seats, and complete the payment process.</p>
      
      <h3>What payment methods do you accept?</h3>
      <p>We accept all major credit cards, debit cards, and digital payment methods.</p>
      
      <h3>Can I cancel my booking?</h3>
      <p>Yes, you can cancel your booking within the specified cancellation period for a refund.</p>
      
      <h2>Technical Support</h2>
      
      <h3>What should I do if I encounter an error?</h3>
      <p>Please clear your browser cache and try again. If the issue persists, contact our support team.</p>
      
      <h3>Is the website mobile-friendly?</h3>
      <p>Yes, our platform is fully responsive and works on all devices.</p>
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
              fontSize: '1rem',
              
              '& h1': {
                color: '#fcd0a5',
                fontWeight: 700,
                fontSize: '2.2rem',
                mt: 4,
                mb: 3,
                fontFamily: 'Raleway, sans-serif',
                borderBottom: '2px solid #ff1955',
                paddingBottom: '1rem',
              },
              
              '& h2': {
                color: '#fcd0a5',
                fontWeight: 600,
                fontSize: '1.8rem',
                mt: 4,
                mb: 2,
                fontFamily: 'Raleway, sans-serif',
                borderBottom: '1px solid rgba(252, 208, 165, 0.3)',
                paddingBottom: '0.75rem',
              },
              
              '& h3': {
                color: '#fcd0a5',
                fontWeight: 600,
                fontSize: '1.3rem',
                mt: 3,
                mb: 1.5,
                fontFamily: 'Raleway, sans-serif',
              },
              
              '& h4, & h5, & h6': {
                color: '#fcd0a5',
                fontWeight: 600,
                fontFamily: 'Raleway, sans-serif',
                mt: 2,
                mb: 1,
              },
              
              '& p': {
                mb: 2,
                textAlign: 'justify',
              },
              
              '& ul, & ol': {
                mb: 2,
                pl: 3,
              },
              
              '& li': {
                mb: 1,
              },
              
              '& a': {
                color: '#ff1955',
                textDecoration: 'none',
                '&:hover': {
                  textDecoration: 'underline',
                },
              },
              
              '& blockquote': {
                borderLeft: '4px solid #ff1955',
                paddingLeft: 2,
                marginLeft: 2,
                fontStyle: 'italic',
                color: '#a0aec0',
              },
              
              '& code': {
                backgroundColor: 'rgba(0, 0, 0, 0.3)',
                padding: '0.2rem 0.4rem',
                borderRadius: '4px',
                fontFamily: 'monospace',
                color: '#fcd0a5',
              },
              
              '& pre': {
                backgroundColor: 'rgba(0, 0, 0, 0.4)',
                padding: '1rem',
                borderRadius: '4px',
                overflow: 'auto',
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

export default FAQ;
