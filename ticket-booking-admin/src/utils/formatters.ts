/**
 * Format phone number to a readable format
 */
export const formatPhoneNumber = (phoneNumber: string | undefined | null): string => {
  if (!phoneNumber) return 'N/A';
  
  // Remove all non-digit characters except '+'
  const cleaned = phoneNumber.replace(/[^\d+]/g, '');
  
  // Handle international format with country code
  if (cleaned.startsWith('+')) {
    const countryCode = cleaned.substring(0, 3); // e.g., +94
    const remaining = cleaned.substring(3);
    
    // Format: +94 71 234 5678
    if (remaining.length >= 9) {
      return `${countryCode} ${remaining.substring(0, 2)} ${remaining.substring(2, 5)} ${remaining.substring(5)}`;
    }
    return cleaned;
  }
  
  // Handle local Sri Lankan format (071 234 5678)
  if (cleaned.length === 10 && cleaned.startsWith('0')) {
    return `${cleaned.substring(0, 3)} ${cleaned.substring(3, 6)} ${cleaned.substring(6)}`;
  }
  
  // Handle US/general format (123 456 7890)
  if (cleaned.length === 10) {
    return `${cleaned.substring(0, 3)} ${cleaned.substring(3, 6)} ${cleaned.substring(6)}`;
  }
  
  // Default formatting for other lengths
  if (cleaned.length > 6) {
    return `${cleaned.substring(0, 3)} ${cleaned.substring(3, 6)} ${cleaned.substring(6)}`;
  }
  
  return cleaned || 'N/A';
};

/**
 * Format date to a readable format
 */
export const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString) return 'N/A';
  
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

/**
 * Format date and time to a readable format
 */
export const formatDateTime = (dateString: string | null | undefined): string => {
  if (!dateString) return 'N/A';
  
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

/**
 * Format currency
 */
export const formatCurrency = (amount: number | null | undefined, currency: string = 'USD'): string => {
  if (amount === null || amount === undefined) return 'N/A';
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency
  }).format(amount);
};
