import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Keyboard
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { AlertTriangle } from 'lucide-react-native';
import { useUserBookingsStore } from '@/store/userBookingsStore';
import Colors from '@/constants/colors';
import Card from '@/components/Card';
import Input from '@/components/Input';
import Button from '@/components/Button';

export default function CancelBookingScreen() {
  const { id } = useLocalSearchParams();
  const { bookings, cancelBooking, fetchUserBookings, isLoading } = useUserBookingsStore();

  const scrollViewRef = useRef<ScrollView>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [activeInput, setActiveInput] = useState<string | null>(null);
  const inputRefs = useRef({
    reason: null as any,
    accountNumber: null as any,
    accountName: null as any,
    bankName: null as any,
  });

  const [reason, setReason] = useState('');
  const [bankDetails, setBankDetails] = useState({
    accountNumber: '',
    accountName: '',
    bankName: '',
  });
  const [errors, setErrors] = useState({
    reason: '',
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

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      (e) => {
        setKeyboardHeight(e.endCoordinates.height);
        // Scroll to active input when keyboard appears
        if (activeInput) {
          scrollToInput(activeInput);
        }
      }
    );
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => {
        setKeyboardHeight(0);
        setActiveInput(null);
      }
    );

    return () => {
      keyboardDidShowListener?.remove();
      keyboardDidHideListener?.remove();
    };
  }, [activeInput]);

  const scrollToInput = (inputKey: string) => {
    setTimeout(() => {
      const inputRef = inputRefs.current[inputKey as keyof typeof inputRefs.current];
      if (inputRef && scrollViewRef.current) {
        inputRef.measureLayout(
          scrollViewRef.current,
          (x: number, y: number) => {
            const scrollOffset = y - 100; // Position input 100px from top
            scrollViewRef.current?.scrollTo({
              x: 0,
              y: Math.max(0, scrollOffset),
              animated: true,
            });
          },
          () => {
            // Fallback if measureLayout fails
          }
        );
      }
    }, 100); // Small delay for smooth animation
  };

  // Find the booking by id with proper type handling
  const booking = bookings.find((b: any) => {
    // Handle both string and number IDs
    return String(b.id) === String(id);
  });

  if (!booking) {
    return (
      <View style={styles.notFoundContainer}>
        <Text style={styles.notFoundText}>Booking not found</Text>
        <Button
          title="Go Back"
          onPress={() => router.back()}
          style={styles.notFoundButton}
        />
      </View>
    );
  }

  const validateForm = () => {
    let isValid = true;
    const newErrors = { ...errors };

    if (!reason.trim()) {
      newErrors.reason = 'Please provide a cancellation reason';
      isValid = false;
    }

    if (!bankDetails.accountNumber.trim()) {
      newErrors.accountNumber = 'Account number is required';
      isValid = false;
    }

    if (!bankDetails.accountName.trim()) {
      newErrors.accountName = 'Account name is required';
      isValid = false;
    }

    if (!bankDetails.bankName.trim()) {
      newErrors.bankName = 'Bank name is required';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleCancel = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      await cancelBooking(booking.id, reason, bankDetails);

      Alert.alert(
        "Booking Cancelled",
        "Your booking has been cancelled successfully. A refund of 50% will be processed within 72 hours.",
        [
          {
            text: "OK",
            onPress: () => router.replace('/(app)/(customer)/(tabs)/bookings')
          }
        ]
      );
    } catch (error) {
      Alert.alert(
        "Cancellation Failed",
        "There was an error cancelling your booking. Please try again."
      );
    }
  };

  // Calculate refund amount (50% of total fare)
  const refundAmount = booking.totalFare * 0.5;

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
        keyboardShouldPersistTaps="handled"
      >
        <Card variant="elevated" style={styles.warningCard}>
          <View style={styles.warningHeader}>
            <AlertTriangle size={24} color={Colors.warning} style={styles.warningIcon} />
            <Text style={styles.warningTitle}>Cancellation Policy</Text>
          </View>
          <Text style={styles.warningText}>
            You are about to cancel your booking. Please note that:
          </Text>
          <View style={styles.policyList}>
            <Text style={styles.policyItem}>• Only 50% of the fare will be refunded</Text>
            <Text style={styles.policyItem}>• Refund will be processed within 72 hours</Text>
            <Text style={styles.policyItem}>• This action cannot be undone</Text>
          </View>
        </Card>

        <Card variant="elevated" style={styles.bookingCard}>
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
              {new Date(booking.departureDate).toLocaleDateString()}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Total Fare:</Text>
            <Text style={styles.detailValue}>MVR {booking.totalFare.toFixed(2)}</Text>
          </View>

          <View style={styles.refundRow}>
            <Text style={styles.refundLabel}>Refund Amount (50%):</Text>
            <Text style={styles.refundValue}>MVR {refundAmount.toFixed(2)}</Text>
          </View>
        </Card>

        <Card variant="elevated" style={styles.formCard}>
          <Text style={styles.cardTitle}>Cancellation Reason</Text>

          <View
            ref={(ref) => { inputRefs.current.reason = ref; }}
          >
            <Input
              label="Reason for Cancellation"
              placeholder="Please provide a reason for cancellation"
              value={reason}
              onChangeText={(text) => {
                setReason(text);
                if (errors.reason) setErrors({ ...errors, reason: '' });
              }}
              onFocus={() => {
                setActiveInput('reason');
                scrollToInput('reason');
              }}
              multiline
              numberOfLines={3}
              error={errors.reason}
              required
            />
          </View>

          <Text style={styles.cardTitle}>Refund Bank Details</Text>

          <View
            ref={(ref) => { inputRefs.current.accountNumber = ref; }}
          >
            <Input
              label="Account Number"
              placeholder="Enter your bank account number"
              value={bankDetails.accountNumber}
              onChangeText={(text) => {
                setBankDetails({ ...bankDetails, accountNumber: text });
                if (errors.accountNumber) setErrors({ ...errors, accountNumber: '' });
              }}
              onFocus={() => {
                setActiveInput('accountNumber');
                scrollToInput('accountNumber');
              }}
              error={errors.accountNumber}
              required
            />
          </View>

          <View
            ref={(ref) => { inputRefs.current.accountName = ref; }}
          >
            <Input
              label="Account Holder Name"
              placeholder="Enter account holder name"
              value={bankDetails.accountName}
              onChangeText={(text) => {
                setBankDetails({ ...bankDetails, accountName: text });
                if (errors.accountName) setErrors({ ...errors, accountName: '' });
              }}
              onFocus={() => {
                setActiveInput('accountName');
                scrollToInput('accountName');
              }}
              error={errors.accountName}
              required
            />
          </View>

          <View
            ref={(ref) => { inputRefs.current.bankName = ref; }}
          >
            <Input
              label="Bank Name"
              placeholder="Enter bank name"
              value={bankDetails.bankName}
              onChangeText={(text) => {
                setBankDetails({ ...bankDetails, bankName: text });
                if (errors.bankName) setErrors({ ...errors, bankName: '' });
              }}
              onFocus={() => {
                setActiveInput('bankName');
                scrollToInput('bankName');
              }}
              error={errors.bankName}
              required
            />
          </View>
        </Card>

        <View style={styles.buttonContainer}>
          <Button
            title="Go Back"
            onPress={() => router.back()}
            variant="outline"
            style={styles.backButton}
          />

          <Button
            title="Confirm Cancellation"
            onPress={handleCancel}
            loading={isLoading}
            disabled={isLoading}
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
    fontWeight: '500',
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
    color: Colors.primary,
  },
  formCard: {
    marginBottom: 24,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  backButton: {
    flex: 1,
    marginRight: 8,
  },
  cancelButton: {
    flex: 1,
    marginLeft: 8,
    backgroundColor: Colors.error,
  },
  cancelButtonText: {
    color: '#fff',
  },
  notFoundContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  notFoundText: {
    fontSize: 18,
    color: Colors.text,
    marginBottom: 20,
  },
  notFoundButton: {
    minWidth: 120,
  },
});