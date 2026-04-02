import React, { useState, useEffect } from 'react';
import { Box, Container, Typography, CircularProgress, Accordion, AccordionSummary, AccordionDetails } from '@mui/material';
import { ExpandMore as ExpandMoreIcon } from '@mui/icons-material';
import PublicNavbar from '../../../components/public/PublicNavbar';
import PublicFooter from '../../../components/public/PublicFooter';
import PageContentService from '../../../services/pageContent.service';

interface FAQItem {
  question: string;
  answer: string;
}

const FAQ: React.FC = () => {
  const [content, setContent] = useState<string>('');
  const [title, setTitle] = useState('Frequently Asked Questions');
  const [loading, setLoading] = useState(true);
  const [faqItems, setFaqItems] = useState<FAQItem[]>([]);

  useEffect(() => {
    loadContent();
  }, []);

  const loadContent = async () => {
    try {
      setLoading(true);
      const data = await PageContentService.getPageContent('FAQ');
      setTitle(data.title);
      setContent(data.content);
      parseFAQItems(data.content);
    } catch (err) {
      console.error('Error loading FAQ:', err);
      setContent(getDefaultContent());
      parseFAQItems(getDefaultContent());
    } finally {
      setLoading(false);
    }
  };

  const parseFAQItems = (htmlContent: string) => {
    // Parse FAQ items from HTML content
    // Expected format: <div class="faq-item"><h5>Question</h5><p>Answer</p></div>
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');
    const items: FAQItem[] = [];

    doc.querySelectorAll('.faq-item').forEach((item) => {
      const questionElement = item.querySelector('h5');
      const answerElement = item.querySelector('p');
      if (questionElement && answerElement) {
        items.push({
          question: questionElement.textContent || '',
          answer: answerElement.innerHTML || '',
        });
      }
    });

    if (items.length > 0) {
      setFaqItems(items);
    }
  };

  const getDefaultContent = () => {
    return `
      <div class="faq-item">
        <h5>What is Ticketer.lk?</h5>
        <p>Ticketer.lk is an online ticket booking platform for events, concerts, shows, and more.</p>
      </div>
      <div class="faq-item">
        <h5>How do I create an account?</h5>
        <p>Click on the "Create Account" button and fill in the required information. You'll receive a confirmation email.</p>
      </div>
      <div class="faq-item">
        <h5>Can I cancel my tickets?</h5>
        <p>Cancellation policies depend on the event. Please check the specific event details for cancellation terms.</p>
      </div>
      <div class="faq-item">
        <h5>What payment methods do you accept?</h5>
        <p>We accept credit cards, debit cards, and online payment gateways.</p>
      </div>
      <div class="faq-item">
        <h5>How will I receive my tickets?</h5>
        <p>Your tickets will be sent to your registered email address. You can also download them from your account.</p>
      </div>
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
        ) : faqItems.length > 0 ? (
          <Box sx={{ mt: 4 }}>
            {faqItems.map((item, index) => (
              <Accordion
                key={index}
                sx={{
                  backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  mb: 2,
                  '&:before': {
                    display: 'none',
                  },
                }}
              >
                <AccordionSummary
                  expandIcon={<ExpandMoreIcon sx={{ color: '#fcd0a5' }} />}
                  sx={{
                    '& .MuiAccordionSummary-content': {
                      my: 0,
                    },
                  }}
                >
                  <Typography
                    sx={{
                      color: '#fcd0a5',
                      fontWeight: 600,
                      fontFamily: 'Raleway, sans-serif',
                    }}
                  >
                    {item.question}
                  </Typography>
                </AccordionSummary>
                <AccordionDetails
                  sx={{
                    backgroundColor: 'rgba(0, 0, 0, 0.3)',
                    color: '#cbd5e1',
                  }}
                >
                  <Box dangerouslySetInnerHTML={{ __html: item.answer }} />
                </AccordionDetails>
              </Accordion>
            ))}
          </Box>
        ) : (
          <Box
            sx={{
              color: '#cbd5e1',
              fontFamily: 'Raleway, sans-serif',
              lineHeight: 1.8,
              '& h5': {
                color: '#fcd0a5',
                fontWeight: 600,
                mt: 4,
                mb: 2,
              },
              '& p': {
                mb: 2,
              },
              '& div': {
                mb: 4,
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
