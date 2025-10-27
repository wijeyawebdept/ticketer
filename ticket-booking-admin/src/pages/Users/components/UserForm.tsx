import React, { useEffect, useState } from 'react';
import { 
  Box, 
  TextField, 
  Button, 
  Grid, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem, 
  FormHelperText,
  Typography,
  Divider
} from '@mui/material';
import { Formik, FormikHelpers } from 'formik';
import * as Yup from 'yup';
import { UserService, RoleService } from '../../../services';
import { User, UserRole, Role } from '../../../types';
import { useAuth } from '../../../context/AuthContext';

interface UserFormProps {
  user?: User;
  onClose?: () => void;
  onSuccess?: () => void;
}

interface UserFormValues {
  firstName: string;
  lastName: string;
  email: string;
  password?: string;
  phoneNumber: string;
  role: UserRole;
}

interface ApiError {
  response?: {
    data?: {
      message?: string;
      errors?: Record<string, string>;
    }
  }
}

const PHONE_REGEX = /^\d{10}$/;
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/;

// Helper function to handle API errors
const handleApiError = (
  error: ApiError, 
  setErrors: (errors: Record<string, string>) => void,
  action: 'create' | 'update'
) => {
  if (error.response?.data) {
    const backendErrors = error.response.data;
    if (backendErrors.message) {
      setErrors({ email: backendErrors.message });
    }
    if (backendErrors.errors) {
      setErrors(backendErrors.errors as any);
    }
  } else {
    setErrors({ email: `Failed to ${action} user. Please try again.` });
  }
};

