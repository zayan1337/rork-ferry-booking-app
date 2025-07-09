import { useState, useCallback, useMemo } from 'react';
import { Alert } from 'react-native';
import type { ContactFormState } from '@/types/customer';
import { isContactFormValid } from '@/utils/customerUtils';

export const useContactForm = () => {
    const [formState, setFormState] = useState<ContactFormState>({
        contactName: '',
        contactEmail: '',
        contactMessage: '',
        isSubmitting: false,
    });

    const updateField = useCallback((field: keyof Omit<ContactFormState, 'isSubmitting'>, value: string) => {
        setFormState(prev => ({
            ...prev,
            [field]: value,
        }));
    }, []);

    const resetForm = useCallback(() => {
        setFormState({
            contactName: '',
            contactEmail: '',
            contactMessage: '',
            isSubmitting: false,
        });
    }, []);

    const submitForm = useCallback(async () => {
        const { contactName, contactEmail, contactMessage } = formState;

        if (!isContactFormValid(contactName, contactEmail, contactMessage)) {
            Alert.alert('Validation Error', 'Please fill in all fields with valid information');
            return;
        }

        setFormState(prev => ({ ...prev, isSubmitting: true }));

        try {
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 1500));

            Alert.alert('Success', 'Your message has been sent. We will get back to you soon.');

            // Reset form
            setFormState({
                contactName: '',
                contactEmail: '',
                contactMessage: '',
                isSubmitting: false,
            });
        } catch (error) {
            Alert.alert('Error', 'Failed to send message. Please try again.');
            setFormState(prev => ({ ...prev, isSubmitting: false }));
        }
    }, [formState]);

    const isValid = useMemo(() =>
        isContactFormValid(formState.contactName, formState.contactEmail, formState.contactMessage),
        [formState.contactName, formState.contactEmail, formState.contactMessage]
    );

    return useMemo(() => ({
        formState,
        updateField,
        resetForm,
        submitForm,
        isValid,
    }), [formState, updateField, resetForm, submitForm, isValid]);
}; 