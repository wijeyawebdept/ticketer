import React from 'react';
import { Box, Container, Typography } from '@mui/material';
import PublicNavbar from '../../../components/public/PublicNavbar';
import PublicFooter from '../../../components/public/PublicFooter';

const TermsAndConditions: React.FC = () => {
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
          Terms and Conditions
        </Typography>

        <Box sx={{ color: '#cbd5e1', fontFamily: 'Raleway, sans-serif', lineHeight: 1.8 }}>
          <Typography variant="h6" sx={{ color: '#fcd0a5', mb: 2, fontWeight: 600 }}>
            1. Agreement to Terms
          </Typography>
          <Typography paragraph>
            By accessing and using this website and services provided by Ticketer.lk, you accept and agree to be bound by and comply with these terms and conditions. If you do not agree to abide by the above, please do not use this service.
          </Typography>

          <Typography variant="h6" sx={{ color: '#fcd0a5', mb: 2, fontWeight: 600, mt: 4 }}>
            2. Use License
          </Typography>
          <Typography paragraph>
            Permission is granted to temporarily download one copy of the materials (information or software) on Ticketer.lk for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title, and under this license you may not:
          </Typography>
          <Box component="ul" sx={{ pl: 2, mb: 2 }}>
            <li>Modify or copy the materials</li>
            <li>Use the materials for any commercial purpose or for any public display</li>
            <li>Attempt to decompile or reverse engineer any software contained on Ticketer.lk</li>
            <li>Remove any copyright or other proprietary notations from the materials</li>
            <li>Transfer the materials to another person or "mirror" the materials on any other server</li>
          </Box>

          <Typography variant="h6" sx={{ color: '#fcd0a5', mb: 2, fontWeight: 600, mt: 4 }}>
            3. Disclaimer
          </Typography>
          <Typography paragraph>
            The materials on Ticketer.lk are provided on an 'as is' basis. Ticketer.lk makes no warranties, expressed or implied, and hereby disclaims and negates all other warranties including, without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights.
          </Typography>

          <Typography variant="h6" sx={{ color: '#fcd0a5', mb: 2, fontWeight: 600, mt: 4 }}>
            4. Limitations
          </Typography>
          <Typography paragraph>
            In no event shall Ticketer.lk or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the materials on Ticketer.lk, even if we or our authorized representative has been notified orally or in writing of the possibility of such damage.
          </Typography>

          <Typography variant="h6" sx={{ color: '#fcd0a5', mb: 2, fontWeight: 600, mt: 4 }}>
            5. Accuracy of Materials
          </Typography>
          <Typography paragraph>
            The materials appearing on Ticketer.lk could include technical, typographical, or photographic errors. Ticketer.lk does not warrant that any of the materials on this website are accurate, complete, or current. Ticketer.lk may make changes to the materials contained on its website at any time without notice.
          </Typography>

          <Typography variant="h6" sx={{ color: '#fcd0a5', mb: 2, fontWeight: 600, mt: 4 }}>
            6. Links
          </Typography>
          <Typography paragraph>
            Ticketer.lk has not reviewed all of the sites linked to its website and is not responsible for the contents of any such linked site. The inclusion of any link does not imply endorsement by Ticketer.lk of the site. Use of any such linked website is at the user's own risk.
          </Typography>

          <Typography variant="h6" sx={{ color: '#fcd0a5', mb: 2, fontWeight: 600, mt: 4 }}>
            7. Modifications
          </Typography>
          <Typography paragraph>
            Ticketer.lk may revise these terms of service for its website at any time without notice. By using this website, you are agreeing to be bound by the then current version of these terms of service.
          </Typography>

          <Typography variant="h6" sx={{ color: '#fcd0a5', mb: 2, fontWeight: 600, mt: 4 }}>
            8. Governing Law
          </Typography>
          <Typography paragraph>
            These terms and conditions are governed by and construed in accordance with the laws of Sri Lanka, and you irrevocably submit to the exclusive jurisdiction of the courts in that location.
          </Typography>

          <Typography variant="h6" sx={{ color: '#fcd0a5', mb: 2, fontWeight: 600, mt: 4 }}>
            9. User Accounts
          </Typography>
          <Typography paragraph>
            When you create an account with Ticketer.lk, you must provide accurate, complete, and current information. You are responsible for maintaining the confidentiality of your account password and for all activities that occur under your account. You agree to notify us immediately of any unauthorized use of your account.
          </Typography>

          <Typography variant="h6" sx={{ color: '#fcd0a5', mb: 2, fontWeight: 600, mt: 4 }}>
            10. Refund Policy
          </Typography>
          <Typography paragraph>
            Ticket purchases are generally non-refundable. However, under certain circumstances such as event cancellation or postponement, refunds may be processed according to our Refund Policy. Please contact our support team for more information.
          </Typography>

          <Typography variant="h6" sx={{ color: '#fcd0a5', mb: 2, fontWeight: 600, mt: 4 }}>
            Contact Us
          </Typography>
          <Typography paragraph>
            If you have any questions about these Terms and Conditions, please contact us at:
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

export default TermsAndConditions;
