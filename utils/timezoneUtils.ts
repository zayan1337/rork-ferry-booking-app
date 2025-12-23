/**
 * Timezone utilities for Maldives (Asia/Maldives - UTC+5)
 *
 * This module centralizes all timezone handling for the ferry booking app.
 * The Maldives timezone is UTC+5, and all trip times stored in the database
 * are in Maldives local time.
 *
 * IMPORTANT: When parsing dates/times from the database:
 * - travel_date is stored as DATE (no timezone) - represents Maldives local date
 * - departure_time is stored as TIME (no timezone) - represents Maldives local time
 * - Timestamps (created_at, etc.) are stored as TIMESTAMPTZ (UTC)
 *
 * NOTE: React Native's Hermes engine on Android doesn't support all IANA timezone names.
 * We use manual UTC offset calculations as a fallback when timezone names fail.
 */

export const MALDIVES_TIMEZONE = 'Asia/Maldives';
export const MALDIVES_UTC_OFFSET_HOURS = 5;
export const MALDIVES_UTC_OFFSET_MS =
  MALDIVES_UTC_OFFSET_HOURS * 60 * 60 * 1000;

/**
 * Check if the platform supports IANA timezone names.
 * Hermes on Android often doesn't support them.
 */
let _supportsTimezoneNames: boolean | null = null;

function supportsTimezoneNames(): boolean {
  if (_supportsTimezoneNames !== null) {
    return _supportsTimezoneNames;
  }

  try {
    // Try to format with timezone - will throw on unsupported platforms
    new Date().toLocaleString('en-US', { timeZone: 'Asia/Maldives' });
    _supportsTimezoneNames = true;
  } catch {
    _supportsTimezoneNames = false;
  }

  return _supportsTimezoneNames;
}

/**
 * Get a Date object adjusted to Maldives local time (for display purposes).
 * This creates a "fake" local time by adding the UTC offset.
 */
function getMaldivesLocalDate(date: Date): Date {
  // Get UTC time and add Maldives offset
  return new Date(date.getTime() + MALDIVES_UTC_OFFSET_MS);
}

/**
 * Parse a Maldives local date and time into a JavaScript Date object.
 *
 * Since trip dates and times are stored as Maldives local time (without timezone),
 * we need to interpret them correctly regardless of the user's device timezone.
 *
 * @param dateStr - Date string in YYYY-MM-DD format (Maldives local date)
 * @param timeStr - Time string in HH:MM or HH:MM:SS format (Maldives local time)
 * @returns Date object representing the correct UTC timestamp
 *
 * @example
 * // Trip departs at 14:00 Maldives time on 2025-12-20
 * const tripTime = parseMaldivesDateTime('2025-12-20', '14:00');
 * // Returns a Date representing 2025-12-20T09:00:00.000Z (UTC)
 */
export function parseMaldivesDateTime(dateStr: string, timeStr: string): Date {
  if (!dateStr || !timeStr) {
    console.warn('parseMaldivesDateTime: Missing date or time string');
    return new Date(NaN);
  }

  try {
    // Normalize time string to HH:MM format
    const timeNormalized = timeStr.substring(0, 5);

    // Parse the components
    const [year, month, day] = dateStr.split('-').map(Number);
    const [hours, minutes] = timeNormalized.split(':').map(Number);

    // Validate parsed values
    if (
      isNaN(year) ||
      isNaN(month) ||
      isNaN(day) ||
      isNaN(hours) ||
      isNaN(minutes)
    ) {
      console.warn(
        'parseMaldivesDateTime: Invalid date/time components',
        dateStr,
        timeStr
      );
      return new Date(NaN);
    }

    // Create a UTC date representing the Maldives local time
    // Month is 0-indexed in JavaScript
    const utcDate = Date.UTC(year, month - 1, day, hours, minutes, 0, 0);

    // Subtract Maldives offset to convert from "Maldives local" to actual UTC
    // If it's 14:00 in Maldives (UTC+5), it's 09:00 UTC
    return new Date(utcDate - MALDIVES_UTC_OFFSET_MS);
  } catch (error) {
    console.error('parseMaldivesDateTime: Error parsing date/time', error);
    return new Date(NaN);
  }
}

/**
 * Parse a date-only string as Maldives local date (start of day).
 *
 * @param dateStr - Date string in YYYY-MM-DD format
 * @returns Date object representing midnight Maldives time
 */
export function parseMaldivesDate(dateStr: string): Date {
  return parseMaldivesDateTime(dateStr, '00:00');
}

/**
 * Get the current time as a Date object.
 * This is simply Date.now() but provided for consistency in the API.
 *
 * @returns Current Date object
 */
export function getNow(): Date {
  return new Date();
}

