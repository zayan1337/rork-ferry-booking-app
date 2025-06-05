import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  KeyboardAvoidingView, 
  Platform,
  ScrollView,
  TouchableOpacity
} from 'react-native';
import { Link, router } from 'expo-router';
import { useAuthStore } from '@/store/authStore';
import Colors from '@/constants/colors';
import Input from '@/components/Input';
import Button from '@/components/Button';
import DatePicker from '@/components/DatePicker';
import Card from '@/components/Card';

export default function RegisterScreen() {
  const [formData, setFormData] = useState({
    fullName: '',
    mobileNumber: '',
    email: '',
    dateOfBirth: null as string | null,
    username: '',
    password: '',
    confirmPassword: '',
  });
  
  const [errors, setErrors] = useState({
    fullName: '',
    mobileNumber: '',
    email: '',
    dateOfBirth: '',
    username: '',
    password: '',
    confirmPassword: '',
  });
  
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [termsError, setTermsError] = useState('');
  
  const { register, isAuthenticated, isLoading, error, clearError } = useAuthStore();
  
  useEffect(() => {
    // If user is already authenticated, redirect to app
    if (isAuthenticated) {
      router.replace('/(app)/(tabs)');
    }
  }, [isAuthenticated]);
  
  const updateFormData = (field: string, value: string | null) => {
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
    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Full name is required';
      isValid = false;
    }
    
    // Validate mobile number
    if (!formData.mobileNumber.trim()) {
      newErrors.mobileNumber = 'Mobile number is required';
      isValid = false;
    } else if (!/^\+?[0-9]{7,15}$/.test(formData.mobileNumber)) {
      newErrors.mobileNumber = 'Enter a valid mobile number';
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
    if (!formData.dateOfBirth) {
      newErrors.dateOfBirth = 'Date of birth is required';
      isValid = false;
    }
    
    // Validate username
    if (!formData.username.trim()) {
      newErrors.username = 'Username is required';
      isValid = false;
    } else if (formData.username.length < 4) {
      newErrors.username = 'Username must be at least 4 characters';
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
    // Clear any previous errors
    clearError();
    
    // Validate form
    if (!validateForm()) {
      return;
    }
    
    // Attempt registration
    await register({
      fullName: formData.fullName,
      mobileNumber: formData.mobileNumber,
      email: formData.email,
      dateOfBirth: formData.dateOfBirth || '',
      username: formData.username,
      password: formData.password,
    });
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
          
          <Input
            label="Full Name"
            placeholder="Enter your full name"
            value={formData.fullName}
            onChangeText={(text) => updateFormData('fullName', text)}
            error={errors.fullName}
            disabled={isLoading}
            required
          />
          
          <Input
            label="Mobile Number"
            placeholder="+9607XXXXXXX"
            value={formData.mobileNumber}
            onChangeText={(text) => updateFormData('mobileNumber', text)}
            keyboardType="phone-pad"
            error={errors.mobileNumber}
            disabled={isLoading}
            required
          />
          
          <Input
            label="Email Address"
            placeholder="your.email@example.com"
            value={formData.email}
            onChangeText={(text) => updateFormData('email', text)}
            keyboardType="email-address"
            error={errors.email}
            disabled={isLoading}
            required
          />
          
          <DatePicker
            label="Date of Birth"
            value={formData.dateOfBirth}
            onChange={(date) => updateFormData('dateOfBirth', date)}
            maxDate={new Date().toISOString().split('T')[0]}
            error={errors.dateOfBirth}
            disabled={isLoading}
            required
          />
          
          <Input
            label="Username"
            placeholder="Choose a username"
            value={formData.username}
            onChangeText={(text) => updateFormData('username', text)}
            error={errors.username}
            disabled={isLoading}
            required
          />
          
          <Input
            label="Password"
            placeholder="Create a password"
            value={formData.password}
            onChangeText={(text) => updateFormData('password', text)}
            secureTextEntry
            error={errors.password}
            disabled={isLoading}
            required
          />
          
          <Input
            label="Confirm Password"
            placeholder="Confirm your password"
            value={formData.confirmPassword}
            onChangeText={(text) => updateFormData('confirmPassword', text)}
            secureTextEntry
            error={errors.confirmPassword}
            disabled={isLoading}
            required
          />
          
          <View style={styles.termsContainer}>
            <TouchableOpacity
              style={styles.checkbox}
              onPress={() => {
                setTermsAccepted(!termsAccepted);
                if (termsError) setTermsError('');
              }}
              disabled={isLoading}
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
          
          <Button
            title="Create Account"
            onPress={handleRegister}
            loading={isLoading}
            disabled={isLoading}
            fullWidth
            style={styles.registerButton}
          />
          
          <View style={styles.loginContainer}>
            <Text style={styles.loginText}>Already have an account? </Text>
            <Link href="/" asChild>
              <TouchableOpacity disabled={isLoading}>
                <Text style={styles.loginLink}>Login</Text>
              </TouchableOpacity>
            </Link>
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
});