import { useState, useEffect, useCallback } from 'react';
import { Route, RouteFormData, RouteValidationErrors, Island } from '@/types/operations';
import { validateRouteForm } from '@/utils/routeUtils';
import { useAdminStore } from '@/store/admin/adminStore';

interface UseRouteFormProps {
    initialData?: Route;
    onSuccess?: (route: Route) => void;
    onError?: (error: string) => void;
}

// Helper function to validate route uniqueness with type conversion
const validateRouteUniqueness = (
    formData: RouteFormData,
    adminRoutes: any[],
    currentRouteId?: string
): boolean => {
    // Convert admin routes to operations routes for validation
    const operationsRoutes = adminRoutes.map(route => ({
        ...route,
        created_at: route.created_at || new Date().toISOString(),
        updated_at: route.updated_at || new Date().toISOString(),
    }));

    // Check if route with same name and islands exists
    const existingRoute = operationsRoutes.find(route =>
        route.id !== currentRouteId &&
        route.name === formData.name &&
        route.from_island_id === formData.from_island_id &&
        route.to_island_id === formData.to_island_id
    );

    return !existingRoute;
};

export const useRouteForm = ({ initialData, onSuccess, onError }: UseRouteFormProps = {}) => {
    const { routes, addRoute, updateRoute, loading, setLoading } = useAdminStore();

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

    // Available islands for selection
    const [islands, setIslands] = useState<Island[]>([]);

    // Initialize form data when initialData changes
    useEffect(() => {
        if (initialData) {
            setFormData({
                name: initialData.name,
                from_island_id: initialData.from_island_id,
                to_island_id: initialData.to_island_id,
                distance: initialData.distance,
                duration: initialData.duration,
                base_fare: initialData.base_fare,
                description: initialData.description || '',
                status: initialData.status === 'maintenance' ? 'active' : initialData.status
            });
        }
    }, [initialData?.id]); // Only depend on ID to prevent infinite re-renders

    // Mock islands data - In real implementation, this would fetch from API
    useEffect(() => {
        setIslands([
            { id: 'island1', name: 'Male', zone: 'A', created_at: '', updated_at: '' },
            { id: 'island2', name: 'Hulhule', zone: 'A', created_at: '', updated_at: '' },
            { id: 'island3', name: 'Villingili', zone: 'B', created_at: '', updated_at: '' },
            { id: 'island4', name: 'Hulhumale', zone: 'A', created_at: '', updated_at: '' },
            { id: 'island5', name: 'Kaafu Atoll', zone: 'B', created_at: '', updated_at: '' }
        ]);
    }, []);

    const updateFormData = useCallback((updates: Partial<RouteFormData>) => {
        setFormData(prev => ({ ...prev, ...updates }));
        setIsDirty(true);

        // Clear errors for updated fields using functional update
        setErrors(prev => {
            const updatedErrors = { ...prev };
            Object.keys(updates).forEach(key => {
                delete updatedErrors[key as keyof RouteValidationErrors];
            });
            return updatedErrors;
        });
    }, []); // No dependencies to prevent circular updates

    const validateForm = useCallback((): boolean => {
        const validationErrors = validateRouteForm(formData);

        // Check uniqueness using our wrapper function
        const uniqueCheck = validateRouteUniqueness(formData, routes, initialData?.id);
        if (!uniqueCheck) {
            validationErrors.general = 'A route with this name and islands already exists';
        }

        setErrors(validationErrors);
        return Object.keys(validationErrors).length === 0;
    }, [formData, routes, initialData?.id]); // Only essential dependencies

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
        setLoading('routes', true);

        try {
            const routeData: Route = {
                id: initialData?.id || `route_${Date.now()}`,
                name: formData.name,
                origin: islands?.find(i => i.id === formData.from_island_id)?.name || '',
                destination: islands?.find(i => i.id === formData.to_island_id)?.name || '',
                from_island_id: formData.from_island_id,
                to_island_id: formData.to_island_id,
                from_island: islands.find(i => i.id === formData.from_island_id),
                to_island: islands.find(i => i.id === formData.to_island_id),
                distance: formData.distance,
                duration: formData.duration,
                base_fare: formData.base_fare,
                description: formData.description,
                status: formData.status as "active" | "inactive" | "maintenance",
                created_at: initialData?.created_at || new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            if (initialData) {
                await updateRoute(initialData.id, routeData);
            } else {
                await addRoute(routeData);
            }

            onSuccess?.(routeData);

            if (!initialData) {
                resetForm();
            }

            return true;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'An error occurred while saving the route';
            setErrors({ general: errorMessage });
            onError?.(errorMessage);
            return false;
        } finally {
            setIsSubmitting(false);
            setLoading('routes', false);
        }
    }, [formData, validateForm, initialData, islands, addRoute, updateRoute, onSuccess, onError, resetForm, setLoading]);

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
        islands,

        // Form actions
        updateFormData,
        validateForm,
        resetForm,
        handleSubmit,
        getFieldError,

        // Utilities
        isLoading: loading['routes'] || false,
        isEditing: !!initialData
    };
}; 