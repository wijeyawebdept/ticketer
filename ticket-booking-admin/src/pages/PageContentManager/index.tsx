import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Tabs,
  Tab,
  TextField,
  CircularProgress,
  Alert,
  Snackbar,
  IconButton,
  Tooltip,
  Divider,
  Chip,
  ToggleButton,
  ToggleButtonGroup,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
} from '@mui/material';
import {
  Save as SaveIcon,
  Visibility as ViewIcon,
  Code as CodeIcon,
  Edit as EditIcon,
  ContentCopy as CopyIcon,
  RestartAlt as ResetIcon,
  AutoStories as TemplateIcon,
  VerticalSplit as SplitIcon,
  Check as CheckIcon,
  InfoOutlined as InfoIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
// @ts-ignore - react-quill types
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import PageContentService, { PageContentResponse } from '../../services/pageContent.service';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`tabpanel-${index}`}
      aria-labelledby={`tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: { xs: 2, md: 3 } }}>{children}</Box>}
    </div>
  );
}

const pageTypes = [
  { key: 'PRIVACY_POLICY', label: 'Privacy Policy' },
  { key: 'COOKIE_POLICY', label: 'Cookie Policy' },
  { key: 'TERMS_AND_CONDITIONS', label: 'Terms and Conditions' },
  { key: 'FAQ', label: 'FAQ' },
  { key: 'REFUND_POLICY', label: 'Refund Policy' },
  { key: 'PAYMENT_TERMS', label: 'Payment Terms & Conditions' },
];

const pageTemplates: Record<string, { title: string; content: string }> = {
  PRIVACY_POLICY: {
    title: 'Privacy Policy',
    content: `<h2>1. Introduction</h2>
<p>Welcome to Ticketer.lk. We are committed to protecting your personal information and your right to privacy. If you have any questions or concerns about our policy, or our practices regarding your personal information, please contact us.</p>

<h2>2. Information We Collect</h2>
<p>We collect personal information that you voluntarily provide to us when registering at the platform, expressing an interest in obtaining information about us or our products and services, when participating in activities on the platform, or otherwise when contacting us.</p>
<ul>
  <li><strong>Personal Identification Information:</strong> Name, email address, phone number, date of birth.</li>
  <li><strong>Payment Data:</strong> Payment instrument number, security code, and billing details necessary to process your ticket purchases securely.</li>
  <li><strong>Booking Information:</strong> Events attended, seat preferences, ticket category, purchase history.</li>
</ul>

<h2>3. How We Use Your Information</h2>
<p>We use personal information collected via our platform for a variety of business purposes described below:</p>
<ul>
  <li>To facilitate account creation and logon process.</li>
  <li>To process and fulfill ticket bookings, send booking confirmations, and e-tickets.</li>
  <li>To send administrative information such as event updates, gate changes, or cancellation alerts.</li>
  <li>To protect our platform against fraud and maintain security.</li>
</ul>

<h2>4. Data Sharing & Disclosure</h2>
<p>We only share information with your consent, to comply with laws, to provide you with services (e.g. event organizers for entry verification), to protect your rights, or to fulfill business obligations.</p>

<h2>5. Data Security & Retention</h2>
<p>We have implemented appropriate technical and organizational security measures designed to protect the security of any personal information we process. We retain personal data only as long as necessary for the purposes set out in this privacy policy.</p>

<h2>6. Contact Us</h2>
<p>If you have questions or comments about this policy, please contact our Data Protection Officer at <strong>support@ticketer.lk</strong>.</p>`,
  },
  COOKIE_POLICY: {
    title: 'Cookie Policy',
    content: `<h2>1. What Are Cookies?</h2>
<p>Cookies are small text files that are stored on your computer or mobile device when you visit a website. They allow the website to recognize your device and store some information about your preferences or past actions.</p>

<h2>2. How We Use Cookies</h2>
<p>Ticketer.lk uses cookies to enhance your browsing experience, remember your preferences, keep you signed in, and analyze website traffic.</p>

<h2>3. Types of Cookies We Use</h2>
<ul>
  <li><strong>Essential Cookies:</strong> Necessary for the website to function properly. These include authentication and session security cookies.</li>
  <li><strong>Performance & Analytics Cookies:</strong> Collect information about how visitors use our site, helping us optimize ticket booking performance.</li>
  <li><strong>Functional Cookies:</strong> Remember choices you make (such as language preference or saved events) to provide personalized features.</li>
  <li><strong>Marketing & Advertising Cookies:</strong> Track browsing habits to display relevant event promotions and deals.</li>
</ul>

<h2>4. Managing Your Cookie Preferences</h2>
<p>You can adjust your browser settings to refuse cookies or notify you when a cookie is sent. Please note that disabling essential cookies may impact the functionality of our ticket booking system.</p>`,
  },
  TERMS_AND_CONDITIONS: {
    title: 'Terms and Conditions',
    content: `<h2>1. Agreement to Terms</h2>
<p>These Terms and Conditions constitute a legally binding agreement made between you, whether personally or on behalf of an entity, and Ticketer.lk concerning your access to and use of our ticketing platform.</p>

<h2>2. Ticket Purchases & Pricing</h2>
<ul>
  <li>All ticket prices are listed in Sri Lankan Rupees (LKR) and include applicable taxes unless specified otherwise.</li>
  <li>Ticket availability is on a first-come, first-served basis. Placing tickets in a cart does not guarantee reservation until payment is completed.</li>
  <li>Discount deals and promo codes are subject to specific validity periods, quantity caps, and eligibility criteria.</li>
</ul>

<h2>3. Entry & Admission Rules</h2>
<ul>
  <li>A valid QR-code digital or printed ticket must be presented at the venue gate for scanning and verification.</li>
  <li>Each ticket is valid for one person and one entry unless specified as a group pass. Duplicate scans will be rejected.</li>
  <li>Event organizers reserve the right to refuse admission or eject attendees who violate venue policies or conduct rules.</li>
</ul>

<h2>4. Intellectual Property</h2>
<p>All content, trademarks, logos, and software on this platform are owned by or licensed to Ticketer.lk and are protected by applicable copyright laws.</p>

<h2>5. Limitation of Liability</h2>
<p>Ticketer.lk acts as a ticketing facilitator between attendees and event organizers. We are not liable for event cancellations, schedule changes, artist changes, or personal injury occurring at venue premises.</p>`,
  },
  FAQ: {
    title: 'Frequently Asked Questions (FAQ)',
    content: `<h2> Ticket Booking & Purchase</h2>
<h3>How do I purchase a ticket?</h3>
<p>Browse our events catalog, select the event you wish to attend, choose your ticket category and quantity, pick your preferred seats (if applicable), and proceed to checkout using our secure payment gateway.</p>

<h3>How do I receive my tickets?</h3>
<p>Upon successful payment, your digital ticket containing a unique QR code will be sent to your registered email address immediately. You can also access and download your tickets at any time from your <strong>My Bookings</strong> dashboard.</p>

<h2> Deals & Promo Codes</h2>
<h3>How do I apply a promo code or discount deal?</h3>
<p>During checkout, enter your promo code into the Promo Code box and click Apply. Percentage discounts and Buy X Get Y Free offers will be automatically calculated and reflected in the order total before payment.</p>

<h2> Gate Entry & Verification</h2>
<h3>How does gate verification work?</h3>
<p>Present your digital QR code on your mobile phone or a clear printout at the event entrance. Our gate staff will scan and validate your ticket using our real-time scanning system.</p>

<h2> Cancellations & Refunds</h2>
<h3>Can I get a refund if I cannot attend?</h3>
<p>Refund eligibility depends on the organizer's event policy. Please review our <a href="/refund-policy">Refund Policy</a> page or contact support at support@ticketer.lk.</p>`,
  },
  REFUND_POLICY: {
    title: 'Refund Policy',
    content: `<h2>1. Overview</h2>
<p>At Ticketer.lk, we strive to ensure a fair and transparent ticket purchasing experience. This Refund Policy outlines the terms under which ticket refunds may be issued.</p>

<h2>2. Cancelled or Postponed Events</h2>
<ul>
  <li><strong>Cancelled Events:</strong> If an event is cancelled by the organizer without a rescheduled date, ticket holders are entitled to a full refund of the ticket face value.</li>
  <li><strong>Postponed / Rescheduled Events:</strong> If an event is rescheduled, your ticket remains valid for the new date. If you cannot attend on the rescheduled date, you may request a refund within 14 days of the rescheduling announcement.</li>
</ul>

<h2>3. Customer-Initiated Refund Requests</h2>
<p>Refund requests initiated by customers due to personal circumstances are subject to the specific organizer's policy for that event:</p>
<ul>
  <li>Requests submitted more than 7 days prior to the event may be eligible for partial refund (subject to cancellation processing fees).</li>
  <li>Requests submitted within 72 hours of the event start time are non-refundable.</li>
</ul>

<h2>4. Non-Refundable Items</h2>
<p>Platform service fees, convenience fees, and payment gateway processing fees are strictly non-refundable.</p>

<h2>5. Refund Processing Timeline</h2>
<p>Approved refunds are processed back to the original payment method (Credit/Debit Card or Bank Account) within <strong>7 to 10 business days</strong> depending on your issuing bank.</p>`,
  },
  PAYMENT_TERMS: {
    title: 'Payment Terms & Conditions',
    content: `<h2>1. Accepted Payment Methods</h2>
<p>We accept a wide range of secure payment options including Visa, MasterCard, LankaPay, WebXpay, Genie, and direct online banking transfers.</p>

<h2>2. Currency & Pricing</h2>
<p>All transactions are processed in Sri Lankan Rupees (LKR). If paying with an international card, your bank may apply currency conversion rates and foreign transaction fees.</p>

<h2>3. Booking Fees & Taxes</h2>
<p>Any applicable handling fees, platform convenience charges, or government taxes are displayed transparently in the checkout summary prior to payment confirmation.</p>

<h2>4. Transaction Security</h2>
<p>All payment transactions are encrypted using industry-standard SSL (Secure Sockets Layer) 256-bit encryption and processed through PCI-DSS compliant payment gateways. Ticketer.lk does not store full credit card numbers on its servers.</p>

<h2>5. Payment Failures & Incomplete Bookings</h2>
<p>If payment deduction occurs without a confirmed booking due to network disruption, our automated reconciliation system will either complete the ticket issuance or trigger a refund within 24 to 48 hours.</p>`,
  },
};

