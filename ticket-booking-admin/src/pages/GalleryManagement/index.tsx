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
import {
  Add as AddIcon,
  Edit as EditIcon,
  DeleteSweep as DeleteSweepIcon,
  Visibility as ViewIcon,
  CheckCircle as ActivateIcon,
  CheckCircle as CheckCircleIcon,
  Block as DeactivateIcon,
  Close as CloseIcon,
  PhotoLibrary as GalleryIcon,
  PauseCircle as PauseCircleIcon,
} from '@mui/icons-material';
import GalleryService, { GalleryImage } from '../../services/GalleryService';
import EventCategoryService from '../../services/eventCategory.service';
import { EventCategory } from '../../types';

const GalleryManagement: React.FC = () => {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [editImage, setEditImage] = useState<GalleryImage | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [viewImage, setViewImage] = useState<GalleryImage | null>(null);
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
    setEditImage(null);
    setTitle('');
    setDescription('');
    setCategory('');
    setDisplayOrder('0');
    setSelectedFile(null);
    setPreviewUrl('');
    setError(null);
    setSuccess(null);
    setOpenDialog(true);
    try {
      const cats = await EventCategoryService.getActiveCategories();
      setEventCategories(cats);
    } catch (err) {
      console.error('Failed to fetch event categories', err);
    }
  };

  const handleEditClick = async (item: GalleryImage) => {
    setEditImage(item);
    setTitle(item.title || '');
    setDescription(item.description || '');
    setCategory(item.category || '');
    setDisplayOrder(String(item.displayOrder ?? 0));
    setSelectedFile(null);
    setPreviewUrl(item.imageUrl || '');
    setError(null);
    setSuccess(null);
    setOpenDialog(true);
    try {
      const cats = await EventCategoryService.getActiveCategories();
      setEventCategories(cats);
    } catch (err) {
      console.error('Failed to fetch event categories', err);
    }
  };

  const handleViewClick = (item: GalleryImage) => {
    setViewImage(item);
    setViewDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditImage(null);
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
    if (!editImage && !selectedFile) {
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
      if (selectedFile) {
        formData.append('imageFile', selectedFile);
      }
      if (title) formData.append('title', title);
      if (description) formData.append('description', description);
      formData.append('category', category);
      formData.append('displayOrder', displayOrder);

      if (editImage) {
        await GalleryService.updateGalleryImage(editImage.galleryId, formData);
        setSuccess('Gallery image updated successfully');
      } else {
        await GalleryService.createGalleryImage(formData);
        setSuccess('Gallery image uploaded successfully');
      }
      handleCloseDialog();
      fetchImages();
    } catch (err) {
      setError(editImage ? 'Failed to update image' : 'Failed to upload image');
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
        <Typography variant="h4" sx={{ fontWeight: 700, color: '#1e293b' }}>
          Gallery Management
        </Typography>
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
        <TableContainer component={Paper} sx={{ borderRadius: 2, boxShadow: '0 2px 10px rgba(0,0,0,0.06)' }}>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: '#f8fafc' }}>
                <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Image</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Title</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Category</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Description</TableCell>
                <TableCell align="center" sx={{ fontWeight: 700, color: '#475569' }}>Order</TableCell>
                <TableCell align="center" sx={{ fontWeight: 700, color: '#475569' }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Uploaded</TableCell>
                <TableCell align="center" sx={{ fontWeight: 700, color: '#475569', minWidth: 180 }}>Actions</TableCell>
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
                          backgroundColor: '#f1f5f9', borderRadius: '6px',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '0.75rem', color: '#888',
                          overflow: 'hidden', border: '1px solid #e2e8f0',
                        }}
                      >
                        {item.imageUrl ? (
                          <img src={item.imageUrl} alt={item.title || 'Gallery'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          'IMG'
                        )}
                      </Box>
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{item.title || '—'}</TableCell>
                    <TableCell>
                      <Chip label={item.category} color="primary" variant="outlined" size="small" sx={{ fontWeight: 500 }} />
                    </TableCell>
                    <TableCell sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', color: 'text.secondary' }}>
                      {item.description || '—'}
                    </TableCell>
                    <TableCell align="center" sx={{ fontWeight: 600 }}>{item.displayOrder}</TableCell>
                    <TableCell align="center">
                      {item.active ? (
                        <Chip
                          icon={<CheckCircleIcon sx={{ fontSize: '14px !important' }} />}
                          label="Active"
                          size="small"
                          sx={{
                            backgroundColor: 'rgba(0,200,83,0.1)',
                            color: '#00a844',
                            fontWeight: 700,
                            border: '1px solid rgba(0,200,83,0.3)',
                          }}
                        />
                      ) : (
                        <Chip
                          icon={<PauseCircleIcon sx={{ fontSize: '14px !important' }} />}
                          label="Inactive"
                          size="small"
                          sx={{
                            backgroundColor: 'rgba(0,0,0,0.06)',
                            color: '#666',
                            fontWeight: 700,
                            border: '1px solid rgba(0,0,0,0.15)',
                          }}
                        />
                      )}
                    </TableCell>
                    <TableCell sx={{ color: 'text.secondary' }}>{formatDate(item.createdAt)}</TableCell>
                    <TableCell align="center">
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', whiteSpace: 'nowrap' }}>
                        {/* View Details */}
                        <Tooltip title="View Details" arrow>
                          <IconButton
                            size="small"
                            color="info"
                            onClick={() => handleViewClick(item)}
                            sx={{
                              backgroundColor: 'rgba(2, 136, 209, 0.1)',
                              '&:hover': {
                                backgroundColor: 'rgba(2, 136, 209, 0.2)',
                              },
                              mr: 0.5,
                            }}
                          >
                            <ViewIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>

                        {/* Edit Image */}
                        <Tooltip title="Edit Image" arrow>
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => handleEditClick(item)}
                            sx={{
                              backgroundColor: 'rgba(25, 118, 210, 0.1)',
                              '&:hover': {
                                backgroundColor: 'rgba(25, 118, 210, 0.2)',
                              },
                              mr: 0.5,
                            }}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>

                        {/* Activate / Deactivate */}
                        {item.active ? (
                          <Tooltip title="Deactivate Image" arrow>
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleToggleStatus(item.galleryId)}
                              sx={{
                                backgroundColor: 'rgba(211, 47, 47, 0.1)',
                                '&:hover': {
                                  backgroundColor: 'rgba(211, 47, 47, 0.2)',
                                },
                                mr: 0.5,
                              }}
                            >
                              <DeactivateIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        ) : (
                          <Tooltip title="Activate Image" arrow>
                            <IconButton
                              size="small"
                              color="success"
                              onClick={() => handleToggleStatus(item.galleryId)}
                              sx={{
                                backgroundColor: 'rgba(46, 125, 50, 0.1)',
                                '&:hover': {
                                  backgroundColor: 'rgba(46, 125, 50, 0.2)',
                                },
                                mr: 0.5,
                              }}
                            >
                              <ActivateIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}

                        {/* Delete */}
                        <Tooltip title="Move to Recycle Bin" arrow>
                          <IconButton
                            size="small"
                            color="warning"
                            onClick={() => handleDelete(item.galleryId)}
                            sx={{
                              backgroundColor: 'rgba(255, 152, 0, 0.1)',
                              '&:hover': {
                                backgroundColor: 'rgba(255, 152, 0, 0.2)',
                              },
                            }}
                          >
                            <DeleteSweepIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
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

      {/* Upload / Edit Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>
          {editImage ? 'Edit Gallery Image' : 'Upload Gallery Image'}
        </DialogTitle>
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
                    <Box sx={{ mt: 2, display: 'flex', gap: 1, justifyContent: 'center' }}>
                      <Button variant="outlined" size="small" component="label">
                        Change Image
                        <input type="file" hidden accept="image/*" onChange={handleFileChange} />
                      </Button>
                      <Button size="small" color="error"
                        onClick={() => { setSelectedFile(null); setPreviewUrl(''); }}
                      >
                        Remove
                      </Button>
                    </Box>
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
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={handleCloseDialog} color="inherit">Cancel</Button>
          <Button
            onClick={handleSubmit} variant="contained"
            disabled={loading || (!editImage && !selectedFile) || !category.trim()}
            sx={{ fontWeight: 600 }}
          >
            {loading ? (editImage ? 'Updating...' : 'Uploading...') : (editImage ? 'Update Image' : 'Upload Image')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Gallery Image Details Dialog */}
      <Dialog open={viewDialogOpen} onClose={() => setViewDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <GalleryIcon sx={{ color: '#1976d2' }} />
            <Typography variant="h6" fontWeight={700}>Gallery Image Details</Typography>
          </Box>
          <IconButton onClick={() => setViewDialogOpen(false)} size="small">
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ p: 3 }}>
          {viewImage && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              {/* Image Preview */}
              <Box
                sx={{
                  width: '100%',
                  height: '240px',
                  backgroundColor: '#f1f5f9',
                  borderRadius: 2,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  border: '1px solid #e2e8f0',
                }}
              >
                {viewImage.imageUrl ? (
                  <img
                    src={viewImage.imageUrl}
                    alt={viewImage.title || 'Gallery'}
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                  />
                ) : (
                  <Typography variant="body2" color="text.secondary">No preview available</Typography>
                )}
              </Box>

              {/* Basic Information */}
              <Box sx={{ p: 2, backgroundColor: '#f8fafc', borderRadius: 2, border: '1px solid #e2e8f0' }}>
                <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase" letterSpacing={0.5}>
                  Image Information
                </Typography>
                <Typography variant="h6" fontWeight={700} sx={{ mt: 0.5 }}>
                  {viewImage.title || 'Untitled Image'}
                </Typography>
                {viewImage.description && (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    {viewImage.description}
                  </Typography>
                )}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1.5, flexWrap: 'wrap' }}>
                  <Chip label={`Category: ${viewImage.category}`} color="primary" size="small" sx={{ fontWeight: 600 }} />
                  <Chip
                    label={viewImage.active ? 'Active' : 'Inactive'}
                    color={viewImage.active ? 'success' : 'default'}
                    size="small"
                    sx={{ fontWeight: 600 }}
                  />
                  <Chip label={`Order: ${viewImage.displayOrder}`} variant="outlined" size="small" />
                </Box>
              </Box>

              {/* Upload Metadata */}
              <Box sx={{ p: 2, backgroundColor: '#f8fafc', borderRadius: 2, border: '1px solid #e2e8f0' }}>
                <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase" letterSpacing={0.5}>
                  Metadata
                </Typography>
                <Grid container spacing={2} sx={{ mt: 0.5 }}>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">Uploaded Date:</Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {formatDate(viewImage.createdAt)}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">Last Updated:</Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {viewImage.updatedAt ? formatDate(viewImage.updatedAt) : '—'}
                    </Typography>
                  </Grid>
                </Grid>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setViewDialogOpen(false)} color="inherit">
            Close
          </Button>
          {viewImage && (
            <Button
              variant="contained"
              startIcon={<EditIcon />}
              onClick={() => {
                const img = viewImage;
                setViewDialogOpen(false);
                handleEditClick(img);
              }}
              sx={{ fontWeight: 600 }}
            >
              Edit Image
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Delete Image</DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mt: 1 }}>
            Are you sure you want to delete this image? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setDeleteDialogOpen(false)} color="inherit">Cancel</Button>
          <Button onClick={confirmDelete} color="error" variant="contained" sx={{ fontWeight: 600 }}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default GalleryManagement;
