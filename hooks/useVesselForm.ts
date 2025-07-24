import { useState, useEffect, useCallback } from 'react';
import { Vessel, VesselFormData, VesselValidationErrors } from '@/types/operations';
import { validateVesselForm, validateVesselUniqueness } from '@/utils/vesselUtils';
import { useAdminStore } from '@/store/admin/adminStore';

interface UseVesselFormProps {
    initialData?: Vessel;
    onSuccess?: (vessel: Vessel) => void;
    onError?: (error: string) => void;
}

export const useVesselForm = ({ initialData, onSuccess, onError }: UseVesselFormProps = {}) => {
    const { vessels, addVessel, updateVessel, loading, setLoading } = useAdminStore();

    const [formData, setFormData] = useState<VesselFormData>({
        name: '',
        registration_number: '',
        capacity: 0,
        seating_capacity: 0,
        crew_capacity: 0,
        vessel_type: 'ferry',
        manufacturer: '',
        year_built: undefined,
        status: 'active',
        specifications: undefined
    });

    const [errors, setErrors] = useState<VesselValidationErrors>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDirty, setIsDirty] = useState(false);

    // Initialize form data when initialData changes
    useEffect(() => {
        if (initialData) {
            setFormData({
                name: initialData.name,
                registration_number: initialData.registration_number,
                capacity: initialData.capacity,
                seating_capacity: initialData.seating_capacity,
                crew_capacity: initialData.crew_capacity,
                vessel_type: initialData.vessel_type,
                manufacturer: initialData.manufacturer || '',
                year_built: initialData.year_built,
                status: initialData.status === 'decommissioned' ? 'inactive' : initialData.status,
                specifications: initialData.specifications
            });
        }
    }, [initialData]);

    const updateFormData = useCallback((updates: Partial<VesselFormData>) => {
        setFormData(prev => ({ ...prev, ...updates }));
        setIsDirty(true);

        // Clear errors for updated fields
        const updatedErrors = { ...errors };
        Object.keys(updates).forEach(key => {
            delete updatedErrors[key as keyof VesselValidationErrors];
        });

        // Clear nested specification errors if specifications are updated
        if (updates.specifications && errors.specifications) {
            delete updatedErrors.specifications;
        }

        setErrors(updatedErrors);
    }, [errors]);

    const updateSpecifications = useCallback((updates: Partial<VesselFormData['specifications']>) => {
        setFormData(prev => ({
            ...prev,
            specifications: {
                ...prev.specifications,
                ...updates
            } as VesselFormData['specifications']
        }));
        setIsDirty(true);

        // Clear specification errors
        if (errors.specifications) {
            const updatedErrors = { ...errors };
            delete updatedErrors.specifications;
            setErrors(updatedErrors);
        }
    }, [errors]);

    const validateForm = useCallback((): boolean => {
        const validationErrors = validateVesselForm(formData);

        // Check uniqueness
        const uniqueCheck = validateVesselUniqueness(formData, vessels, initialData?.id);
        if (uniqueCheck.nameExists) {
            validationErrors.name = 'A vessel with this name already exists';
        }
        if (uniqueCheck.registrationExists) {
            validationErrors.registration_number = 'A vessel with this registration number already exists';
        }

        setErrors(validationErrors);
        return Object.keys(validationErrors).length === 0;
    }, [formData, vessels, initialData]);

    const resetForm = useCallback(() => {
        setFormData({
            name: '',
            registration_number: '',
            capacity: 0,
            seating_capacity: 0,
            crew_capacity: 0,
            vessel_type: 'ferry',
            manufacturer: '',
            year_built: undefined,
            status: 'active',
            specifications: undefined
        });
        setErrors({});
        setIsDirty(false);
    }, []);

    const handleSubmit = useCallback(async () => {
        if (!validateForm()) {
            return false;
        }

        setIsSubmitting(true);
        setLoading('vessels', true);

        try {
            const vesselData: Vessel = {
                id: initialData?.id || `vessel_${Date.now()}`,
                name: formData.name,
                registration_number: formData.registration_number,
                capacity: formData.capacity,
                seating_capacity: formData.seating_capacity,
                crew_capacity: formData.crew_capacity,
                vessel_type: formData.vessel_type,
                manufacturer: formData.manufacturer,
                year_built: formData.year_built,
                status: formData.status as "active" | "maintenance" | "inactive" | "decommissioned",
                specifications: formData.specifications,
                created_at: initialData?.created_at || new Date().toISOString(),
                updated_at: new Date().toISOString(),

                // Preserve existing data if updating
                last_maintenance: initialData?.last_maintenance,
                next_maintenance: initialData?.next_maintenance,
                current_location: initialData?.current_location,
                total_trips_30d: initialData?.total_trips_30d,
                capacity_utilization_30d: initialData?.capacity_utilization_30d,
                total_revenue_30d: initialData?.total_revenue_30d,
                maintenance_cost_30d: initialData?.maintenance_cost_30d,
                fuel_consumption_30d: initialData?.fuel_consumption_30d,
                average_rating: initialData?.average_rating
            };

            if (initialData) {
                await updateVessel(initialData.id, vesselData);
            } else {
                await addVessel(vesselData);
            }

            onSuccess?.(vesselData);

            if (!initialData) {
                resetForm();
            }

            return true;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'An error occurred while saving the vessel';
            setErrors({ general: errorMessage });
            onError?.(errorMessage);
            return false;
        } finally {
            setIsSubmitting(false);
            setLoading('vessels', false);
        }
    }, [formData, validateForm, initialData, addVessel, updateVessel, onSuccess, onError, resetForm, setLoading]);

    const getFieldError = useCallback((fieldName: keyof VesselFormData): string | undefined => {
        // Only return error if the field exists in the validation errors type
        if (fieldName in errors) {
            const error = errors[fieldName as keyof VesselValidationErrors];
            return typeof error === 'string' ? error : undefined;
        }
        return undefined;
    }, [errors]);

    const getSpecificationError = useCallback((specField: string) => {
        return errors.specifications?.[specField as keyof typeof errors.specifications];
    }, [errors.specifications]);

    const hasErrors = Object.keys(errors).length > 0;

    const canSubmit = !isSubmitting && !hasErrors && isDirty &&
        formData.name.trim() !== '' &&
        formData.registration_number.trim() !== '' &&
        formData.capacity > 0 &&
        formData.seating_capacity > 0 &&
        formData.crew_capacity > 0;

    // Vessel type options
    const vesselTypes = [
        { value: 'ferry', label: 'Ferry', description: 'Large capacity, stable vessel' },
        { value: 'speedboat', label: 'Speedboat', description: 'Fast, smaller capacity vessel' },
        { value: 'catamaran', label: 'Catamaran', description: 'Stable, moderate capacity vessel' }
    ];

    return {
        // Form state
        formData,
        errors,
        isDirty,
        isSubmitting,
        hasErrors,
        canSubmit,

        // Available data
        vesselTypes,

        // Form actions
        updateFormData,
        updateSpecifications,
        validateForm,
        resetForm,
        handleSubmit,
        getFieldError,
        getSpecificationError,

        // Utilities
        isLoading: loading['vessels'] || false,
        isEditing: !!initialData
    };
}; 