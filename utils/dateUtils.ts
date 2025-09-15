/**
 * Format a date string for display in booking details
 * @param dateString - ISO date string
 * @returns Formatted date string
 */
export const formatBookingDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

/**
 * Format a date string for simple display
 * @param dateString - ISO date string
 * @returns Formatted date string
 */
export const formatSimpleDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString();
};

/**
 * Calculate hours until a specific date
 * @param dateString - Target date string
 * @returns Number of hours until the target date
 */
export const getHoursUntil = (dateString: string): number => {
  const targetDate = new Date(dateString);
  const now = new Date();
  return (targetDate.getTime() - now.getTime()) / (1000 * 60 * 60);
};

/**
 * Check if a date is in the past
 * @param dateString - Date string to check
 * @returns True if the date is in the past
 */
export const isDateInPast = (dateString: string): boolean => {
  const date = new Date(dateString);
  const now = new Date();
  date.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);
  return date < now;
};

/**
 * Format time string from 24-hour format to 12-hour AM/PM format
 * @param timeString - Time string in format "HH:mm:ss" or "HH:mm"
 * @returns Formatted time string in 12-hour AM/PM format
 */
export const formatTimeAMPM = (timeString: string): string => {
  if (!timeString) return '';

  // Handle both "HH:mm:ss" and "HH:mm" formats
  const timeParts = timeString.split(':');
  const hours = parseInt(timeParts[0], 10);
  const minutes = timeParts[1] || '00';

  // Convert to 12-hour format
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;

  return `${displayHours}:${minutes} ${period}`;
};
