import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  TextField,
  CircularProgress,
  Alert,
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import { Edit as EditIcon } from '@mui/icons-material';
// @ts-ignore - react-quill types
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import PageContentService, { PageContentResponse } from '../../../services/pageContent.service';

const PaymentTermsManager: React.FC = () => {
  const [content, setContent] = useState<PageContentResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [formData, setFormData] = useState({ title: '', content: '' });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  useEffect(() => {
    loadContent();
  }, []);

  const loadContent = async () => {
    setLoading(true);
    try {
      const data = await PageContentService.getPageContent('PAYMENT_TERMS');
      setContent(data);
      setFormData({ title: data.title, content: data.content });
    } catch (error) {
      setSnackbar({ open: true, message: 'Error loading payment terms and conditions', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = () => {
    setEditDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.title.trim()) {
      setSnackbar({ open: true, message: 'Title is required', severity: 'error' });
      return;
    }
    if (!formData.content.trim()) {
      setSnackbar({ open: true, message: 'Content is required', severity: 'error' });
      return;
    }

    setSaving(true);
    try {
      await PageContentService.updatePageContent('PAYMENT_TERMS', formData.title, formData.content);
      setSnackbar({ open: true, message: 'Payment Terms and Conditions updated successfully', severity: 'success' });
      setEditDialogOpen(false);
      loadContent();
    } catch (error) {
      setSnackbar({ open: true, message: 'Error saving payment terms and conditions', severity: 'error' });
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
        <h1>Payment Terms and Conditions Manager</h1>
        <Typography color="textSecondary">Manage and edit the Payment Terms and Conditions content</Typography>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
              <TableCell sx={{ fontWeight: 'bold' }}>Title</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Last Updated</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Updated By</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {content && (
              <TableRow>
                <TableCell>{content.title}</TableCell>
                <TableCell>{new Date(content.updatedAt).toLocaleString()}</TableCell>
                <TableCell>{content.updatedBy || 'SYSTEM'}</TableCell>
                <TableCell>
                  <Button
                    startIcon={<EditIcon />}
                    onClick={handleEditClick}
                    variant="outlined"
                    size="small"
                    sx={{ mr: 1 }}
                  >
                    Edit
                  </Button>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Edit Payment Terms and Conditions</DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <TextField
            label="Title"
            fullWidth
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            disabled={saving}
            sx={{ mb: 3 }}
          />

          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
            Content
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
              value={formData.content}
              onChange={(value: string) => setFormData({ ...formData, content: value })}
              placeholder="Enter payment terms and conditions content here..."
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
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSave} variant="contained" color="primary" disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>

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
};

export default PaymentTermsManager;
