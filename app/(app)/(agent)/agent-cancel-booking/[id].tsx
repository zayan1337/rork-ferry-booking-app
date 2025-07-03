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
  TextInput as RNTextInput
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { AlertTriangle, DollarSign, User, CreditCard } from 'lucide-react-native';
import { useAgentStore } from '@/store/agent/agentStore';
import Colors from '@/constants/colors';
import Card from '@/components/Card';
import Input from '@/components/Input';
import Button from '@/components/Button';

export default function AgentCancelBookingScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { bookings, agentCancelBooking, isLoading, getTranslation } = useAgentStore();

  // Ensure id is a string
  const bookingId = Array.isArray(id) ? id[0] : id;

  // Early return if no booking ID
  if (!bookingId) {
    return (
      <View style={styles.notFoundContainer}>
        <Text style={styles.notFoundText}>Invalid booking ID</Text>
        <Button
          title="Go Back"
          onPress={() => router.back()}
          style={styles.notFoundButton}
        />
      </View>
    );
  }

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
  const [refundMethod, setRefundMethod] = useState<'agent_credit' | 'original_payment' | 'bank_transfer'>('agent_credit');
  const [refundPercentage, setRefundPercentage] = useState(100); // Agents can offer full refunds
  const [bankDetails, setBankDetails] = useState({
    accountNumber: '',
    accountName: '',
    bankName: '',
  });
  const [errors, setErrors] = useState({
    reason: '',
    agentNotes: '',
    bankDetails: '',
  });

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      (e) => {
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

  const scrollToInput = (inputKey: string) => {
    setTimeout(() => {
      const inputRef = inputRefs.current[inputKey as keyof typeof inputRefs.current];
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
          () => { }
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
          title="Go Back"
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
      if (!bankDetails.accountNumber.trim() || !bankDetails.accountName.trim() || !bankDetails.bankName.trim()) {
        newErrors.bankDetails = 'Please provide complete bank details for bank transfer';
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

  const formatCurrency = (amount: number) => {
    const safeAmount = Number(amount) || 0;
    return 'MVR ' + safeAmount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
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

    return fromLocation + ' → ' + toLocation;
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

    const confirmMessage = 'Are you sure you want to cancel this booking? ' +
      String(refundPercentage) + '% refund will be processed.';

    Alert.alert(
      "Confirm Cancellation",
      confirmMessage,
      [
        {
          text: "No",
          style: "cancel",
        },
        {
          text: "Yes, Cancel",
          onPress: async () => {
            try {
              const cancellationData = {
                reason,
                refundPercentage,
                refundMethod,
                bankDetails: refundMethod === 'bank_transfer' ? bankDetails : undefined,
                agentNotes,
                overrideFee: true,
              };

              const cancellationNumber = await agentCancelBooking(safeBooking.id, cancellationData);

              const calculatedRefundAmount = (safeBooking.totalAmount * refundPercentage) / 100;
              const refundMethodDisplay = refundMethod.replace('_', ' ');

              const successMessage = 'Booking has been cancelled successfully. ' +
                'Cancellation number: ' + String(cancellationNumber) + '. ' +
                formatCurrency(calculatedRefundAmount) + ' will be refunded via ' + refundMethodDisplay + '.';

              Alert.alert(
                "Booking Cancelled",
                successMessage,
                [
                  {
                    text: "OK",
                    onPress: () => router.back()
                  }
                ]
              );
            } catch (error) {
              console.error('Cancellation error:', error);
              const errorMessage = 'There was an error cancelling the booking: ' +
                (error instanceof Error ? error.message : 'Unknown error');

              Alert.alert(
                "Cancellation Failed",
                errorMessage
              );
            }
          },
          style: "destructive",
        },
      ]
    );
  };

  // Calculate refund amount
  const refundAmount = (safeBooking.totalAmount * refundPercentage) / 100;

  return (
    <>
      <Stack.Screen
        options={{
          title: "Cancel Booking",
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
          keyboardShouldPersistTaps="handled"
        >
          {/* Agent Policy Info */}
          <Card variant="elevated" style={styles.policyCard}>
            <View style={styles.policyHeader}>
              <AlertTriangle size={24} color={Colors.warning} style={styles.policyIcon} />
              <Text style={styles.policyTitle}>Agent Cancellation Authority</Text>
            </View>
            <Text style={styles.policyText}>
              As an agent, you have the authority to:
            </Text>
            <View style={styles.policyList}>
              <Text style={styles.policyItem}>• Offer up to 100% refund for valid reasons</Text>
              <Text style={styles.policyItem}>• Process immediate refunds through agent credit</Text>
              <Text style={styles.policyItem}>• Waive standard cancellation policies for client satisfaction</Text>
              <Text style={styles.policyItem}>• Document special circumstances in notes</Text>
            </View>
          </Card>

          {/* Booking Details */}
          <Card variant="elevated" style={styles.bookingCard}>
            <Text style={styles.cardTitle}>Booking Details</Text>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Booking Number:</Text>
              <Text style={styles.detailValue}>{safeBooking.bookingNumber}</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Client:</Text>
              <Text style={styles.detailValue}>{safeBooking.clientName}</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Route:</Text>
              <Text style={styles.detailValue}>{getRouteDisplay()}</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Date:</Text>
              <Text style={styles.detailValue}>{getDateDisplay()}</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Total Amount:</Text>
              <Text style={styles.detailValue}>{formatCurrency(safeBooking.totalAmount)}</Text>
            </View>

            {safeBooking.discountedAmount && safeBooking.discountedAmount !== safeBooking.totalAmount ? (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Amount Paid:</Text>
                <Text style={styles.detailValue}>{formatCurrency(safeBooking.discountedAmount)}</Text>
              </View>
            ) : null}
          </Card>

          {/* Refund Configuration */}
          <Card variant="elevated" style={styles.refundCard}>
            <Text style={styles.cardTitle}>Refund Configuration</Text>

            <View style={styles.refundMethodContainer}>
              <Text style={styles.refundMethodLabel}>Refund Method</Text>
              <View style={styles.refundMethods}>
                <Button
                  title="Agent Credit"
                  onPress={() => setRefundMethod('agent_credit')}
                  variant={refundMethod === 'agent_credit' ? 'primary' : 'outline'}
                  style={styles.refundMethodButton}
                  textStyle={styles.refundMethodText}
                />
                <Button
                  title="Original Payment"
                  onPress={() => setRefundMethod('original_payment')}
                  variant={refundMethod === 'original_payment' ? 'primary' : 'outline'}
                  style={styles.refundMethodButton}
                  textStyle={styles.refundMethodText}
                />
                <Button
                  title="Bank Transfer"
                  onPress={() => setRefundMethod('bank_transfer')}
                  variant={refundMethod === 'bank_transfer' ? 'primary' : 'outline'}
                  style={styles.refundMethodButton}
                  textStyle={styles.refundMethodText}
                />
              </View>

              {/* Bank Details Form - shown only for bank transfer */}
              {refundMethod === 'bank_transfer' ? (
                <View style={styles.bankDetailsContainer}>
                  <Text style={styles.bankDetailsTitle}>Bank Transfer Details</Text>

                  <Input
                    label="Account Number"
                    placeholder="Enter bank account number"
                    value={bankDetails.accountNumber}
                    onChangeText={(text) => setBankDetails({ ...bankDetails, accountNumber: text })}
                    keyboardType="numeric"
                    required
                  />

                  <Input
                    label="Account Holder Name"
                    placeholder="Enter account holder name"
                    value={bankDetails.accountName}
                    onChangeText={(text) => setBankDetails({ ...bankDetails, accountName: text })}
                    required
                  />

                  <Input
                    label="Bank Name"
                    placeholder="Enter bank name"
                    value={bankDetails.bankName}
                    onChangeText={(text) => setBankDetails({ ...bankDetails, bankName: text })}
                    required
                  />

                  {errors.bankDetails ? (
                    <Text style={styles.errorText}>{errors.bankDetails}</Text>
                  ) : null}
                </View>
              ) : null}
            </View>

            <View style={styles.refundPercentageContainer}>
              <Text style={styles.refundPercentageLabel}>Refund Percentage</Text>
              <View style={styles.refundPercentageButtons}>
                <Button
                  title="50%"
                  onPress={() => setRefundPercentage(50)}
                  variant={refundPercentage === 50 ? 'primary' : 'outline'}
                  style={styles.percentageButton}
                />
                <Button
                  title="75%"
                  onPress={() => setRefundPercentage(75)}
                  variant={refundPercentage === 75 ? 'primary' : 'outline'}
                  style={styles.percentageButton}
                />
                <Button
                  title="100%"
                  onPress={() => setRefundPercentage(100)}
                  variant={refundPercentage === 100 ? 'primary' : 'outline'}
                  style={styles.percentageButton}
                />
              </View>
            </View>

            <View style={styles.refundAmountRow}>
              <Text style={styles.refundAmountLabel}>Refund Amount:</Text>
              <Text style={styles.refundAmountValue}>{formatCurrency(refundAmount)}</Text>
            </View>
          </Card>

          {/* Form */}
          <Card variant="elevated" style={styles.formCard}>
            <Text style={styles.cardTitle}>Cancellation Details</Text>

            <View
              ref={(ref) => { inputRefs.current.reason = ref; }}
            >
              <Input
                label="Reason for Cancellation"
                placeholder="Please provide a detailed reason for cancellation"
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

            <View
              ref={(ref) => { inputRefs.current.agentNotes = ref; }}
            >
              <Input
                label="Agent Notes (Internal)"
                placeholder="Add any internal notes or special circumstances"
                value={agentNotes}
                onChangeText={setAgentNotes}
                onFocus={() => {
                  setActiveInput('agentNotes');
                  scrollToInput('agentNotes');
                }}
                multiline
                numberOfLines={2}
              />
            </View>

            <View
              ref={(ref) => { inputRefs.current.clientNotification = ref; }}
            >
              <Input
                label="Client Notification Message"
                placeholder="Optional custom message to send to client"
                value={clientNotification}
                onChangeText={setClientNotification}
                onFocus={() => {
                  setActiveInput('clientNotification');
                  scrollToInput('clientNotification');
                }}
                multiline
                numberOfLines={2}
              />
            </View>
          </Card>

          {/* Commission Impact */}
          {safeBooking.commission && Number(safeBooking.commission) > 0 ? (
            <Card variant="elevated" style={styles.commissionCard}>
              <View style={styles.commissionHeader}>
                <DollarSign size={20} color={Colors.warning} />
                <Text style={styles.commissionTitle}>Commission Impact</Text>
              </View>
              <Text style={styles.commissionText}>
                {'Your commission of ' + formatCurrency(safeBooking.commission) + ' will be deducted from your account.'}
              </Text>
            </Card>
          ) : null}

          <View style={styles.buttonContainer}>
            <Button
              title="Go Back"
              onPress={() => router.back()}
              variant="outline"
              style={styles.backButton}
            />

            <Button
              title="Cancel Booking"
              onPress={handleCancel}
              loading={isLoading}
              disabled={isLoading}
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