import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useAuthStore } from '@/store/authStore';
import Colors from '@/constants/colors';
import Input from '@/components/Input';
import Button from '@/components/Button';
import Card from '@/components/Card';
import { DateSelector } from '@/components/DateSelector';

export default function RegisterScreen() {
  const [formData, setFormData] = useState({
    fullname: '',
    phone: '',
    email: '',
    dateofbirth: null as string | null,
    password: '',
    confirmPassword: '',
  });

  const [errors, setErrors] = useState({
    fullname: '',
    phone: '',
    email: '',
    dateofbirth: '',
    password: '',
    confirmPassword: '',
  });

  const [termsAccepted, setTermsAccepted] = useState(false);
  const [termsError, setTermsError] = useState('');
  const [isNavigating, setIsNavigating] = useState(false);

  const {
    signUp,
    sendOTPForSignup,
    isAuthenticated,
    isLoading,
    error,
    clearError,
    clearLoading,
    setPreventRedirect,
  } = useAuthStore();

  // Clear preventRedirect when component unmounts
  useEffect(() => {
    return () => {
      setPreventRedirect(false);
    };
  }, [setPreventRedirect]);

  // Clear errors when screen gains focus
  useFocusEffect(
    React.useCallback(() => {
      clearError();
    }, [clearError])
  );

  const updateFormData = (
    field: keyof typeof formData,
    value: string | null
  ) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    // Clear error for this field
    if (errors[field as keyof typeof errors]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }

    // Clear auth store error when user starts typing
    if (error) {
      clearError();
    }
  };

  const validateForm = () => {
    let isValid = true;
    const newErrors = { ...errors };

    // Validate full name
    if (!formData.fullname.trim()) {
      newErrors.fullname = 'Full name is required';
      isValid = false;
    }

    // Validate mobile number
    if (!formData.phone.trim()) {
      newErrors.phone = 'Mobile number is required';
      isValid = false;
    } else if (!/^\+?[0-9]{7,15}$/.test(formData.phone)) {
      newErrors.phone = 'Enter a valid mobile number';
      isValid = false;
    }

    // Validate email
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
      isValid = false;
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Enter a valid email address';
      isValid = false;
    }

    // Validate date of birth
    if (!formData.dateofbirth) {
      newErrors.dateofbirth = 'Date of birth is required';
      isValid = false;
    }

    // Validate password
    if (!formData.password) {
      newErrors.password = 'Password is required';
      isValid = false;
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
      isValid = false;
    }

    // Validate confirm password
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
      isValid = false;
    }

    // Validate terms acceptance
    if (!termsAccepted) {
      setTermsError('You must accept the terms and conditions');
      isValid = false;
    } else {
      setTermsError('');
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleRegister = async () => {
    // Prevent multiple attempts while loading or navigating
    if (isLoading || isNavigating) {
      return;
    }

    // Clear any previous errors
    clearError();

    // Validate form
    if (!validateForm()) {
      return;
    }

    try {
      // Send OTP for signup verification
      await signUp({
        email_address: formData.email,
        password: formData.password,
        full_name: formData.fullname,
        mobile_number: formData.phone,
        date_of_birth: formData.dateofbirth || '',
        accepted_terms: termsAccepted,
      });

      // Navigate to OTP verification page
      setIsNavigating(true);
      setTimeout(() => {
        clearLoading();
        router.push({
          pathname: '/(auth)/otp-verification',
          params: { email: formData.email, type: 'signup' },
        });
      }, 300);
    } catch (err) {
      // Reset states if sending OTP fails
      console.error('Registration error:', err);
      clearLoading();
      setIsNavigating(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps='handled'
      >
        <Card variant='elevated' style={styles.card}>
          <Text style={styles.title}>Create Account</Text>

          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <Input
            label='Full Name'
            placeholder='Enter your full name'
            value={formData.fullname}
            onChangeText={text => updateFormData('fullname', text)}
            error={errors.fullname}
            disabled={isLoading || isNavigating}
            required
          />

          <Input
            label='Mobile Number'
            placeholder='+9607XXXXXXX'
            value={formData.phone}
            onChangeText={text => updateFormData('phone', text)}
            keyboardType='phone-pad'
            error={errors.phone}
            disabled={isLoading || isNavigating}
            required
          />

          <Input
            label='Email Address'
            placeholder='your.email@example.com'
            value={formData.email}
            onChangeText={text => updateFormData('email', text)}
            keyboardType='email-address'
            error={errors.email}
            disabled={isLoading || isNavigating}
            required
          />

          <DateSelector
            label='Date of Birth'
            value={formData.dateofbirth}
            onChange={date => updateFormData('dateofbirth', date)}
            maxDate={new Date().toISOString().split('T')[0]}
            error={errors.dateofbirth}
            isDateOfBirth={true}
            required
          />

          <Input
            label='Password'
            placeholder='Create a password'
            value={formData.password}
            onChangeText={text => updateFormData('password', text)}
            secureTextEntry
            error={errors.password}
            disabled={isLoading || isNavigating}
            required
          />

          <Input
            label='Confirm Password'
            placeholder='Confirm your password'
            value={formData.confirmPassword}
            onChangeText={text => updateFormData('confirmPassword', text)}
            secureTextEntry
            error={errors.confirmPassword}
            disabled={isLoading || isNavigating}
            required
          />

          <View style={styles.termsContainer}>
            <TouchableOpacity
              style={styles.checkbox}
              onPress={() => {
                setTermsAccepted(!termsAccepted);
                if (termsError) setTermsError('');
              }}
              disabled={isLoading || isNavigating}
            >
              <View
                style={[
                  styles.checkboxInner,
                  termsAccepted && styles.checkboxChecked,
                ]}
              />
            </TouchableOpacity>
            <Text style={styles.termsText}>
              I accept the{' '}
              <Text
                style={styles.termsLink}
                onPress={() => router.push('/(auth)/terms-and-conditions')}
              >
                Terms and Conditions
              </Text>
            </Text>
          </View>

          {termsError ? (
            <Text style={styles.termsError}>{termsError}</Text>
          ) : null}

          <Button
            title='Create Account'
            onPress={handleRegister}
            loading={isLoading}
            disabled={isLoading || isNavigating}
            fullWidth
            style={styles.registerButton}
          />

          <View style={styles.loginContainer}>
            <Text style={styles.loginText}>Already have an account? </Text>
            <TouchableOpacity
              disabled={isLoading || isNavigating}
              onPress={() => router.push('/')}
            >
              <Text
                style={[styles.loginLink, isLoading && styles.disabledLink]}
              >
                Login
              </Text>
            </TouchableOpacity>
          </View>
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
    paddingTop: 10,
    justifyContent: 'center',
    paddingBottom: 40,
  },
  card: {
    width: '100%',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 24,
    textAlign: 'center',
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    color: Colors.error,
    fontSize: 14,
    textAlign: 'center',
  },
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 4,
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxInner: {
    width: 12,
    height: 12,
    borderRadius: 2,
  },
  checkboxChecked: {
    backgroundColor: Colors.primary,
  },
  termsText: {
    flex: 1,
    fontSize: 14,
    color: Colors.text,
  },
  termsLink: {
    color: Colors.primary,
    fontWeight: '600',
  },
  termsError: {
    color: Colors.error,
    fontSize: 14,
    marginBottom: 16,
  },
  registerButton: {
    marginTop: 8,
    marginBottom: 16,
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 8,
  },
  loginText: {
    color: Colors.textSecondary,
    fontSize: 16,
  },
  loginLink: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  disabledLink: {
    color: Colors.textSecondary,
    opacity: 0.5,
  },
});
