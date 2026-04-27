/**
 * Countdown Timer Utilities
 * Provides functions to calculate and format time remaining until a target date/time
 */

/**
 * Calculate milliseconds remaining from now until target date and time
 * @param targetDate - Date string (YYYY-MM-DD format)
 * @param targetTime - Time string (HH:MM:SS or HH:MM format, can include end time like "18:00:00 - 21:00:00")
 * @returns Milliseconds remaining, or 0 if the target time has passed
 */
export const calculateTimeRemaining = (targetDate: string, targetTime: string): number => {
  try {
    // Extract just the start time if it's a time range (e.g., "18:00:00 - 21:00:00")
    const startTime = targetTime.split(' - ')[0].trim();
    
    // Combine date and time into a full datetime string
    const dateTimeString = `${targetDate}T${startTime}`;
    const targetDateTime = new Date(dateTimeString).getTime();
    const now = new Date().getTime();
    const remaining = targetDateTime - now;

    // Return 0 if time has passed, otherwise return remaining time
    return remaining > 0 ? remaining : 0;
  } catch (error) {
    return 0;
  }
};

/**
 * Format milliseconds into human-readable countdown format
 * @param milliseconds - Milliseconds to format
 * @returns Formatted string like "2 days, 14 hours, 32 minutes"
 */
export const formatCountdown = (milliseconds: number): string => {
  if (milliseconds <= 0) {
    return '';
  }

  const totalSeconds = Math.floor(milliseconds / 1000);
  const days = Math.floor(totalSeconds / (24 * 60 * 60));
  const hours = Math.floor((totalSeconds % (24 * 60 * 60)) / (60 * 60));
  const minutes = Math.floor((totalSeconds % (60 * 60)) / 60);

  const parts: string[] = [];

  if (days > 0) {
    parts.push(`${days} day${days > 1 ? 's' : ''}`);
  }

  if (hours > 0) {
    parts.push(`${hours} hour${hours > 1 ? 's' : ''}`);
  }

  if (minutes > 0) {
    parts.push(`${minutes} minute${minutes > 1 ? 's' : ''}`);
  }

  // If less than a minute, show "less than 1 minute"
  if (parts.length === 0) {
    return 'less than 1 minute';
  }

  return parts.join(', ');
};

/**
 * Get countdown status based on remaining time
 * Useful for styling or behavior decisions
 * @param milliseconds - Milliseconds remaining
 * @returns 'urgent' | 'warning' | 'normal' | 'expired'
 */
export const getCountdownStatus = (milliseconds: number): 'urgent' | 'warning' | 'normal' | 'expired' => {
  if (milliseconds <= 0) {
    return 'expired';
  }

  const hours = milliseconds / (60 * 60 * 1000);

  if (hours < 1) {
    return 'urgent';
  }

  if (hours < 24) {
    return 'warning';
  }

  return 'normal';
};
