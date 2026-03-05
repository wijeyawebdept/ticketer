import { ProfileDTO, ProfileUpdateDTO } from '../types';
import api from './api';

export const profileService = {
  // Get current user's profile
  getProfile: async (): Promise<ProfileDTO> => {
    const response = await api.get('/api/profile');
    return response.data as ProfileDTO;
  },

  // Update current user's profile
  updateProfile: async (profileData: ProfileUpdateDTO): Promise<ProfileDTO> => {
    const response = await api.put('/api/profile', profileData);
    return response.data as ProfileDTO;
  },

  // Upload profile picture
  uploadProfilePicture: async (file: File): Promise<{ message: string; profilePictureUrl: string }> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post('/api/profile/upload-picture', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data as { message: string; profilePictureUrl: string };
  },

  // Change password
  changePassword: async (currentPassword: string, newPassword: string): Promise<{ message: string }> => {
    const response = await api.post('/api/profile/change-password', {
      currentPassword,
      newPassword,
    });
    return response.data as { message: string };
  },

  // Change email
  changeEmail: async (newEmail: string, password: string): Promise<{ message: string }> => {
    const response = await api.post('/api/profile/change-email', {
      newEmail,
      password,
    });
    return response.data as { message: string };
  },

  // Toggle login email notifications on/off
  updateLoginEmailPreference: async (enabled: boolean): Promise<{ loginEmailEnabled: boolean; message: string }> => {
    const response = await api.patch('/api/profile/login-email-preference', { loginEmailEnabled: enabled });
    return response.data as { loginEmailEnabled: boolean; message: string };
  },

  // Update email, sms, marketing notification preferences
  updateNotificationPreferences: async (
    emailNotifications: boolean,
    smsNotifications: boolean,
    marketingEmails: boolean
  ): Promise<{ message: string }> => {
    const response = await api.patch('/api/profile/notification-preferences', {
      emailNotifications,
      smsNotifications,
      marketingEmails,
    });
    return response.data as { message: string };
  },
};