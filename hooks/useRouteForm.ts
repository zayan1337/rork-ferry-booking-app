import { useState, useEffect, useCallback } from 'react';
import { RouteFormData, RouteValidationErrors } from '@/types/operations';
import { DatabaseIsland, OperationsRoute } from '@/types/database';
import { validateRouteForm } from '@/utils/routeUtils';
import { useOperationsStore } from '@/store/admin/operationsStore';

interface UseRouteFormProps {
    initialData?: OperationsRoute;
    onSuccess?: (route: OperationsRoute) => void;
    onError?: (error: string) => void;
}

// Helper function to validate route uniqueness
const validateRouteUniqueness = (
    formData: RouteFormData,
    routes: OperationsRoute[],
    currentRouteId?: string
): boolean => {
    // Check if route with same islands exists
    const existingRoute = routes.find(route =>
        route.id !== currentRouteId &&
        route.from_island_id === formData.from_island_id &&
        route.to_island_id === formData.to_island_id
    );

    return !existingRoute;
};

export const useRouteForm = ({ initialData, onSuccess, onError }: UseRouteFormProps = {}) => {
    const {
        routes,
        islands,
        loading,
        addRoute,
        updateRouteData,
        fetchIslands
    } = useOperationsStore();

    const [formData, setFormData] = useState<RouteFormData>({
        name: '',
        from_island_id: '',
        to_island_id: '',
        distance: '',
        duration: '',
        base_fare: 0,
        description: '',
        status: 'active'
    });

    const [errors, setErrors] = useState<RouteValidationErrors>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDirty, setIsDirty] = useState(false);

    // Initialize form data when initialData changes
    useEffect(() => {
        if (initialData) {
            setFormData({
                name: initialData.name || '',
                from_island_id: initialData.from_island_id,
                to_island_id: initialData.to_island_id,
                distance: initialData.distance || '',
                duration: initialData.duration || '',
                base_fare: initialData.base_fare,
                description: initialData.description || '',
                status: initialData.status || 'active'
            });
        }
    }, [initialData?.id]); // Only depend on ID to prevent infinite re-renders

    // Fetch islands if not already loaded
    useEffect(() => {
        if (!islands || islands.length === 0) {
            fetchIslands();
        }
    }, [islands, fetchIslands]);

    const updateFormData = useCallback((updates: Partial<RouteFormData>) => {
        setFormData(prev => ({ ...prev, ...updates }));
        setIsDirty(true);

        // Clear errors for updated fields
        setErrors(prev => {
            const updatedErrors = { ...prev };
            Object.keys(updates).forEach(key => {
                delete updatedErrors[key as keyof RouteValidationErrors];
            });
            return updatedErrors;
        });
    }, []);

    const validateForm = useCallback((): boolean => {
        const validationErrors = validateRouteForm(formData);

        // Check uniqueness
        const uniqueCheck = validateRouteUniqueness(formData, routes, initialData?.id);
        if (!uniqueCheck) {
            validationErrors.general = 'A route between these islands already exists';
        }

        setErrors(validationErrors);
        return Object.keys(validationErrors).length === 0;
    }, [formData, routes, initialData?.id]);

    const resetForm = useCallback(() => {
        setFormData({
            name: '',
            from_island_id: '',
            to_island_id: '',
            distance: '',
            duration: '',
            base_fare: 0,
            description: '',
            status: 'active'
        });
        setErrors({});
        setIsDirty(false);
    }, []);

    const handleSubmit = useCallback(async () => {
        if (!validateForm()) {
            return false;
        }

        setIsSubmitting(true);

        try {
            const routeData = {
                name: formData.name,
                from_island_id: formData.from_island_id,
                to_island_id: formData.to_island_id,
                distance: formData.distance,
                duration: formData.duration,
                base_fare: formData.base_fare,
                description: formData.description,
                status: formData.status,
            };

            let success = false;
            let resultRoute: OperationsRoute | null = null;

            if (initialData) {
                success = await updateRouteData(initialData.id, routeData);
                if (success) {
                    // Find the updated route from the store
                    resultRoute = routes.find(r => r.id === initialData.id) || null;
                }
            } else {
                success = await addRoute(routeData);
                if (success) {
                    // Find the newly created route from the store
                    resultRoute = routes.find(r =>
                        r.from_island_id === formData.from_island_id &&
                        r.to_island_id === formData.to_island_id &&
                        r.base_fare === formData.base_fare
                    ) || null;
                }
            }

            if (success && resultRoute) {
                onSuccess?.(resultRoute);
                if (!initialData) {
                    resetForm();
                }
                return true;
            } else {
                throw new Error('Failed to save route');
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'An error occurred while saving the route';
            setErrors({ general: errorMessage });
            onError?.(errorMessage);
            return false;
        } finally {
            setIsSubmitting(false);
        }
    }, [formData, validateForm, initialData, routes, addRoute, updateRouteData, onSuccess, onError, resetForm]);

    const getFieldError = (fieldName: keyof RouteFormData) => {
        // Only return error if the field exists in the validation errors type
        if (fieldName in errors) {
            return errors[fieldName as keyof RouteValidationErrors];
        }
        return undefined;
    };

    const hasErrors = Object.keys(errors).length > 0;

    const canSubmit = !isSubmitting && !hasErrors && isDirty &&
        formData.name.trim() !== '' &&
        formData.from_island_id !== '' &&
        formData.to_island_id !== '' &&
        formData.distance.trim() !== '' &&
        formData.duration.trim() !== '' &&
        formData.base_fare > 0;

    return {
        // Form state
        formData,
        errors,
        isDirty,
        isSubmitting,
        hasErrors,
        canSubmit,

        // Available data
        islands: islands || [],

        // Form actions
        updateFormData,
        validateForm,
        resetForm,
        handleSubmit,
        getFieldError,

        // Utilities
        isLoading: loading.routes || loading.islands,
        isEditing: !!initialData
    };
}; 