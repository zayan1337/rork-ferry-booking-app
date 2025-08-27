import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Check, X, AlertCircle, Clock } from 'lucide-react-native';
import { supabase } from '@/utils/supabase';
import Colors from '@/constants/colors';
import Card from '@/components/Card';
import Button from '@/components/Button';
import {
  processMibPaymentResult,
  checkMibPaymentStatus,
} from '@/utils/paymentUtils';

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

  const bookingId = params.bookingId as string;
  const result = params.result as string;
  const sessionId =
    (params['session.id'] as string) || (params.sessionId as string);

  useEffect(() => {
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
        console.log('🔄 Processing payment result with Edge Function...', {
          result,
          sessionId,
          bookingId,
          timestamp: new Date().toISOString(),
        });

        try {
          const resultData = await processMibPaymentResult({
            sessionId,
            result,
            bookingId, // Pass bookingId to help find the payment record
          });

          console.log('📊 Payment result processed successfully:', {
            resultData,
            originalResult: result,
            hasNote: !!resultData.note,
          });

          // Create a proper payment result object
          const paymentResultObject = {
            success: resultData.success || true,
            status: result,
            message: resultData.note || 'Payment processed successfully',
            bookingId: resultData.bookingId || bookingId,
            sessionId: resultData.sessionId || sessionId,
            paymentStatus: resultData.paymentStatus,
            bookingStatus: resultData.bookingStatus,
          };

          setPaymentResult(paymentResultObject);

          if (result === 'SUCCESS') {
            console.log('✅ Setting status to success');
            setStatus('success');
          } else if (result === 'CANCELLED') {
            console.log('❌ Setting status to cancelled');
            setStatus('cancelled');
          } else if (result === 'FAILURE') {
            console.log('💥 Setting status to failed');
            setStatus('failed');
          } else {
            console.log('⏳ Setting status to pending');
            setStatus('pending');
          }
        } catch (processError) {
          console.error('❌ Edge Function failed to process payment result:', {
            processError:
              processError instanceof Error
                ? processError.message
                : 'Unknown error',
            result,
            sessionId,
            bookingId,
            stack:
              processError instanceof Error ? processError.stack : undefined,
          });

          // If Edge Function fails but we have a SUCCESS result from the URL,
          // we can still show success since we know the payment completed
          if (result === 'SUCCESS') {
            console.log(
              '🔄 Edge Function failed but result is SUCCESS - attempting manual update'
            );

            // Manually update the payment and booking status in the database
            try {
              const { manuallyUpdatePaymentStatus } = await import(
                '@/utils/paymentUtils'
              );
              await manuallyUpdatePaymentStatus(bookingId);

              console.log('✅ Manual payment status update successful');
            } catch (updateError) {
              console.error('❌ Failed to manually update payment status:', {
                updateError:
                  updateError instanceof Error
                    ? updateError.message
                    : 'Unknown error',
                bookingId,
              });
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
          } else if (result === 'CANCELLED') {
            console.log(
              '❌ Edge Function failed but result is CANCELLED - attempting manual update'
            );

            // Update payment status to cancelled
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

              console.log('✅ Manual cancellation update completed', {
                paymentUpdateError,
                bookingUpdateError,
              });
            } catch (updateError) {
              console.error(
                '❌ Failed to update cancelled status:',
                updateError
              );
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
          } else if (result === 'FAILURE') {
            console.log(
              '💥 Edge Function failed but result is FAILURE - attempting manual update'
            );

            // Update payment status to failed
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

              console.log('✅ Manual failure update completed', {
                paymentUpdateError,
                bookingUpdateError,
              });
            } catch (updateError) {
              console.error('❌ Failed to update failed status:', updateError);
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
          } else {
            console.log('❓ Edge Function failed with unknown result:', result);

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
        console.log(
          '🔍 No result/sessionId provided - checking payment status from database...',
          {
            bookingId,
            hasResult: !!result,
            hasSessionId: !!sessionId,
          }
        );

        const resultData = await checkMibPaymentStatus(bookingId);

        console.log('📊 Database Status Check Result:', {
          resultData,
          bookingId,
          timestamp: new Date().toISOString(),
        });

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
          console.log(
            '✅ Database check shows payment completed - setting success'
          );
          setStatus('success');
        } else if (resultData.paymentStatus === 'failed') {
          console.log(
            '💥 Database check shows payment failed - setting failed'
          );
          setStatus('failed');
        } else {
          console.log(
            '⏳ Database check shows payment pending - setting pending'
          );
          setStatus('pending');
        }
      }
    } catch (error: any) {
      console.error('Error handling payment result:', error);
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
        return 'Your payment has been processed successfully. Your booking is now confirmed and you will receive a confirmation email shortly.';
      case 'failed':
        return 'Your payment could not be processed. Please try again or contact support if the problem persists.';
      case 'cancelled':
        return 'Your payment was cancelled. No charges have been made to your account.';
      case 'pending':
        return 'Your payment is being processed. Please wait while we confirm your payment.';
      default:
        return 'We are processing your payment. Please wait...';
    }
  };

  const handleRetryPayment = () => {
    // Navigate back to booking page to retry payment
    router.back();
  };

  const handleViewBookings = () => {
    router.push('/(app)/(customer)/(tabs)/bookings');
  };

  const handleGoHome = () => {
    router.push('/(app)/(customer)/(tabs)');
  };

  const handleCheckStatus = async () => {
    try {
      setLoading(true);
      setError(null);

      const resultData = await checkMibPaymentStatus(bookingId);
      setPaymentResult(resultData);

      if (resultData.paymentStatus === 'completed') {
        setStatus('success');
      } else if (resultData.paymentStatus === 'failed') {
        setStatus('failed');
      } else {
        setStatus('pending');
      }
    } catch (error: any) {
      console.error('Error checking payment status:', error);
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
                {paymentResult.paymentStatus}
              </Text>
            </View>
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>Booking Status:</Text>
              <Text style={styles.resultValue}>
                {paymentResult.bookingStatus}
              </Text>
            </View>
          </View>
        )}

        <View style={styles.buttonContainer}>
          {status === 'success' && (
            <>
              <Button
                title='View My Bookings'
                onPress={handleViewBookings}
                style={styles.primaryButton}
              />
              <Button
                title='Go Home'
                onPress={handleGoHome}
                variant='outline'
                style={styles.secondaryButton}
              />
            </>
          )}

          {status === 'failed' && (
            <>
              <Button
                title='Try Again'
                onPress={handleRetryPayment}
                style={styles.primaryButton}
              />
              <Button
                title='Go Home'
                onPress={handleGoHome}
                variant='outline'
                style={styles.secondaryButton}
              />
            </>
          )}

          {status === 'cancelled' && (
            <>
              <Button
                title='Try Again'
                onPress={handleRetryPayment}
                style={styles.primaryButton}
              />
              <Button
                title='Go Home'
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
                title='Go Home'
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
