import { useMemo, useCallback } from 'react';
import type { StepValidation } from '@/types/customer';
import { BOOKING_STEPS, TRIP_TYPES } from '@/constants/customer';

interface UseBookingFormProps {
  currentBooking: any;
  currentStep: number;
  localSelectedSeats: any[];
  localReturnSelectedSeats: any[];
  paymentMethod: string;
  termsAccepted: boolean;
}

export const useBookingForm = ({
  currentBooking,
  currentStep,
  localSelectedSeats,
  localReturnSelectedSeats,
  paymentMethod,
  termsAccepted,
}: UseBookingFormProps) => {
  const validateStep = useCallback(
    (step: number): StepValidation => {
      const errors: any = {};

      switch (step) {
        case BOOKING_STEPS.ISLAND_DATE_SELECTION:
          if (!currentBooking.tripType) {
            errors.tripType = 'Please select a trip type';
          }
          if (!currentBooking.departureDate) {
            errors.departureDate = 'Please select a departure date';
          }
          if (!currentBooking.route) {
            errors.route = 'Please select a route';
          }
          if (
            currentBooking.tripType === TRIP_TYPES.ROUND_TRIP &&
            !currentBooking.returnRoute
          ) {
            errors.returnRoute = 'Please select a return route';
          }
          if (
            currentBooking.tripType === TRIP_TYPES.ROUND_TRIP &&
            !currentBooking.returnDate
          ) {
            errors.returnDate = 'Please select a return date';
          }
          break;

        case BOOKING_STEPS.TRIP_SELECTION:
          if (!currentBooking.trip) {
            errors.trip = 'Please select a departure time';
          }
          if (currentBooking.tripType === TRIP_TYPES.ROUND_TRIP) {
            if (!currentBooking.returnTrip) {
              errors.returnTrip = 'Please select a return time';
            }
          }
          break;

        case BOOKING_STEPS.SEAT_SELECTION:
          if (localSelectedSeats.length === 0) {
            errors.seats = 'Please select at least one seat';
          }
          if (
            currentBooking.tripType === TRIP_TYPES.ROUND_TRIP &&
            localReturnSelectedSeats.length === 0
          ) {
            errors.returnSeats = 'Please select at least one return seat';
          }
          if (
            currentBooking.tripType === TRIP_TYPES.ROUND_TRIP &&
            localSelectedSeats.length !== localReturnSelectedSeats.length
          ) {
            errors.seats = 'Number of departure and return seats must match';
          }
          break;

        case BOOKING_STEPS.PASSENGER_DETAILS:
          const incompletePassenger = currentBooking.passengers.find(
            (p: any) => !p.fullName.trim()
          );
          if (incompletePassenger) {
            errors.passengers = 'Please enter details for all passengers';
          }
          break;

        case BOOKING_STEPS.PAYMENT:
          if (!paymentMethod) {
            errors.paymentMethod = 'Please select a payment method';
          }
          if (!termsAccepted) {
            errors.terms = 'You must accept the terms and conditions';
          }
          break;
      }

      return {
        isValid: Object.keys(errors).length === 0,
        errors,
        step,
      };
    },
    [
      currentBooking,
      localSelectedSeats,
      localReturnSelectedSeats,
      paymentMethod,
      termsAccepted,
    ]
  );

  const canProceedToNextStep = useMemo(() => {
    return validateStep(currentStep).isValid;
  }, [validateStep, currentStep]);

  return useMemo(
    () => ({
      validateStep,
      canProceedToNextStep,
    }),
    [validateStep, canProceedToNextStep]
  );
};
