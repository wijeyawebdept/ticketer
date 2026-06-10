/**
 * Checks the current authentication state and logs debugging information
 */
export const debugAuth = () => {
  const token = localStorage.getItem('auth_token');
  const userData = localStorage.getItem('user_data');
  
  if (token) {
    try {
      // Don't use jwt_decode here to avoid import dependencies
      // Just show basic token info
      const parts = token.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(atob(parts[1]));
        
        // Check if token is expired
        const currentTime = Date.now() / 1000;
      }
    } catch (e) {
    }
  }
  
  if (userData) {
    try {
    } catch (e) {
    }
  }
};

/**
 * Clears all authentication data from local storage
 */
export const clearAuth = () => {
  localStorage.removeItem('auth_token');
  localStorage.removeItem('user_data');
  return 'Authentication data cleared successfully!';
};

/**
 * Creates fake authentication data for testing (USE WITH CAUTION)
 */
export const createTestAuthData = () => {
  const fakeToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0LXVzZXItaWQiLCJyb2xlIjoiQURNSU4iLCJleHAiOjQ3Njc2Mzk5OTksImlhdCI6MTYwMDAwMDAwMH0.IU7IzRiSZ-GXisq0pVd8UCIPh_JXioxIkYK9h-jnKOg';
  const fakeUserData = JSON.stringify({
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User'
  });
  
  localStorage.setItem('auth_token', fakeToken);
  localStorage.setItem('user_data', fakeUserData);
  
  return 'Test authentication data created!';
};

const authDebugUtils = {
  debugAuth,
  clearAuth,
  createTestAuthData
};

export default authDebugUtils;
