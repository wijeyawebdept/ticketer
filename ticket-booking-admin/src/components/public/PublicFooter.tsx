import React from 'react';
import { Box, Container, Grid, Typography, Link, IconButton } from '@mui/material';
import {
  Facebook,
  Instagram,
  Twitter,
  LinkedIn,
  YouTube,
  WhatsApp,
  MailOutline,
} from '@mui/icons-material';
import { FaTiktok } from 'react-icons/fa';

const PublicFooter: React.FC = () => {
  const socialLinks = [
    { icon: <Facebook />, href: '#' },
    { icon: <Instagram />, href: '#' },
    { icon: <Twitter />, href: '#' },
    { icon: <LinkedIn />, href: '#' },
    { icon: FaTiktok({ size: 20 }), href: '#' },
    { icon: <YouTube />, href: '#' },
    { icon: <WhatsApp />, href: '#' },
  ];

  return (
    <Box>
      {/* Footer Top */}
      <Box sx={{ backgroundColor: '#242a33', color: '#cbd5e1', py: 6, borderTop: '2px solid #ff1955' }}>
        <Container maxWidth="lg">
          <Grid container spacing={4}>
            {/* Column 1: About */}
            <Grid item xs={12} md={4}>
              <Typography variant="h5" sx={{ color: '#fcd0a5', fontWeight: 700, mb: 2, fontFamily: 'Raleway, sans-serif' }}>
                Ticketer<span style={{ color: '#ff1955' }}>.lk</span>
              </Typography>
              <Typography variant="body2" sx={{ mb: 2, lineHeight: 1.7, fontFamily: 'Raleway, sans-serif' }}>
                Experience Sri Lanka's vibrant entertainment scene with Ticketer.lk. Browse thousands of events, secure your tickets instantly, and never miss out on the moments that matter most.
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                {socialLinks.map((social, index) => (
                  <IconButton
                    key={index}
                    href={social.href}
                    sx={{
                      color: '#fff',
                      backgroundColor: 'rgba(255,255,255,0.1)',
                      '&:hover': { backgroundColor: 'rgba(255,255,255,0.2)' },
                    }}
                  >
                    {social.icon}
                  </IconButton>
                ))}
              </Box>
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                <img src="/images/visa.jpg" alt="Visa" height="24" />
                <img src="/images/master.jpg" alt="Mastercard" height="24" />
                <img src="/images/koko.jpeg" alt="Koko" height="24" />
              </Box>
            </Grid>

            {/* Column 2: Helpful Links */}
            <Grid item xs={6} md={2}>
              <Typography variant="h6" sx={{ color: '#fcd0a5', fontWeight: 600, mb: 2, fontFamily: 'Raleway, sans-serif' }}>
                Helpful Links
              </Typography>
              <Link href="/events" display="block" color="inherit" sx={{ mb: 1, textDecoration: 'none', fontFamily: 'Raleway, sans-serif', '&:hover': { color: '#fff' } }}>Events</Link>
              <Link href="/events" display="block" color="inherit" sx={{ mb: 1, textDecoration: 'none', fontFamily: 'Raleway, sans-serif', '&:hover': { color: '#fff' } }}>Ticketer Deals</Link>
              <Link href="/profile" display="block" color="inherit" sx={{ mb: 1, textDecoration: 'none', fontFamily: 'Raleway, sans-serif', '&:hover': { color: '#fff' } }}>My Account</Link>
              <Link href="/" display="block" color="inherit" sx={{ mb: 1, textDecoration: 'none', fontFamily: 'Raleway, sans-serif', '&:hover': { color: '#fff' } }}>Refund Policy</Link>
            </Grid>

            {/* Column 3: About Us */}
            <Grid item xs={6} md={2}>
              <Typography variant="h6" sx={{ color: '#fcd0a5', fontWeight: 600, mb: 2, fontFamily: 'Raleway, sans-serif' }}>
                About Us
              </Typography>
              <Link href="/about" display="block" color="inherit" sx={{ mb: 1, textDecoration: 'none', fontFamily: 'Raleway, sans-serif', '&:hover': { color: '#fff' } }}>Who We Are</Link>
              <Link href="/faq" display="block" color="inherit" sx={{ mb: 1, textDecoration: 'none', fontFamily: 'Raleway, sans-serif', '&:hover': { color: '#fff' } }}>FAQ</Link>
              <Link href="/contact" display="block" color="inherit" sx={{ mb: 1, textDecoration: 'none', fontFamily: 'Raleway, sans-serif', '&:hover': { color: '#fff' } }}>Contact Us</Link>
            </Grid>

            {/* Column 4: Contact */}
            <Grid item xs={12} md={4}>
              <Typography variant="h6" sx={{ color: '#fcd0a5', fontWeight: 600, mb: 2, fontFamily: 'Raleway, sans-serif' }}>
                Contact
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <WhatsApp sx={{ mr: 1, color: '#fff' }} />
                <Typography variant="body2" sx={{ fontFamily: 'Raleway, sans-serif' }}>WhatsApp (Text-only service)</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <MailOutline sx={{ mr: 1, color: '#fff' }} />
                <Link href="mailto:support@ticketer.lk" color="inherit" sx={{ textDecoration: 'none', fontFamily: 'Raleway, sans-serif', '&:hover': { color: '#fff' } }}>
                  support@ticketer.lk
                </Link>
              </Box>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Footer Bottom */}
      <Box sx={{ backgroundColor: '#1a1f27', color: '#cbd5e1', py: 3, borderTop: '1px solid rgba(255, 25, 85, 0.3)' }}>
        <Container maxWidth="lg">
          <Grid container justifyContent="space-between" alignItems="center">
            <Grid item sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
              <Link href="/privacy-policy" color="inherit" sx={{ textDecoration: 'none', fontFamily: 'Raleway, sans-serif', '&:hover': { color: '#fff' } }}>Privacy Policy</Link>
              <Typography sx={{ color: '#cbd5e1' }}>|</Typography>
              <Link href="/cookie-policy" color="inherit" sx={{ textDecoration: 'none', fontFamily: 'Raleway, sans-serif', '&:hover': { color: '#fff' } }}>Cookie Policy</Link>
              <Typography sx={{ color: '#cbd5e1' }}>|</Typography>
              <Link href="/terms-and-conditions" color="inherit" sx={{ textDecoration: 'none', fontFamily: 'Raleway, sans-serif', '&:hover': { color: '#fff' } }}>Terms and Conditions</Link>
            </Grid>
            <Grid item>
              <Typography variant="body2" sx={{ fontFamily: 'Raleway, sans-serif' }}>
                Copyright 2026 © Ticketer.lk All Rights Reserved
              </Typography>
            </Grid>
          </Grid>
        </Container>
      </Box>
    </Box>
  );
};

export default PublicFooter;
