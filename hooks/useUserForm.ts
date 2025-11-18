import { useState, useEffect, useCallback } from 'react';
import {
  UserProfile,
  UserFormData,
  UserValidationErrors,
} from '@/types/userManagement';
import {
  validateUserForm,
  validateUserUniqueness,
} from '@/utils/userManagementUtils';
import { useUserStore } from '@/store/admin/userStore';

interface UseUserFormProps {
  initialData?: UserProfile;
  onSuccess?: (user: UserProfile) => void;
  onError?: (error: string) => void;
}

// Overloads for different usage patterns
export function useUserForm(
  userId?: string
): ReturnType<typeof useUserFormImpl>;
export function useUserForm(
  props?: UseUserFormProps
): ReturnType<typeof useUserFormImpl>;
export function useUserForm(
  userIdOrProps?: string | UseUserFormProps
): ReturnType<typeof useUserFormImpl> {
  let props: UseUserFormProps = {};
  let userId: string | undefined;

  if (typeof userIdOrProps === 'string') {
    // Handle case where userId is passed directly
    // We'll fetch the user data inside the hook implementation
    userId = userIdOrProps;
    props = { initialData: undefined };
  } else if (userIdOrProps) {
    props = userIdOrProps;
    userId = undefined;
  }

  return useUserFormImpl(props, userId);
}

const createDefaultPreferences = () => ({
  language: 'en',
  currency: 'MVR',
  notifications: {
    email: true,
    sms: true,
    push: true,
  },
  accessibility: {
    assistance_required: false,
    assistance_type: '',
  },
});

const mapUserToFormState = (userData: UserProfile): UserFormData => ({
  name: userData.name,
  email: userData.email,
  mobile_number: userData.mobile_number,
  role: userData.role,
  status: userData.status === 'banned' ? 'suspended' : userData.status,
  profile_picture: userData.profile_picture || '',
  date_of_birth: userData.date_of_birth || '',
  address: userData.address,
  emergency_contact: userData.emergency_contact,
  preferences: userData.preferences || createDefaultPreferences(),
  password: '',
  confirm_password: '',
  send_welcome_email: false,
  send_credentials_sms: false,
});

