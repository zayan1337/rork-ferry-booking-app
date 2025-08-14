import { useState, useEffect } from 'react';

interface ClientFormData {
  name: string;
  email: string;
  phone: string;
  idNumber: string;
}

interface FormErrors {
  name: string;
  email: string;
  phone: string;
  idNumber: string;
  general: string;
}

export const useClientForm = () => {
  const [formData, setFormData] = useState<ClientFormData>({
    name: '',
    email: '',
    phone: '',
    idNumber: '',
  });

  const [errors, setErrors] = useState<FormErrors>({
    name: '',
    email: '',
    phone: '',
    idNumber: '',
    general: '',
  });

  // Validation patterns
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const phoneRegex = /^[\+]?[0-9\-\(\)\s]+$/;

  const validateField = (field: keyof ClientFormData, value: string) => {
    let error = '';

    switch (field) {
      case 'name':
        if (!value.trim()) {
          error = 'Client name is required';
        } else if (value.trim().length < 2) {
          error = 'Client name must be at least 2 characters';
        }
        break;

      case 'email':
        if (!value.trim()) {
          error = 'Email is required';
        } else if (!emailRegex.test(value)) {
          error = 'Please enter a valid email address';
        }
        break;

      case 'phone':
        if (!value.trim()) {
          error = 'Phone number is required';
        } else if (!phoneRegex.test(value)) {
          error = 'Please enter a valid phone number';
        } else if (value.replace(/\D/g, '').length < 7) {
          error = 'Phone number must be at least 7 digits';
        }
        break;
    }

    setErrors(prev => ({ ...prev, [field]: error }));
    return error === '';
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {
      name: '',
      email: '',
      phone: '',
      idNumber: '',
      general: '',
    };

    // Validate all fields
    if (!formData.name.trim()) {
      newErrors.name = 'Client name is required';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Client name must be at least 2 characters';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!emailRegex.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!phoneRegex.test(formData.phone)) {
      newErrors.phone = 'Please enter a valid phone number';
    } else if (formData.phone.replace(/\D/g, '').length < 7) {
      newErrors.phone = 'Phone number must be at least 7 digits';
    }

    setErrors(newErrors);
    return !Object.values(newErrors).some(error => error.length > 0);
  };

  const handleInputChange = (field: keyof ClientFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    // Clear general errors when user starts typing
    if (errors.general) {
      setErrors(prev => ({ ...prev, general: '' }));
    }
  };

  const clearForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      idNumber: '',
    });
    setErrors({
      name: '',
      email: '',
      phone: '',
      idNumber: '',
      general: '',
    });
  };

  const setGeneralError = (error: string) => {
    setErrors(prev => ({ ...prev, general: error }));
  };

  const clearGeneralError = () => {
    setErrors(prev => ({ ...prev, general: '' }));
  };

  // Real-time validation effects
  useEffect(() => {
    if (formData.name) {
      validateField('name', formData.name);
    }
  }, [formData.name]);

  useEffect(() => {
    if (formData.email) {
      validateField('email', formData.email);
    }
  }, [formData.email]);

  useEffect(() => {
    if (formData.phone) {
      validateField('phone', formData.phone);
    }
  }, [formData.phone]);

  return {
    formData,
    errors,
    handleInputChange,
    validateForm,
    clearForm,
    setGeneralError,
    clearGeneralError,
    isFormValid:
      !Object.values(errors).some(error => error.length > 0) &&
      formData.name &&
      formData.email &&
      formData.phone,
  };
};
