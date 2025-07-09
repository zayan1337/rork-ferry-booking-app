import { useState, useCallback } from 'react';
import type { BookingFormErrors, BankDetails } from '@/types/pages/booking';

interface UseFormValidationProps {
  validateBankDetails?: boolean;
}

export const useFormValidation = ({ validateBankDetails = false }: UseFormValidationProps = {}) => {
  const [errors, setErrors] = useState<BookingFormErrors>({});

  const clearError = useCallback((field: keyof BookingFormErrors) => {
    setErrors(prev => ({ ...prev, [field]: '' }));
  }, []);

  const setError = useCallback((field: keyof BookingFormErrors, message: string) => {
    setErrors(prev => ({ ...prev, [field]: message }));
  }, []);

  const validateRequired = useCallback((value: string, fieldName: string): string => {
    if (!value?.trim()) {
      return `${fieldName} is required`;
    }
    return '';
  }, []);

  const validateBankDetailsForm = useCallback((bankDetails: BankDetails): BookingFormErrors => {
    const newErrors: BookingFormErrors = {};

    const accountNumberError = validateRequired(bankDetails.accountNumber, 'Account number');
    if (accountNumberError) newErrors.accountNumber = accountNumberError;

    const accountNameError = validateRequired(bankDetails.accountName, 'Account name');
    if (accountNameError) newErrors.accountName = accountNameError;

    const bankNameError = validateRequired(bankDetails.bankName, 'Bank name');
    if (bankNameError) newErrors.bankName = bankNameError;

    return newErrors;
  }, [validateRequired]);

  const validateCancellationForm = useCallback((reason: string, bankDetails: BankDetails): boolean => {
    let isValid = true;
    const newErrors: BookingFormErrors = {};

    const reasonError = validateRequired(reason, 'Cancellation reason');
    if (reasonError) {
      newErrors.reason = reasonError;
      isValid = false;
    }

    if (validateBankDetails) {
      const bankErrors = validateBankDetailsForm(bankDetails);
      Object.assign(newErrors, bankErrors);
      if (Object.keys(bankErrors).length > 0) {
        isValid = false;
      }
    }

    setErrors(newErrors);
    return isValid;
  }, [validateRequired, validateBankDetailsForm, validateBankDetails]);

  const resetErrors = useCallback(() => {
    setErrors({});
  }, []);

  return {
    errors,
    setErrors,
    clearError,
    setError,
    validateRequired,
    validateBankDetailsForm,
    validateCancellationForm,
    resetErrors,
  };
}; 