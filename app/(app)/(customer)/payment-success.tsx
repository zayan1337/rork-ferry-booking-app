import React, {
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  BackHandler,
} from 'react-native';
import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import { Check, X, AlertCircle, Clock } from 'lucide-react-native';
import { supabase } from '@/utils/supabase';
import Colors from '@/constants/colors';
import Card from '@/components/Card';
import Button from '@/components/Button';
import {
  processMibPaymentResult,
  checkMibPaymentStatus,
  cancelBookingOnPaymentFailure,
  cancelBookingOnPaymentCancellation,
  releaseSeatReservations,
  cancelModificationBookingOnPaymentFailure,
  cancelModificationBookingOnPaymentCancellation,
  completeModificationAfterPayment,
} from '@/utils/paymentUtils';
import { useBookingStore } from '@/store';
import { useAgentBookingFormStore } from '@/store/agent/agentBookingFormStore';
import { useAgentStore } from '@/store/agent/agentStore';
import { BOOKING_STEPS } from '@/constants/customer';
import { useFocusEffect } from '@react-navigation/native';

const parseBooleanParam = (
  value: string | string[] | boolean | undefined
): boolean => {
  if (Array.isArray(value)) {
    return value.some(item =>
      typeof item === 'string'
        ? ['true', '1', 'yes'].includes(item.toLowerCase())
        : Boolean(item)
    );
  }

  if (typeof value === 'string') {
    return ['true', '1', 'yes'].includes(value.toLowerCase());
  }

  return Boolean(value);
};

type PaymentStatus =
  | 'success'
  | 'failed'
  | 'cancelled'
  | 'pending'
  | 'processing';

interface PaymentResult {
  success?: boolean;
  status?: string;
  message?: string;
  paymentStatus: string;
  bookingStatus: string;
  bookingId?: string;
  sessionId?: string;
}