/**
 * Get the current date in Maldives as a YYYY-MM-DD string.
 *
 * @returns Date string in YYYY-MM-DD format (Maldives local date)
 */
export function getMaldivesTodayString(): string {
  const now = new Date();
  return formatDateInMaldives(now, 'YYYY-MM-DD');
}

/**
 * Format a Date object for display in Maldives timezone.
 * Uses native timezone support when available, falls back to manual offset calculation.
 *
 * @param date - Date object or ISO date string
 * @param format - Format type: 'full', 'date', 'time', 'datetime', or 'YYYY-MM-DD'
 * @returns Formatted string in Maldives timezone
 */
export function formatDateInMaldives(
  date: Date | string,
  format:
    | 'full'
    | 'date'
    | 'time'
    | 'datetime'
    | 'YYYY-MM-DD'
    | 'short-date'
    | 'month-year'
    | 'month-short'
    | 'weekday-short'
    | 'month-long'
    | 'month-year-short' = 'datetime'
): string {
  try {
    const d = typeof date === 'string' ? new Date(date) : date;

    if (isNaN(d.getTime())) {
      return 'Invalid Date';
    }

    // Try native timezone support first
    if (supportsTimezoneNames()) {
      const options: Intl.DateTimeFormatOptions = {
        timeZone: MALDIVES_TIMEZONE,
      };

      switch (format) {
        case 'full':
          return d.toLocaleString('en-US', {
            ...options,
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
          });

        case 'date':
          return d.toLocaleDateString('en-US', {
            ...options,
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          });

        case 'short-date':
          return d.toLocaleDateString('en-US', {
            ...options,
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          });

        case 'time':
          return d.toLocaleTimeString('en-US', {
            ...options,
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
          });

        case 'YYYY-MM-DD':
          return d.toLocaleDateString('en-CA', options);

        case 'month-year':
          return d.toLocaleDateString('en-US', {
            ...options,
            month: 'long',
            year: 'numeric',
          });

        case 'month-short':
          return d.toLocaleDateString('en-US', {
            ...options,
            month: 'short',
          });

        case 'weekday-short':
          return d.toLocaleDateString('en-US', {
            ...options,
            weekday: 'short',
          });

        case 'month-long':
          return d.toLocaleDateString('en-US', {
            ...options,
            month: 'long',
          });

        case 'month-year-short':
          return d.toLocaleDateString('en-US', {
            ...options,
            month: 'short',
            year: 'numeric',
          });

        case 'datetime':
        default:
          return d.toLocaleString('en-US', {
            ...options,
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
          });
      }
    }

    // Fallback: Manual offset calculation for platforms that don't support timezone names
    const maldivesDate = getMaldivesLocalDate(d);

    switch (format) {
      case 'full':
        return maldivesDate.toLocaleString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
          timeZone: 'UTC', // Use UTC since we already adjusted the time
        });

      case 'date':
        return maldivesDate.toLocaleDateString('en-US', {
          weekday: 'short',
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          timeZone: 'UTC',
        });

      case 'short-date':
        return maldivesDate.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          timeZone: 'UTC',
        });

      case 'time':
        return maldivesDate.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
          timeZone: 'UTC',
        });

      case 'YYYY-MM-DD':
        return maldivesDate.toLocaleDateString('en-CA', { timeZone: 'UTC' });

      case 'month-year':
        return maldivesDate.toLocaleDateString('en-US', {
          month: 'long',
          year: 'numeric',
          timeZone: 'UTC',
        });

      case 'month-short':
        return maldivesDate.toLocaleDateString('en-US', {
          month: 'short',
          timeZone: 'UTC',
        });

      case 'weekday-short':
        return maldivesDate.toLocaleDateString('en-US', {
          weekday: 'short',
          timeZone: 'UTC',
        });

      case 'month-long':
        return maldivesDate.toLocaleDateString('en-US', {
          month: 'long',
          timeZone: 'UTC',
        });

      case 'month-year-short':
        return maldivesDate.toLocaleDateString('en-US', {
          month: 'short',
          year: 'numeric',
          timeZone: 'UTC',
        });

      case 'datetime':
      default:
        return maldivesDate.toLocaleString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
          timeZone: 'UTC',
        });
    }
  } catch (error) {
    console.error('formatDateInMaldives: Error formatting date', error);
    return 'Invalid Date';
  }
}

/**
 * Compare two dates ignoring time (date-only comparison in Maldives timezone).
 *
 * @param date1 - First date
 * @param date2 - Second date
 * @returns -1 if date1 < date2, 0 if equal, 1 if date1 > date2
 */