const UserForm: React.FC<UserFormProps> = ({ user, onClose, onSuccess }) => {
  const [availableRoles, setAvailableRoles] = useState<Role[]>([]);
  const [loadingRoles, setLoadingRoles] = useState(true);
  const { isSuperAdmin } = useAuth();

  // Fetch available roles on component mount
  useEffect(() => {
    const fetchRoles = async () => {
      try {
        setLoadingRoles(true);
        const roles = await RoleService.getAllRoles();
        // Filter only active roles
        let activeRoles = roles.filter(role => role.isActive);
        
        // If the current user is not a SUPER_ADMIN, exclude SUPER_ADMIN role from the list
        if (!isSuperAdmin()) {
          activeRoles = activeRoles.filter(role => 
            role.roleName !== UserRole.SUPER_ADMIN && 
            role.roleName !== 'SUPER_ADMIN'
          );
        }
        
        setAvailableRoles(activeRoles);
      } catch (error) {
        console.error('Failed to fetch roles:', error);
        // Fallback to default roles if fetch fails
        setAvailableRoles([]);
      } finally {
        setLoadingRoles(false);
      }
    };

    fetchRoles();
  }, [isSuperAdmin]);

  return (
    <Formik
      initialValues={{
        firstName: user?.firstName || '',
        lastName: user?.lastName || '',
        email: user?.email || '',
        password: '',
        phoneNumber: user?.phoneNumber || '',
        role: user?.role || UserRole.USER,
      }}
      validationSchema={Yup.object({
        firstName: Yup.string()
          .required('First name is required')
          .min(2, 'First name must be at least 2 characters')
          .max(50, 'First name must be less than 50 characters'),
        lastName: Yup.string()
          .required('Last name is required')
          .min(2, 'Last name must be at least 2 characters')
          .max(50, 'Last name must be less than 50 characters'),
        email: Yup.string()
          .required('Email is required')
          .email('Invalid email address')
          .max(100, 'Email must not exceed 100 characters'),
        password: user 
          ? Yup.string() // When editing, password is optional
            .test('password-validation', 'Invalid password format', value => {
              // If editing and no password entered, it's valid (keeping old password)
              if (!value || value === '') return true;
              
              return value.length >= 8 && PASSWORD_REGEX.test(value);
            })
          : Yup.string()
            .required('Password is required')
            .min(8, 'Password must be at least 8 characters')
            .matches(
              PASSWORD_REGEX,
              'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&#)'
            ),
        phoneNumber: Yup.string()
          .matches(PHONE_REGEX, 'Phone number must be 10 digits'),
        role: Yup.string()
          .required('Role is required'),
      })}
      onSubmit={async (values: UserFormValues, { setSubmitting, resetForm, setErrors }: FormikHelpers<UserFormValues>) => {
        try {
          const userData = { ...values };
          if (user?.id && !userData.password) {
            delete userData.password;
          }
          
          if (user?.id) {
            await UserService.updateUser(user.id, userData);
          } else {
            if (!userData.password) {
              setErrors({ password: 'Password is required' });
              return;
            }
            
            // Add debugging information
            console.log('Password validation test:', PASSWORD_REGEX.test(userData.password));
            console.log('Password length check:', userData.password.length >= 8);
            console.log('Has uppercase:', /[A-Z]/.test(userData.password));
            console.log('Has lowercase:', /[a-z]/.test(userData.password));
            console.log('Has number:', /\d/.test(userData.password));
            console.log('Has special char:', /[@$!%*?&#]/.test(userData.password));
            
            try {
              await UserService.createUser(userData as any); // Type assertion as any to resolve TS issue
            } catch (error: any) {
              console.log('Detailed API error:', error?.response?.data);
              throw error;
            }
          }
          
          // Success handling
          resetForm();
          if (onSuccess) onSuccess();
        } catch (error) {
          // Error handling
          console.error(`Error ${user ? 'updating' : 'creating'} user:`, error);
          console.error('Full error details:', error);
          if ((error as any)?.response?.data) {
            console.error('API error response:', (error as any).response.data);
          }
          handleApiError(error as ApiError, setErrors, user ? 'update' : 'create');
          alert(`Failed to ${user ? 'update' : 'create'} user. Check the browser console for details.`);
        } finally {
          setSubmitting(false);
        }
      }}
    >
      {({ values, errors, touched, handleChange, handleBlur, handleSubmit, isSubmitting, setFieldValue }) => (
        <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>User Information</Typography>
          <Divider sx={{ mb: 3 }} />
          
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                id="firstName"
                name="firstName"
                label="First Name"
                value={values.firstName}
                onChange={handleChange}
                onBlur={handleBlur}
                error={touched.firstName && Boolean(errors.firstName)}
                helperText={touched.firstName && errors.firstName ? errors.firstName as string : undefined}
                variant="outlined"
                margin="normal"
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                id="lastName"
                name="lastName"
                label="Last Name"
                value={values.lastName}
                onChange={handleChange}
                onBlur={handleBlur}
                error={touched.lastName && Boolean(errors.lastName)}
                helperText={touched.lastName && errors.lastName ? errors.lastName as string : undefined}
                variant="outlined"
                margin="normal"
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                id="email"
                name="email"
                label="Email Address"
                type="email"
                value={values.email}
                onChange={handleChange}
                onBlur={handleBlur}
                error={touched.email && Boolean(errors.email)}
                helperText={touched.email && errors.email ? errors.email as string : undefined}
                variant="outlined"
                margin="normal"
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                id="password"
                name="password"
                label={user ? "Password (leave blank to keep current)" : "Password"}
                type="password"
                value={values.password}
                onChange={handleChange}
                onBlur={handleBlur}
                error={touched.password && Boolean(errors.password)}
                helperText={touched.password && errors.password ? errors.password as string : undefined}
                variant="outlined"
                margin="normal"
                required={!user}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                id="phoneNumber"
                name="phoneNumber"
                label="Phone Number"
                value={values.phoneNumber}
                onChange={handleChange}
                onBlur={handleBlur}
                error={touched.phoneNumber && Boolean(errors.phoneNumber)}
                helperText={touched.phoneNumber && errors.phoneNumber ? errors.phoneNumber as string : undefined}
                variant="outlined"
                margin="normal"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl 
                fullWidth 
                variant="outlined" 
                margin="normal"
                error={touched.role && Boolean(errors.role)}
              >
                <InputLabel id="role-label">Role</InputLabel>
                <Select
                  labelId="role-label"
                  id="role"
                  name="role"
                  value={values.role}
                  onChange={(e) => {
                    setFieldValue('role', e.target.value);
                  }}
                  label="Role"
                  required
                  disabled={loadingRoles}
                >
                  {loadingRoles ? (
                    <MenuItem disabled>Loading roles...</MenuItem>
                  ) : availableRoles.length > 0 ? (
                    availableRoles.map((role) => (
                      <MenuItem key={role.roleId} value={role.roleName}>
                        {role.roleName.replace(/_/g, ' ')}
                      </MenuItem>
                    ))
                  ) : (
                    // Fallback to default roles if no roles are fetched
                    <>
                      <MenuItem value={UserRole.USER}>User</MenuItem>
                      <MenuItem value={UserRole.ORGANIZER}>Organizer</MenuItem>
                      <MenuItem value={UserRole.ADMIN}>Admin</MenuItem>
                    </>
                  )}
                </Select>
                {touched.role && errors.role && (
                  <FormHelperText>{errors.role as string}</FormHelperText>
                )}
              </FormControl>
            </Grid>
          </Grid>

          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              type="button"
              variant="outlined"
              color="secondary"
              onClick={onClose}
              sx={{ mr: 1 }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : 'Save'}
            </Button>
          </Box>
        </Box>
      )}
    </Formik>
  );
}

export default UserForm;