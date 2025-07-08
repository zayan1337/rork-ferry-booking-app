/**
 * Admin validation utilities for forms and data integrity
 */

/**
 * Validation result interface
 */
export interface ValidationResult {
    isValid: boolean;
    error?: string;
}

/**
 * Validate email format
 */
export function validateEmail(email: string): ValidationResult {
    if (!email) {
        return { isValid: false, error: 'Email is required' };
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return { isValid: false, error: 'Invalid email format' };
    }

    return { isValid: true };
}

/**
 * Validate Maldivian phone number
 */
export function validatePhoneNumber(phone: string): ValidationResult {
    if (!phone) {
        return { isValid: false, error: 'Phone number is required' };
    }

    // Remove all non-digit characters
    const digits = phone.replace(/\D/g, '');

    // Check for valid Maldivian number formats
    if (digits.length === 7) {
        // Local format: 7 digits
        return { isValid: true };
    }

    if (digits.length === 10 && digits.startsWith('960')) {
        // International format: +960 followed by 7 digits
        return { isValid: true };
    }

    return { isValid: false, error: 'Invalid phone number format' };
}

/**
 * Validate vessel name
 */
export function validateVesselName(name: string): ValidationResult {
    if (!name) {
        return { isValid: false, error: 'Vessel name is required' };
    }

    if (name.length < 2) {
        return { isValid: false, error: 'Vessel name must be at least 2 characters' };
    }

    if (name.length > 100) {
        return { isValid: false, error: 'Vessel name must be less than 100 characters' };
    }

    return { isValid: true };
}

/**
 * Validate vessel capacity
 */
export function validateVesselCapacity(capacity: number): ValidationResult {
    if (!capacity || capacity <= 0) {
        return { isValid: false, error: 'Capacity must be greater than 0' };
    }

    if (capacity > 1000) {
        return { isValid: false, error: 'Capacity seems unusually high' };
    }

    if (!Number.isInteger(capacity)) {
        return { isValid: false, error: 'Capacity must be a whole number' };
    }

    return { isValid: true };
}

/**
 * Validate route fare
 */
export function validateRouteFare(fare: number): ValidationResult {
    if (!fare || fare <= 0) {
        return { isValid: false, error: 'Fare must be greater than 0' };
    }

    if (fare > 10000) {
        return { isValid: false, error: 'Fare seems unusually high' };
    }

    // Check if fare has more than 2 decimal places
    if (Number((fare % 1).toFixed(2)) !== fare % 1) {
        return { isValid: false, error: 'Fare can have maximum 2 decimal places' };
    }

    return { isValid: true };
}

/**
 * Validate date (future date for trips)
 */
export function validateFutureDate(dateString: string): ValidationResult {
    if (!dateString) {
        return { isValid: false, error: 'Date is required' };
    }

    const date = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (isNaN(date.getTime())) {
        return { isValid: false, error: 'Invalid date format' };
    }

    if (date < today) {
        return { isValid: false, error: 'Date cannot be in the past' };
    }

    // Check if date is not too far in the future (e.g., 2 years)
    const maxDate = new Date();
    maxDate.setFullYear(maxDate.getFullYear() + 2);

    if (date > maxDate) {
        return { isValid: false, error: 'Date cannot be more than 2 years in the future' };
    }

    return { isValid: true };
}

/**
 * Validate time format (HH:MM)
 */
export function validateTimeFormat(timeString: string): ValidationResult {
    if (!timeString) {
        return { isValid: false, error: 'Time is required' };
    }

    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(timeString)) {
        return { isValid: false, error: 'Invalid time format (use HH:MM)' };
    }

    return { isValid: true };
}

/**
 * Validate user name
 */
