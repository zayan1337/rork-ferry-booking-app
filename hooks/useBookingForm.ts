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
    termsAccepted
}: UseBookingFormProps) => {

    const validateStep = useCallback((step: number): StepValidation => {
        const errors: string[] = [];

        switch (step) {
            case BOOKING_STEPS.TRIP_TYPE_DATE:
                if (!currentBooking.tripType) {
                    errors.push('Please select a trip type');
                }
                if (!currentBooking.departureDate) {
                    errors.push('Please select a departure date');
                }
                if (currentBooking.tripType === TRIP_TYPES.ROUND_TRIP && !currentBooking.returnDate) {
                    errors.push('Please select a return date');
                }
                break;

            case BOOKING_STEPS.ROUTE_SELECTION:
                if (!currentBooking.route) {
                    errors.push('Please select a route');
                }
                if (!currentBooking.trip) {
                    errors.push('Please select a departure time');
                }
                if (currentBooking.tripType === TRIP_TYPES.ROUND_TRIP) {
                    if (!currentBooking.returnRoute) {
                        errors.push('Please select a return route');
                    }
                    if (!currentBooking.returnTrip) {
                        errors.push('Please select a return time');
                    }
                }
                break;

            case BOOKING_STEPS.SEAT_SELECTION:
                if (localSelectedSeats.length === 0) {
                    errors.push('Please select at least one seat');
                }
                if (currentBooking.tripType === TRIP_TYPES.ROUND_TRIP && localReturnSelectedSeats.length === 0) {
                    errors.push('Please select at least one return seat');
                }
                if (currentBooking.tripType === TRIP_TYPES.ROUND_TRIP &&
                    localSelectedSeats.length !== localReturnSelectedSeats.length) {
                    errors.push('Number of departure and return seats must match');
                }
                break;

            case BOOKING_STEPS.PASSENGER_DETAILS:
                const incompletePassenger = currentBooking.passengers.find((p: any) => !p.fullName.trim());
                if (incompletePassenger) {
                    errors.push('Please enter details for all passengers');
                }
                break;

            case BOOKING_STEPS.PAYMENT:
                if (!paymentMethod) {
                    errors.push('Please select a payment method');
                }
                if (!termsAccepted) {
                    errors.push('You must accept the terms and conditions');
                }
                break;
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }, [currentBooking, localSelectedSeats, localReturnSelectedSeats, paymentMethod, termsAccepted]);

    const canProceedToNextStep = useMemo(() => {
        return validateStep(currentStep).isValid;
    }, [validateStep, currentStep]);

    return useMemo(() => ({
        validateStep,
        canProceedToNextStep
    }), [validateStep, canProceedToNextStep]);
}; 