export function compareDatesInMaldives(
  date1: Date | string,
  date2: Date | string
): number {
  const d1 = typeof date1 === 'string' ? new Date(date1) : date1;
  const d2 = typeof date2 === 'string' ? new Date(date2) : date2;

  const str1 = formatDateInMaldives(d1, 'YYYY-MM-DD');
  const str2 = formatDateInMaldives(d2, 'YYYY-MM-DD');

  if (str1 < str2) return -1;
  if (str1 > str2) return 1;
  return 0;
}

/**
 * Check if a Maldives local date is in the past (before today in Maldives).
 *
 * @param dateStr - Date string in YYYY-MM-DD format
 * @returns true if the date is before today in Maldives timezone
 */
export function isMaldivesDateInPast(dateStr: string): boolean {
  const today = getMaldivesTodayString();
  return dateStr < today;
}

/**
 * Check if a Maldives local datetime is in the past.
 *
 * @param dateStr - Date string in YYYY-MM-DD format
 * @param timeStr - Time string in HH:MM or HH:MM:SS format
 * @returns true if the datetime has passed
 */
export function isMaldivesDateTimeInPast(
  dateStr: string,
  timeStr: string
): boolean {
  const tripTime = parseMaldivesDateTime(dateStr, timeStr);
  return tripTime.getTime() < Date.now();
}

/**
 * Calculate milliseconds until a Maldives local datetime.
 *
 * @param dateStr - Date string in YYYY-MM-DD format
 * @param timeStr - Time string in HH:MM or HH:MM:SS format
 * @returns Milliseconds until the datetime (negative if in past)
 */
export function getMillisecondsUntilMaldivesDateTime(
  dateStr: string,
  timeStr: string
): number {
  const tripTime = parseMaldivesDateTime(dateStr, timeStr);
  return tripTime.getTime() - Date.now();
}

/**
 * Calculate minutes until a Maldives local datetime.
 *
 * @param dateStr - Date string in YYYY-MM-DD format
 * @param timeStr - Time string in HH:MM or HH:MM:SS format
 * @returns Minutes until the datetime (negative if in past)
 */
export function getMinutesUntilMaldivesDateTime(
  dateStr: string,
  timeStr: string
): number {
  const ms = getMillisecondsUntilMaldivesDateTime(dateStr, timeStr);
  return Math.floor(ms / (60 * 1000));
}

/**
 * Get hours until a specific date in Maldives timezone.
 *
 * @param dateString - ISO date string or date string
 * @returns Number of hours until the target date
 */
export function getHoursUntilInMaldives(dateString: string): number {
  const targetDate = new Date(dateString);
  const now = new Date();
  return (targetDate.getTime() - now.getTime()) / (1000 * 60 * 60);
}

/**
 * Create a Date object from date and time components, treating them as Maldives local time.
 * This is useful for combining departure date and time from the database.
 *
 * @param date - Date object or date string
 * @param hours - Hours (0-23)
 * @param minutes - Minutes (0-59)
 * @returns Date object representing the Maldives local time
 */
export function createMaldivesDateTime(
  date: Date | string,
  hours: number,
  minutes: number
): Date {
  const dateStr =
    typeof date === 'string' ? date : formatDateInMaldives(date, 'YYYY-MM-DD');
  const timeStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  return parseMaldivesDateTime(dateStr, timeStr);
}

/**
 * Convert a UTC timestamp to Maldives local time components.
 * Uses native timezone support when available, falls back to manual offset calculation.
 *
 * @param date - Date object
 * @returns Object with Maldives local time components
 */
export function getMaldivesTimeComponents(date: Date): {
  year: number;
  month: number;
  day: number;
  hours: number;
  minutes: number;
  seconds: number;
} {
  // Try native timezone support first
  if (supportsTimezoneNames()) {
    try {
      const maldivesStr = date.toLocaleString('en-US', {
        timeZone: MALDIVES_TIMEZONE,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      });

      // Parse the formatted string
      // Format: MM/DD/YYYY, HH:MM:SS
      const match = maldivesStr.match(
        /(\d{2})\/(\d{2})\/(\d{4}),?\s*(\d{2}):(\d{2}):(\d{2})/
      );

      if (match) {
        return {
          month: parseInt(match[1], 10),
          day: parseInt(match[2], 10),
          year: parseInt(match[3], 10),
          hours: parseInt(match[4], 10),
          minutes: parseInt(match[5], 10),
          seconds: parseInt(match[6], 10),
        };
      }
    } catch {
      // Fall through to manual calculation
    }
  }

  // Fallback: Manual UTC + offset calculation
  const maldivesTime = getMaldivesLocalDate(date);
  return {
    year: maldivesTime.getUTCFullYear(),
    month: maldivesTime.getUTCMonth() + 1,
    day: maldivesTime.getUTCDate(),
    hours: maldivesTime.getUTCHours(),
    minutes: maldivesTime.getUTCMinutes(),
    seconds: maldivesTime.getUTCSeconds(),
  };
}
