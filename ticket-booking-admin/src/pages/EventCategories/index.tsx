import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  CircularProgress,
  Chip,
  Snackbar,
  Alert as MuiAlert
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Close as CloseIcon,
  Refresh as RefreshIcon,
  Restore as RestoreIcon,
  CheckCircle as ActivateIcon,
  Block as DeactivateIcon,
  DeleteSweep as DeleteSweepIcon
} from '@mui/icons-material';
import { DataGrid, GridColDef, GridRenderCellParams, GridRowSelectionModel } from '@mui/x-data-grid';
import { EventCategoryService } from '../../services';
import { EventCategory, EventCategoryRequest } from '../../types';
import { Formik } from 'formik';
import * as Yup from 'yup';

const EventCategories: React.FC = () => {
  const [categories, setCategories] = useState<EventCategory[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedCategory, setSelectedCategory] = useState<EventCategory | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState<boolean>(false);
  const [selectedRows, setSelectedRows] = useState<GridRowSelectionModel>([]);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'error' | 'warning' | 'info' | 'success' }>({ 
    open: false, 
    message: '', 
    severity: 'info' 
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const response = await EventCategoryService.getAllCategories();
      setCategories(response);
    } catch (error) {
      setSnackbar({ open: true, message: 'Failed to load categories', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleDialogOpen = (category?: EventCategory) => {
    setSelectedCategory(category || null);
    setIsDialogOpen(true);
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setSelectedCategory(null);
  };

  const handleDeleteDialogOpen = (category: EventCategory) => {
    setSelectedCategory(category);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteDialogClose = () => {
    setIsDeleteDialogOpen(false);
    setSelectedCategory(null);
  };

  const handleSubmit = async (values: EventCategoryRequest, { setSubmitting }: any) => {
    try {
      if (selectedCategory) {
        await EventCategoryService.updateCategory(selectedCategory.id, values);
        setSnackbar({ open: true, message: 'Category updated successfully', severity: 'success' });
      } else {
        await EventCategoryService.createCategory(values);
        setSnackbar({ open: true, message: 'Category created successfully', severity: 'success' });
      }
      fetchCategories();
      handleDialogClose();
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to save category';
      setSnackbar({ open: true, message: errorMessage, severity: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedCategory) return;
    
    try {
      await EventCategoryService.softDeleteCategory(selectedCategory.id);
      setSnackbar({ open: true, message: 'Category deleted successfully', severity: 'success' });
      fetchCategories();
      handleDeleteDialogClose();
    } catch (error) {
      setSnackbar({ open: true, message: 'Failed to delete category', severity: 'error' });
    }
  };

  const handleRestore = async (id: string) => {
    try {
      await EventCategoryService.restoreCategory(id);
      setSnackbar({ open: true, message: 'Category restored successfully', severity: 'success' });
      fetchCategories();
    } catch (error) {
      setSnackbar({ open: true, message: 'Failed to restore category', severity: 'error' });
    }
  };

  const handleToggleStatus = async (category: EventCategory) => {
    try {
      if (category.active === 1) {
        await EventCategoryService.deactivateCategory(category.id);
        setSnackbar({ 
          open: true, 
          message: 'Category deactivated successfully', 
          severity: 'success' 
        });
      } else {
        await EventCategoryService.activateCategory(category.id);
        setSnackbar({ 
          open: true, 
          message: 'Category activated successfully', 
          severity: 'success' 
        });
      }
      fetchCategories();
    } catch (error) {
      setSnackbar({ open: true, message: 'Failed to update category status', severity: 'error' });
    }
  };

  const handleBulkOperation = async (operation: 'ACTIVATE' | 'DEACTIVATE' | 'DELETE' | 'RESTORE') => {
    if (selectedRows.length === 0) {
      setSnackbar({ open: true, message: 'Please select categories first', severity: 'error' });
      return;
    }

    try {
      const categoryIds = selectedRows.map(id => String(id));
      const result = await EventCategoryService.bulkOperation(categoryIds, operation);
      
      setSnackbar({ 
        open: true, 
        message: result.message, 
        severity: result.failed > 0 ? 'warning' : 'success' 
      });
      fetchCategories();
      setSelectedRows([]);
    } catch (error) {
      setSnackbar({ open: true, message: 'Error performing bulk operation', severity: 'error' });
    }
  };

  const columns: GridColDef[] = [
    {
      field: 'categoryName',
      headerName: 'Category Name',
      flex: 1,
      minWidth: 150,
    },
    {
      field: 'description',
      headerName: 'Description',
      flex: 2,
      minWidth: 200,
    },
    {
      field: 'active',
      headerName: 'Status',
      flex: 0.7,
      renderCell: (params: GridRenderCellParams) => (
        <Chip
          label={params.value === 1 ? 'Active' : params.value === 0 ? 'Inactive' : 'Deleted'}
          color={params.value === 1 ? 'success' : params.value === 0 ? 'default' : 'error'}
          size="small"
          sx={{ fontWeight: 500 }}
        />
      )
    },
    {
      field: 'actions',
      headerName: 'Actions',
      flex: 1,
      sortable: false,
      renderCell: (params: GridRenderCellParams) => {
        const category = params.row as EventCategory;
        return (
          <Box>
            {category.active === -1 ? (
              <IconButton
                onClick={() => handleRestore(category.id)}
                size="small"
                color="primary"
                sx={{
                  backgroundColor: 'rgba(25, 118, 210, 0.1)',
                  '&:hover': {
                    backgroundColor: 'rgba(25, 118, 210, 0.2)',
                  },
                  mr: 0.5
                }}
                title="Restore Category"
              >
                <RestoreIcon fontSize="small" />
              </IconButton>
            ) : (
              <>
                <IconButton
                  onClick={() => handleDialogOpen(category)}
                  size="small"
                  color="primary"
                  sx={{
                    backgroundColor: 'rgba(25, 118, 210, 0.1)',
                    '&:hover': {
                      backgroundColor: 'rgba(25, 118, 210, 0.2)',
                    },
                    mr: 0.5
                  }}
                  title="Edit Category"
                >
                  <EditIcon fontSize="small" />
                </IconButton>
                {category.active === 1 ? (
                  <IconButton
                    onClick={() => handleToggleStatus(category)}
                    size="small"
                    color="error"
                    sx={{
                      backgroundColor: 'rgba(211, 47, 47, 0.1)',
                      '&:hover': {
                        backgroundColor: 'rgba(211, 47, 47, 0.2)',
                      },
                      mr: 0.5
                    }}
                    title="Deactivate Category"
                  >
                    <DeactivateIcon fontSize="small" />
                  </IconButton>
                ) : (
                  <IconButton
                    onClick={() => handleToggleStatus(category)}
                    size="small"
                    color="success"
                    sx={{
                      backgroundColor: 'rgba(46, 125, 50, 0.1)',
                      '&:hover': {
                        backgroundColor: 'rgba(46, 125, 50, 0.2)',
                      },
                      mr: 0.5
                    }}
                    title="Activate Category"
                  >
                    <ActivateIcon fontSize="small" />
                  </IconButton>
                )}
                <IconButton
                  onClick={() => handleDeleteDialogOpen(category)}
                  size="small"
                  color="warning"
                  sx={{
                    backgroundColor: 'rgba(255, 152, 0, 0.1)',
                    '&:hover': {
                      backgroundColor: 'rgba(255, 152, 0, 0.2)',
                    }
                  }}
                  title="Move to Recycle Bin"
                >
                  <DeleteSweepIcon fontSize="small" />
                </IconButton>
              </>
            )}
          </Box>
        );
      },
    },
  ];

  const validationSchema = Yup.object({
    categoryName: Yup.string()
      .required('Category name is required')
      .min(2, 'Category name must be at least 2 characters')
      .max(100, 'Category name cannot exceed 100 characters'),
    description: Yup.string()
      .max(500, 'Description cannot exceed 500 characters'),
  });

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between',
        alignItems: 'center',
        mb: 3 
      }}>
        <Typography variant="h4" sx={{ fontWeight: 600, color: '#1976d2' }}>
          Event Categories
        </Typography>
        <Box>
          <IconButton onClick={fetchCategories} sx={{ mr: 1 }} title="Refresh">
            <RefreshIcon />
          </IconButton>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => handleDialogOpen()}
            sx={{
              borderRadius: 2,
              padding: '8px 16px',
              fontWeight: 600,
              boxShadow: '0 4px 6px rgba(25, 118, 210, 0.2)',
              '&:hover': {
                boxShadow: '0 6px 8px rgba(25, 118, 210, 0.3)',
              }
            }}
          >
            Add New Category
          </Button>
        </Box>
      </Box>

      {/* Bulk Operations Bar */}
      {selectedRows.length > 0 && (
        <Paper sx={{ p: 2, mb: 2, backgroundColor: 'rgba(25, 118, 210, 0.05)' }}>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="body1" fontWeight={500}>
              {selectedRows.length} categor{selectedRows.length === 1 ? 'y' : 'ies'} selected
            </Typography>
            <Box>
              <Button
                variant="outlined"
                color="success"
                size="small"
                onClick={() => handleBulkOperation('ACTIVATE')}
                sx={{ mr: 1 }}
              >
                Activate Selected
              </Button>
              <Button
                variant="outlined"
                color="error"
                size="small"
                onClick={() => handleBulkOperation('DEACTIVATE')}
                sx={{ mr: 1 }}
              >
                Deactivate Selected
              </Button>
              <Button
                variant="outlined"
                color="warning"
                size="small"
                onClick={() => handleBulkOperation('DELETE')}
                sx={{ mr: 1 }}
              >
                Delete Selected
              </Button>
              <Button
                variant="outlined"
                color="info"
                size="small"
                onClick={() => handleBulkOperation('RESTORE')}
              >
                Restore Selected
              </Button>
            </Box>
          </Box>
        </Paper>
      )}

      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Paper 
            sx={{ 
              p: 2,
              borderRadius: 3,
              boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
              border: '1px solid rgba(0,0,0,0.05)'
            }}
          >
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
                <CircularProgress />
              </Box>
            ) : (
              <DataGrid
                rows={categories}
                columns={columns}
                checkboxSelection
                disableRowSelectionOnClick
                onRowSelectionModelChange={(newSelection) => {
                  setSelectedRows(newSelection);
                }}
                rowSelectionModel={selectedRows}
                initialState={{
                  pagination: {
                    paginationModel: { page: 0, pageSize: 10 },
                  },
                }}
                pageSizeOptions={[10, 25, 50]}
                autoHeight
                hideFooterPagination={categories.length <= 10}
                sx={{
                  '& .MuiDataGrid-columnHeaders': {
                    backgroundColor: 'rgba(25, 118, 210, 0.1)',
                    borderRadius: '8px 8px 0 0',
                  },
                  '& .MuiDataGrid-cell': {
                    borderBottom: '1px solid rgba(0,0,0,0.05)',
                  },
                  '& .MuiDataGrid-row:hover': {
                    backgroundColor: 'rgba(25, 118, 210, 0.04)',
                  },
                }}
              />
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* Category Form Dialog */}
      <Dialog open={isDialogOpen} onClose={handleDialogClose} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 600, color: '#1976d2' }}>
          {selectedCategory ? 'Edit Category' : 'Add New Category'}
          <IconButton
            onClick={handleDialogClose}
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Formik
            initialValues={{
              categoryName: selectedCategory?.categoryName || '',
              description: selectedCategory?.description || '',
            }}
            validationSchema={validationSchema}
            onSubmit={handleSubmit}
          >
            {({ values, errors, touched, handleChange, handleBlur, handleSubmit, isSubmitting }) => (
              <form onSubmit={handleSubmit}>
                <Grid container spacing={2} sx={{ mt: 1 }}>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      id="categoryName"
                      name="categoryName"
                      label="Category Name"
                      value={values.categoryName}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      error={touched.categoryName && Boolean(errors.categoryName)}
                      helperText={touched.categoryName && errors.categoryName ? errors.categoryName as string : ''}
                      required
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      id="description"
                      name="description"
                      label="Description"
                      multiline
                      rows={3}
                      value={values.description}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      error={touched.description && Boolean(errors.description)}
                      helperText={touched.description && errors.description ? errors.description as string : ''}
                    />
                  </Grid>
                </Grid>
                <DialogActions sx={{ mt: 3, px: 0 }}>
                  <Button onClick={handleDialogClose}>Cancel</Button>
                  <Button
                    type="submit"
                    variant="contained"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? <CircularProgress size={24} /> : selectedCategory ? 'Update' : 'Create'}
                  </Button>
                </DialogActions>
              </form>
            )}
          </Formik>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onClose={handleDeleteDialogClose}>
        <DialogTitle sx={{ fontWeight: 600 }}>Move Category to Recycle Bin</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to move the category "{selectedCategory?.categoryName}" to the recycle bin? You can restore it later.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={handleDeleteDialogClose}
            sx={{ fontWeight: 500 }}
          >
            Cancel
          </Button>
          <Button 
            variant="contained" 
            color="warning" 
            onClick={handleDelete}
            sx={{ fontWeight: 500 }}
          >
            Move to Recycle Bin
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar 
        open={snackbar.open} 
        autoHideDuration={6000} 
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <MuiAlert 
          onClose={() => setSnackbar({ ...snackbar, open: false })} 
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </MuiAlert>
      </Snackbar>
    </Box>
  );
};

export default EventCategories;