export default function PaymentSuccessScreen() {
  const params = useLocalSearchParams();
  const [status, setStatus] = useState<PaymentStatus>('processing');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paymentResult, setPaymentResult] = useState<PaymentResult | null>(
    null
  );

  // Get booking store actions for resetting state
  const { resetBooking: resetCurrentBooking, setCurrentStep } =
    useBookingStore();

  // Import agent stores conditionally
  const { reset: resetAgentBooking, setCurrentStep: setAgentCurrentStep } =
    useAgentBookingFormStore();
  const { refreshBookingsData: refreshAgentBookingsData } = useAgentStore();

  const bookingId = params.bookingId as string;
  const result = params.result as string;
  const sessionId =
    (params['session.id'] as string) || (params.sessionId as string);
  const shouldResetBooking = useMemo(
    () => parseBooleanParam(params.resetBooking),
    [params.resetBooking]
  );
  const isModification = useMemo(
    () => parseBooleanParam(params.isModification),
    [params.isModification]
  );
  const isAgent = useMemo(
    () => parseBooleanParam(params.isAgent),
    [params.isAgent]
  );
  const shouldEnforceSafeExit = useMemo(
    () => shouldResetBooking || status === 'success',
    [shouldResetBooking, status]
  );

  useEffect(() => {
    const resultParam = (params.result as string) || '';
    const shouldReset = shouldResetBooking;

    if (resultParam === 'SUCCESS' && shouldReset) {
      resetBookingState();
    }

    handlePaymentResult();
  }, []);

  const handlePaymentResult = async () => {
    try {
      setLoading(true);

      if (!bookingId) {
        setError('Booking ID not found');
        setStatus('failed');
        return;
      }

      // Process the payment result
      if (result && (sessionId || bookingId)) {
        try {
          const resultData = await processMibPaymentResult({
            sessionId,
            result,
            bookingId, // Pass bookingId to help find the payment record
          });

          // Create a proper payment result object
          const paymentResultObject = {
            success: true,
            status: result,
            message: 'Payment processed successfully',
            bookingId: bookingId,
            sessionId: sessionId,
            paymentStatus: resultData.paymentStatus,
            bookingStatus: resultData.bookingStatus,
          };

          setPaymentResult(paymentResultObject);

          if (result === 'SUCCESS') {
            setStatus('success');

            // Handle modification completion
            if (isModification) {
              try {
                // For modifications, complete the modification process
                const { data: modificationData } = await supabase
                  .from('modifications')
                  .select('old_booking_id')
                  .eq('new_booking_id', bookingId)
                  .single();

                if (modificationData?.old_booking_id) {
                  await completeModificationAfterPayment(
                    bookingId,
                    modificationData.old_booking_id
                  );
                }
              } catch (modificationError) {
                console.warn(
                  'Failed to complete modification process:',
                  modificationError
                );
              }
            }

            // Reset booking state only on successful payment
            if (shouldResetBooking) {
              resetCurrentBooking();
              setCurrentStep(BOOKING_STEPS.ISLAND_DATE_SELECTION);
            }
          } else if (result === 'CANCELLED') {
            setStatus('cancelled');
            // Cancel booking and create cancellation record when payment is cancelled
            try {
              if (isModification) {
                // For modifications, we need to get the original booking ID
                // We'll extract it from the modification record
                const { data: modificationData } = await supabase
                  .from('modifications')
                  .select('old_booking_id')
                  .eq('new_booking_id', bookingId)
                  .single();

                if (modificationData?.old_booking_id) {
                  await cancelModificationBookingOnPaymentCancellation(
                    bookingId,
                    modificationData.old_booking_id,
                    'Modification payment cancelled by user'
                  );
                } else {
                  // Fallback to regular cancellation
                  await cancelBookingOnPaymentCancellation(
                    bookingId,
                    'Payment cancelled by user'
                  );
                }
              } else {
                await cancelBookingOnPaymentCancellation(
                  bookingId,
                  'Payment cancelled by user'
                );
              }
            } catch (cancelError) {
              console.warn(
                'Failed to cancel booking on payment cancellation:',
                cancelError
              );
              // Fallback to just releasing seats
              try {
                await releaseSeatReservations(bookingId);
              } catch (seatError) {
                console.warn(
                  'Failed to release seats on cancellation:',
                  seatError
                );
              }
            }

            // Reset booking state on cancellation
            if (shouldResetBooking) {
              resetBookingState();
            }
          } else if (result === 'FAILURE') {
            setStatus('failed');
            // Cancel booking and release seats when payment fails
            try {
              if (isModification) {
                // For modifications, we need to get the original booking ID
                const { data: modificationData } = await supabase
                  .from('modifications')
                  .select('old_booking_id')
                  .eq('new_booking_id', bookingId)
                  .single();

                if (modificationData?.old_booking_id) {
                  await cancelModificationBookingOnPaymentFailure(
                    bookingId,
                    modificationData.old_booking_id,
                    'Modification payment failed'
                  );
                } else {
                  // Fallback to regular cancellation
                  await cancelBookingOnPaymentFailure(
                    bookingId,
                    'Payment failed'
                  );
                }
              } else {
                await cancelBookingOnPaymentFailure(
                  bookingId,
                  'Payment failed'
                );
              }
            } catch (cancelError) {
              console.warn(
                'Failed to cancel booking on payment failure:',
                cancelError
              );
            }

            // Reset booking state on failure
            if (shouldResetBooking) {
              resetBookingState();
            }
          } else {
            setStatus('pending');
          }
        } catch (processError) {
          // If Edge Function fails but we have a SUCCESS result from the URL,
          // we can still show success since we know the payment completed
          if (result === 'SUCCESS') {
            // Manually update the payment and booking status in the database
            try {
              const { manuallyUpdatePaymentStatus } = await import(
                '@/utils/paymentUtils'
              );
              await manuallyUpdatePaymentStatus(bookingId);
            } catch (updateError) {
              // Silent fallback
            }

            setPaymentResult({
              success: true,
              status: 'SUCCESS',
              message: 'Payment completed successfully',
              bookingId: bookingId,
              sessionId: sessionId,
              paymentStatus: 'completed',
              bookingStatus: 'confirmed',
            });
            setStatus('success');

            // Handle modification completion
            if (isModification) {
              try {
                // For modifications, complete the modification process
                const { data: modificationData } = await supabase
                  .from('modifications')
                  .select('old_booking_id')
                  .eq('new_booking_id', bookingId)
                  .single();

                if (modificationData?.old_booking_id) {
                  await completeModificationAfterPayment(
                    bookingId,
                    modificationData.old_booking_id
                  );
                }
              } catch (modificationError) {
                console.warn(
                  'Failed to complete modification process:',
                  modificationError
                );
              }
            }

            // Reset booking state only on successful payment
            if (shouldResetBooking) {
              resetCurrentBooking();
              setCurrentStep(BOOKING_STEPS.ISLAND_DATE_SELECTION);
            }
          } else if (result === 'CANCELLED') {
            // Cancel booking and release seats when payment is cancelled
            try {
              await cancelBookingOnPaymentCancellation(
                bookingId,
                'Payment cancelled by user'
              );
            } catch (cancelError) {
              console.warn(
                'Failed to cancel booking on payment cancellation:',
                cancelError
              );
              // Fallback to manual update
              try {
                const { error: paymentUpdateError } = await supabase
                  .from('payments')
                  .update({ status: 'cancelled' })
                  .eq('booking_id', bookingId)
                  .eq('payment_method', 'mib');

                const { error: bookingUpdateError } = await supabase
                  .from('bookings')
                  .update({ status: 'cancelled' })
                  .eq('id', bookingId);

                // Try to release seats manually
                await releaseSeatReservations(bookingId);
              } catch (updateError) {
                // Silent fallback
              }
            }

            setPaymentResult({
              success: false,
              status: 'CANCELLED',
              message: 'Payment was cancelled',
              bookingId: bookingId,
              sessionId: sessionId,
              paymentStatus: 'cancelled',
              bookingStatus: 'cancelled',
            });
            setStatus('cancelled');

            // Reset booking state on cancellation
            if (shouldResetBooking) {
              resetBookingState();
            }
          } else if (result === 'FAILURE') {
            // Cancel booking and release seats when payment fails
            try {
              await cancelBookingOnPaymentFailure(bookingId, 'Payment failed');
            } catch (cancelError) {
              console.warn(
                'Failed to cancel booking on payment failure:',
                cancelError
              );
              // Fallback to manual update
              try {
                const { error: paymentUpdateError } = await supabase
                  .from('payments')
                  .update({ status: 'failed' })
                  .eq('booking_id', bookingId)
                  .eq('payment_method', 'mib');

                const { error: bookingUpdateError } = await supabase
                  .from('bookings')
                  .update({ status: 'cancelled' })
                  .eq('id', bookingId);

                // Try to release seats manually
                await releaseSeatReservations(bookingId);
              } catch (updateError) {
                // Silent fallback
              }
            }

            setPaymentResult({
              success: false,
              status: 'FAILURE',
              message: 'Payment failed',
              bookingId: bookingId,
              sessionId: sessionId,
              paymentStatus: 'failed',
              bookingStatus: 'cancelled',
            });
            setStatus('failed');

            // Reset booking state on failure
            if (shouldResetBooking) {
              resetBookingState();
            }
          } else {
            setPaymentResult({
              success: false,
              status: 'PENDING',
              message: 'Payment status unknown',
              bookingId: bookingId,
              sessionId: sessionId,
              paymentStatus: 'pending',
              bookingStatus: 'pending_payment',
            });
            setStatus('pending');
          }
        }
      } else {
        const resultData = await checkMibPaymentStatus(bookingId);

        // Create a proper payment result object for database results
        const paymentResultObject = {
          success: resultData.paymentStatus === 'completed',
          status:
            resultData.paymentStatus === 'completed'
              ? 'SUCCESS'
              : resultData.paymentStatus === 'failed'
                ? 'FAILURE'
                : 'PENDING',
          message: `Payment status: ${resultData.paymentStatus}`,
          bookingId: bookingId,
          sessionId: sessionId,
          paymentStatus: resultData.paymentStatus,
          bookingStatus: resultData.bookingStatus,
        };

        setPaymentResult(paymentResultObject);

        if (resultData.paymentStatus === 'completed') {
          setStatus('success');

          // Handle modification completion
          if (isModification) {
            try {
              // For modifications, complete the modification process
              const { data: modificationData } = await supabase
                .from('modifications')
                .select('old_booking_id')
                .eq('new_booking_id', bookingId)
                .single();

              if (modificationData?.old_booking_id) {
                await completeModificationAfterPayment(
                  bookingId,
                  modificationData.old_booking_id
                );
              }
            } catch (modificationError) {
              console.warn(
                'Failed to complete modification process:',
                modificationError
              );
            }
          }

          // Reset booking state only on successful payment
          if (shouldResetBooking) {
            resetCurrentBooking();
            setCurrentStep(BOOKING_STEPS.ISLAND_DATE_SELECTION);
          }
        } else if (resultData.paymentStatus === 'failed') {
          setStatus('failed');
          // Release seats when payment is failed (from database check)
          try {
            await releaseSeatReservations(bookingId);
          } catch (seatError) {
            console.warn(
              'Failed to release seats on payment failure:',
              seatError
            );
          }

          // Reset booking state on failure
          if (shouldResetBooking) {
            resetBookingState();
          }
        } else {
          setStatus('pending');
        }
      }
    } catch (error: any) {
      setError(error.message || 'Failed to process payment result');
      setStatus('failed');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'success':
        return <Check size={48} color={Colors.success} />;
      case 'failed':
        return <X size={48} color={Colors.error} />;
      case 'cancelled':
        return <X size={48} color={Colors.warning} />;
      case 'pending':
        return <Clock size={48} color={Colors.warning} />;
      default:
        return <AlertCircle size={48} color={Colors.primary} />;
    }
  };

  const getStatusTitle = () => {
    switch (status) {
      case 'success':
        return 'Payment Successful!';
      case 'failed':
        return 'Payment Failed';
      case 'cancelled':
        return 'Payment Cancelled';
      case 'pending':
        return 'Payment Pending';
      default:
        return 'Processing Payment';
    }
  };

  const getStatusMessage = () => {
    switch (status) {
      case 'success':
        return isAgent
          ? 'The payment has been processed successfully. The booking is now confirmed and the client will receive a confirmation email shortly.'
          : 'Your payment has been processed successfully. Your booking is now confirmed and you will receive a confirmation email shortly.';
      case 'failed':
        return isAgent
          ? 'The payment could not be processed. Please try again or contact support if the problem persists.'
          : 'Your payment could not be processed. Please try again or contact support if the problem persists.';
      case 'cancelled':
        return isAgent
          ? 'The payment was cancelled. No charges have been made and the booking has been cancelled.'
          : 'Your payment was cancelled. No charges have been made to your account.';
      case 'pending':
        return isAgent
          ? 'The payment is being processed. Please wait while we confirm the payment.'
          : 'Your payment is being processed. Please wait while we confirm your payment.';
      default:
        return isAgent
          ? 'We are processing the payment. Please wait...'
          : 'We are processing your payment. Please wait...';
    }
  };

  const formatStatusLabel = (status: string): string => {
    return status
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  const isNavigatingRef = useRef(false);

  const resetBookingState = useCallback(async () => {
    if (isAgent) {
      resetAgentBooking();
      setAgentCurrentStep(1);
      try {
        await refreshAgentBookingsData();
      } catch (refreshError) {
        console.warn('Failed to refresh agent bookings data:', refreshError);
      }
    } else {
      resetCurrentBooking();
      setCurrentStep(BOOKING_STEPS.ISLAND_DATE_SELECTION);
    }
  }, [
    isAgent,
    resetAgentBooking,
    setAgentCurrentStep,
    refreshAgentBookingsData,
    resetCurrentBooking,
    setCurrentStep,
  ]);

  const navigateAfterReset = useCallback(
    async (path: string) => {
      if (isNavigatingRef.current) {
        return;
      }
      isNavigatingRef.current = true;
      await resetBookingState();
      router.replace(path as any);
    },
    [resetBookingState]
  );

  const fallbackRoute = useMemo(
    () =>
      isAgent
        ? '/(app)/(agent)/(tabs)/bookings'
        : '/(app)/(customer)/(tabs)/bookings',
    [isAgent]
  );

  useFocusEffect(
    useCallback(() => {
      if (shouldEnforceSafeExit) {
        const onBackPress = () => {
          if (isNavigatingRef.current) {
            return true;
          }
          navigateAfterReset(fallbackRoute);
          return true;
        };
        const subscription = BackHandler.addEventListener(
          'hardwareBackPress',
          onBackPress
        );
        return () => subscription.remove();
      }
      return undefined;
    }, [shouldEnforceSafeExit, fallbackRoute, navigateAfterReset])
  );

  const navigation = useNavigation();

  useEffect(() => {
    if (shouldEnforceSafeExit) {
      const preventDefault = (e: any) => {
        if (isNavigatingRef.current) {
          return;
        }
        e.preventDefault();
        navigateAfterReset(fallbackRoute);
      };
      const unsubscribe = navigation.addListener(
        'beforeRemove',
        preventDefault
      );
      return unsubscribe;
    }
  }, [navigation, shouldEnforceSafeExit, fallbackRoute, navigateAfterReset]);

  const handleRetryPayment = () => {
    if (!shouldEnforceSafeExit) {
      if (isAgent) {
        setAgentCurrentStep(6);
      } else {
        setCurrentStep(BOOKING_STEPS.PAYMENT);
      }
      router.back();
    } else {
      const fallbackPath = isAgent
        ? '/(app)/(agent)/(tabs)/bookings'
        : '/(app)/(customer)/(tabs)/bookings';
      navigateAfterReset(fallbackPath);
    }
  };

  const handleViewBookings = () => {
    navigateAfterReset(
      isAgent
        ? '/(app)/(agent)/(tabs)/bookings'
        : '/(app)/(customer)/(tabs)/bookings'
    );
  };

  const handleGoHome = () => {
    navigateAfterReset(
      isAgent ? '/(app)/(agent)/(tabs)' : '/(app)/(customer)/(tabs)'
    );
  };

  const handleNewBooking = () => {
    navigateAfterReset(
      isAgent
        ? '/(app)/(agent)/agent-booking/new'
        : '/(app)/(customer)/(tabs)/book'
    );
  };

  const handleCheckStatus = async () => {
    try {
      setLoading(true);
      setError(null);

      const resultData = await checkMibPaymentStatus(bookingId);
      setPaymentResult(resultData);

      if (resultData.paymentStatus === 'completed') {
        setStatus('success');

        // Handle modification completion
        if (isModification) {
          try {
            // For modifications, complete the modification process
            const { data: modificationData } = await supabase
              .from('modifications')
              .select('old_booking_id')
              .eq('new_booking_id', bookingId)
              .single();

            if (modificationData?.old_booking_id) {
              await completeModificationAfterPayment(
                bookingId,
                modificationData.old_booking_id
              );
            }
          } catch (modificationError) {
            console.warn(
              'Failed to complete modification process:',
              modificationError
            );
          }
        }

        // Reset booking state only on successful payment
        if (shouldResetBooking) {
          resetCurrentBooking();
          setCurrentStep(BOOKING_STEPS.ISLAND_DATE_SELECTION);
        }
      } else if (resultData.paymentStatus === 'failed') {
        setStatus('failed');
        // Release seats when payment is failed (from manual status check)
        try {
          await releaseSeatReservations(bookingId);
        } catch (seatError) {
          console.warn(
            'Failed to release seats on payment failure:',
            seatError
          );
        }

        // Reset booking state on failure
        if (shouldResetBooking) {
          resetBookingState();
        }
      } else {
        setStatus('pending');
      }
    } catch (error: any) {
      setError(error.message || 'Failed to check payment status');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size='large' color={Colors.primary} />
          <Text style={styles.loadingText}>Processing payment...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Card variant='elevated' style={styles.card}>
        <View style={styles.iconContainer}>{getStatusIcon()}</View>

        <Text style={styles.title}>{getStatusTitle()}</Text>
        <Text style={styles.message}>{getStatusMessage()}</Text>

        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {paymentResult && (
          <View style={styles.resultContainer}>
            <Text style={styles.resultTitle}>Payment Details:</Text>
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>Payment Status:</Text>
              <Text style={styles.resultValue}>
                {formatStatusLabel(paymentResult.paymentStatus)}
              </Text>
            </View>
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>Booking Status:</Text>
              <Text style={styles.resultValue}>
                {formatStatusLabel(paymentResult.bookingStatus)}
              </Text>
            </View>
          </View>
        )}

        <View style={styles.buttonContainer}>
          {status === 'success' && (
            <>
              <Button
                title={isAgent ? 'View Bookings' : 'View My Bookings'}
                onPress={handleViewBookings}
                style={styles.primaryButton}
              />
              {isAgent && (
                <Button
                  title='New Booking'
                  onPress={handleNewBooking}
                  variant='outline'
                  style={styles.secondaryButton}
                />
              )}
              <Button
                title={isAgent ? 'Dashboard' : 'Go Home'}
                onPress={handleGoHome}
                variant='outline'
                style={styles.secondaryButton}
              />
            </>
          )}

          {status === 'failed' && (
            <>
              <Button
                title={isAgent ? 'View Bookings' : 'View My Bookings'}
                onPress={handleViewBookings}
                style={styles.primaryButton}
              />
              {isAgent && (
                <Button
                  title='New Booking'
                  onPress={handleNewBooking}
                  variant='outline'
                  style={styles.secondaryButton}
                />
              )}
              <Button
                title={isAgent ? 'Dashboard' : 'Go Home'}
                onPress={handleGoHome}
                variant='outline'
                style={styles.secondaryButton}
              />
            </>
          )}

          {status === 'cancelled' && (
            <>
              <Button
                title={isAgent ? 'View Bookings' : 'View My Bookings'}
                onPress={handleViewBookings}
                style={styles.primaryButton}
              />
              {isAgent && (
                <Button
                  title='New Booking'
                  onPress={handleNewBooking}
                  variant='outline'
                  style={styles.secondaryButton}
                />
              )}
              <Button
                title={isAgent ? 'Dashboard' : 'Go Home'}
                onPress={handleGoHome}
                variant='outline'
                style={styles.secondaryButton}
              />
            </>
          )}

          {status === 'pending' && (
            <>
              <Button
                title='Check Status'
                onPress={handleCheckStatus}
                style={styles.primaryButton}
              />
              <Button
                title={isAgent ? 'Dashboard' : 'Go Home'}
                onPress={handleGoHome}
                variant='outline'
                style={styles.secondaryButton}
              />
            </>
          )}
        </View>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: Colors.textSecondary,
  },
  card: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  iconContainer: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 16,
  },
  message: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  errorContainer: {
    backgroundColor: Colors.error + '10',
    borderWidth: 1,
    borderColor: Colors.error,
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
  },
  errorText: {
    color: Colors.error,
    fontSize: 14,
    textAlign: 'center',
  },
  resultContainer: {
    backgroundColor: Colors.highlight,
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
    width: '100%',
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  resultLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  resultValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  buttonContainer: {
    width: '100%',
    gap: 12,
  },
  primaryButton: {
    marginBottom: 8,
  },
  secondaryButton: {
    marginBottom: 8,
  },
});
