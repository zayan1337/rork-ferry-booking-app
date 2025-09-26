import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  BackHandler,
  ActivityIndicator,
} from 'react-native';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useAuthStore } from '@/store/authStore';
import Colors from '@/constants/colors';
import Input from '@/components/Input';
import Button from '@/components/Button';
import Card from '@/components/Card';

export default function NewPasswordScreen() {
  const { email, otp } = useLocalSearchParams<{
    email: string;
    otp: string;
  }>();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const [isNavigating, setIsNavigating] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const { ResetPassword, isLoading, error, clearError } = useAuthStore();

  // Prevent going back if navigating
  useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        if (isNavigating) {
          return true; // Prevent going back
        }
        return false;
      }
    );

    return () => {
      backHandler.remove();
      setIsNavigating(false);
    };
  }, [isNavigating]);

  // Handle auto-navigation after success
  useEffect(() => {
    let navigationTimer: ReturnType<typeof setTimeout>;

    if (isSuccess) {
      navigationTimer = setTimeout(() => {
        if (!isNavigating) {
          setIsNavigating(true);
          setTimeout(() => {
            router.replace('/');
          }, 100);
        }
      }, 3000);
    }

    return () => {
      if (navigationTimer) {
        clearTimeout(navigationTimer);
      }
    };
  }, [isSuccess]);

  // Clear errors when screen gains focus
  useFocusEffect(
    React.useCallback(() => {
      clearError();
    }, [clearError])
  );

  const validatePasswords = () => {
    let isValid = true;

    // Validate password
    if (!password.trim()) {
      setPasswordError('Password is required');
      isValid = false;
    } else if (password.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      isValid = false;
    } else {
      setPasswordError('');
    }

    // Validate confirm password
    if (!confirmPassword.trim()) {
      setConfirmPasswordError('Please confirm your password');
      isValid = false;
    } else if (password !== confirmPassword) {
      setConfirmPasswordError('Passwords do not match');
      isValid = false;
    } else {
      setConfirmPasswordError('');
    }

    return isValid;
  };

  const handleResetPassword = async () => {
    // Prevent multiple attempts while loading or navigating
    if (isLoading || isNavigating || isSuccess || isResetting) {
      return;
    }

    // Clear any previous errors
    clearError();

    // Validate passwords
    if (!validatePasswords()) {
      return;
    }

    try {
      setIsResetting(true);
      await ResetPassword(password);
      // Clear the password fields after success
      setPassword('');
      setConfirmPassword('');
      // Set success state
      setIsSuccess(true);
    } catch (err) {
      // Reset states if reset fails
      setIsResetting(false);
      setIsNavigating(false);
      setIsSuccess(false);
      console.error('Password reset error:', err);
    }
  };

  const handleNavigation = (path: '/') => {
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
        keyboardShouldPersistTaps='handled'
      >
        <Card variant='elevated' style={styles.card}>
          <Text style={styles.title}>Create New Password</Text>

          {error && !isSuccess && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {isSuccess ? (
            <View style={styles.successContainer}>
              <View style={styles.successIconContainer}>
                <Text style={styles.successIcon}>✓</Text>
              </View>
              <Text style={styles.successTitle}>
                Password Reset Successful!
              </Text>
              <Text style={styles.successText}>
                Your password has been successfully reset. You can now login
                with your new password.
              </Text>
              <View style={styles.loadingContainer}>
                <ActivityIndicator size='small' color={Colors.primary} />
                <Text style={styles.loadingText}>Redirecting to login...</Text>
              </View>
              <TouchableOpacity
                style={styles.backToLoginButton}
                onPress={() => {
                  if (!isNavigating) {
                    setIsNavigating(true);
                    setTimeout(() => {
                      router.replace('/');
                    }, 100);
                  }
                }}
                disabled={isNavigating}
              >
                <Text style={styles.backToLoginText}>Go to Login Now</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <Text style={styles.description}>
                Please enter your new password. Make sure it's secure and easy
                for you to remember.
              </Text>

              <Input
                label='New Password'
                placeholder='Enter your new password'
                value={password}
                onChangeText={text => {
                  setPassword(text);
                  if (passwordError) setPasswordError('');
                  // Clear auth store error when user starts typing
                  if (error) clearError();
                }}
                error={passwordError}
                secureTextEntry
                disabled={isLoading || isNavigating || isResetting}
                required
              />

              <Input
                label='Confirm New Password'
                placeholder='Confirm your new password'
                value={confirmPassword}
                onChangeText={text => {
                  setConfirmPassword(text);
                  if (confirmPasswordError) setConfirmPasswordError('');
                  // Clear auth store error when user starts typing
                  if (error) clearError();
                }}
                error={confirmPasswordError}
                secureTextEntry
                disabled={isLoading || isNavigating || isResetting}
                required
              />

              <Button
                title={isResetting ? 'Resetting Password...' : 'Reset Password'}
                onPress={handleResetPassword}
                loading={isLoading || isNavigating || isResetting}
                disabled={isLoading || isNavigating || isResetting}
                fullWidth
                style={styles.resetButton}
              />

              <View style={styles.loginContainer}>
                <Text style={styles.loginText}>Remember your password? </Text>
                <TouchableOpacity
                  disabled={isLoading || isNavigating || isResetting}
                  onPress={() => handleNavigation('/')}
                >
                  <Text
                    style={[
                      styles.loginLink,
                      (isLoading || isNavigating || isResetting) &&
                        styles.disabledLink,
                    ]}
                  >
                    Login
                  </Text>
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
    lineHeight: 24,
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    alignItems: 'center',
  },
  errorText: {
    color: Colors.error,
    fontSize: 14,
    textAlign: 'center',
  },
  successContainer: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
  },
  successIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.success,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: Colors.success,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  successIcon: {
    fontSize: 32,
    color: 'white',
    fontWeight: 'bold',
  },
  successTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.success,
    marginBottom: 12,
    textAlign: 'center',
  },
  successText: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 24,
  },
  loadingText: {
    fontSize: 16,
    color: Colors.primary,
    fontWeight: '500',
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
  disabledLink: {
    color: Colors.textSecondary,
    opacity: 0.5,
  },
});
