// API Debugging Utility
import axios from 'axios';

// Use the same base URL logic as your api.ts
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8081';

/**
 * Test the login endpoint to verify it's working correctly
 */
export const testLoginEndpoint = async () => {
  console.group('Testing Login Endpoint');
  
  try {
    // Try with /api/auth/login (correct endpoint)
    console.log('Trying /api/auth/login...');
    try {
      const response = await axios.post(`${API_URL}/api/auth/login`, {
        email: 'admin@ticketbooking.com',
        password: '1234'
      });
      console.log('Success with /api/auth/login!', response.status);
      console.log('Response:', response.data);
      return { success: true, endpoint: '/api/auth/login', response: response.data };
    } catch (error) {
      console.error('Error with /api/auth/login:', error);
    }
    
    // Try with /auth/login (incorrect endpoint)
    console.log('Trying /auth/login...');
    try {
      const response = await axios.post(`${API_URL}/auth/login`, {
        email: 'admin@ticketbooking.com',
        password: '1234'
      });
      console.log('Success with /auth/login!', response.status);
      console.log('Response:', response.data);
      return { success: true, endpoint: '/auth/login', response: response.data };
    } catch (error) {
      console.error('Error with /auth/login:', error);
    }
    
    // Try with the absolute URL
    const backendUrl = 'http://localhost:8081/api/auth/login';
    console.log(`Trying direct URL: ${backendUrl}...`);
    try {
      const response = await axios.post(backendUrl, {
        email: 'admin@ticketbooking.com',
        password: '1234'
      });
      console.log(`Success with ${backendUrl}!`, response.status);
      console.log('Response:', response.data);
      return { success: true, endpoint: backendUrl, response: response.data };
    } catch (error) {
      console.error(`Error with ${backendUrl}:`, error);
    }
    
    return { success: false, error: 'All endpoints failed' };
  } finally {
    console.groupEnd();
  }
};

/**
 * Test the register endpoint to verify it's working correctly
 */
export const testRegisterEndpoint = async () => {
  console.group('Testing Register Endpoint');
  
  const testUser = {
    email: `test-user-${Date.now()}@example.com`,
    password: 'Test1234',
    firstName: 'Test',
    lastName: 'User',
    phoneNumber: '1234567890',
    role: 'USER'
  };
  
  try {
    // Try with /api/auth/register (correct endpoint)
    console.log('Trying /api/auth/register...');
    try {
      const response = await axios.post(`${API_URL}/api/auth/register`, testUser);
      console.log('Success with /api/auth/register!', response.status);
      console.log('Response:', response.data);
      return { success: true, endpoint: '/api/auth/register', response: response.data };
    } catch (error) {
      console.error('Error with /api/auth/register:', error);
    }
    
    // Try with /auth/register (incorrect endpoint)
    console.log('Trying /auth/register...');
    try {
      const response = await axios.post(`${API_URL}/auth/register`, testUser);
      console.log('Success with /auth/register!', response.status);
      console.log('Response:', response.data);
      return { success: true, endpoint: '/auth/register', response: response.data };
    } catch (error) {
      console.error('Error with /auth/register:', error);
    }
    
    return { success: false, error: 'All endpoints failed' };
  } finally {
    console.groupEnd();
  }
};

const apiTestUtils = {
  testLoginEndpoint,
  testRegisterEndpoint
};

export default apiTestUtils;