const useUserFormImpl = (
  { initialData, onSuccess, onError }: UseUserFormProps = {},
  userId?: string
) => {
  const {
    users = [],
    create,
    update,
    loading: storeLoading,
    fetchById,
  } = useUserStore();

  // Ensure users is always an array to prevent .find() errors
  const safeUsers = Array.isArray(users) ? users : [];

  const [formData, setFormData] = useState<UserFormData>({
    name: '',
    email: '',
    mobile_number: '',
    role: 'customer',
    status: 'active',
    profile_picture: '',
    date_of_birth: '',
    address: undefined,
    emergency_contact: undefined,
    preferences: createDefaultPreferences(),
    password: '',
    confirm_password: '',
    send_welcome_email: true,
    send_credentials_sms: false,
  });

  const [errors, setErrors] = useState<UserValidationErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [originalIdentifiers, setOriginalIdentifiers] = useState<{
    email: string;
    mobile_number: string;
  } | null>(null);

  const editingUserId = initialData?.id ?? userId;

  // Fetch user data when userId is provided but no initialData
  useEffect(() => {
    const fetchUserData = async () => {
      if (userId && !initialData) {
        try {
          const userData = await fetchById(userId);
          if (userData) {
            // Set the fetched user data as initialData
            setFormData(mapUserToFormState(userData));
            setOriginalIdentifiers({
              email: userData.email,
              mobile_number: userData.mobile_number,
            });
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
          onError?.('Failed to fetch user data');
        }
      }
    };

    fetchUserData();
  }, [userId, initialData, fetchById, onError]);

  // Initialize form data when initialData changes
  useEffect(() => {
    if (initialData) {
      setFormData(mapUserToFormState(initialData));
      setOriginalIdentifiers({
        email: initialData.email,
        mobile_number: initialData.mobile_number,
      });
    }
  }, [initialData]);

  const updateFormData = useCallback(
    (fieldOrUpdates: string | Partial<UserFormData>, value?: any) => {
      if (typeof fieldOrUpdates === 'string') {
        // Handle dot notation for nested fields
        const field = fieldOrUpdates;
        const keys = field.split('.');

        setFormData(prev => {
          const newData = { ...prev };
          if (keys.length === 1) {
            (newData as any)[keys[0]] = value;
          } else if (keys.length === 2) {
            if (!newData[keys[0] as keyof UserFormData]) {
              (newData as any)[keys[0]] = {};
            }
            (newData as any)[keys[0]][keys[1]] = value;
          }
          return newData;
        });
      } else {
        // Handle object updates
        setFormData(prev => ({ ...prev, ...fieldOrUpdates }));
      }

      setIsDirty(true);

      // Clear errors for updated fields
      const updatedErrors = { ...errors };
      if (typeof fieldOrUpdates === 'string') {
        // Clear specific field error
        const topLevelField = fieldOrUpdates.split('.')[0];
        if (topLevelField === 'address' && errors.address) {
          delete updatedErrors.address;
        } else if (
          topLevelField === 'emergency_contact' &&
          errors.emergency_contact
        ) {
          delete updatedErrors.emergency_contact;
        } else if (topLevelField in errors) {
          delete updatedErrors[topLevelField as keyof UserValidationErrors];
        }
      } else {
        // Clear errors for all updated fields
        Object.keys(fieldOrUpdates).forEach(key => {
          delete updatedErrors[key as keyof UserValidationErrors];
        });

        // Clear nested errors if applicable
        if (fieldOrUpdates.address && errors.address) {
          delete updatedErrors.address;
        }
        if (fieldOrUpdates.emergency_contact && errors.emergency_contact) {
          delete updatedErrors.emergency_contact;
        }
      }

      setErrors(updatedErrors);
    },
    [errors]
  );

  const updateAddress = useCallback(
    (updates: Partial<UserFormData['address']>) => {
      setFormData(prev => ({
        ...prev,
        address: {
          ...prev.address,
          ...updates,
        } as UserFormData['address'],
      }));
      setIsDirty(true);

      // Clear address errors
      if (errors.address) {
        const updatedErrors = { ...errors };
        delete updatedErrors.address;
        setErrors(updatedErrors);
      }
    },
    [errors]
  );

  const updateEmergencyContact = useCallback(
    (updates: Partial<UserFormData['emergency_contact']>) => {
      setFormData(prev => ({
        ...prev,
        emergency_contact: {
          ...prev.emergency_contact,
          ...updates,
        } as UserFormData['emergency_contact'],
      }));
      setIsDirty(true);

      // Clear emergency contact errors
      if (errors.emergency_contact) {
        const updatedErrors = { ...errors };
        delete updatedErrors.emergency_contact;
        setErrors(updatedErrors);
      }
    },
    [errors]
  );

  const updatePreferences = useCallback(
    (updates: Partial<UserFormData['preferences']>) => {
      setFormData(prev => ({
        ...prev,
        preferences: {
          ...prev.preferences,
          ...updates,
        } as UserFormData['preferences'],
      }));
      setIsDirty(true);
    },
    []
  );

  const validateForm = useCallback((): boolean => {
    const validationErrors = validateUserForm(formData);

    const emailChanged =
      !originalIdentifiers ||
      formData.email.trim().toLowerCase() !==
        originalIdentifiers.email?.trim().toLowerCase();
    const mobileChanged =
      !originalIdentifiers ||
      (formData.mobile_number || '').trim() !==
        (originalIdentifiers.mobile_number || '').trim();

    // Check uniqueness (only if users array is available and has data)
    if (safeUsers.length > 0 && (emailChanged || mobileChanged)) {
      const uniqueCheck = validateUserUniqueness(
        formData,
        safeUsers,
        editingUserId
      );
      if (uniqueCheck.emailExists && emailChanged) {
        validationErrors.email = 'A user with this email already exists';
      }
      if (uniqueCheck.mobileExists && mobileChanged) {
        validationErrors.mobile_number =
          'A user with this mobile number already exists';
      }
    }

    setErrors(validationErrors);
    return Object.keys(validationErrors).length === 0;
  }, [formData, safeUsers, initialData, editingUserId, originalIdentifiers]);

  const resetForm = useCallback(() => {
    setFormData({
      name: '',
      email: '',
      mobile_number: '',
      role: 'customer',
      status: 'active',
      profile_picture: '',
      date_of_birth: '',
      address: undefined,
      emergency_contact: undefined,
      preferences: createDefaultPreferences(),
      password: '',
      confirm_password: '',
      send_welcome_email: true,
      send_credentials_sms: false,
    });
    setErrors({});
    setIsDirty(false);
  }, []);

  const handleSubmit = useCallback(async (): Promise<UserProfile | false> => {
    if (!validateForm()) {
      return false;
    }

    setIsSubmitting(true);

    try {
      const userData: Partial<UserProfile> & { password?: string } = {
        name: formData.name,
        email: formData.email,
        mobile_number: formData.mobile_number,
        role: formData.role,
        status: formData.status,
        profile_picture: formData.profile_picture,
        date_of_birth: formData.date_of_birth,
        address: formData.address,
        emergency_contact: formData.emergency_contact,
        preferences: formData.preferences,
        password: formData.password || undefined,
      };

      let result: UserProfile;
      if (editingUserId) {
        result = await update(editingUserId, userData);
      } else {
        result = await create(userData);
      }

      onSuccess?.(result);

      if (editingUserId) {
        setFormData(mapUserToFormState(result));
        setOriginalIdentifiers({
          email: result.email,
          mobile_number: result.mobile_number,
        });
        setIsDirty(false);
      }

      if (!initialData) {
        resetForm();
      }

      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'An error occurred while saving the user';
      setErrors({ general: errorMessage });
      onError?.(errorMessage);
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, [
    formData,
    validateForm,
    editingUserId,
    create,
    update,
    onSuccess,
    onError,
    resetForm,
  ]);

  const getFieldError = useCallback(
    (fieldName: string) => {
      const topLevelField = fieldName.split('.')[0];
      return errors[topLevelField as keyof UserValidationErrors];
    },
    [errors]
  );

  const getAddressError = useCallback(
    (field: string) => {
      return errors.address?.[field as keyof typeof errors.address];
    },
    [errors.address]
  );

  const getEmergencyContactError = useCallback(
    (field: string) => {
      return errors.emergency_contact?.[
        field as keyof typeof errors.emergency_contact
      ];
    },
    [errors.emergency_contact]
  );

  const hasErrors = Object.keys(errors).length > 0;

  const canSubmit =
    !isSubmitting &&
    !hasErrors &&
    isDirty &&
    formData.name.trim() !== '' &&
    formData.email.trim() !== '' &&
    formData.mobile_number.trim() !== '' &&
    (!formData.password || formData.password === formData.confirm_password);

  // Role options
  const roleOptions = [
    { value: 'admin', label: 'Admin', description: 'Full system access' },
    {
      value: 'agent',
      label: 'Agent',
      description: 'Booking and client management',
    },
    {
      value: 'customer',
      label: 'Customer',
      description: 'Regular user with booking privileges',
    },
    {
      value: 'passenger',
      label: 'Passenger',
      description: 'Limited access for passengers',
    },
  ];

  // Status options
  const statusOptions = [
    {
      value: 'active',
      label: 'Active',
      description: 'User can access the system',
    },
    {
      value: 'inactive',
      label: 'Inactive',
      description: 'User cannot access the system',
    },
    {
      value: 'suspended',
      label: 'Suspended',
      description: 'Temporarily blocked',
    },
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
    setFieldError: useCallback((fieldName: string, error: string) => {
      setErrors(prev => ({ ...prev, [fieldName.split('.')[0]]: error }));
    }, []),
    clearFieldError: useCallback((fieldName: string) => {
      setErrors(prev => {
        const newErrors = { ...prev };
        const topLevelField = fieldName.split('.')[0];
        if (topLevelField === 'address' && newErrors.address) {
          delete newErrors.address;
        } else if (
          topLevelField === 'emergency_contact' &&
          newErrors.emergency_contact
        ) {
          delete newErrors.emergency_contact;
        } else if (topLevelField in newErrors) {
          delete newErrors[topLevelField as keyof UserValidationErrors];
        }
        return newErrors;
      });
    }, []),

    // Utilities
    isLoading: storeLoading || false,
    isEditing: !!initialData,
  };
};
