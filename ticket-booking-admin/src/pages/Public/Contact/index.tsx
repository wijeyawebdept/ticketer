import React, { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  TextField,
  Button,
  TextareaAutosize,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  Email as EmailIcon,
  Phone as PhoneIcon,
  LocationOn as LocationIcon,
  AccessTime as ClockIcon,
} from '@mui/icons-material';
import PublicNavbar from '../../../components/public/PublicNavbar';
import PublicFooter from '../../../components/public/PublicFooter';

const Contact: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Validate form
    if (!formData.name.trim()) {
      setError('Please enter your name');
      setLoading(false);
      return;
    }
    if (!formData.email.trim()) {
      setError('Please enter your email');
      setLoading(false);
      return;
    }
    if (!formData.subject.trim()) {
      setError('Please enter a subject');
      setLoading(false);
      return;
    }
    if (!formData.message.trim()) {
      setError('Please enter your message');
      setLoading(false);
      return;
    }

    // Simulate API call
    setTimeout(() => {
      setSubmitted(true);
      setFormData({ name: '', email: '', subject: '', message: '' });
      setLoading(false);
      // Reset success message after 5 seconds
      setTimeout(() => setSubmitted(false), 5000);
    }, 1000);
  };

  const contactInfo = [
    {
      icon: <EmailIcon sx={{ fontSize: 40, color: '#ff1955' }} />,
      title: 'Email',
      details: 'support@dailymirror.lk',
      description: 'For general inquiries and support',
    },
    {
      icon: <PhoneIcon sx={{ fontSize: 40, color: '#ff1955' }} />,
      title: 'Phone',
      details: '+94 (74) 364 3560 ',
      description: '24/7 Customer Support',
    },
    {
      icon: <LocationIcon sx={{ fontSize: 40, color: '#ff1955' }} />,
      title: 'Address',
      details: 'No. 8, Hunupitiya Cross Road',
      description: 'Colombo 02, Sri Lanka',
    },
    {
      icon: <ClockIcon sx={{ fontSize: 40, color: '#ff1955' }} />,
      title: 'Working Hours',
      details: 'Mon - Fri: 9am - 5pm',
      description: 'Our team is available during these hours',
    },
  ];

  return (
    <Box sx={{ backgroundColor: '#242a33', color: '#fff' }}>
      <PublicNavbar />

      {/* Hero Section */}
      <Box
        sx={{
          backgroundImage: "url('/images/party 3.jpg')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          color: 'white',
          py: { xs: 6, md: 10 },
          position: 'relative',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            zIndex: 1,
          },
        }}
      >
        <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 2, textAlign: 'center' }}>
          <Typography
            variant="h3"
            sx={{
              fontWeight: 700,
              mb: 2,
              fontFamily: 'Raleway, sans-serif',
              fontSize: { xs: '2rem', md: '3rem' },
              color: '#fcd0a5',
            }}
          >
            Contact Us
          </Typography>
          <Typography
            variant="h6"
            sx={{
              fontWeight: 300,
              opacity: 0.9,
              fontFamily: 'Raleway, sans-serif',
              lineHeight: 1.6,
              color: '#fff',
              maxWidth: '800px',
              mx: 'auto',
            }}
          >
            We're here to help with any questions or concerns. Reach out to us through any of the methods below.
          </Typography>
        </Container>
      </Box>

      {/* Contact Section */}
      <Box sx={{ py: { xs: 6, md: 10 } }}>
        <Container maxWidth="lg">
          <Grid container spacing={5}>
            {/* Contact Form */}
            <Grid item xs={12} md={7}>
              <Typography variant="h4" sx={{ fontWeight: 700, mb: 4, color: '#fcd0a5' }}>
                Send Us a Message
              </Typography>
              <form onSubmit={handleSubmit}>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Your Name"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      required
                      variant="filled"
                      InputLabelProps={{ style: { color: '#ccc' } }}
                      InputProps={{ style: { color: '#fff', backgroundColor: 'rgba(255,255,255,0.1)' } }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Your Email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                      variant="filled"
                      InputLabelProps={{ style: { color: '#ccc' } }}
                      InputProps={{ style: { color: '#fff', backgroundColor: 'rgba(255,255,255,0.1)' } }}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Subject"
                      name="subject"
                      value={formData.subject}
                      onChange={handleInputChange}
                      required
                      variant="filled"
                      InputLabelProps={{ style: { color: '#ccc' } }}
                      InputProps={{ style: { color: '#fff', backgroundColor: 'rgba(255,255,255,0.1)' } }}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextareaAutosize
                      minRows={6}
                      placeholder="Your Message *"
                      name="message"
                      value={formData.message}
                      onChange={handleInputChange}
                      style={{
                        width: '100%',
                        padding: '16px',
                        backgroundColor: 'rgba(255,255,255,0.1)',
                        color: '#fff',
                        border: '1px solid rgba(255,255,255,0.2)',
                        borderRadius: '4px',
                        fontFamily: 'inherit',
                        fontSize: '1rem',
                      }}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
                    {submitted && <Alert severity="success" sx={{ mb: 2 }}>Your message has been sent successfully!</Alert>}
                    <Button
                      type="submit"
                      variant="contained"
                      size="large"
                      disabled={loading}
                      sx={{
                        backgroundColor: '#ff1955',
                        '&:hover': { backgroundColor: '#e0003c' },
                      }}
                    >
                      {loading ? <CircularProgress size={24} color="inherit" /> : 'Send Message'}
                    </Button>
                  </Grid>
                </Grid>
              </form>
            </Grid>

            {/* Contact Info */}
            <Grid item xs={12} md={5}>
              <Typography variant="h4" sx={{ fontWeight: 700, mb: 4, color: '#fcd0a5' }}>
                Contact Information
              </Typography>
              <Grid container spacing={3}>
                {contactInfo.map((info, index) => (
                  <Grid item xs={12} key={index}>
                    <Card
                      sx={{
                        backgroundColor: 'rgba(255, 255, 255, 0.08)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        p: 2,
                        display: 'flex',
                        alignItems: 'center',
                      }}
                    >
                      <Box sx={{ mr: 2 }}>{info.icon}</Box>
                      <Box>
                        <Typography variant="h6" sx={{ fontWeight: 600, color: '#fcd0a5' }}>
                          {info.title}
                        </Typography>
                        <Typography variant="body1" sx={{ opacity: 0.9 }}>
                          {info.details}
                        </Typography>
                        <Typography variant="body2" sx={{ opacity: 0.7 }}>
                          {info.description}
                        </Typography>
                      </Box>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Grid>
          </Grid>
        </Container>
      </Box>
      <PublicFooter />
    </Box>
  );
};

export default Contact;
