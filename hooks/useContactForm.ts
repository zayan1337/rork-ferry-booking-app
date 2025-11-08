import { useState, useCallback, useMemo } from 'react';
import { supabase } from '@/utils/supabase';
import type { ContactFormState } from '@/types/customer';
import { isContactFormValid } from '@/utils/customerUtils';
import { useAlertContext } from '@/components/AlertProvider';

export const useContactForm = () => {
  const { showError, showSuccess } = useAlertContext();
  const [formState, setFormState] = useState<ContactFormState>({
    contactName: '',
    contactEmail: '',
    contactMessage: '',
    isSubmitting: false,
  });

  const updateField = useCallback(
    (field: keyof Omit<ContactFormState, 'isSubmitting'>, value: string) => {
      setFormState(prev => ({
        ...prev,
        [field]: value,
      }));
    },
    []
  );

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
      showError(
        'Validation Error',
        'Please fill in all fields with valid information'
      );
      return;
    }

    setFormState(prev => ({ ...prev, isSubmitting: true }));

    try {
      // Call Supabase function to send contact email
      const { data, error } = await supabase.functions.invoke(
        'send-contact-email',
        {
          body: {
            name: contactName,
            email: contactEmail,
            message: contactMessage,
          },
        }
      );

      if (error) {
        throw error;
      }

      showSuccess(
        'Success',
        'Your message has been sent successfully! We will get back to you soon.'
      );

      // Reset form
      setFormState({
        contactName: '',
        contactEmail: '',
        contactMessage: '',
        isSubmitting: false,
      });
    } catch (error) {
      console.error('Contact form submission error:', error);
      showError(
        'Error',
        'Failed to send message. Please check your internet connection and try again.'
      );
      setFormState(prev => ({ ...prev, isSubmitting: false }));
    }
  }, [formState, showError, showSuccess]);

  const isValid = useMemo(
    () =>
      isContactFormValid(
        formState.contactName,
        formState.contactEmail,
        formState.contactMessage
      ),
    [formState.contactName, formState.contactEmail, formState.contactMessage]
  );

  return useMemo(
    () => ({
      formState,
      updateField,
      resetForm,
      submitForm,
      isValid,
    }),
    [formState, updateField, resetForm, submitForm, isValid]
  );
};