export default function PageContentManager() {
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editorMode, setEditorMode] = useState<'visual' | 'code' | 'split'>('visual');
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [templateConfirmOpen, setTemplateConfirmOpen] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' | 'info' });
  
  const [contents, setContents] = useState<Record<string, PageContentResponse>>({});
  const [formData, setFormData] = useState<Record<string, { title: string; content: string }>>({
    PRIVACY_POLICY: { title: '', content: '' },
    COOKIE_POLICY: { title: '', content: '' },
    TERMS_AND_CONDITIONS: { title: '', content: '' },
    FAQ: { title: '', content: '' },
    REFUND_POLICY: { title: '', content: '' },
    PAYMENT_TERMS: { title: '', content: '' },
  });

  // Comprehensive Quill Toolbar Configuration
  const quillModules = {
    toolbar: [
      [{ font: [] }, { size: ['small', false, 'large', 'huge'] }],
      [{ header: [1, 2, 3, 4, 5, 6, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ color: [] }, { background: [] }],
      [{ script: 'sub' }, { script: 'super' }],
      ['blockquote', 'code-block'],
      [{ list: 'ordered' }, { list: 'bullet' }, { list: 'check' }],
      [{ indent: '-1' }, { indent: '+1' }],
      [{ direction: 'rtl' }],
      [{ align: [] }],
      ['link', 'image', 'video'],
      ['clean'],
    ],
  };

  const quillFormats = [
    'font',
    'size',
    'header',
    'bold',
    'italic',
    'underline',
    'strike',
    'color',
    'background',
    'script',
    'blockquote',
    'code-block',
    'list',
    'indent',
    'direction',
    'align',
    'link',
    'image',
    'video',
    'clean',
  ];

  // Load all page contents
  useEffect(() => {
    loadAllPageContents();
  }, []);

  const loadAllPageContents = async () => {
    setLoading(true);
    try {
      const allContents: Record<string, PageContentResponse> = {};
      
      for (const page of pageTypes) {
        try {
          const content = await PageContentService.getPageContent(page.key);
          allContents[page.key] = content;
          setFormData(prev => ({
            ...prev,
            [page.key]: {
              title: content.title || page.label,
              content: content.content || '',
            }
          }));
        } catch (error) {
          // If page doesn't exist yet, initialize with default title
          setFormData(prev => ({
            ...prev,
            [page.key]: {
              title: page.label,
              content: '',
            }
          }));
        }
      }
      
      setContents(allContents);
    } catch (error) {
      setSnackbar({
        open: true,
        message: 'Error loading page contents',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleFormChange = (pageType: string, field: 'title' | 'content', value: string) => {
    setFormData(prev => ({
      ...prev,
      [pageType]: {
        ...prev[pageType],
        [field]: value
      }
    }));
  };

  const handleSave = async () => {
    const currentPageType = pageTypes[tabValue].key;
    const data = formData[currentPageType];

    if (!data.title.trim()) {
      setSnackbar({
        open: true,
        message: 'Title is required',
        severity: 'error'
      });
      return;
    }

    if (!data.content.trim()) {
      setSnackbar({
        open: true,
        message: 'Content is required',
        severity: 'error'
      });
      return;
    }

    setSaving(true);
    try {
      await PageContentService.updatePageContent(
        currentPageType,
        data.title,
        data.content
      );

      setSnackbar({
        open: true,
        message: `${pageTypes[tabValue].label} updated successfully`,
        severity: 'success'
      });

      // Reload to get updated data
      loadAllPageContents();
    } catch (error) {
      setSnackbar({
        open: true,
        message: 'Error saving page content',
        severity: 'error'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleApplyTemplate = () => {
    const currentKey = pageTypes[tabValue].key;
    const tpl = pageTemplates[currentKey];
    if (tpl) {
      setFormData(prev => ({
        ...prev,
        [currentKey]: {
          title: tpl.title,
          content: tpl.content,
        }
      }));
      setSnackbar({
        open: true,
        message: `Loaded standard template for ${pageTypes[tabValue].label}`,
        severity: 'info',
      });
    }
    setTemplateConfirmOpen(false);
  };

  const handleCopyHtml = () => {
    const currentKey = pageTypes[tabValue].key;
    const content = formData[currentKey]?.content || '';
    navigator.clipboard.writeText(content);
    setSnackbar({
      open: true,
      message: 'HTML content copied to clipboard!',
      severity: 'success',
    });
  };

  const handleReset = () => {
    const currentKey = pageTypes[tabValue].key;
    const original = contents[currentKey];
    if (original) {
      setFormData(prev => ({
        ...prev,
        [currentKey]: {
          title: original.title,
          content: original.content,
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [currentKey]: {
          title: pageTypes[tabValue].label,
          content: '',
        }
      }));
    }
    setSnackbar({
      open: true,
      message: 'Reverted back to last saved version',
      severity: 'info',
    });
  };

  const getStats = (htmlContent: string) => {
    const text = htmlContent.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    const words = text ? text.split(' ').length : 0;
    const characters = text.length;
    const readingTime = Math.ceil(words / 200);
    return { words, characters, readingTime };
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress />
      </Box>
    );
  }

  const currentKey = pageTypes[tabValue].key;
  const currentContent = formData[currentKey]?.content || '';
  const currentTitle = formData[currentKey]?.title || '';
  const stats = getStats(currentContent);

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, flexDirection: { xs: 'column', sm: 'row' }, mb: 3, gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, color: '#1e293b' }}>
            Page Content Manager
          </Typography>
          <Typography variant="body2" color="textSecondary" sx={{ mt: 0.5 }}>
            Manage Privacy Policy, Cookie Policy, Terms and Conditions, FAQ, and Refund Policy
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
          <Button
            variant="outlined"
            startIcon={<ViewIcon />}
            onClick={() => setPreviewModalOpen(true)}
            sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2 }}
          >
            Live Preview
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={handleSave}
            disabled={saving}
            startIcon={saving ? <CircularProgress size={18} color="inherit" /> : <SaveIcon />}
            sx={{ textTransform: 'none', fontWeight: 700, px: 3, borderRadius: 2, boxShadow: '0 4px 12px rgba(25, 118, 210, 0.25)' }}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </Box>
      </Box>

      <Paper sx={{ borderRadius: 2, boxShadow: '0 2px 10px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
        {/* Navigation Tabs */}
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          aria-label="page content tabs"
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
          sx={{
            borderBottom: 1,
            borderColor: 'divider',
            backgroundColor: '#f8fafc',
            '& .MuiTab-root': {
              fontWeight: 700,
              fontSize: { xs: '0.82rem', sm: '0.9rem' },
              minWidth: 'auto',
              px: { xs: 1.5, sm: 2.5 },
              py: 2,
              textTransform: 'none',
              transition: 'all 0.2s',
              '&.Mui-selected': {
                color: '#1976d2',
                backgroundColor: '#ffffff',
              }
            }
          }}
        >
          {pageTypes.map((page, index) => (
            <Tab
              key={page.key}
              label={page.label}
              id={`tab-${index}`}
              aria-controls={`tabpanel-${index}`}
            />
          ))}
        </Tabs>

        {pageTypes.map((page, index) => (
          <TabPanel key={page.key} value={tabValue} index={index}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              {/* Top Meta Bar */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2, p: 2, backgroundColor: '#f8fafc', borderRadius: 2, border: '1px solid #e2e8f0' }}>
                <Box sx={{ flex: 1, minWidth: '260px' }}>
                  <TextField
                    label="Public Page Title"
                    fullWidth
                    size="small"
                    value={formData[page.key]?.title || ''}
                    onChange={(e) => handleFormChange(page.key, 'title', e.target.value)}
                    disabled={saving}
                    placeholder={`e.g. ${page.label}`}
                  />
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                  {/* View Mode Toggle */}
                  <ToggleButtonGroup
                    value={editorMode}
                    exclusive
                    onChange={(_, val) => { if (val) setEditorMode(val); }}
                    size="small"
                  >
                    <ToggleButton value="visual" title="Visual Rich Text Editor">
                      <EditIcon fontSize="small" sx={{ mr: 0.5 }} /> Visual
                    </ToggleButton>
                    <ToggleButton value="code" title="HTML Source Code Editor">
                      <CodeIcon fontSize="small" sx={{ mr: 0.5 }} /> HTML Code
                    </ToggleButton>
                    <ToggleButton value="split" title="Side-by-Side Split View">
                      <SplitIcon fontSize="small" sx={{ mr: 0.5 }} /> Split View
                    </ToggleButton>
                  </ToggleButtonGroup>

                  <Tooltip title="Load Standard Template">
                    <Button
                      variant="outlined"
                      size="small"
                      color="secondary"
                      startIcon={<TemplateIcon />}
                      onClick={() => setTemplateConfirmOpen(true)}
                      sx={{ textTransform: 'none', fontWeight: 600 }}
                    >
                      Template
                    </Button>
                  </Tooltip>

                  <Tooltip title="Copy HTML Code">
                    <IconButton size="small" onClick={handleCopyHtml} sx={{ border: '1px solid #cbd5e1' }}>
                      <CopyIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>

                  <Tooltip title="Reset to Last Saved Version">
                    <IconButton size="small" onClick={handleReset} sx={{ border: '1px solid #cbd5e1' }}>
                      <ResetIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>

              {/* Word / Stats Counter */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                <Chip label={`${stats.words} Words`} size="small" variant="outlined" sx={{ fontWeight: 600 }} />
                <Chip label={`${stats.characters} Characters`} size="small" variant="outlined" sx={{ fontWeight: 600 }} />
                <Chip label={`~${stats.readingTime} min read`} size="small" variant="outlined" sx={{ fontWeight: 600 }} />
                {contents[page.key]?.updatedAt && (
                  <Typography variant="caption" color="textSecondary" sx={{ ml: 'auto' }}>
                    Last saved: {new Date(contents[page.key]?.updatedAt || '').toLocaleString()} by {contents[page.key]?.updatedBy || 'Admin'}
                  </Typography>
                )}
              </Box>

              {/* Editor / Code / Split Container */}
              <Box sx={{ mt: 1 }}>
                {editorMode === 'visual' && (
                  <Box
                    sx={{
                      border: '1px solid #cbd5e1',
                      borderRadius: '8px',
                      backgroundColor: '#fff',
                      overflow: 'hidden',
                      '& .ql-toolbar': {
                        borderTop: 'none',
                        borderLeft: 'none',
                        borderRight: 'none',
                        borderBottom: '1px solid #cbd5e1',
                        backgroundColor: '#f8fafc',
                        p: 1.5,
                      },
                      '& .ql-container': {
                        minHeight: '450px',
                        fontSize: '15px',
                        fontFamily: 'inherit',
                        border: 'none',
                      },
                      '& .ql-editor': {
                        minHeight: '450px',
                        p: 2.5,
                        '& h1, & h2, & h3, & h4': {
                          color: '#0f172a',
                          fontWeight: 700,
                          mt: 1.5,
                          mb: 1,
                        },
                        '& p': {
                          lineHeight: 1.7,
                          color: '#334155',
                          mb: 1.5,
                        },
                        '& ul, & ol': {
                          pl: 3,
                          mb: 1.5,
                          '& li': {
                            mb: 0.5,
                            color: '#334155',
                          },
                        },
                      },
                      opacity: saving ? 0.6 : 1,
                      pointerEvents: saving ? 'none' : 'auto',
                    }}
                  >
                    <ReactQuill
                      value={formData[page.key]?.content || ''}
                      onChange={(value: string) => handleFormChange(page.key, 'content', value)}
                      placeholder={`Enter ${page.label} content here... You can use headings, lists, tables, text styling, colors, and media.`}
                      modules={quillModules}
                      formats={quillFormats}
                    />
                  </Box>
                )}

                {editorMode === 'code' && (
                  <Box sx={{ border: '1px solid #cbd5e1', borderRadius: '8px', overflow: 'hidden' }}>
                    <Box sx={{ p: 1.5, backgroundColor: '#0f172a', color: '#94a3b8', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="caption" fontWeight={700} sx={{ color: '#e2e8f0', letterSpacing: 0.5 }}>
                        HTML SOURCE CODE EDITOR
                      </Typography>
                      <Typography variant="caption">Direct HTML markup</Typography>
                    </Box>
                    <TextField
                      fullWidth
                      multiline
                      rows={18}
                      value={formData[page.key]?.content || ''}
                      onChange={(e) => handleFormChange(page.key, 'content', e.target.value)}
                      disabled={saving}
                      sx={{
                        backgroundColor: '#1e293b',
                        '& .MuiInputBase-root': {
                          color: '#f8fafc',
                          fontFamily: 'Consolas, Monaco, "Courier New", monospace',
                          fontSize: '13.5px',
                          p: 2,
                        },
                      }}
                    />
                  </Box>
                )}

                {editorMode === 'split' && (
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1, color: '#475569' }}>
                        Visual Editor
                      </Typography>
                      <Box
                        sx={{
                          border: '1px solid #cbd5e1',
                          borderRadius: '8px',
                          backgroundColor: '#fff',
                          overflow: 'hidden',
                          '& .ql-toolbar': {
                            borderTop: 'none',
                            borderLeft: 'none',
                            borderRight: 'none',
                            borderBottom: '1px solid #cbd5e1',
                            backgroundColor: '#f8fafc',
                          },
                          '& .ql-container': {
                            minHeight: '420px',
                            border: 'none',
                          },
                          '& .ql-editor': {
                            minHeight: '420px',
                          },
                        }}
                      >
                        <ReactQuill
                          value={formData[page.key]?.content || ''}
                          onChange={(value: string) => handleFormChange(page.key, 'content', value)}
                          placeholder="Type content..."
                          modules={quillModules}
                          formats={quillFormats}
                        />
                      </Box>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1, color: '#475569' }}>
                        Live Rendered Preview
                      </Typography>
                      <Box
                        sx={{
                          border: '1px solid #cbd5e1',
                          borderRadius: '8px',
                          backgroundColor: '#f8fafc',
                          p: 3,
                          minHeight: '480px',
                          maxHeight: '560px',
                          overflowY: 'auto',
                          '& h1, & h2, & h3, & h4': {
                            color: '#0f172a',
                            fontWeight: 700,
                            mt: 1.5,
                            mb: 1,
                          },
                          '& p': {
                            lineHeight: 1.7,
                            color: '#334155',
                            mb: 1.5,
                          },
                          '& ul, & ol': {
                            pl: 3,
                            mb: 1.5,
                          },
                        }}
                      >
                        <Typography variant="h5" fontWeight={800} sx={{ mb: 2, color: '#1e293b' }}>
                          {formData[page.key]?.title || page.label}
                        </Typography>
                        <Divider sx={{ mb: 2 }} />
                        <div
                          dangerouslySetInnerHTML={{
                            __html: formData[page.key]?.content || '<p style="color:#94a3b8">No content entered yet.</p>',
                          }}
                        />
                      </Box>
                    </Grid>
                  </Grid>
                )}
              </Box>

              {/* Bottom Actions */}
              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'space-between', alignItems: 'center', pt: 1 }}>
                <Button
                  variant="outlined"
                  color="inherit"
                  startIcon={<ResetIcon />}
                  onClick={handleReset}
                  size="small"
                >
                  Discard Changes
                </Button>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleSave}
                  disabled={saving}
                  startIcon={saving ? <CircularProgress size={18} color="inherit" /> : <SaveIcon />}
                  sx={{ textTransform: 'none', fontWeight: 700, px: 3, borderRadius: 2 }}
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </Box>
            </Box>
          </TabPanel>
        ))}
      </Paper>

      {/* Live Preview Modal */}
      <Dialog
        open={previewModalOpen}
        onClose={() => setPreviewModalOpen(false)}
        maxWidth="md"
        fullWidth
        scroll="paper"
      >
        <DialogTitle sx={{ fontWeight: 700, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ViewIcon color="primary" />
            <Typography variant="h6" fontWeight={700}>
              Public Page Preview: {currentTitle || pageTypes[tabValue].label}
            </Typography>
          </Box>
          <IconButton size="small" onClick={() => setPreviewModalOpen(false)}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: { xs: 2.5, md: 4 } }}>
          <Box sx={{ maxWidth: '800px', mx: 'auto' }}>
            <Typography variant="h4" fontWeight={800} sx={{ color: '#0f172a', mb: 1 }}>
              {currentTitle || pageTypes[tabValue].label}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 3 }}>
              Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
            </Typography>
            <Divider sx={{ mb: 3 }} />
            <Box
              sx={{
                '& h1, & h2, & h3, & h4': {
                  color: '#0f172a',
                  fontWeight: 700,
                  mt: 2.5,
                  mb: 1,
                },
                '& p': {
                  lineHeight: 1.8,
                  color: '#334155',
                  fontSize: '15.5px',
                  mb: 1.8,
                },
                '& ul, & ol': {
                  pl: 3,
                  mb: 2,
                  '& li': {
                    mb: 0.8,
                    color: '#334155',
                    fontSize: '15px',
                  },
                },
                '& a': {
                  color: '#1976d2',
                  textDecoration: 'underline',
                },
                '& blockquote': {
                  borderLeft: '4px solid #1976d2',
                  pl: 2,
                  py: 0.5,
                  my: 2,
                  backgroundColor: '#f1f5f9',
                  fontStyle: 'italic',
                },
              }}
              dangerouslySetInnerHTML={{
                __html: currentContent || '<p style="color:#94a3b8; text-align:center; padding: 40px 0;">No content entered yet.</p>',
              }}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2, borderTop: '1px solid #e2e8f0' }}>
          <Button onClick={() => setPreviewModalOpen(false)} variant="contained" color="inherit">
            Close Preview
          </Button>
        </DialogActions>
      </Dialog>

      {/* Template Confirmation Dialog */}
      <Dialog
        open={templateConfirmOpen}
        onClose={() => setTemplateConfirmOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
          <InfoIcon color="secondary" />
          Load Standard Template?
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="textSecondary">
            Loading the standard template will replace the current editor content for <strong>{pageTypes[tabValue].label}</strong> with a professionally drafted starting template.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setTemplateConfirmOpen(false)} color="inherit">
            Cancel
          </Button>
          <Button onClick={handleApplyTemplate} variant="contained" color="secondary" startIcon={<CheckIcon />}>
            Load Template
          </Button>
        </DialogActions>
      </Dialog>

      {/* Toast Feedback */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={5000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
