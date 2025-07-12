import { useState, useEffect, useCallback } from 'react';
import { UserProfile, UserFormData, UserValidationErrors } from '@/types/userManagement';
import { validateUserForm, validateUserUniqueness } from '@/utils/userManagementUtils';
import { useAdminStore } from '@/store/admin/adminStore';

interface UseUserFormProps {
    initialData?: UserProfile;
    onSuccess?: (user: UserProfile) => void;
    onError?: (error: string) => void;
}

// Overloads for different usage patterns
export function useUserForm(userId?: string): ReturnType<typeof useUserFormImpl>;
export function useUserForm(props?: UseUserFormProps): ReturnType<typeof useUserFormImpl>;
export function useUserForm(userIdOrProps?: string | UseUserFormProps): ReturnType<typeof useUserFormImpl> {
    let props: UseUserFormProps = {};

    if (typeof userIdOrProps === 'string') {
        // Handle case where userId is passed directly
        props = { initialData: undefined };
    } else if (userIdOrProps) {
        props = userIdOrProps;
    }

    return useUserFormImpl(props);
}

const useUserFormImpl = ({ initialData, onSuccess, onError }: UseUserFormProps = {}) => {
    const { users = [], addUser, updateUser, loading, setLoading } = useAdminStore();

    const [formData, setFormData] = useState<UserFormData>({
        name: '',
        email: '',
        mobile_number: '',
        role: 'customer',
        status: 'active',
        profile_picture: '',
        date_of_birth: '',
        gender: undefined,
        address: undefined,
        emergency_contact: undefined,
        preferences: {
            language: 'en',
            currency: 'MVR',
            notifications: {
                email: true,
                sms: true,
                push: true
            },
            accessibility: {
                assistance_required: false,
                assistance_type: ''
            }
        },
        password: '',
        confirm_password: '',
        send_welcome_email: true,
        send_credentials_sms: false
    });

    const [errors, setErrors] = useState<UserValidationErrors>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDirty, setIsDirty] = useState(false);

    // Initialize form data when initialData changes
    useEffect(() => {
        if (initialData) {
            setFormData({
                name: initialData.name,
                email: initialData.email,
                mobile_number: initialData.mobile_number,
                role: initialData.role,
                status: initialData.status === 'banned' ? 'suspended' : initialData.status, // Map banned to suspended for form
                profile_picture: initialData.profile_picture || '',
                date_of_birth: initialData.date_of_birth || '',
                gender: initialData.gender,
                address: initialData.address,
                emergency_contact: initialData.emergency_contact,
                preferences: initialData.preferences || {
                    language: 'en',
                    currency: 'MVR',
                    notifications: {
                        email: true,
                        sms: true,
                        push: true
                    },
                    accessibility: {
                        assistance_required: false,
                        assistance_type: ''
                    }
                },
                password: '',
                confirm_password: '',
                send_welcome_email: false,
                send_credentials_sms: false
            });
        }
    }, [initialData]);

    const updateFormData = useCallback((updates: Partial<UserFormData>) => {
        setFormData(prev => ({ ...prev, ...updates }));
        setIsDirty(true);

        // Clear errors for updated fields
        const updatedErrors = { ...errors };
        Object.keys(updates).forEach(key => {
            delete updatedErrors[key as keyof UserValidationErrors];
        });

        // Clear nested errors if applicable
        if (updates.address && errors.address) {
            delete updatedErrors.address;
        }
        if (updates.emergency_contact && errors.emergency_contact) {
            delete updatedErrors.emergency_contact;
        }

        setErrors(updatedErrors);
    }, [errors]);

    const updateAddress = useCallback((updates: Partial<UserFormData['address']>) => {
        setFormData(prev => ({
            ...prev,
            address: {
                ...prev.address,
                ...updates
            } as UserFormData['address']
        }));
        setIsDirty(true);

        // Clear address errors
        if (errors.address) {
            const updatedErrors = { ...errors };
            delete updatedErrors.address;
            setErrors(updatedErrors);
        }
    }, [errors]);

    const updateEmergencyContact = useCallback((updates: Partial<UserFormData['emergency_contact']>) => {
        setFormData(prev => ({
            ...prev,
            emergency_contact: {
                ...prev.emergency_contact,
                ...updates
            } as UserFormData['emergency_contact']
        }));
        setIsDirty(true);

        // Clear emergency contact errors
        if (errors.emergency_contact) {
            const updatedErrors = { ...errors };
            delete updatedErrors.emergency_contact;
            setErrors(updatedErrors);
        }
    }, [errors]);

    const updatePreferences = useCallback((updates: Partial<UserFormData['preferences']>) => {
        setFormData(prev => ({
            ...prev,
            preferences: {
                ...prev.preferences,
                ...updates
            } as UserFormData['preferences']
        }));
        setIsDirty(true);
    }, []);

    const validateForm = useCallback((): boolean => {
        const validationErrors = validateUserForm(formData);

        // Check uniqueness (only if users array is available and has data)
        if (users && Array.isArray(users) && users.length > 0) {
            const uniqueCheck = validateUserUniqueness(formData, users, initialData?.id);
            if (uniqueCheck.emailExists) {
                validationErrors.email = 'A user with this email already exists';
            }
            if (uniqueCheck.mobileExists) {
                validationErrors.mobile_number = 'A user with this mobile number already exists';
            }
        }

        setErrors(validationErrors);
        return Object.keys(validationErrors).length === 0;
    }, [formData, users, initialData]);

    const resetForm = useCallback(() => {
        setFormData({
            name: '',
            email: '',
            mobile_number: '',
            role: 'customer',
            status: 'active',
            profile_picture: '',
            date_of_birth: '',
            gender: undefined,
            address: undefined,
            emergency_contact: undefined,
            preferences: {
                language: 'en',
                currency: 'MVR',
                notifications: {
                    email: true,
                    sms: true,
                    push: true
                },
                accessibility: {
                    assistance_required: false,
                    assistance_type: ''
                }
            },
            password: '',
            confirm_password: '',
            send_welcome_email: true,
            send_credentials_sms: false
        });
        setErrors({});
        setIsDirty(false);
    }, []);

    const handleSubmit = useCallback(async () => {
        if (!validateForm()) {
            return false;
        }

        setIsSubmitting(true);
        setLoading('users', true);

        try {
            const userData: UserProfile = {
                id: initialData?.id || `user_${Date.now()}`,
                name: formData.name,
                email: formData.email,
                mobile_number: formData.mobile_number,
                role: formData.role,
                status: formData.status,
                email_verified: initialData?.email_verified || false,
                mobile_verified: initialData?.mobile_verified || false,
                profile_picture: formData.profile_picture,
                date_of_birth: formData.date_of_birth,
                gender: formData.gender,
                address: formData.address,
                emergency_contact: formData.emergency_contact,
                preferences: formData.preferences,
                created_at: initialData?.created_at || new Date().toISOString(),
                updated_at: new Date().toISOString(),
                last_login: initialData?.last_login,

                // Preserve existing statistics
                total_bookings: initialData?.total_bookings || 0,
                total_spent: initialData?.total_spent || 0,
                total_trips: initialData?.total_trips || 0,
                average_rating: initialData?.average_rating || 0,
                wallet_balance: initialData?.wallet_balance || 0,
                credit_score: initialData?.credit_score || 0,
                loyalty_points: initialData?.loyalty_points || 0
            };

            if (initialData) {
                await updateUser(initialData.id, userData);
            } else {
                await addUser(userData);
            }

            onSuccess?.(userData);

            if (!initialData) {
                resetForm();
            }

            return true;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'An error occurred while saving the user';
            setErrors({ general: errorMessage });
            onError?.(errorMessage);
            return false;
        } finally {
            setIsSubmitting(false);
            setLoading('users', false);
        }
    }, [formData, validateForm, initialData, addUser, updateUser, onSuccess, onError, resetForm, setLoading]);

    const getFieldError = useCallback((fieldName: keyof UserFormData) => {
        return errors[fieldName];
    }, [errors]);

    const getAddressError = useCallback((field: string) => {
        return errors.address?.[field as keyof typeof errors.address];
    }, [errors.address]);

    const getEmergencyContactError = useCallback((field: string) => {
        return errors.emergency_contact?.[field as keyof typeof errors.emergency_contact];
    }, [errors.emergency_contact]);

    const hasErrors = Object.keys(errors).length > 0;

    const canSubmit = !isSubmitting && !hasErrors && isDirty &&
        formData.name.trim() !== '' &&
        formData.email.trim() !== '' &&
        formData.mobile_number.trim() !== '' &&
        (!formData.password || formData.password === formData.confirm_password);

    // Role options
    const roleOptions = [
        { value: 'admin', label: 'Admin', description: 'Full system access' },
        { value: 'agent', label: 'Agent', description: 'Booking and client management' },
        { value: 'customer', label: 'Customer', description: 'Regular user with booking privileges' },
        { value: 'passenger', label: 'Passenger', description: 'Limited access for passengers' }
    ];

    // Status options
    const statusOptions = [
        { value: 'active', label: 'Active', description: 'User can access the system' },
        { value: 'inactive', label: 'Inactive', description: 'User cannot access the system' },
        { value: 'suspended', label: 'Suspended', description: 'Temporarily blocked' }
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
        roleOptions,
        statusOptions,
        roles: roleOptions, // Alias for roleOptions for backward compatibility

        // Form actions
        updateFormData,
        updateAddress,
        updateEmergencyContact,
        updatePreferences,
        validateForm,
        resetForm,
        handleSubmit,
        getFieldError,
        getAddressError,
        getEmergencyContactError,

        // Field-specific actions
        setFieldValue: updateFormData,
        setFieldError: useCallback((fieldName: keyof UserFormData, error: string) => {
            setErrors(prev => ({ ...prev, [fieldName]: error }));
        }, []),
        clearFieldError: useCallback((fieldName: keyof UserFormData) => {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[fieldName];
                return newErrors;
            });
        }, []),

        // Utilities
        isLoading: loading['users'] || false,
        isEditing: !!initialData
    };
}; 