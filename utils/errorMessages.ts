/**
 * User-friendly error message mapping
 */

export interface ErrorContext {
  operation: string;
  entity?: string;
  details?: Record<string, any>;
}

/**
 * Get user-friendly error message
 */
export function getUserFriendlyErrorMessage(
  error: any,
  context?: ErrorContext
): string {
  const errorMessage = error?.message || String(error) || 'An error occurred';

  // Network errors
  if (
    errorMessage.includes('network') ||
    errorMessage.includes('timeout') ||
    errorMessage.includes('fetch')
  ) {
    return 'Connection error. Please check your internet connection and try again.';
  }

  // Authentication errors
  if (
    errorMessage.includes('auth') ||
    errorMessage.includes('unauthorized') ||
    errorMessage.includes('permission')
  ) {
    return 'You need to sign in to perform this action. Please sign in and try again.';
  }

  // Booking-specific errors
  if (errorMessage.includes('seat') && errorMessage.includes('available')) {
    return 'This seat is no longer available. Please select a different seat.';
  }

  if (errorMessage.includes('seat') && errorMessage.includes('reserved')) {
    return 'This seat has been reserved by another user. Please select a different seat.';
  }

  if (errorMessage.includes('trip') && errorMessage.includes('available')) {
    return 'This trip is no longer available for booking. Please select a different trip.';
  }

  if (errorMessage.includes('booking') && errorMessage.includes('not found')) {
    return 'Booking not found. It may have been cancelled or deleted.';
  }

  if (errorMessage.includes('booking') && errorMessage.includes('modified')) {
    return 'This booking was modified by another process. Please refresh and try again.';
  }

  // Payment errors
  if (errorMessage.includes('payment') && errorMessage.includes('failed')) {
    return 'Payment processing failed. Please try again or use a different payment method.';
  }

  if (errorMessage.includes('payment') && errorMessage.includes('expired')) {
    return 'Payment session expired. Please start a new booking.';
  }

  // Validation errors
  if (errorMessage.includes('required') || errorMessage.includes('missing')) {
    return 'Please fill in all required fields.';
  }

  if (errorMessage.includes('invalid')) {
    return 'Invalid information provided. Please check your input and try again.';
  }

  // Database errors
  if (errorMessage.includes('constraint') || errorMessage.includes('unique')) {
    return 'This action cannot be completed due to a conflict. Please refresh and try again.';
  }

  // Generic fallback
  if (context?.operation) {
    return `Failed to ${context.operation}. ${errorMessage}`;
  }

  return errorMessage;
}

/**
 * Get actionable next steps for an error
 */
export function getErrorNextSteps(
  error: any,
  context?: ErrorContext
): string[] {
  const errorMessage = error?.message || String(error) || '';
  const steps: string[] = [];

  // Network errors
  if (
    errorMessage.includes('network') ||
    errorMessage.includes('timeout') ||
    errorMessage.includes('fetch')
  ) {
    steps.push('Check your internet connection');
    steps.push('Try again in a few moments');
    steps.push('Contact support if the problem persists');
  }

  // Seat availability errors
  if (errorMessage.includes('seat') && errorMessage.includes('available')) {
    steps.push('Refresh the seat selection');
    steps.push('Choose a different seat');
  }

  // Booking modification errors
  if (errorMessage.includes('booking') && errorMessage.includes('modified')) {
    steps.push('Refresh the booking details');
    steps.push('Check if the booking was updated');
    steps.push('Try your modification again');
  }

  // Payment errors
  if (errorMessage.includes('payment')) {
    steps.push('Verify your payment method');
    steps.push('Try a different payment method');
    steps.push('Contact support if payment issues continue');
  }

  return steps;
}
