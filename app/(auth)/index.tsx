import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  BackHandler
} from 'react-native';
import { Link, router, useFocusEffect } from 'expo-router';
import { useAuthStore } from '@/store/authStore';
import Colors from '@/constants/colors';
import Input from '@/components/Input';
import Button from '@/components/Button';
import Card from '@/components/Card';

export default function LoginScreen() {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
  });

  const [errors, setErrors] = useState({
    username: '',
    password: '',
  });

  const { login, isAuthenticated, isLoading, error, clearError } = useAuthStore();
  const [isNavigating, setIsNavigating] = useState(false);

  // Reset navigation state when screen receives focus
  useFocusEffect(
    React.useCallback(() => {
      setIsNavigating(false);
      return () => { };
    }, [])
  );

  useEffect(() => {
    // If user is already authenticated, redirect to app
    if (isAuthenticated && !isNavigating) {
      setIsNavigating(true);
      router.replace('/(app)/(tabs)');
    }
  }, [isAuthenticated]);

  // Prevent going back if authenticated
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (isAuthenticated || isNavigating) {
        return true; // Prevent going back
      }
      return false;
    });

    return () => backHandler.remove();
  }, [isAuthenticated, isNavigating]);

  const updateFormData = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    // Clear error for this field
    if (errors[field as keyof typeof errors]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    let isValid = true;
    const newErrors = { ...errors };

    // Validate username (email or phone)
    if (!formData.username.trim()) {
      newErrors.username = 'Email or phone number is required';
      isValid = false;
    } else {
      const isEmail = /\S+@\S+\.\S+/.test(formData.username);
      const isPhone = /^\+?[0-9]{7,15}$/.test(formData.username);
      if (!isEmail && !isPhone) {
        newErrors.username = 'Enter a valid email or phone number';
        isValid = false;
      }
    }

    // Validate password
    if (!formData.password) {
      newErrors.password = 'Password is required';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleLogin = async () => {
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

    // Attempt login
    try {
      await login(formData.username, formData.password);
    } catch (err) {
      // Reset navigation state if login fails
      setIsNavigating(false);
    }
  };

  const handleNavigation = (path: '/' | '/register' | '/forgotPassword') => {
    if (!isNavigating && !isLoading) {
      setIsNavigating(true);
      router.push(path);
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
        <View style={styles.logoContainer}>
          <Image
            source={{ uri: 'https://images.unsplash.com/photo-1534008897995-27a23e859048?q=80&w=1000&auto=format&fit=crop' }}
            style={styles.logo}
          />
          <Text style={styles.appName}>Ferry Booking</Text>
          <Text style={styles.tagline}>Your gateway to island adventures</Text>
        </View>

        <Card variant="elevated" style={styles.card}>
          <Text style={styles.title}>Welcome Back</Text>

          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <Input
            label="Email"
            placeholder="Enter your email"
            value={formData.username}
            onChangeText={(text) => updateFormData('username', text)}
            error={errors.username}
            autoCapitalize="none"
            keyboardType="email-address"
            disabled={isLoading || isNavigating}
            required
          />

          <Input
            label="Password"
            placeholder="Enter your password"
            value={formData.password}
            onChangeText={(text) => updateFormData('password', text)}
            secureTextEntry
            error={errors.password}
            disabled={isLoading || isNavigating}
            required
          />

          <TouchableOpacity
            style={styles.forgotPasswordContainer}
            disabled={isLoading || isNavigating}
            onPress={() => handleNavigation('/forgotPassword')}
          >
            <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
          </TouchableOpacity>

          <Button
            title="Login"
            onPress={handleLogin}
            loading={isLoading || isNavigating}
            disabled={isLoading || isNavigating}
            fullWidth
            style={styles.loginButton}
          />

          <View style={styles.registerContainer}>
            <Text style={styles.registerText}>Don't have an account? </Text>
            <TouchableOpacity
              disabled={isLoading || isNavigating}
              onPress={() => handleNavigation('/register')}
            >
              <Text style={styles.registerLink}>Sign Up</Text>
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
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logo: {
    width: 100,
    height: 100,
    borderRadius: 20,
    marginBottom: 16,
  },
  appName: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: 8,
  },
  tagline: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
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
  loginButton: {
    marginTop: 8,
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  registerText: {
    color: Colors.textSecondary,
    fontSize: 16,
  },
  registerLink: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  demoContainer: {
    marginTop: 24,
    alignItems: 'center',
  },
  demoText: {
    color: Colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
  },
  forgotPasswordContainer: {
    alignSelf: 'flex-end',
    marginTop: 4,
    marginBottom: 16,
  },
  forgotPasswordText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '500',
  },
});