export function validateUserName(name: string): ValidationResult {
    if (!name) {
        return { isValid: false, error: 'Name is required' };
    }

    if (name.length < 2) {
        return { isValid: false, error: 'Name must be at least 2 characters' };
    }

    if (name.length > 100) {
        return { isValid: false, error: 'Name must be less than 100 characters' };
    }

    // Check for valid characters (letters, spaces, hyphens, apostrophes)
    const nameRegex = /^[a-zA-Z\s\-'\.]+$/;
    if (!nameRegex.test(name)) {
        return { isValid: false, error: 'Name contains invalid characters' };
    }

    return { isValid: true };
}

/**
 * Validate island name
 */
export function validateIslandName(name: string): ValidationResult {
    if (!name) {
        return { isValid: false, error: 'Island name is required' };
    }

    if (name.length < 2) {
        return { isValid: false, error: 'Island name must be at least 2 characters' };
    }

    if (name.length > 100) {
        return { isValid: false, error: 'Island name must be less than 100 characters' };
    }

    return { isValid: true };
}

/**
 * Validate agent discount percentage
 */
export function validateAgentDiscount(discount: number): ValidationResult {
    if (discount < 0) {
        return { isValid: false, error: 'Discount cannot be negative' };
    }

    if (discount > 100) {
        return { isValid: false, error: 'Discount cannot exceed 100%' };
    }

    // Check if discount has more than 2 decimal places
    if (Number((discount % 1).toFixed(2)) !== discount % 1) {
        return { isValid: false, error: 'Discount can have maximum 2 decimal places' };
    }

    return { isValid: true };
}

/**
 * Validate credit amount
 */
export function validateCreditAmount(amount: number): ValidationResult {
    if (amount < 0) {
        return { isValid: false, error: 'Credit amount cannot be negative' };
    }

    if (amount > 1000000) {
        return { isValid: false, error: 'Credit amount seems unusually high' };
    }

    // Check if amount has more than 2 decimal places
    if (Number((amount % 1).toFixed(2)) !== amount % 1) {
        return { isValid: false, error: 'Amount can have maximum 2 decimal places' };
    }

    return { isValid: true };
}

/**
 * Validate date range
 */
export function validateDateRange(startDate: string, endDate: string): ValidationResult {
    if (!startDate || !endDate) {
        return { isValid: false, error: 'Both start and end dates are required' };
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return { isValid: false, error: 'Invalid date format' };
    }

    if (start > end) {
        return { isValid: false, error: 'Start date cannot be after end date' };
    }

    // Check if range is not too large (e.g., more than 1 year)
    const maxRangeMs = 365 * 24 * 60 * 60 * 1000; // 1 year in milliseconds
    if (end.getTime() - start.getTime() > maxRangeMs) {
        return { isValid: false, error: 'Date range cannot exceed 1 year' };
    }

    return { isValid: true };
}

/**
 * Validate multiple departure times
 */
export function validateDepartureTimes(times: string[]): ValidationResult {
    if (!times || times.length === 0) {
        return { isValid: false, error: 'At least one departure time is required' };
    }

    // Validate each time format
    for (const time of times) {
        const timeValidation = validateTimeFormat(time);
        if (!timeValidation.isValid) {
            return { isValid: false, error: `Invalid time format: ${time}` };
        }
    }

    // Check for duplicate times
    const uniqueTimes = new Set(times);
    if (uniqueTimes.size !== times.length) {
        return { isValid: false, error: 'Duplicate departure times are not allowed' };
    }

    return { isValid: true };
}

/**
 * Validate days of week selection
 */
export function validateDaysOfWeek(days: number[]): ValidationResult {
    if (!days || days.length === 0) {
        return { isValid: false, error: 'At least one day must be selected' };
    }

    // Check if all values are valid day numbers (0-6)
    for (const day of days) {
        if (day < 0 || day > 6 || !Number.isInteger(day)) {
            return { isValid: false, error: 'Invalid day of week value' };
        }
    }

    // Check for duplicates
    const uniqueDays = new Set(days);
    if (uniqueDays.size !== days.length) {
        return { isValid: false, error: 'Duplicate days are not allowed' };
    }

    return { isValid: true };
}

/**
 * Validate form data with multiple fields
 */
export function validateForm(data: Record<string, any>, rules: Record<string, (value: any) => ValidationResult>): { isValid: boolean; errors: Record<string, string> } {
    const errors: Record<string, string> = {};
    let isValid = true;

    for (const [field, validator] of Object.entries(rules)) {
        const result = validator(data[field]);
        if (!result.isValid) {
            errors[field] = result.error || 'Invalid value';
            isValid = false;
        }
    }

    return { isValid, errors };
}

/**
 * Validate booking capacity
 */
export function validateBookingCapacity(requestedSeats: number, availableSeats: number): ValidationResult {
    if (!requestedSeats || requestedSeats <= 0) {
        return { isValid: false, error: 'Number of seats must be greater than 0' };
    }

    if (!Number.isInteger(requestedSeats)) {
        return { isValid: false, error: 'Number of seats must be a whole number' };
    }

    if (requestedSeats > availableSeats) {
        return { isValid: false, error: `Only ${availableSeats} seats available` };
    }

    if (requestedSeats > 20) {
        return { isValid: false, error: 'Cannot book more than 20 seats at once' };
    }

    return { isValid: true };
}

/**
 * Validate search query
 */
export function validateSearchQuery(query: string): ValidationResult {
    if (!query) {
        return { isValid: false, error: 'Search query is required' };
    }

    if (query.length < 2) {
        return { isValid: false, error: 'Search query must be at least 2 characters' };
    }

    if (query.length > 100) {
        return { isValid: false, error: 'Search query is too long' };
    }

    return { isValid: true };
} 