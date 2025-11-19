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
 * Normalize time format to ensure proper parsing by JavaScript Date
 * Handles formats: HH:mm, HH:mm:ss, HH:mm:ss.SSS, Date objects, and null/undefined
 * @param timeStr - Time string or Date object
 * @returns Normalized time string in HH:mm:ss format
 */
export const normalizeTime = (timeStr: string | Date | null | undefined): string => {
  // Handle null, undefined, or empty string
  if (!timeStr) {
    return '00:00:00';
  }

  // If it's a Date object, extract time
  if (timeStr instanceof Date) {
    const hours = timeStr.getHours().toString().padStart(2, '0');
    const minutes = timeStr.getMinutes().toString().padStart(2, '0');
    const seconds = timeStr.getSeconds().toString().padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  }

  // Convert to string and remove any whitespace
  let cleanTime = String(timeStr).trim();

  // Remove any timezone indicators or extra characters
  cleanTime = cleanTime.replace(/[TZ\+\-].*$/, ''); // Remove timezone info if present

  // If empty after cleaning, return default
  if (!cleanTime || cleanTime === 'null' || cleanTime === 'undefined') {
    return '00:00:00';
  }

  // If time is in HH:mm format, add seconds
  if (/^\d{2}:\d{2}$/.test(cleanTime)) {
    return `${cleanTime}:00`;
  }

  // If time is in HH:mm:ss format, return as is
  if (/^\d{2}:\d{2}:\d{2}$/.test(cleanTime)) {
    return cleanTime;
  }

  // If time is in HH:mm:ss.SSS format, remove milliseconds
  if (/^\d{2}:\d{2}:\d{2}\./.test(cleanTime)) {
    return cleanTime.split('.')[0];
  }

  // If time is in H:mm format (single digit hour), pad it
  if (/^\d{1}:\d{2}$/.test(cleanTime)) {
    return `0${cleanTime}:00`;
  }

  // If time is in H:mm:ss format (single digit hour), pad it
  if (/^\d{1}:\d{2}:\d{2}$/.test(cleanTime)) {
    return `0${cleanTime}`;
  }

  // Try to extract time from ISO string format (e.g., "2025-11-18T20:00:00Z")
  const isoMatch = cleanTime.match(/T(\d{2}):(\d{2}):?(\d{2})?/);
  if (isoMatch) {
    const hours = isoMatch[1];
    const minutes = isoMatch[2];
    const seconds = isoMatch[3] || '00';
    return `${hours}:${minutes}:${seconds}`;
  }

  // Return as-is if we can't normalize it
  return cleanTime;
};

/**
 * Format time string from 24-hour format to 12-hour AM/PM format
 * @param timeString - Time string in format "HH:mm:ss" or "HH:mm"
 * @returns Formatted time string in 12-hour AM/PM format
 */
export const formatTimeAMPM = (timeString: string): string => {
  if (!timeString) return '';

  // Normalize the time first to ensure consistent format
  const normalized = normalizeTime(timeString);

  // Handle both "HH:mm:ss" and "HH:mm" formats
  const timeParts = normalized.split(':');
  const hours = parseInt(timeParts[0], 10);
  const minutes = timeParts[1] || '00';

  // Convert to 12-hour format
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;

  return `${displayHours}:${minutes} ${period}`;
};
