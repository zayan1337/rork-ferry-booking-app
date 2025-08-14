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
