import { useState, useCallback, useMemo } from 'react';
import { router } from 'expo-router';
import type { QuickBookingState } from '@/types/customer';
import { useBookingStore, useRouteStore } from '@/store';

export const useQuickBooking = () => {
    const [quickBookingState, setQuickBookingState] = useState<QuickBookingState>({
        selectedFromIsland: '',
        selectedToIsland: '',
        selectedDate: '',
        errorMessage: '',
    });

    const { setQuickBookingData } = useBookingStore();
    const { availableRoutes } = useRouteStore();

    const updateField = useCallback((field: keyof Omit<QuickBookingState, 'errorMessage'>, value: string) => {
        setQuickBookingState(prev => ({
            ...prev,
            [field]: value,
            errorMessage: '', // Clear error when user makes changes
            // Clear destination if departure changes
            ...(field === 'selectedFromIsland' && prev.selectedFromIsland !== value ? { selectedToIsland: '' } : {})
        }));
    }, []);

    const setError = useCallback((error: string) => {
        setQuickBookingState(prev => ({
            ...prev,
            errorMessage: error
        }));
    }, []);

    const clearError = useCallback(() => {
        setQuickBookingState(prev => ({
            ...prev,
            errorMessage: ''
        }));
    }, []);

    const resetForm = useCallback(() => {
        setQuickBookingState({
            selectedFromIsland: '',
            selectedToIsland: '',
            selectedDate: '',
            errorMessage: '',
        });
    }, []);

    const validateAndStartBooking = useCallback(async (): Promise<boolean> => {
        const { selectedFromIsland, selectedToIsland, selectedDate } = quickBookingState;

        // Clear any previous error
        setQuickBookingState(prev => ({ ...prev, errorMessage: '' }));

        // Validate that all fields are selected and show specific error messages
        if (!selectedFromIsland) {
            setQuickBookingState(prev => ({ ...prev, errorMessage: "Please select a departure island" }));
            return false;
        }

        if (!selectedToIsland) {
            setQuickBookingState(prev => ({ ...prev, errorMessage: "Please select a destination island" }));
            return false;
        }

        if (!selectedDate) {
            setQuickBookingState(prev => ({ ...prev, errorMessage: "Please select a travel date" }));
            return false;
        }

        // Check if the selected route combination exists in the database
        const matchingRoute = availableRoutes.find(route =>
            route.fromIsland.name === selectedFromIsland &&
            route.toIsland.name === selectedToIsland
        );

        if (!matchingRoute) {
            setQuickBookingState(prev => ({
                ...prev,
                errorMessage: `No ferry route available from ${selectedFromIsland} to ${selectedToIsland}. Please select a different destination.`
            }));
            return false;
        }

        try {
            // Use the new function to set quick booking data
            setQuickBookingData(matchingRoute, selectedDate);

            // Small delay to ensure state is updated before navigation
            await new Promise(resolve => setTimeout(resolve, 100));

            // Navigate to the booking page
            router.push('/book');
            return true;
        } catch (error) {
            setQuickBookingState(prev => ({
                ...prev,
                errorMessage: "An error occurred while setting up your booking. Please try again."
            }));
            return false;
        }
    }, [quickBookingState, availableRoutes]);

    return useMemo(() => ({
        quickBookingState,
        updateField,
        setError,
        clearError,
        resetForm,
        validateAndStartBooking,
    }), [quickBookingState, updateField, setError, clearError, resetForm, validateAndStartBooking]);
}; 