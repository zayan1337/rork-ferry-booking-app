import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { AlertTriangle } from 'lucide-react-native';
import { useUserBookingsStore } from '@/store/userBookingsStore';
import { useKeyboardHandler } from '@/hooks/useKeyboardHandler';
import { useFormValidation } from '@/hooks/useFormValidation';
import { useBookingEligibility } from '@/hooks/useBookingEligibility';
import Colors from '@/constants/colors';
import Card from '@/components/Card';
import Input from '@/components/Input';
import Button from '@/components/Button';
import { formatBookingDate } from '@/utils/dateUtils';
import { calculateRefundAmount } from '@/utils/paymentUtils';
import type { BankDetails } from '@/types/pages/booking';
import { useAlertContext } from '@/components/AlertProvider';

export default function CancelBookingScreen() {
  const { id } = useLocalSearchParams();
  const { bookings, cancelBooking, fetchUserBookings, isLoading } =
    useUserBookingsStore();
  const { showError, showSuccess, showWarning } = useAlertContext();

  const scrollViewRef = useRef<ScrollView>(null);
  const { keyboardHeight, handleInputFocus, setInputRef } = useKeyboardHandler({
    scrollViewRef,
  });

  const { errors, validateCancellationForm, clearError } = useFormValidation({
    validateBankDetails: true,
  });

  const [reason, setReason] = useState('');
  const [bankDetails, setBankDetails] = useState<BankDetails>({
    accountNumber: '',
    accountName: '',
    bankName: '',
  });

  // Ensure bookings are loaded when component mounts
  useEffect(() => {
    if (bookings.length === 0) {
      fetchUserBookings();
    }
  }, [fetchUserBookings, bookings.length]);

  // Find the booking by id with proper type handling
  const booking =
    bookings.find((b: any) => {
      // Handle both string and number IDs
      return String(b.id) === String(id);
    }) ?? null;

  // Use booking eligibility hook
  const { isCancellable, message } = useBookingEligibility({ booking });

  if (!booking) {
    return (
      <View style={styles.notFoundContainer}>
        <Text style={styles.notFoundText}>Booking not found</Text>
        <Button
          title='Go Back'
          onPress={() => router.back()}
          style={styles.notFoundButton}
        />
      </View>
    );
  }

  // Calculate refund amount (50% of total fare)
  const refundAmount = calculateRefundAmount(booking.totalFare);

  const handleInputChange = (field: keyof BankDetails, value: string) => {
    setBankDetails(prev => ({ ...prev, [field]: value }));
    clearError(field as any);
  };

  const handleReasonChange = (text: string) => {
    setReason(text);
    clearError('reason');
  };

  const handleCancel = async () => {
    if (!isCancellable) {
      showWarning(
        'Cannot Cancel',
        message || 'This booking cannot be cancelled'
      );
      return;
    }

    if (!validateCancellationForm(reason, bankDetails)) {
      return;
    }

    try {
      await cancelBooking(booking.id, reason, bankDetails);

      // Determine refund message based on payment method
      const isMibPayment = booking.payment?.method === 'mib';
      const refundMessage = isMibPayment
        ? 'Your booking has been cancelled successfully. A refund of 50% has been initiated and will be processed to your original payment method within 3-5 business days.'
        : 'Your booking has been cancelled successfully. A refund of 50% will be processed to your bank account within 5-7 business days.';

      showSuccess('Booking Cancelled', refundMessage, () => {
        router.replace('/(app)/(customer)/(tabs)/bookings');
      });
    } catch (error) {
      showError(
        'Cancellation Failed',
        'There was an error cancelling your booking. Please try again.'
      );
    }
  };

  const renderBookingDetails = () => (
    <Card variant='elevated' style={styles.bookingCard}>
      <Text style={styles.cardTitle}>Booking Details</Text>

      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>Booking Number:</Text>
        <Text style={styles.detailValue}>{booking.bookingNumber}</Text>
      </View>

      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>Route:</Text>
        <Text style={styles.detailValue}>
          {booking.route.fromIsland.name} → {booking.route.toIsland.name}
        </Text>
      </View>

      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>Date:</Text>
        <Text style={styles.detailValue}>
          {formatBookingDate(booking.departureDate)}
        </Text>
      </View>

      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>Total Fare:</Text>
        <Text style={styles.detailValue}>
          MVR {booking.totalFare.toFixed(2)}
        </Text>
      </View>

      <View style={styles.refundRow}>
        <Text style={styles.refundLabel}>Refund Amount (50%):</Text>
        <Text style={styles.refundValue}>MVR {refundAmount.toFixed(2)}</Text>
      </View>
    </Card>
  );

  const renderCancellationForm = () => {
    const isMibPayment = booking?.payment?.method === 'mib';

    return (
      <Card variant='elevated' style={styles.formCard}>
        <Text style={styles.cardTitle}>Cancellation Reason</Text>

        <View ref={ref => setInputRef('reason', ref)}>
          <Input
            label='Reason for Cancellation'
            placeholder='Please provide a reason for cancellation'
            value={reason}
            onChangeText={handleReasonChange}
            onFocus={() => handleInputFocus('reason')}
            multiline
            numberOfLines={3}
            error={errors.reason}
            required
          />
        </View>

        <Text style={styles.cardTitle}>
          {isMibPayment
            ? 'Refund Bank Details (Backup)'
            : 'Refund Bank Details'}
        </Text>

        {isMibPayment && (
          <Text style={styles.infoText}>
            Your refund will be automatically processed to your original payment
            method. Bank details are required as a backup option.
          </Text>
        )}

        <View ref={ref => setInputRef('accountNumber', ref)}>
          <Input
            label='Account Number'
            placeholder='Enter your bank account number'
            value={bankDetails.accountNumber}
            onChangeText={text => handleInputChange('accountNumber', text)}
            onFocus={() => handleInputFocus('accountNumber')}
            error={errors.accountNumber}
            required
          />
        </View>

        <View ref={ref => setInputRef('accountName', ref)}>
          <Input
            label='Account Holder Name'
            placeholder='Enter account holder name'
            value={bankDetails.accountName}
            onChangeText={text => handleInputChange('accountName', text)}
            onFocus={() => handleInputFocus('accountName')}
            error={errors.accountName}
            required
          />
        </View>

        <View ref={ref => setInputRef('bankName', ref)}>
          <Input
            label='Bank Name'
            placeholder='Enter bank name'
            value={bankDetails.bankName}
            onChangeText={text => handleInputChange('bankName', text)}
            onFocus={() => handleInputFocus('bankName')}
            error={errors.bankName}
            required
          />
        </View>
      </Card>
    );
  };

  const renderWarningCard = () => {
    const isMibPayment = booking?.payment?.method === 'mib';

    return (
      <Card variant='elevated' style={styles.warningCard}>
        <View style={styles.warningHeader}>
          <AlertTriangle
            size={24}
            color={Colors.warning}
            style={styles.warningIcon}
          />
          <Text style={styles.warningTitle}>Cancellation Policy</Text>
        </View>
        <Text style={styles.warningText}>
          You are about to cancel your booking. Please note that:
        </Text>
        <View style={styles.policyList}>
          <Text style={styles.policyItem}>
            • Only 50% of the fare will be refunded
          </Text>
          <Text style={styles.policyItem}>
            {isMibPayment
              ? '• Refund will be automatically processed to your original payment method'
              : '• Refund will be transferred to the bank account you provide'}
          </Text>
          <Text style={styles.policyItem}>
            {isMibPayment
              ? '• Processing time: 3-5 business days'
              : '• Processing time: 5-7 business days'}
          </Text>
          <Text style={styles.policyItem}>• This action cannot be undone</Text>
        </View>
      </Card>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 80}
      enabled
    >
      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={[styles.contentContainer, { flexGrow: 1 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps='handled'
      >
        {renderWarningCard()}
        {renderBookingDetails()}
        {renderCancellationForm()}

        <View style={styles.buttonContainer}>
          <Button
            title='Go Back'
            onPress={() => router.back()}
            variant='outline'
            style={styles.backButton}
          />

          <Button
            title='Confirm Cancellation'
            onPress={handleCancel}
            loading={isLoading}
            disabled={isLoading || !isCancellable}
            style={styles.cancelButton}
            textStyle={styles.cancelButtonText}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  warningCard: {
    marginBottom: 16,
    backgroundColor: '#fff8e1',
    borderLeftWidth: 4,
    borderLeftColor: Colors.warning,
  },
  warningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  warningIcon: {
    marginRight: 8,
  },
  warningTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  warningText: {
    fontSize: 14,
    color: Colors.text,
    marginBottom: 8,
  },
  policyList: {
    marginBottom: 8,
  },
  policyItem: {
    fontSize: 14,
    color: Colors.text,
    marginBottom: 4,
  },
  bookingCard: {
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  refundRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  refundLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  refundValue: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.success,
  },
  formCard: {
    marginBottom: 24,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  backButton: {
    flex: 1,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: Colors.error,
  },
  cancelButtonText: {
    color: '#ffffff',
  },
  notFoundContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  notFoundText: {
    fontSize: 18,
    color: Colors.textSecondary,
    marginBottom: 16,
  },
  notFoundButton: {
    minWidth: 120,
  },
  infoText: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 16,
    fontStyle: 'italic',
    lineHeight: 18,
  },
});
