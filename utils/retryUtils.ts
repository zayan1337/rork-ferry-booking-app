/**
 * Retry utility functions for network operations
 */

export interface RetryOptions {
  maxRetries?: number;
  delay?: number;
  exponentialBackoff?: boolean;
  onRetry?: (attempt: number, error: any) => void;
}

/**
 * Retry an async operation with exponential backoff
 */
export async function retryOperation<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    delay = 1000,
    exponentialBackoff = true,
    onRetry,
  } = options;

  let lastError: any;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      // Don't retry on last attempt
      if (attempt === maxRetries - 1) {
        break;
      }

      // Calculate delay with exponential backoff
      const retryDelay = exponentialBackoff
        ? delay * Math.pow(2, attempt)
        : delay;

      // Call onRetry callback if provided
      if (onRetry) {
        onRetry(attempt + 1, error);
      }

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }
  }

  throw lastError;
}

/**
 * Check if an error is retryable (network errors, timeouts, etc.)
 */
export function isRetryableError(error: any): boolean {
  if (!error) return false;

  // Network errors
  if (
    error.message?.includes('network') ||
    error.message?.includes('timeout')
  ) {
    return true;
  }

  // Supabase connection errors
  if (error.code === 'PGRST116' || error.code === 'PGRST301') {
    return true;
  }

  // Generic fetch errors
  if (error.name === 'TypeError' && error.message?.includes('fetch')) {
    return true;
  }

  return false;
}

/**
 * Retry operation only if error is retryable
 */
export async function retryIfRetryable<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (isRetryableError(error)) {
      return await retryOperation(operation, options);
    }
    throw error;
  }
}
