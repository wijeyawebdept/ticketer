import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Typography,
  Alert,
  Chip,
  CircularProgress,
  Tooltip,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import GalleryService, { GalleryImage } from '../../services/GalleryService';
import EventCategoryService from '../../services/eventCategory.service';
import { EventCategory } from '../../types';

const GalleryManagement: React.FC = () => {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [eventCategories, setEventCategories] = useState<EventCategory[]>([]);
  
  // Delete Dialog State
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [imageToDelete, setImageToDelete] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [displayOrder, setDisplayOrder] = useState('0');

  const fetchImages = async () => {
    setLoading(true);
    try {
      const response = await GalleryService.getAllGalleryImages(0, 100);
      setImages(response.content);
    } catch (err) {
      setError('Failed to load gallery images');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchImages();
  }, []);

  const handleOpenDialog = async () => {
    setOpenDialog(true);
    setTitle('');
    setDescription('');
    setCategory('');
    setDisplayOrder('0');
    setSelectedFile(null);
    setPreviewUrl('');
    setError(null);
    setSuccess(null);
    try {
      const cats = await EventCategoryService.getActiveCategories();
      setEventCategories(cats);
    } catch (err) {
      console.error('Failed to fetch event categories', err);
    }
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) {
        setError('File size exceeds 5MB limit');
        return;
      }
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async () => {
    if (!selectedFile) {
      setError('Please select an image file');
      return;
    }
    if (!category.trim()) {
      setError('Category is required');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('imageFile', selectedFile);
      if (title) formData.append('title', title);
      if (description) formData.append('description', description);
      formData.append('category', category);
      formData.append('displayOrder', displayOrder);

      await GalleryService.createGalleryImage(formData);
      setSuccess('Gallery image uploaded successfully');
      handleCloseDialog();
      fetchImages();
    } catch (err) {
      setError('Failed to upload image');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (id: string) => {
    setImageToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (imageToDelete) {
      try {
        setError(null);
        await GalleryService.deleteGalleryImage(imageToDelete);
        setSuccess('Image deleted successfully');
        setDeleteDialogOpen(false);
        setImageToDelete(null);
        fetchImages();
      } catch (err) {
        setError('Failed to delete image');
        setDeleteDialogOpen(false);
      }
    }
  };

  const handleToggleStatus = async (id: string) => {
    try {
      setError(null);
      await GalleryService.toggleActiveStatus(id);
      setSuccess('Image status updated');
      fetchImages();
    } catch (err) {
      setError('Failed to update status');
    }
  };

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
    });

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <h1>Gallery Management</h1>
        <Button variant="contained" color="primary" startIcon={<AddIcon />} onClick={handleOpenDialog}>
          Upload New Image
        </Button>
      </Box>

      {/* Alerts */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      {/* Loading */}
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
          <CircularProgress />
        </Box>
      )}

      {/* Images Table */}
      {!loading && (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                <TableCell>Image</TableCell>
                <TableCell>Title</TableCell>
                <TableCell>Category</TableCell>
                <TableCell>Description</TableCell>
                <TableCell align="center">Order</TableCell>
                <TableCell align="center">Status</TableCell>
                <TableCell>Uploaded</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {images.length > 0 ? (
                images.map((item) => (
                  <TableRow key={item.galleryId} hover>
                    <TableCell>
                      <Box
                        sx={{
                          width: '80px', height: '60px',
                          backgroundColor: '#e0e0e0', borderRadius: '4px',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '0.75rem', color: '#888',
                          overflow: 'hidden'
                        }}
                      >
                        {item.imageUrl ? (
                          <img src={item.imageUrl} alt={item.title || 'Gallery'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          'IMG'
                        )}
                      </Box>
                    </TableCell>
                    <TableCell sx={{ fontWeight: 500 }}>{item.title || '—'}</TableCell>
                    <TableCell>
                      <Chip label={item.category} color="primary" variant="outlined" size="small" />
                    </TableCell>
                    <TableCell sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.description || '—'}
                    </TableCell>
                    <TableCell align="center">{item.displayOrder}</TableCell>
                    <TableCell align="center">
                      <Chip
                        label={item.active ? 'Active' : 'Inactive'}
                        color={item.active ? 'success' : 'default'}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>{formatDate(item.createdAt)}</TableCell>
                    <TableCell align="center">
                      <Tooltip title={item.active ? 'Deactivate' : 'Activate'}>
                        <IconButton
                          size="small"
                          color={item.active ? 'warning' : 'success'}
                          onClick={() => handleToggleStatus(item.galleryId)}
                        >
                          {item.active ? <CancelIcon fontSize="small" /> : <CheckCircleIcon fontSize="small" />}
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton size="small" color="error" onClick={() => handleDelete(item.galleryId)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 3 }}>
                    No gallery images found. Upload your first event photo!
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Upload Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>Upload Gallery Image</DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}
          <Grid container spacing={3} sx={{ mt: 0 }}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth label="Title (Optional)" value={title}
                onChange={(e) => setTitle(e.target.value)} margin="normal"
              />
              <FormControl fullWidth required margin="normal">
                <InputLabel id="gallery-category-label">Category (Required)</InputLabel>
                <Select
                  labelId="gallery-category-label"
                  value={category}
                  label="Category (Required)"
                  onChange={(e) => setCategory(e.target.value as string)}
                >
                  {eventCategories.map((cat) => (
                    <MenuItem key={cat.id} value={cat.categoryName}>
                      {cat.categoryName}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                fullWidth label="Description (Optional)" value={description}
                onChange={(e) => setDescription(e.target.value)} margin="normal"
                multiline rows={3}
              />
              <TextField
                fullWidth label="Display Order" type="number" value={displayOrder}
                onChange={(e) => setDisplayOrder(e.target.value)} margin="normal"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <Box
                sx={{
                  border: '2px dashed #ccc', borderRadius: 2, p: 3,
                  height: '100%', display: 'flex', flexDirection: 'column',
                  justifyContent: 'center', alignItems: 'center', textAlign: 'center',
                }}
              >
                {previewUrl ? (
                  <Box sx={{ width: '100%' }}>
                    <img
                      src={previewUrl} alt="Preview"
                      style={{ maxWidth: '100%', maxHeight: '200px', objectFit: 'contain' }}
                    />
                    <Button size="small" color="error" sx={{ mt: 2 }}
                      onClick={() => { setSelectedFile(null); setPreviewUrl(''); }}
                    >
                      Remove
                    </Button>
                  </Box>
                ) : (
                  <>
                    <Typography variant="body1" color="textSecondary" gutterBottom>
                      Click to select an image
                    </Typography>
                    <Typography variant="caption" color="textSecondary" display="block" gutterBottom>
                      Maximum file size: 5MB
                    </Typography>
                    <Button variant="outlined" component="label" sx={{ mt: 2 }}>
                      Select Image
                      <input type="file" hidden accept="image/*" onChange={handleFileChange} />
                    </Button>
                  </>
                )}
              </Box>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button
            onClick={handleSubmit} variant="contained"
            disabled={loading || !selectedFile || !category.trim()}
          >
            {loading ? 'Uploading...' : 'Upload'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Delete Image</DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mt: 1 }}>
            Are you sure you want to delete this image? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={confirmDelete} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default GalleryManagement;
