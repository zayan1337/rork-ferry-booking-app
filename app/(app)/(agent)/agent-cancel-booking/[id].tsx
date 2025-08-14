import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useAgentStore } from '@/store/agent/agentStore';
import {
  AgentPolicyCard,
  RefundConfigurationCard,
  CancellationDetailsForm,
  CommissionImpactCard,
} from '@/components/booking';
import { CurrentTicketDetailsCard } from '@/components/booking';
import Button from '@/components/Button';
import { formatCurrency } from '@/utils/agentFormatters';
import Colors from '@/constants/colors';

type RefundMethod = 'agent_credit' | 'original_payment' | 'bank_transfer';

interface BankDetails {
  accountNumber: string;
  accountName: string;
  bankName: string;
}

export default function AgentCancelBookingScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { bookings, agentCancelBooking, getTranslation } = useAgentStore();

  // Ensure id is a string
  const bookingId = Array.isArray(id) ? id[0] : id;

  // All hooks must be called before any early returns
  const scrollViewRef = useRef<ScrollView>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [activeInput, setActiveInput] = useState<string | null>(null);
  const inputRefs = useRef({
    reason: null as any,
    agentNotes: null as any,
    clientNotification: null as any,
  });

  const [reason, setReason] = useState('');
  const [agentNotes, setAgentNotes] = useState('');
  const [clientNotification, setClientNotification] = useState('');
  const [refundMethod, setRefundMethod] =
    useState<RefundMethod>('agent_credit');
  const [refundPercentage, setRefundPercentage] = useState(100);
  const [bankDetails, setBankDetails] = useState<BankDetails>({
    accountNumber: '',
    accountName: '',
    bankName: '',
  });
  const [errors, setErrors] = useState({
    reason: '',
    bankDetails: '',
  });
  const [isCancelling, setIsCancelling] = useState(false); // Local loading state for cancellation

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      e => {
        setKeyboardHeight(e.endCoordinates.height);
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

  // Early return if no booking ID
  if (!bookingId) {
    return (
      <View style={styles.notFoundContainer}>
        <Text style={styles.notFoundText}>Invalid booking ID</Text>
        <Button
          title='Go Back'
          onPress={() => router.back()}
          style={styles.notFoundButton}
        />
      </View>
    );
  }

  const scrollToInput = (inputKey: string) => {
    setTimeout(() => {
      const inputRef =
        inputRefs.current[inputKey as keyof typeof inputRefs.current];
      if (inputRef && scrollViewRef.current) {
        inputRef.measureLayout(
          scrollViewRef.current,
          (x: number, y: number) => {
            const scrollOffset = y - 100;
            scrollViewRef.current?.scrollTo({
              x: 0,
              y: Math.max(0, scrollOffset),
              animated: true,
            });
          },
          () => {}
        );
      }
    }, 100);
  };

  // Find the booking by id - ensure bookings is an array
  const bookingsArray = Array.isArray(bookings) ? bookings : [];
  const booking = bookingsArray.find((b: any) => {
    if (!b || !b.id) return false;
    return String(b.id) === String(bookingId);
  });

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

  // Create safe booking object with proper defaults
  const safeBooking = {
    id: String(booking.id || ''),
    bookingNumber: String(booking.bookingNumber || 'N/A'),
    clientName: String(booking.clientName || 'N/A'),
    totalAmount: Number(booking.totalAmount) || 0,
    discountedAmount: Number(booking.discountedAmount) || 0,
    commission: Number(booking.commission) || 0,
    departureDate: booking.departureDate || null,
    origin: String(booking.origin || 'Unknown'),
    destination: String(booking.destination || 'Unknown'),
    route: booking.route || null,
  };

  const validateForm = () => {
    let isValid = true;
    const newErrors = { ...errors };

    if (!reason.trim()) {
      newErrors.reason = 'Please provide a cancellation reason';
      isValid = false;
    } else {
      newErrors.reason = '';
    }

    if (refundMethod === 'bank_transfer') {
      if (
        !bankDetails.accountNumber.trim() ||
        !bankDetails.accountName.trim() ||
        !bankDetails.bankName.trim()
      ) {
        newErrors.bankDetails =
          'Please provide complete bank details for bank transfer';
        isValid = false;
      } else {
        newErrors.bankDetails = '';
      }
    } else {
      newErrors.bankDetails = '';
    }

    setErrors(newErrors);
    return isValid;
  };

  const getRouteDisplay = () => {
    let fromLocation = 'Unknown';
    let toLocation = 'Unknown';

    if (safeBooking.route?.fromIsland?.name) {
      fromLocation = String(safeBooking.route.fromIsland.name);
    } else if (safeBooking.origin) {
      fromLocation = safeBooking.origin;
    }

    if (safeBooking.route?.toIsland?.name) {
      toLocation = String(safeBooking.route.toIsland.name);
    } else if (safeBooking.destination) {
      toLocation = safeBooking.destination;
    }

    return `${fromLocation} → ${toLocation}`;
  };

  const getDateDisplay = () => {
    if (safeBooking.departureDate) {
      try {
        return new Date(safeBooking.departureDate).toLocaleDateString();
      } catch (error) {
        return 'Invalid Date';
      }
    }
    return 'N/A';
  };

  const handleCancel = async () => {
    if (!validateForm()) {
      return;
    }

    const confirmMessage = `Are you sure you want to cancel this booking? ${String(
      refundPercentage
    )}% refund will be processed.`;

    Alert.alert('Confirm Cancellation', confirmMessage, [
      {
        text: 'No',
        style: 'cancel',
      },
      {
        text: 'Yes, Cancel',
        onPress: async () => {
          setIsCancelling(true);
          try {
            const cancellationData = {
              reason,
              refundPercentage,
              refundMethod,
              bankDetails:
                refundMethod === 'bank_transfer' ? bankDetails : undefined,
              agentNotes,
              overrideFee: true,
            };

            const cancellationNumber = await agentCancelBooking(
              safeBooking.id,
              cancellationData
            );

            const calculatedRefundAmount =
              (safeBooking.totalAmount * refundPercentage) / 100;
            const refundMethodDisplay = refundMethod.replace('_', ' ');

            const successMessage =
              `Booking has been cancelled successfully. ` +
              `Cancellation number: ${String(
                cancellationNumber
              )}. ${formatCurrency(
                calculatedRefundAmount
              )} will be refunded via ${refundMethodDisplay}.`;

            Alert.alert('Booking Cancelled', successMessage, [
              {
                text: 'OK',
                onPress: () => router.back(),
              },
            ]);
          } catch (error) {
            console.error('Cancellation error:', error);
            const errorMessage = `There was an error cancelling the booking: ${
              error instanceof Error ? error.message : 'Unknown error'
            }`;

            Alert.alert('Cancellation Failed', errorMessage);
          } finally {
            setIsCancelling(false);
          }
        },
        style: 'destructive',
      },
    ]);
  };

  // Calculate refund amount
  const refundAmount = (safeBooking.totalAmount * refundPercentage) / 100;

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Cancel Booking',
          headerTitleStyle: { fontSize: 18 },
        }}
      />
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
          {/* Agent Policy Info */}
          <AgentPolicyCard />

          {/* Booking Details */}
          <CurrentTicketDetailsCard
            bookingNumber={safeBooking.bookingNumber}
            clientName={safeBooking.clientName}
            route={
              safeBooking.route
                ? {
                    fromIsland: {
                      name: safeBooking.route.fromIsland?.name || 'Unknown',
                    },
                    toIsland: {
                      name: safeBooking.route.toIsland?.name || 'Unknown',
                    },
                  }
                : undefined
            }
            origin={safeBooking.origin}
            destination={safeBooking.destination}
            currentDate={safeBooking.departureDate || ''}
            currentSeats={[]}
            totalAmount={safeBooking.totalAmount}
            ticketLabel='Booking'
          />

          {/* Refund Configuration */}
          <RefundConfigurationCard
            refundMethod={refundMethod}
            onRefundMethodChange={setRefundMethod}
            refundPercentage={refundPercentage}
            onRefundPercentageChange={setRefundPercentage}
            bankDetails={bankDetails}
            onBankDetailsChange={setBankDetails}
            refundAmount={refundAmount}
            bankDetailsError={errors.bankDetails}
          />

          {/* Cancellation Details */}
          <CancellationDetailsForm
            reason={reason}
            onReasonChange={text => {
              setReason(text);
              if (errors.reason) setErrors({ ...errors, reason: '' });
            }}
            agentNotes={agentNotes}
            onAgentNotesChange={setAgentNotes}
            clientNotification={clientNotification}
            onClientNotificationChange={setClientNotification}
            reasonError={errors.reason}
            onReasonFocus={() => {
              setActiveInput('reason');
              scrollToInput('reason');
            }}
            onAgentNotesFocus={() => {
              setActiveInput('agentNotes');
              scrollToInput('agentNotes');
            }}
            onClientNotificationFocus={() => {
              setActiveInput('clientNotification');
              scrollToInput('clientNotification');
            }}
            inputRefs={inputRefs}
          />

          {/* Commission Impact */}
          <CommissionImpactCard commission={safeBooking.commission} />

          <View style={styles.buttonContainer}>
            <Button
              title='Go Back'
              onPress={() => router.back()}
              variant='outline'
              style={styles.backButton}
            />

            <Button
              title='Cancel Booking'
              onPress={handleCancel}
              loading={isCancelling}
              disabled={isCancelling}
              style={styles.cancelButton}
              textStyle={styles.cancelButtonText}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
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
  policyCard: {
    marginBottom: 16,
    backgroundColor: '#fff8e1',
    borderLeftWidth: 4,
    borderLeftColor: Colors.warning,
  },
  policyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  policyIcon: {
    marginRight: 8,
  },
  policyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  policyText: {
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
  refundCard: {
    marginBottom: 16,
  },
  refundMethodContainer: {
    marginBottom: 16,
  },
  refundMethodLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  refundMethods: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  refundMethodButton: {
    flex: 1,
    minWidth: 100,
    marginRight: 8,
  },
  refundMethodText: {
    fontSize: 14,
  },
  refundPercentageContainer: {
    marginBottom: 16,
  },
  refundPercentageLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  refundPercentageButtons: {
    flexDirection: 'row',
    marginRight: -8,
  },
  percentageButton: {
    flex: 1,
    marginRight: 8,
  },
  refundAmountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  refundAmountLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  refundAmountValue: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.primary,
  },
  formCard: {
    marginBottom: 16,
  },
  commissionCard: {
    marginBottom: 16,
    backgroundColor: '#fff3e0',
    borderLeftWidth: 4,
    borderLeftColor: Colors.warning,
  },
  commissionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  commissionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginLeft: 8,
  },
  commissionText: {
    fontSize: 14,
    color: Colors.text,
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
  bankDetailsContainer: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  bankDetailsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  errorText: {
    fontSize: 14,
    color: Colors.error,
    marginTop: 4,
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
