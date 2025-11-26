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
import Button from '@/components/Button';
import Card from '@/components/Card';
import OTPInput from '@/components/OTPInput';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function OTPVerificationScreen() {
  const { email, type } = useLocalSearchParams<{
    email: string;
    type: 'forgot-password' | 'signup';
  }>();

  const [otp, setOtp] = useState('');
  const [otpError, setOtpError] = useState('');
  const [isNavigating, setIsNavigating] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(60);
  const [isVerifying, setIsVerifying] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const {
    completePendingRegistration,
    sendOTPForPasswordReset,
    sendOTPForSignup,
    pendingRegistration,
    isLoading,
    error,
    clearError,
    clearLoading,
    verifyOTP,
  } = useAuthStore();

  // Clear loading state when component mounts (after navigation)
  useEffect(() => {
    clearLoading();
    setIsVerifying(false);
    setIsNavigating(false);
  }, [clearLoading]);

  // Reset states when OTP is cleared (e.g., after resend)
  useEffect(() => {
    if (otp === '') {
      setIsVerifying(false);
      setOtpError('');
    }
  }, [otp]);

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

  // Resend cooldown timer
  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    if (resendCooldown > 0) {
      timer = setInterval(() => {
        setResendCooldown(prev => prev - 1);
      }, 1000);
    }

    return () => {
      if (timer) {
        clearInterval(timer);
      }
    };
  }, [resendCooldown]);

  // Clear errors when screen gains focus
  useFocusEffect(
    React.useCallback(() => {
      clearError();
    }, [clearError])
  );

  const handleVerifyOTP = async () => {
    if (isLoading || isNavigating || isVerifying) {
      return;
    }

    // Clear any previous errors
    clearError();
    setOtpError('');

    // Validate OTP
    if (!otp.trim()) {
      setOtpError('Please enter the verification code');
      return;
    }

    if (otp.length !== 6) {
      setOtpError('Please enter a valid 6-digit code');
      return;
    }

    try {
      setIsVerifying(true);

      if (type === 'signup') {
        // First verify the OTP
        await verifyOTP(email, otp, 'email');
        // Then complete the registration
        // await completePendingRegistration();

        // Show success state
        setShowSuccess(true);

        // Navigate after showing success
        setTimeout(() => {
          setIsNavigating(true);
          setTimeout(() => {
            router.replace('/');
          }, 100);
        }, 2000);
      } else if (type === 'forgot-password') {
        // For forgot password, verify OTP and keep session for password reset
        await verifyOTP(email, otp, 'recovery');

        // Navigate to new password screen after successful verification
        setIsNavigating(true);
        router.push({
          pathname: '/(auth)/new-password',
          params: { email, otp },
        });
      }
    } catch (err) {
      setIsVerifying(false);
      setIsNavigating(false);
      console.error('OTP verification error:', err);
      setOtp('');
      // Handle specific error types
      let errorMessage = 'Verification failed. Please try again.';

      if (err instanceof Error) {
        if (err.message.includes('rate limit')) {
          errorMessage =
            'Too many attempts. Please wait a few minutes before trying again.';
        } else if (
          err.message.includes('expired') ||
          err.message.includes('invalid')
        ) {
          errorMessage =
            'Invalid or expired code. Please request a new verification code.';
        } else if (err.message.includes('Token has expired')) {
          errorMessage =
            'Verification code has expired. Please request a new one.';
        }
      }

      setOtpError(errorMessage);
    }
  };

  const handleResendOTP = async () => {
    if (isLoading || resendCooldown > 0) {
      return;
    }

    // Clear all states and errors
    clearError();
    setOtpError('');
    setOtp('');
    setIsVerifying(false); // Reset verifying state
    setIsNavigating(false); // Reset navigating state

    try {
      if (type === 'signup') {
        if (pendingRegistration) {
          await sendOTPForSignup(pendingRegistration);
        } else {
          throw new Error('No pending registration found');
        }
      } else {
        await sendOTPForPasswordReset(email);
      }

      // Clear the auth store loading state after successful resend
      clearLoading();
      setResendCooldown(60); // 60 seconds cooldown
    } catch (err) {
      console.error('Resend OTP error:', err);
      // Make sure to clear loading state even on error
      clearLoading();
      setIsVerifying(false);
      setIsNavigating(false);
    }
  };

  const handleNavigation = (path: '/' | '/register' | '/forgotPassword') => {
    if (!isNavigating && !isLoading) {
      setIsNavigating(true);
      router.push(path);
    }
  };

  const getTitle = () => {
    return type === 'signup' ? 'Verify Your Email' : 'Verify Your Identity';
  };

  const getDescription = () => {
    if (type === 'signup') {
      return `We've sent a 6-digit verification code to ${email}. Please enter it below to verify your email address.`;
    }
    return `We've sent a 6-digit verification code to ${email}. Please enter it below to reset your password.`;
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
        showsVerticalScrollIndicator={false}
      >
        <Card variant='elevated' style={styles.card}>
          <Text style={styles.title}>{getTitle()}</Text>

          {showSuccess ? (
            <View style={styles.successContainer}>
              <View style={styles.successIconContainer}>
                <Text style={styles.successIcon}>✓</Text>
              </View>
              <Text style={styles.successTitle}>
                {type === 'signup'
                  ? 'Account Created Successfully!'
                  : 'Code Verified!'}
              </Text>
              <Text style={styles.successText}>
                {type === 'signup'
                  ? 'Your account has been created and verified. You will be redirected to the login page shortly.'
                  : 'Your identity has been verified. You can now create a new password.'}
              </Text>
              <View style={styles.loadingContainer}>
                <ActivityIndicator size='small' color={Colors.primary} />
                <Text style={styles.loadingText}>Redirecting...</Text>
              </View>
            </View>
          ) : (
            <>
              {error && (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              <Text style={styles.description}>{getDescription()}</Text>

              <View style={styles.otpContainer}>
                <Text style={styles.otpLabel}>Enter 6-digit code</Text>
                <OTPInput
                  value={otp}
                  onChange={value => {
                    setOtp(value);
                    // Clear error when user starts typing
                    if (otpError) {
                      setOtpError('');
                    }
                    // Clear auth store error when user starts typing
                    if (error) {
                      clearError();
                    }
                  }}
                  error={otpError}
                  disabled={isLoading || isNavigating || isVerifying}
                  onComplete={handleVerifyOTP}
                />
              </View>

              <Button
                title={isVerifying ? 'Verifying...' : 'Verify Code'}
                onPress={handleVerifyOTP}
                loading={isLoading || isNavigating || isVerifying}
                disabled={
                  isLoading || isNavigating || isVerifying || otp.length !== 6
                }
                fullWidth
                style={styles.verifyButton}
              />

              <View style={styles.resendContainer}>
                <Text style={styles.resendText}>Didn't receive the code? </Text>
                <Pressable
                  disabled={
                    isLoading ||
                    isNavigating ||
                    isVerifying ||
                    resendCooldown > 0
                  }
                  onPress={handleResendOTP}
                >
                  <Text
                    style={[
                      styles.resendLink,
                      (isLoading ||
                        isNavigating ||
                        isVerifying ||
                        resendCooldown > 0) &&
                        styles.disabledLink,
                    ]}
                  >
                    {resendCooldown > 0
                      ? `Resend (${resendCooldown}s)`
                      : 'Resend'}
                  </Text>
                </Pressable>
              </View>

              <View style={styles.backContainer}>
                <Text style={styles.backText}>Wrong email? </Text>
                <Pressable
                  disabled={isLoading || isNavigating || isVerifying}
                  onPress={() => {
                    if (type === 'signup') {
                      handleNavigation('/register');
                    } else {
                      handleNavigation('/forgotPassword');
                    }
                  }}
                >
                  <Text
                    style={[
                      styles.backLink,
                      (isLoading || isNavigating || isVerifying) &&
                        styles.disabledLink,
                    ]}
                  >
                    Go Back
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
    fontSize: getResponsiveValue(22, 24, 26),
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
    marginBottom: getResponsiveValue(24, 28, 32),
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
  otpContainer: {
    marginBottom: getResponsiveValue(32, 36, 40),
    paddingHorizontal: getResponsiveValue(4, 8, 12),
    width: '100%',
    alignItems: 'center',
  },
  otpLabel: {
    fontSize: getResponsiveValue(16, 17, 18),
    fontWeight: '600',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: getResponsiveValue(20, 22, 24),
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
    lineHeight: getResponsiveValue(20, 22, 24),
    marginBottom: getResponsiveValue(20, 22, 24),
    paddingHorizontal: getResponsiveValue(12, 16, 20),
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: getResponsiveValue(10, 11, 12),
  },
  loadingText: {
    fontSize: getResponsiveValue(14, 15, 16),
    color: Colors.primary,
    fontWeight: '500',
  },
  verifyButton: {
    marginBottom: getResponsiveValue(24, 28, 32),
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 6,
    borderRadius: 12,
  },
  resendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: getResponsiveValue(16, 18, 20),
    paddingVertical: getResponsiveValue(6, 7, 8),
    flexWrap: 'wrap',
  },
  resendText: {
    color: Colors.textSecondary,
    fontSize: getResponsiveValue(14, 15, 16),
  },
  resendLink: {
    color: Colors.primary,
    fontSize: getResponsiveValue(14, 15, 16),
    fontWeight: '600',
  },
  backContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    paddingHorizontal: getResponsiveValue(8, 12, 16),
  },
  backText: {
    color: Colors.textSecondary,
    fontSize: getResponsiveValue(14, 15, 16),
  },
  backLink: {
    color: Colors.primary,
    fontSize: getResponsiveValue(14, 15, 16),
    fontWeight: '600',
  },
  disabledLink: {
    color: Colors.textSecondary,
    opacity: 0.5,
  },
});
