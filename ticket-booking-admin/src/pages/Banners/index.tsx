import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Alert,
  Chip,
  CircularProgress,
  IconButton,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Edit as EditIcon,
  Visibility as VisibilityIcon,
  CheckCircle as ActivateIcon,
  Block as DeactivateIcon,
} from '@mui/icons-material';
import BannerService, { BannerResponse } from '../../services/banner.service';

interface BannerFormData {
  title: string;
  description: string;
  displayOrder: number;
  status: 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
}

type DialogMode = 'create' | 'edit' | 'view' | null;

export default function BannersPage() {
  const [banners, setBanners] = useState<BannerResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<DialogMode>(null);
  const [currentBanner, setCurrentBanner] = useState<BannerResponse | null>(null);
  
  const [formData, setFormData] = useState<BannerFormData>({
    title: '',
    description: '',
    displayOrder: 0,
    status: 'ACTIVE',
  });
  
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Load banners
  useEffect(() => {
    loadBanners();
  }, []);

  const loadBanners = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await BannerService.getAllBanners(0, 50);
      setBanners(data.content || []);
    } catch (err) {
      setError('Failed to load banners');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files[0]) {
      const file = files[0];
      setSelectedImage(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCreateClick = () => {
    setDialogMode('create');
    setCurrentBanner(null);
    setFormData({
      title: '',
      description: '',
      displayOrder: banners.length,
      status: 'ACTIVE',
    });
    setSelectedImage(null);
    setImagePreview(null);
    setDialogOpen(true);
  };

  const handleEditClick = (banner: BannerResponse) => {
    setDialogMode('edit');
    setCurrentBanner(banner);
    setFormData({
      title: banner.title,
      description: banner.description,
      displayOrder: banner.displayOrder,
      status: banner.status,
    });
    setSelectedImage(null);
    // Fetch full banner data with image
    fetchFullBannerForPreview(banner.bannerId);
    setDialogOpen(true);
  };

  const handleViewClick = (banner: BannerResponse) => {
    setDialogMode('view');
    setCurrentBanner(banner);
    // Fetch full banner data with image
    fetchFullBannerForPreview(banner.bannerId);
    setDialogOpen(true);
  };

  const fetchFullBannerForPreview = async (bannerId: string) => {
    try {
      const fullBanner = await BannerService.getBannerById(bannerId);
      setImagePreview(fullBanner.imageBase64);
    } catch (err) {
      console.error('Failed to fetch banner details', err);
      setImagePreview(null);
    }
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setDialogMode(null);
    setCurrentBanner(null);
    setFormData({
      title: '',
      description: '',
      displayOrder: 0,
      status: 'ACTIVE',
    });
    setSelectedImage(null);
    setImagePreview(null);
  };

  const handleFormChange = (
    event: React.ChangeEvent<HTMLInputElement | { name?: string; value: unknown }>
  ) => {
    const { name, value } = event.target as HTMLInputElement;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'displayOrder' ? parseInt(value as string) || 0 : value,
    }));
  };

  const handleSubmit = async () => {
    try {
      setError(null);
      setSuccess(null);

      if (!formData.title.trim()) {
        setError('Title is required');
        return;
      }

      if (dialogMode === 'create') {
        if (!selectedImage) {
          setError('Image is required for new banners');
          return;
        }

        await BannerService.createBanner(
          formData.title,
          formData.description,
          selectedImage,
          formData.displayOrder
        );
        setSuccess('Banner created successfully');
      } else if (dialogMode === 'edit' && currentBanner) {
        await BannerService.updateBanner(
          currentBanner.bannerId,
          formData.title,
          formData.description,
          selectedImage || undefined,
          formData.displayOrder
        );
        setSuccess('Banner updated successfully');
      }

      handleDialogClose();
      loadBanners();
    } catch (err) {
      setError('Operation failed. Please try again.');
      console.error(err);
    }
  };

  const handleDelete = async (bannerId: string) => {
    if (window.confirm('Are you sure you want to delete this banner?')) {
      try {
        setError(null);
        await BannerService.deleteBanner(bannerId);
        setSuccess('Banner deleted successfully');
        loadBanners();
      } catch (err) {
        setError('Failed to delete banner');
        console.error(err);
      }
    }
  };

  const handleStatusChange = async (bannerId: string, newStatus: 'ACTIVE' | 'INACTIVE' | 'ARCHIVED') => {
    try {
      setError(null);
      await BannerService.updateBannerStatus(bannerId, newStatus);
      setSuccess(`Banner ${newStatus.toLowerCase()}`);
      loadBanners();
    } catch (err) {
      setError('Failed to update banner status');
      console.error(err);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'success';
      case 'INACTIVE':
        return 'warning';
      case 'ARCHIVED':
        return 'error';
      default:
        return 'default';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 3,
        }}
      >
        <h1>Banner Management</h1>
        <Button
          variant="contained"
          color="primary"
          onClick={handleCreateClick}
        >
          Create Banner
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

      {/* Banners Table */}
      {!loading && (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                <TableCell>Image</TableCell>
                <TableCell>Title</TableCell>
                <TableCell>Description</TableCell>
                <TableCell align="center">Order</TableCell>
                <TableCell align="center">Status</TableCell>
                <TableCell>Updated</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {banners.length > 0 ? (
                banners.map((banner) => (
                  <TableRow key={banner.bannerId} hover>
                    <TableCell>
                      {banner.imageBase64 ? (
                        <img
                          src={banner.imageBase64}
                          alt={banner.title}
                          style={{
                            width: '80px',
                            height: '60px',
                            objectFit: 'cover',
                            borderRadius: '4px',
                          }}
                        />
                      ) : (
                        <Box
                          sx={{
                            width: '80px',
                            height: '60px',
                            backgroundColor: '#e0e0e0',
                            borderRadius: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#999',
                            fontSize: '0.75rem',
                            textAlign: 'center',
                          }}
                        >
                          No Image
                        </Box>
                      )}
                    </TableCell>
                    <TableCell sx={{ fontWeight: 500 }}>{banner.title}</TableCell>
                    <TableCell sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {banner.description}
                    </TableCell>
                    <TableCell align="center">{banner.displayOrder}</TableCell>
                    <TableCell align="center">
                      <Chip
                        label={banner.status}
                        color={getStatusColor(banner.status) as any}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>{formatDate(banner.updatedAt)}</TableCell>
                    <TableCell align="center">
                      <Tooltip title="View">
                        <IconButton
                          size="small"
                          onClick={() => handleViewClick(banner)}
                          color="info"
                        >
                          <VisibilityIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Edit">
                        <IconButton
                          size="small"
                          onClick={() => handleEditClick(banner)}
                          color="primary"
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      {banner.status === 'ACTIVE' ? (
                        <IconButton
                          onClick={() =>
                            handleStatusChange(
                              banner.bannerId,
                              'INACTIVE'
                            )
                          }
                          size="small"
                          color="error"
                          sx={{
                            backgroundColor: 'rgba(211, 47, 47, 0.1)',
                            '&:hover': {
                              backgroundColor: 'rgba(211, 47, 47, 0.2)',
                            },
                            mr: 0.5
                          }}
                          title="Deactivate Banner"
                        >
                          <DeactivateIcon fontSize="small" />
                        </IconButton>
                      ) : (
                        <IconButton
                          onClick={() =>
                            handleStatusChange(
                              banner.bannerId,
                              'ACTIVE'
                            )
                          }
                          size="small"
                          color="success"
                          sx={{
                            backgroundColor: 'rgba(46, 125, 50, 0.1)',
                            '&:hover': {
                              backgroundColor: 'rgba(46, 125, 50, 0.2)',
                            },
                            mr: 0.5
                          }}
                          title="Activate Banner"
                        >
                          <ActivateIcon fontSize="small" />
                        </IconButton>
                      )}
                      <Tooltip title="Delete">
                        <IconButton
                          size="small"
                          onClick={() => handleDelete(banner.bannerId)}
                          color="error"
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 3 }}>
                    No banners found. Create your first banner!
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Create/Edit Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={handleDialogClose}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {dialogMode === 'create'
            ? 'Create Banner'
            : dialogMode === 'edit'
            ? 'Edit Banner'
            : 'View Banner'}
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {dialogMode !== 'view' ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                label="Title"
                name="title"
                value={formData.title}
                onChange={handleFormChange}
                fullWidth
                required
              />
              <TextField
                label="Description"
                name="description"
                value={formData.description}
                onChange={handleFormChange}
                fullWidth
                multiline
                rows={3}
              />
              <TextField
                label="Display Order"
                name="displayOrder"
                type="number"
                value={formData.displayOrder}
                onChange={handleFormChange}
                fullWidth
                inputProps={{ min: 0 }}
              />
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  name="status"
                  value={formData.status}
                  onChange={handleFormChange as any}
                  label="Status"
                >
                  <MenuItem value="ACTIVE">Active</MenuItem>
                  <MenuItem value="INACTIVE">Inactive</MenuItem>
                  <MenuItem value="ARCHIVED">Archived</MenuItem>
                </Select>
              </FormControl>
              <Box>
                <input
                  accept="image/*"
                  style={{ display: 'none' }}
                  id="image-upload"
                  type="file"
                  onChange={handleImageChange}
                />
                <label htmlFor="image-upload">
                  <Button
                    variant="outlined"
                    component="span"
                    fullWidth
                  >
                    {selectedImage ? 'Change Image' : 'Upload Image'}
                  </Button>
                </label>
              </Box>
              {imagePreview && (
                <Box sx={{ mt: 2 }}>
                  <img
                    src={imagePreview}
                    alt="Preview"
                    style={{
                      maxWidth: '100%',
                      height: 'auto',
                      borderRadius: '4px',
                    }}
                  />
                </Box>
              )}
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {imagePreview && (
                <Box>
                  <img
                    src={imagePreview}
                    alt={currentBanner?.title}
                    style={{
                      maxWidth: '100%',
                      height: 'auto',
                      borderRadius: '4px',
                    }}
                  />
                </Box>
              )}
              <Card variant="outlined">
                <CardContent>
                  <Box sx={{ mb: 1 }}>
                    <strong>Title:</strong> {currentBanner?.title}
                  </Box>
                  <Box sx={{ mb: 1 }}>
                    <strong>Description:</strong> {currentBanner?.description}
                  </Box>
                  <Box sx={{ mb: 1 }}>
                    <strong>Display Order:</strong> {currentBanner?.displayOrder}
                  </Box>
                  <Box sx={{ mb: 1 }}>
                    <strong>Status:</strong>{' '}
                    <Chip
                      label={currentBanner?.status}
                      color={getStatusColor(currentBanner?.status || '') as any}
                      size="small"
                      variant="outlined"
                    />
                  </Box>
                  <Box sx={{ mb: 1 }}>
                    <strong>Size:</strong> {currentBanner?.imageSize} bytes
                  </Box>
                  <Box>
                    <strong>Updated:</strong> {formatDate(currentBanner?.updatedAt || '')}
                  </Box>
                </CardContent>
              </Card>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDialogClose}>
            {dialogMode === 'view' ? 'Close' : 'Cancel'}
          </Button>
          {dialogMode !== 'view' && (
            <Button
              onClick={handleSubmit}
              variant="contained"
              color="primary"
            >
              {dialogMode === 'create' ? 'Create' : 'Update'}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
}
