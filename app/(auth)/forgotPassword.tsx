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
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
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
  const [isSendingOTP, setIsSendingOTP] = useState(false);

  const {
    sendOTPForPasswordReset,
    isLoading,
    error,
    clearError,
    clearLoading,
  } = useAuthStore();

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
      setIsNavigating(false); // Reset navigation state when unmounting
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
            router.push('/');
          }, 100);
        }
      }, 5000);
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

  const handleSendOTP = async () => {
    // Prevent multiple attempts while loading or navigating
    if (isLoading || isNavigating || isSendingOTP) {
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
      setIsSendingOTP(true);
      await sendOTPForPasswordReset(email);

      // Keep loading state and navigate
      setIsNavigating(true);

      // Navigate with a small delay to ensure loading screen is visible
      setTimeout(() => {
        clearLoading(); // Clear the auth store loading state
        router.push({
          pathname: '/(auth)/otp-verification',
          params: { email, type: 'forgot-password' },
        });
      }, 300); // Increased delay to 300ms
    } catch (err) {
      // Reset states if sending OTP fails
      console.error('Send OTP error:', err);
      setIsSendingOTP(false);
      setIsNavigating(false);
      setIsSuccess(false);
    }
  };

  // Show loading screen while sending OTP or navigating
  // if (isSendingOTP || isNavigating || isLoading) {
  //   return (
  //     <AuthLoadingScreen
  //       message={
  //         isSendingOTP || isLoading
  //           ? `Sending verification code to ${email}...`
  //           : 'Redirecting to verification page...'
  //       }
  //     />
  //   );
  // }

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
        {/* <View style={styles.logoContainer}>
          <Image
            source={{
              uri: 'https://images.unsplash.com/photo-1534008897995-27a23e859048?q=80&w=1000&auto=format&fit=crop',
            }}
            style={styles.logo}
          />
          <Text style={styles.appName}>Crystal Transfer Vaavu</Text>
          <Text style={styles.tagline}>Your gateway to island adventures</Text>
        </View> */}

        <Card variant='elevated' style={styles.card}>
          <Text style={styles.title}>Reset Password</Text>

          {error && !isSuccess && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {isSuccess ? (
            <View style={styles.successContainer}>
              <Text style={styles.successIcon}>✓</Text>
              <Text style={styles.successTitle}>Code Sent Successfully!</Text>
              <Text style={styles.successText}>
                We've sent a 6-digit verification code to {email}. You'll be
                redirected to enter the code shortly.
              </Text>
              <Text style={styles.successNote}>
                Redirecting to verification page...
              </Text>
            </View>
          ) : (
            <>
              <Text style={styles.description}>
                Enter your email address and we'll send you a verification code
                to reset your password.
              </Text>

              <Input
                label='Email Address'
                placeholder='Enter your email address'
                value={email}
                onChangeText={text => {
                  setEmail(text);
                  if (emailError) setEmailError('');
                  // Clear auth store error when user starts typing
                  if (error) clearError();
                }}
                error={emailError}
                keyboardType='email-address'
                autoCapitalize='none'
                disabled={isLoading || isNavigating || isSendingOTP}
                required
              />

              <Button
                title={
                  isSendingOTP ? 'Sending Code...' : 'Send Verification Code'
                }
                onPress={handleSendOTP}
                loading={isLoading || isNavigating || isSendingOTP}
                disabled={isLoading || isNavigating || isSendingOTP}
                fullWidth
                style={styles.resetButton}
              />

              <View style={styles.loginContainer}>
                <Text style={styles.loginText}>Remember your password? </Text>
                <TouchableOpacity
                  disabled={isLoading || isNavigating || isSendingOTP}
                  onPress={() => {
                    if (!isNavigating && !isLoading && !isSendingOTP) {
                      setIsNavigating(true);
                      setTimeout(() => {
                        router.push('/');
                      }, 100);
                    }
                  }}
                >
                  <Text
                    style={[
                      styles.loginLink,
                      (isLoading || isNavigating || isSendingOTP) &&
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
    padding: 20,
    backgroundColor: '#e8f5e9',
    borderRadius: 8,
    marginBottom: 16,
  },
  successIcon: {
    fontSize: 32,
    color: Colors.success,
    marginBottom: 12,
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
    marginBottom: 16,
  },
  successNote: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontStyle: 'italic',
    marginBottom: 16,
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
  disabledLink: {
    color: Colors.textSecondary,
    opacity: 0.5,
  },
});
