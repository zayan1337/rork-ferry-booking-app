import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  BackHandler
} from 'react-native';
import { Link, router } from 'expo-router';
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
  const [isSuccess, setIsSuccess] = useState(false);
  const [countdown, setCountdown] = useState(5);

  const { signUp, isAuthenticated, isLoading, error, clearError } = useAuthStore();

  useEffect(() => {
    // If user is already authenticated, redirect to app
    if (isAuthenticated && !isNavigating) {
      setIsNavigating(true);
      router.replace('/(app)/(tabs)');
    }
  }, [isAuthenticated]);

  // Prevent going back if authenticated or navigating
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (isAuthenticated || isNavigating) {
        return true; // Prevent going back
      }
      return false;
    });

    return () => {
      backHandler.remove();
      setIsNavigating(false); // Reset navigation state when unmounting
    };
  }, [isAuthenticated, isNavigating]);

  // Handle countdown timer when success state is true
  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    if (isSuccess && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    } else if (isSuccess && countdown === 0 && !isNavigating) {
      setIsNavigating(true);
      // Navigate based on authentication state
      if (isAuthenticated) {
        router.replace('/(app)/(tabs)');
      } else {
        router.replace('/');
      }
    }

    return () => {
      if (timer) {
        clearInterval(timer);
      }
    };
  }, [isSuccess, countdown, isNavigating, isAuthenticated]);

  const updateFormData = (field: keyof typeof formData, value: string | null) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    // Clear error for this field
    if (errors[field as keyof typeof errors]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
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

  const handleNavigation = (path: '/') => {
    if (!isNavigating && !isLoading) {
      setIsNavigating(true);
      router.push(path);
    }
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
      // Attempt registration with enhanced signUp
      await signUp({
        email_address: formData.email,
        password: formData.password,
        full_name: formData.fullname,
        mobile_number: formData.phone,
        date_of_birth: formData.dateofbirth || '',
        accepted_terms: termsAccepted
      });

      // Show success message with countdown
      setIsSuccess(true);
      setCountdown(5);

    } catch (err) {
      // Reset navigation state if registration fails
      setIsNavigating(false);
      setIsSuccess(false);
      console.error('Registration error:', err);
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
        keyboardShouldPersistTaps="handled"
      >
        <Card variant="elevated" style={styles.card}>
          <Text style={styles.title}>Create Account</Text>

          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {isSuccess ? (
            <View style={styles.successContainer}>
              <Text style={styles.successTitle}>Registration Successful!</Text>
              <Text style={styles.successText}>
                Your account has been created successfully.
              </Text>
              <Text style={styles.countdownText}>
                Redirecting {isAuthenticated ? 'to home page' : 'to login'} in {countdown} seconds...
              </Text>
              <Button
                title={`Skip (${countdown}s)`}
                onPress={() => setCountdown(0)}
                disabled={isNavigating}
                fullWidth
                style={styles.skipButton}
              />
            </View>
          ) : (
            <>
              <Input
                label="Full Name"
                placeholder="Enter your full name"
                value={formData.fullname}
                onChangeText={(text) => updateFormData('fullname', text)}
                error={errors.fullname}
                disabled={isLoading || isNavigating}
                required
              />

              <Input
                label="Mobile Number"
                placeholder="+9607XXXXXXX"
                value={formData.phone}
                onChangeText={(text) => updateFormData('phone', text)}
                keyboardType="phone-pad"
                error={errors.phone}
                disabled={isLoading || isNavigating}
                required
              />

              <Input
                label="Email Address"
                placeholder="your.email@example.com"
                value={formData.email}
                onChangeText={(text) => updateFormData('email', text)}
                keyboardType="email-address"
                error={errors.email}
                disabled={isLoading || isNavigating}
                required
              />

              <DateSelector
                label="Date of Birth"
                value={formData.dateofbirth}
                onChange={(date) => updateFormData('dateofbirth', date)}
                maxDate={new Date().toISOString().split('T')[0]}
                error={errors.dateofbirth}
                isDateOfBirth={true}
                required
              />

              <Input
                label="Password"
                placeholder="Create a password"
                value={formData.password}
                onChangeText={(text) => updateFormData('password', text)}
                secureTextEntry
                error={errors.password}
                disabled={isLoading || isNavigating}
                required
              />

              <Input
                label="Confirm Password"
                placeholder="Confirm your password"
                value={formData.confirmPassword}
                onChangeText={(text) => updateFormData('confirmPassword', text)}
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
                  <View style={[
                    styles.checkboxInner,
                    termsAccepted && styles.checkboxChecked
                  ]} />
                </TouchableOpacity>
                <Text style={styles.termsText}>
                  I accept the{' '}
                  <Text style={styles.termsLink}>Terms and Conditions</Text>
                </Text>
              </View>

              {termsError ? (
                <Text style={styles.termsError}>{termsError}</Text>
              ) : null}
            </>
          )}

          {!isSuccess && (
            <>
              <Button
                title="Create Account"
                onPress={handleRegister}
                loading={isLoading || isNavigating}
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
                  <Text style={styles.loginLink}>Login</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
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
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
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
  successContainer: {
    backgroundColor: '#e8f5e9',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    alignItems: 'center',
  },
  successTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.success,
    marginBottom: 8,
  },
  successText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 12,
  },
  countdownText: {
    fontSize: 16,
    color: Colors.primary,
    fontWeight: '500',
    marginBottom: 16,
    textAlign: 'center',
  },
  skipButton: {
    marginTop: 8,
    backgroundColor: Colors.secondary,
  },
});