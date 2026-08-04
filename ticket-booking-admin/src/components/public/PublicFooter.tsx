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
  ConfirmationNumber as TicketIcon,
} from '@mui/icons-material';
import { FaTiktok } from 'react-icons/fa';

const PublicFooter: React.FC = () => {
  const socialLinks = [
    { icon: <Facebook sx={{ fontSize: { xs: 15, md: 20 } }} />, href: '#' },
    { icon: <Instagram sx={{ fontSize: { xs: 15, md: 20 } }} />, href: '#' },
    { icon: <Twitter sx={{ fontSize: { xs: 15, md: 20 } }} />, href: '#' },
    { icon: <LinkedIn sx={{ fontSize: { xs: 15, md: 20 } }} />, href: '#' },
    { icon: FaTiktok({ size: 15 }), href: '#' },
    { icon: <YouTube sx={{ fontSize: { xs: 15, md: 20 } }} />, href: '#' },
    { icon: <WhatsApp sx={{ fontSize: { xs: 15, md: 20 } }} />, href: '#' },
  ];

  return (
    <Box>
      {/* Footer Top */}
      <Box sx={{ backgroundColor: '#242a33', color: '#cbd5e1', py: { xs: 3, md: 6 }, borderTop: '2px solid #ff1955' }}>
        <Container maxWidth="lg">
          <Grid container spacing={{ xs: 2.5, md: 4 }}>
            {/* Column 1: About */}
            <Grid item xs={12} md={4}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
                <TicketIcon sx={{ color: '#ff1955', fontSize: { xs: '1.4rem', md: '1.75rem' }, transform: 'rotate(-10deg)', mr: 1 }} />
                <Typography variant="h5" sx={{ color: '#fcd0a5', fontWeight: 700, fontFamily: 'Raleway, sans-serif', fontSize: { xs: '1.15rem', md: '1.5rem' } }}>
                  Ticketer<span style={{ color: '#ff1955' }}>.lk</span>
                </Typography>
              </Box>
              <Typography variant="body2" sx={{ mb: 2, lineHeight: 1.6, fontFamily: 'Raleway, sans-serif', fontSize: { xs: '0.8rem', md: '0.875rem' } }}>
                Experience Sri Lanka's vibrant entertainment scene with Ticketer.lk. Browse thousands of events, secure your tickets instantly, and never miss out on the moments that matter most.
              </Typography>

              {/* Social Media Icons */}
              <Box sx={{ display: 'flex', gap: { xs: 0.5, md: 1 }, mb: 2, flexWrap: 'wrap' }}>
                {socialLinks.map((social, index) => (
                  <IconButton
                    key={index}
                    href={social.href}
                    size="small"
                    sx={{
                      color: '#fff',
                      width: { xs: 28, md: 36 },
                      height: { xs: 28, md: 36 },
                      backgroundColor: 'rgba(255,255,255,0.1)',
                      '&:hover': { backgroundColor: 'rgba(255,255,255,0.2)' },
                    }}
                  >
                    {social.icon}
                  </IconButton>
                ))}
              </Box>

              {/* Payment Methods */}
              <Box sx={{ display: 'flex', gap: { xs: 1, md: 2 }, alignItems: 'center', flexWrap: 'wrap' }}>
                <img src="/images/visa.jpg" alt="Visa" style={{ height: '18px', width: 'auto', maxHeight: '18px', objectFit: 'contain' }} />
                <img src="/images/master.jpg" alt="Mastercard" style={{ height: '18px', width: 'auto', maxHeight: '18px', objectFit: 'contain' }} />
                <img src="/images/koko.jpeg" alt="Koko" style={{ height: '18px', width: 'auto', maxHeight: '18px', objectFit: 'contain' }} />
              </Box>
            </Grid>

            {/* Column 2: Helpful Links */}
            <Grid item xs={6} md={2}>
              <Typography variant="h6" sx={{ color: '#fcd0a5', fontWeight: 600, mb: { xs: 1, md: 2 }, fontFamily: 'Raleway, sans-serif', fontSize: { xs: '0.95rem', md: '1.15rem' } }}>
                Helpful Links
              </Typography>
              <Link href="/events" display="block" color="inherit" sx={{ mb: 0.8, textDecoration: 'none', fontFamily: 'Raleway, sans-serif', fontSize: { xs: '0.78rem', md: '0.88rem' }, '&:hover': { color: '#fff' } }}>Events</Link>
              <Link href="/deals" display="block" color="inherit" sx={{ mb: 0.8, textDecoration: 'none', fontFamily: 'Raleway, sans-serif', fontSize: { xs: '0.78rem', md: '0.88rem' }, '&:hover': { color: '#fff' } }}>Ticketer Deals</Link>
              <Link href="/profile" display="block" color="inherit" sx={{ mb: 0.8, textDecoration: 'none', fontFamily: 'Raleway, sans-serif', fontSize: { xs: '0.78rem', md: '0.88rem' }, '&:hover': { color: '#fff' } }}>My Account</Link>
              <Link href="/refund-policy" display="block" color="inherit" sx={{ mb: 0.8, textDecoration: 'none', fontFamily: 'Raleway, sans-serif', fontSize: { xs: '0.78rem', md: '0.88rem' }, '&:hover': { color: '#fff' } }}>Refund Policy</Link>
            </Grid>

            {/* Column 3: About Us */}
            <Grid item xs={6} md={2}>
              <Typography variant="h6" sx={{ color: '#fcd0a5', fontWeight: 600, mb: { xs: 1, md: 2 }, fontFamily: 'Raleway, sans-serif', fontSize: { xs: '0.95rem', md: '1.15rem' } }}>
                About Us
              </Typography>
              <Link href="/about" display="block" color="inherit" sx={{ mb: 0.8, textDecoration: 'none', fontFamily: 'Raleway, sans-serif', fontSize: { xs: '0.78rem', md: '0.88rem' }, '&:hover': { color: '#fff' } }}>Who We Are</Link>
              <Link href="/faq" display="block" color="inherit" sx={{ mb: 0.8, textDecoration: 'none', fontFamily: 'Raleway, sans-serif', fontSize: { xs: '0.78rem', md: '0.88rem' }, '&:hover': { color: '#fff' } }}>FAQ</Link>
              <Link href="/contact" display="block" color="inherit" sx={{ mb: 0.8, textDecoration: 'none', fontFamily: 'Raleway, sans-serif', fontSize: { xs: '0.78rem', md: '0.88rem' }, '&:hover': { color: '#fff' } }}>Contact Us</Link>
            </Grid>

            {/* Column 4: Contact */}
            <Grid item xs={12} md={4}>
              <Typography variant="h6" sx={{ color: '#fcd0a5', fontWeight: 600, mb: { xs: 1, md: 2 }, fontFamily: 'Raleway, sans-serif', fontSize: { xs: '0.95rem', md: '1.15rem' } }}>
                Contact
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <WhatsApp sx={{ mr: 1, color: '#fff', fontSize: { xs: 16, md: 20 } }} />
                <Typography variant="body2" sx={{ fontFamily: 'Raleway, sans-serif', fontSize: { xs: '0.78rem', md: '0.88rem' } }}>WhatsApp (Text-only service)</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <MailOutline sx={{ mr: 1, color: '#fff', fontSize: { xs: 16, md: 20 } }} />
                <Link href="mailto:support@ticketer.lk" color="inherit" sx={{ textDecoration: 'none', fontFamily: 'Raleway, sans-serif', fontSize: { xs: '0.78rem', md: '0.88rem' }, '&:hover': { color: '#fff' } }}>
                  support@ticketer.lk
                </Link>
              </Box>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Footer Bottom */}
      <Box sx={{ backgroundColor: '#1a1f27', color: '#cbd5e1', py: { xs: 1.5, md: 3 }, borderTop: '1px solid rgba(255, 25, 85, 0.3)' }}>
        <Container maxWidth="lg">
          <Grid container justifyContent="space-between" alignItems="center" gap={{ xs: 1, md: 0 }}>
            <Grid item sx={{ display: 'flex', gap: 0.8, alignItems: 'center', flexWrap: 'wrap' }}>
              <Link href="/privacy-policy" color="inherit" sx={{ textDecoration: 'none', fontFamily: 'Raleway, sans-serif', fontSize: { xs: '0.72rem', md: '0.85rem' }, '&:hover': { color: '#fff' } }}>Privacy Policy</Link>
              <Typography sx={{ color: '#cbd5e1', fontSize: { xs: '0.72rem', md: '0.85rem' } }}>|</Typography>
              <Link href="/cookie-policy" color="inherit" sx={{ textDecoration: 'none', fontFamily: 'Raleway, sans-serif', fontSize: { xs: '0.72rem', md: '0.85rem' }, '&:hover': { color: '#fff' } }}>Cookie Policy</Link>
              <Typography sx={{ color: '#cbd5e1', fontSize: { xs: '0.72rem', md: '0.85rem' } }}>|</Typography>
              <Link href="/terms-and-conditions" color="inherit" sx={{ textDecoration: 'none', fontFamily: 'Raleway, sans-serif', fontSize: { xs: '0.72rem', md: '0.85rem' }, '&:hover': { color: '#fff' } }}>Terms & Conditions</Link>
            </Grid>
            <Grid item>
              <Typography variant="body2" sx={{ fontFamily: 'Raleway, sans-serif', fontSize: { xs: '0.72rem', md: '0.85rem' } }}>
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
