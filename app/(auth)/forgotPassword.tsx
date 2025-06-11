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
  BackHandler
} from 'react-native';
import { Link, router } from 'expo-router';
import { useAuthStore } from '@/store/authStore';
import Colors from '@/constants/colors';
import Input from '@/components/Input';
import Button from '@/components/Button';
import Card from '@/components/Card';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  
  const { resetPassword, isLoading, error, clearError } = useAuthStore();

  // Prevent going back if navigating
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (isNavigating) {
        return true; // Prevent going back
      }
      return false;
    });

    return () => {
      backHandler.remove();
      setIsNavigating(false); // Reset navigation state when unmounting
    };
  }, [isNavigating]);
  
  const validateEmail = () => {
    if (!email.trim()) {
      setEmailError('Email is required');
      return false;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setEmailError('Enter a valid email address');
      return false;
    }
    return true;
  };

  const handleNavigation = (path: '/' | '/register' | '/forgotPassword') => {
    if (!isNavigating && !isLoading) {
      setIsNavigating(true);
      router.push(path);
    }
  };
  
  const handleResetPassword = async () => {
    // Prevent multiple attempts while loading or navigating
    if (isLoading || isNavigating) {
      return;
    }

    // Clear any previous errors
    clearError();
    setEmailError('');
    
    // Validate email
    if (!validateEmail()) {
      return;
    }
    
    try {
      await resetPassword(email);
      setIsSuccess(true);
    } catch (err) {
      // Reset navigation state if reset fails
      setIsNavigating(false);
      console.error('Password reset error:', err);
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
          <Text style={styles.title}>Reset Password</Text>
          
          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}
          
          {isSuccess ? (
            <View style={styles.successContainer}>
              <Text style={styles.successTitle}>Check Your Email</Text>
              <Text style={styles.successText}>
                We've sent password reset instructions to your email address. Please check your inbox and follow the instructions to reset your password.
              </Text>
              <TouchableOpacity 
                style={styles.backToLoginButton}
                onPress={() => handleNavigation('/')}
                disabled={isNavigating}
              >
                <Text style={styles.backToLoginText}>Back to Login</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <Text style={styles.description}>
                Enter your email address and we'll send you instructions to reset your password.
              </Text>
              
              <Input
                label="Email Address"
                placeholder="Enter your email address"
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  if (emailError) setEmailError('');
                }}
                error={emailError}
                keyboardType="email-address"
                autoCapitalize="none"
                disabled={isLoading || isNavigating}
                required
              />
              
              <Button
                title="Reset Password"
                onPress={handleResetPassword}
                loading={isLoading || isNavigating}
                disabled={isLoading || isNavigating}
                fullWidth
                style={styles.resetButton}
              />
              
              <View style={styles.loginContainer}>
                <Text style={styles.loginText}>Remember your password? </Text>
                <TouchableOpacity 
                  disabled={isLoading || isNavigating}
                  onPress={() => handleNavigation('/')}
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
    marginBottom: 16,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
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
  successContainer: {
    alignItems: 'center',
    padding: 16,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.success,
    marginBottom: 12,
  },
  successText: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  resetButton: {
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
  backToLoginButton: {
    padding: 12,
  },
  backToLoginText: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
});