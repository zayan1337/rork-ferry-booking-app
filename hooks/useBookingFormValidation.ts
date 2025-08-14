import { useState, useCallback } from 'react';
import { validateBookingStep } from '@/utils/bookingFormUtils';

interface ValidationErrors {
  tripType: string;
  departureDate: string;
  returnDate: string;
  route: string;
  returnRoute: string;
  seats: string;
  passengers: string;
  paymentMethod: string;
  terms: string;
  trip: string;
  returnTrip: string;
  client: string;
}

interface UseBookingFormValidationProps {
  initialErrors?: Partial<ValidationErrors>;
}

export const useBookingFormValidation = ({
  initialErrors = {},
}: UseBookingFormValidationProps = {}) => {
  const [errors, setErrors] = useState<ValidationErrors>({
    tripType: '',
    departureDate: '',
    returnDate: '',
    route: '',
    returnRoute: '',
    seats: '',
    passengers: '',
    paymentMethod: '',
    terms: '',
    trip: '',
    returnTrip: '',
    client: '',
    ...initialErrors,
  });

  const clearError = useCallback((field: keyof ValidationErrors) => {
    setErrors(prev => ({ ...prev, [field]: '' }));
  }, []);

  const clearAllErrors = useCallback(() => {
    setErrors({
      tripType: '',
      departureDate: '',
      returnDate: '',
      route: '',
      returnRoute: '',
      seats: '',
      passengers: '',
      paymentMethod: '',
      terms: '',
      trip: '',
      returnTrip: '',
      client: '',
    });
  }, []);

  const setError = useCallback(
    (field: keyof ValidationErrors, message: string) => {
      setErrors(prev => ({ ...prev, [field]: message }));
    },
    []
  );

  const validateStep = useCallback((step: number, data: any) => {
    const validation = validateBookingStep(step, data);

    // Clear previous errors for this step
    const stepErrors = Object.keys(validation.errors);
    setErrors(prev => {
      const newErrors = { ...prev };
      stepErrors.forEach(key => {
        if (key in newErrors) {
          newErrors[key as keyof ValidationErrors] =
            validation.errors[key] || '';
        }
      });
      return newErrors;
    });

    return validation.isValid;
  }, []);

  const hasErrors = Object.values(errors).some(error => error.length > 0);

  return {
    errors,
    hasErrors,
    clearError,
    clearAllErrors,
    setError,
    validateStep,
    setErrors,
  };
};
