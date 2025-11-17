/**
 * Format currency for display
 * @param amount - The amount to format
 * @param currency - Currency symbol (default: MVR)
 * @param locale - Locale for formatting (default: en-US)
 * @returns Formatted currency string
 */
export const formatCurrency = (
  amount: number | undefined,
  currency: string = 'MVR',
  locale: string = 'en-US'
): string => {
  if (typeof amount !== 'number' || isNaN(amount)) {
    return `${currency} 0.00`;
  }

  return `${currency} ${amount.toLocaleString(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

/**
 * Format MVR currency specifically
 * @param amount - The amount to format
 * @returns Formatted MVR currency string
 */
export const formatMVR = (amount: number | undefined): string => {
  return formatCurrency(amount, 'MVR ');
};

/**
 * Format USD currency specifically (now returns MVR)
 * @param amount - The amount to format
 * @returns Formatted MVR currency stringr
 */
export const formatUSD = (amount: number | undefined): string => {
  return formatCurrency(amount, 'MVR');
};

/**
 * Parse currency string to number
 * @param currencyString - String with currency formatting
 * @returns Parsed number or 0 if invalid
 */
export const parseCurrency = (currencyString: string): number => {
  if (!currencyString) return 0;

  // Remove currency symbols and parse
  const cleanString = currencyString.replace(/[^0-9.-]/g, '');
  const parsed = parseFloat(cleanString);

  return isNaN(parsed) ? 0 : parsed;
};

/**
 * Validate currency amount
 * @param amount - Amount to validate
 * @param minAmount - Minimum allowed amount (default: 0)
 * @param maxAmount - Maximum allowed amount (optional)
 * @returns Validation result
 */
export const validateCurrencyAmount = (
  amount: number,
  minAmount: number = 0,
  maxAmount?: number
): { isValid: boolean; error?: string } => {
  if (isNaN(amount)) {
    return { isValid: false, error: 'Invalid amount' };
  }

  if (amount < minAmount) {
    return {
      isValid: false,
      error: `Amount must be at least ${formatCurrency(minAmount)}`,
    };
  }

  if (maxAmount !== undefined && amount > maxAmount) {
    return {
      isValid: false,
      error: `Amount cannot exceed ${formatCurrency(maxAmount)}`,
    };
  }

  return { isValid: true };
};
