import React, { useState, useEffect } from 'react';
import { Box, Container, Typography, CircularProgress } from '@mui/material';
import PublicNavbar from '../../../components/public/PublicNavbar';
import PublicFooter from '../../../components/public/PublicFooter';
import PageContentService from '../../../services/pageContent.service';

const TermsAndConditions: React.FC = () => {
  const [content, setContent] = useState<string>('');
  const [title, setTitle] = useState('Terms and Conditions');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadContent();
  }, []);

  const loadContent = async () => {
    try {
      setLoading(true);
      const data = await PageContentService.getPageContent('TERMS_AND_CONDITIONS');
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
      <h4>1. Agreement to Terms</h4>
      <p>By accessing and using this website, you accept and agree to be bound by these terms and conditions.</p>
      
      <h4>2. Use License</h4>
      <p>Permission is granted for personal, non-commercial use only.</p>
      <ul>
        <li>No modification or copying of materials</li>
        <li>No commercial use</li>
        <li>No reverse engineering</li>
      </ul>
      
      <h4>3. Disclaimer</h4>
      <p>The materials are provided on an 'as is' basis without warranties.</p>
      
      <h4>4. Limitations</h4>
      <p>We are not liable for damages arising from the use of this website.</p>
      
      <h4>5. Governing Law</h4>
      <p>These terms are governed by the laws of Sri Lanka.</p>
      
      <h4>Contact Us</h4>
      <p>If you have questions, please contact us at support@ticketer.lk</p>
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

export default TermsAndConditions;
