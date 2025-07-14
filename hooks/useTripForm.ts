import { useState, useEffect, useCallback } from 'react';
import { Trip, TripFormData, TripValidationErrors, Route, Vessel } from '@/types/operations';
import { validateTripForm, validateTripConflicts, calculateEstimatedArrivalTime } from '@/utils/tripUtils';
import { useAdminStore } from '@/store/admin/adminStore';

interface UseTripFormProps {
    initialData?: Trip;
    onSuccess?: (trip: Trip) => void;
    onError?: (error: string) => void;
}

export const useTripForm = ({ initialData, onSuccess, onError }: UseTripFormProps = {}) => {
    const { trips, routes, vessels, addTrip, updateTrip, loading, setLoading } = useAdminStore();

    const [formData, setFormData] = useState<TripFormData>({
        route_id: '',
        vessel_id: '',
        travel_date: '',
        departure_time: '',
        arrival_time: '',
        fare_multiplier: 1,
        notes: '',
        weather_conditions: '',
        captain_id: '',
        crew_ids: []
    });

    const [errors, setErrors] = useState<TripValidationErrors>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDirty, setIsDirty] = useState(false);

    // Initialize form data when initialData changes
    useEffect(() => {
        if (initialData) {
            setFormData({
                route_id: initialData.route_id,
                vessel_id: initialData.vessel_id,
                travel_date: initialData.travel_date,
                departure_time: initialData.departure_time,
                arrival_time: initialData.arrival_time || '',
                fare_multiplier: initialData.fare_multiplier,
                notes: initialData.notes || '',
                weather_conditions: initialData.weather_conditions || '',
                captain_id: initialData.captain_id || '',
                crew_ids: initialData.crew_ids || []
            });
        }
    }, [initialData]);

    const updateFormData = useCallback((updates: Partial<TripFormData>) => {
        setFormData(prev => ({ ...prev, ...updates }));
        setIsDirty(true);

        // Clear errors for updated fields
        const updatedErrors = { ...errors };
        Object.keys(updates).forEach(key => {
            delete updatedErrors[key as keyof TripValidationErrors];
        });
        setErrors(updatedErrors);
    }, [errors]);

    // Auto-calculate arrival time when route or departure time changes
    useEffect(() => {
        if (formData.route_id && formData.departure_time) {
            const selectedRoute = routes?.find(r => r.id === formData.route_id);
            if (selectedRoute && selectedRoute.duration) {
                const estimatedArrival = calculateEstimatedArrivalTime(
                    formData.departure_time,
                    selectedRoute.duration
                );
                setFormData(prev => ({ ...prev, arrival_time: estimatedArrival }));
            }
        }
    }, [formData.route_id, formData.departure_time, routes]);

    const validateForm = useCallback((): boolean => {
        const validationErrors = validateTripForm(formData);

        // Check for trip conflicts
        const conflictCheck = validateTripConflicts(formData, trips, initialData?.id);
        if (conflictCheck.hasConflict) {
            validationErrors.general = `Trip conflicts with existing trip on ${conflictCheck.conflictingTrip?.routeName} at ${conflictCheck.conflictingTrip?.departure_time}`;
        }

        setErrors(validationErrors);
        return Object.keys(validationErrors).length === 0;
    }, [formData, trips, initialData]);

    const resetForm = useCallback(() => {
        setFormData({
            route_id: '',
            vessel_id: '',
            travel_date: '',
            departure_time: '',
            arrival_time: '',
            fare_multiplier: 1,
            notes: '',
            weather_conditions: '',
            captain_id: '',
            crew_ids: []
        });
        setErrors({});
        setIsDirty(false);
    }, []);

    const handleSubmit = useCallback(async () => {
        if (!validateForm()) {
            return false;
        }

        setIsSubmitting(true);
        setLoading('trips', true);

        try {
            const selectedRoute = routes?.find(r => r.id === formData.route_id);
            const selectedVessel = vessels?.find(v => v.id === formData.vessel_id);

            const tripData: Trip = {
                id: initialData?.id || `trip_${Date.now()}`,
                route_id: formData.route_id,
                vessel_id: formData.vessel_id,
                travel_date: formData.travel_date,
                departure_time: formData.departure_time,
                arrival_time: formData.arrival_time,
                estimated_duration: selectedRoute?.duration || '1h',
                status: 'scheduled',
                available_seats: selectedVessel?.seating_capacity || 0,
                booked_seats: 0,
                fare_multiplier: formData.fare_multiplier,
                weather_conditions: formData.weather_conditions,
                captain_id: formData.captain_id,
                crew_ids: formData.crew_ids,
                notes: formData.notes,
                created_at: initialData?.created_at || new Date().toISOString(),
                updated_at: new Date().toISOString(),

                // Related data for display
                route: selectedRoute,
                vessel: selectedVessel,
                routeName: selectedRoute?.name || `${selectedRoute?.origin} → ${selectedRoute?.destination}`,
                vesselName: selectedVessel?.name,
                bookings: initialData?.bookings || 0,
                capacity: selectedVessel?.seating_capacity || 0,
                is_active: true,

                // Preserve existing data if updating
                delay_reason: initialData?.delay_reason
            };

            if (initialData) {
                await updateTrip(initialData.id, tripData);
            } else {
                await addTrip(tripData);
            }

            onSuccess?.(tripData);

            if (!initialData) {
                resetForm();
            }

            return true;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'An error occurred while saving the trip';
            setErrors({ general: errorMessage });
            onError?.(errorMessage);
            return false;
        } finally {
            setIsSubmitting(false);
            setLoading('trips', false);
        }
    }, [formData, validateForm, initialData, routes, vessels, addTrip, updateTrip, onSuccess, onError, resetForm, setLoading]);

    const getFieldError = useCallback((fieldName: keyof TripFormData): string | undefined => {
        // Only return error if the field exists in the validation errors type
        if (fieldName in errors) {
            const error = errors[fieldName as keyof TripValidationErrors];
            return typeof error === 'string' ? error : undefined;
        }
        return undefined;
    }, [errors]);

    const hasErrors = Object.keys(errors).length > 0;

    const isFormValid = () => !hasErrors &&
        formData.route_id !== '' &&
        formData.vessel_id !== '' &&
        formData.travel_date !== '' &&
        formData.departure_time !== '' &&
        formData.fare_multiplier > 0;

    const canSubmit = !isSubmitting && !hasErrors && isDirty &&
        formData.route_id !== '' &&
        formData.vessel_id !== '' &&
        formData.travel_date !== '' &&
        formData.departure_time !== '' &&
        formData.fare_multiplier > 0;

    // Get available routes and vessels
    const availableRoutes = routes.filter(r => r.status === 'active');
    const availableVessels = vessels.filter(v => v.status === 'active');

    // Get selected route and vessel details
    const selectedRoute = routes?.find(r => r.id === formData.route_id);
    const selectedVessel = vessels?.find(v => v.id === formData.vessel_id);

    return {
        // Form state
        formData,
        errors,
        isDirty,
        isSubmitting,
        hasErrors,
        canSubmit,
        isFormValid,
        hasChanges: () => isDirty,

        // Available data
        availableRoutes,
        availableVessels,
        routeOptions: availableRoutes,
        vesselOptions: availableVessels,
        selectedRoute,
        selectedVessel,

        // Form actions
        updateFormData,
        validateForm,
        validateField: validateForm,
        resetForm,
        handleSubmit,
        getFieldError,

        // Utilities
        isLoading: loading['trips'] || false,
        isEditing: !!initialData
    };
}; 