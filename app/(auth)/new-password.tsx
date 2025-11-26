import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  BackHandler,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useAuthStore } from '@/store/authStore';
import Colors from '@/constants/colors';
import Input from '@/components/Input';
import Button from '@/components/Button';
import Card from '@/components/Card';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

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
              <Pressable
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
              </Pressable>
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
                <Pressable
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
                </Pressable>
              </View>
            </>
          )}
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// Responsive helper function
const getResponsiveValue = (small: number, medium: number, large: number) => {
  if (SCREEN_WIDTH < 375) return small;
  if (SCREEN_WIDTH < 414) return medium;
  return large;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    padding: getResponsiveValue(16, 18, 20),
    justifyContent: 'center',
    minHeight: SCREEN_HEIGHT * 0.9,
  },
  card: {
    width: '100%',
    maxWidth: 500,
    alignSelf: 'center',
  },
  title: {
    fontSize: getResponsiveValue(22, 23, 24),
    fontWeight: '700',
    color: Colors.text,
    marginBottom: getResponsiveValue(12, 14, 16),
    textAlign: 'center',
    paddingHorizontal: getResponsiveValue(8, 12, 16),
  },
  description: {
    fontSize: getResponsiveValue(14, 15, 16),
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: getResponsiveValue(20, 22, 24),
    lineHeight: getResponsiveValue(20, 22, 24),
    paddingHorizontal: getResponsiveValue(8, 12, 16),
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    padding: getResponsiveValue(12, 14, 16),
    borderRadius: 8,
    marginBottom: getResponsiveValue(12, 14, 16),
    alignItems: 'center',
    marginHorizontal: getResponsiveValue(4, 8, 12),
  },
  errorText: {
    color: Colors.error,
    fontSize: getResponsiveValue(13, 13.5, 14),
    textAlign: 'center',
    lineHeight: getResponsiveValue(18, 19, 20),
  },
  successContainer: {
    alignItems: 'center',
    paddingVertical: getResponsiveValue(24, 28, 32),
    paddingHorizontal: getResponsiveValue(16, 18, 20),
  },
  successIconContainer: {
    width: getResponsiveValue(70, 75, 80),
    height: getResponsiveValue(70, 75, 80),
    borderRadius: getResponsiveValue(35, 37.5, 40),
    backgroundColor: Colors.success,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: getResponsiveValue(20, 22, 24),
    shadowColor: Colors.success,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  successIcon: {
    fontSize: getResponsiveValue(28, 30, 32),
    color: 'white',
    fontWeight: 'bold',
  },
  successTitle: {
    fontSize: getResponsiveValue(20, 21, 22),
    fontWeight: '700',
    color: Colors.success,
    marginBottom: getResponsiveValue(10, 11, 12),
    textAlign: 'center',
    paddingHorizontal: getResponsiveValue(12, 16, 20),
  },
  successText: {
    fontSize: getResponsiveValue(14, 15, 16),
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: getResponsiveValue(20, 22, 24),
    lineHeight: getResponsiveValue(20, 22, 24),
    paddingHorizontal: getResponsiveValue(12, 16, 20),
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: getResponsiveValue(10, 11, 12),
    marginBottom: getResponsiveValue(20, 22, 24),
  },
  loadingText: {
    fontSize: getResponsiveValue(14, 15, 16),
    color: Colors.primary,
    fontWeight: '500',
  },
  resetButton: {
    marginTop: getResponsiveValue(6, 7, 8),
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: getResponsiveValue(20, 22, 24),
    flexWrap: 'wrap',
  },
  loginText: {
    color: Colors.textSecondary,
    fontSize: getResponsiveValue(14, 15, 16),
  },
  loginLink: {
    color: Colors.primary,
    fontSize: getResponsiveValue(14, 15, 16),
    fontWeight: '600',
  },
  backToLoginButton: {
    padding: getResponsiveValue(10, 11, 12),
  },
  backToLoginText: {
    color: Colors.primary,
    fontSize: getResponsiveValue(14, 15, 16),
    fontWeight: '600',
  },
  disabledLink: {
    color: Colors.textSecondary,
    opacity: 0.5,
  },
});
