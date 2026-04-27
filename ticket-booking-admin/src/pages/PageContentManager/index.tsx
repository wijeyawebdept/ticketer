import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Button,
  Tabs,
  Tab,
  TextField,
  CircularProgress,
  Alert,
  Snackbar,
} from '@mui/material';
import { Save as SaveIcon } from '@mui/icons-material';
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
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const pageTypes = [
  { key: 'PRIVACY_POLICY', label: 'Privacy Policy' },
  { key: 'COOKIE_POLICY', label: 'Cookie Policy' },
  { key: 'TERMS_AND_CONDITIONS', label: 'Terms and Conditions' },
  { key: 'FAQ', label: 'FAQ' },
];

export default function PageContentManager() {
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  
  const [contents, setContents] = useState<Record<string, PageContentResponse>>({});
  const [formData, setFormData] = useState<Record<string, { title: string; content: string }>>({
    PRIVACY_POLICY: { title: '', content: '' },
    COOKIE_POLICY: { title: '', content: '' },
    TERMS_AND_CONDITIONS: { title: '', content: '' },
    FAQ: { title: '', content: '' },
  });

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
              title: content.title,
              content: content.content,
            }
          }));
        } catch (error) {
          // If page doesn't exist yet, initialize with empty values
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

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 3 }}>
        <h1>Page Content Manager</h1>
        <Typography color="textSecondary">
          Manage Privacy Policy, Cookie Policy, Terms and Conditions, and FAQ
        </Typography>
      </Box>

      <Paper>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          aria-label="page content tabs"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          {pageTypes.map((page, index) => (
            <Tab key={page.key} label={page.label} id={`tab-${index}`} aria-controls={`tabpanel-${index}`} />
          ))}
        </Tabs>

        {pageTypes.map((page, index) => (
          <TabPanel key={page.key} value={tabValue} index={index}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <TextField
                label="Page Title"
                fullWidth
                value={formData[page.key]?.title || ''}
                onChange={(e) => handleFormChange(page.key, 'title', e.target.value)}
                disabled={saving}
              />

              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                  Page Content
                </Typography>
                <Box
                  sx={{
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                    backgroundColor: '#fff',
                    '& .ql-toolbar': {
                      borderBottom: '1px solid #ccc',
                      backgroundColor: '#f5f5f5',
                    },
                    '& .ql-container': {
                      minHeight: '400px',
                      fontSize: '16px',
                    },
                    opacity: saving ? 0.6 : 1,
                    pointerEvents: saving ? 'none' : 'auto',
                  }}
                >
                  <ReactQuill
                    value={formData[page.key]?.content || ''}
                    onChange={(value: string) => handleFormChange(page.key, 'content', value)}
                    placeholder="Enter page content here..."
                    modules={{
                      toolbar: [
                        ['bold', 'italic', 'underline', 'strike'],
                        ['blockquote', 'code-block'],
                        [{ 'header': 1 }, { 'header': 2 }],
                        [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                        [{ 'color': [] }, { 'background': [] }],
                        [{ 'align': [] }],
                        ['link', 'image'],
                        ['clean'],
                      ],
                    }}
                    formats={[
                      'bold',
                      'italic',
                      'underline',
                      'strike',
                      'blockquote',
                      'code-block',
                      'header',
                      'list',
                      'color',
                      'background',
                      'align',
                      'link',
                      'image',
                    ]}
                  />
                </Box>
              </Box>

              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleSave}
                  disabled={saving}
                  startIcon={<SaveIcon />}
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </Box>

              {contents[page.key]?.updatedAt && (
                <Typography variant="caption" color="textSecondary">
                  Last updated: {new Date(contents[page.key]?.updatedAt || '').toLocaleString()} by {contents[page.key]?.updatedBy}
                </Typography>
              )}
            </Box>
          </TabPanel>
        ))}
      </Paper>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
