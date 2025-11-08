import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useAgentStore } from '@/store/agent/agentStore';
import { useRouteStore, useTripStore } from '@/store/routeStore';
import { useSeatStore } from '@/store/seatStore';
import {
  CurrentTicketDetailsCard,
  FareCalculationCard,
  PaymentMethodSelector,
  ModificationReasonForm,
} from '@/components/booking';
import DatePicker from '@/components/DatePicker';
import SeatSelector from '@/components/SeatSelector';
import Button from '@/components/Button';
import Card from '@/components/Card';
import MibPaymentWebView from '@/components/MibPaymentWebView';
import { calculateDiscountedFare } from '@/utils/bookingUtils';
import { formatCurrency } from '@/utils/agentFormatters';
import Colors from '@/constants/colors';
import { Seat } from '@/types';
import { useAlertContext } from '@/components/AlertProvider';

type PaymentMethod = 'agent_credit' | 'bank_transfer' | 'mib';

interface BankDetails {
  accountNumber: string;
  accountName: string;
  bankName: string;
}

export default function AgentModifyBookingScreen() {
  const { showSuccess, showError, showInfo } = useAlertContext();
  const { id, ticketType } = useLocalSearchParams();
  const router = useRouter();
  const scrollViewRef = useRef<ScrollView>(null);

  // Enhanced keyboard handling
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [activeInput, setActiveInput] = useState<string | null>(null);
  const inputRefs = useRef({
    reason: null as any,
    agentNotes: null as any,
    accountNumber: null as any,
    accountName: null as any,
    bankName: null as any,
  });

  // Store management
  const {
    bookings,
    modifyBooking,
    isLoading: agentLoading,
    agent,
  } = useAgentStore();

  const { availableRoutes, isLoading: routeLoading } = useRouteStore();

  const { trips, fetchTrips, isLoading: tripLoading } = useTripStore();

  const {
    availableSeats,
    fetchAvailableSeats,
    isLoading: seatLoading,
  } = useSeatStore();

  // Determine which ticket is being modified
  const isModifyingReturn = ticketType === 'return';
  const ticketLabel = isModifyingReturn ? 'Return' : 'Departure';

  // State management
  const [newDate, setNewDate] = useState<string | null>(null);
  const [selectedSeats, setSelectedSeats] = useState<Seat[]>([]);
  const [modificationReason, setModificationReason] = useState('');
  const [agentNotes, setAgentNotes] = useState('');
  const [fareDifference, setFareDifference] = useState(0);
  const [selectedTrip, setSelectedTrip] = useState<any>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] =
    useState<PaymentMethod>('agent_credit');
  const [bankAccountDetails, setBankAccountDetails] = useState<BankDetails>({
    accountNumber: '',
    accountName: '',
    bankName: '',
  });
  const [isModifying, setIsModifying] = useState(false);
  const [agentDiscountRate, setAgentDiscountRate] = useState(0);
  const [newTotalFare, setNewTotalFare] = useState(0); // Fare with multiplier, before discount
  const [discountedFare, setDiscountedFare] = useState(0);
  const [errors, setErrors] = useState({
    date: '',
    seats: '',
    reason: '',
    trip: '',
    accountNumber: '',
    accountName: '',
    bankName: '',
  });

  // MIB payment states
  const [showMibPayment, setShowMibPayment] = useState(false);
  const [mibBookingDetails, setMibBookingDetails] = useState<any>(null);
  const [modifiedBookingId, setModifiedBookingId] = useState<string | null>(
    null
  );

  // Find the booking by id
  const booking = bookings.find((b: any) => b.id === id);

  // Enhanced keyboard event listeners
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
            });
          },
          () => {}
        );
      }
    }, 100);
  };

  // Initialize form data
  useEffect(() => {
    if (booking) {
      const currentDate = isModifyingReturn
        ? booking.returnDate
        : booking.departureDate;
      const currentSeats = booking.seats;

      setNewDate(currentDate || null);
      setSelectedSeats(
        currentSeats?.map((seat: any) => ({
          ...seat,
          isAvailable: true,
        })) || []
      );
    }
  }, [booking, isModifyingReturn]);

  // Initialize agent discount rate
  useEffect(() => {
    if (agent?.discountRate) {
      setAgentDiscountRate(Number(agent.discountRate) || 0);
    }
  }, [agent]);

  // Calculate fare difference when trip changes
  useEffect(() => {
    if (selectedTrip && booking) {
      const currentPaidFare =
        Number(booking.discountedAmount) || Number(booking.totalAmount) || 0;
      const passengerCount =
        booking.passengers?.length || booking.passengerCount || 1;

      // Calculate fare using route.base_fare × trip.fare_multiplier
      // base_fare is in route table, fare_multiplier is in trip table
      // booking.route.routeBaseFare has the original route base_fare (if available)
      const routeBaseFare = Number((booking.route as any)?.routeBaseFare || 0);
      const fareMultiplier = Number(selectedTrip.fare_multiplier) || 1.0;
      const newFarePerPassenger = routeBaseFare * fareMultiplier;
      const calculatedNewTotalFare = newFarePerPassenger * passengerCount;

      setNewTotalFare(calculatedNewTotalFare); // Store total fare with multiplier

      const discountCalculation = calculateDiscountedFare(
        calculatedNewTotalFare,
        agentDiscountRate
      );
      setDiscountedFare(discountCalculation.discountedFare);

      const difference = discountCalculation.discountedFare - currentPaidFare;
      setFareDifference(difference);
    }
  }, [selectedTrip, booking, agentDiscountRate]);

  // Fetch trips when date changes
  useEffect(() => {
    if (newDate && booking?.route) {
      fetchTrips(booking.route.id, newDate, false);
    }
  }, [newDate, booking, fetchTrips]);

  // Fetch seats when trip changes
  useEffect(() => {
    if (selectedTrip) {
      fetchAvailableSeats(selectedTrip.id);
    }
  }, [selectedTrip, fetchAvailableSeats]);

  const toggleSeatSelection = (seat: Seat) => {
    const maxSeats =
      booking?.passengers?.length || booking?.passengerCount || 1;

    setSelectedSeats(prev => {
      const isSelected = prev.find(s => s.id === seat.id);
      if (isSelected) {
        return prev.filter(s => s.id !== seat.id);
      } else if (prev.length < maxSeats) {
        return [...prev, seat];
      }
      return prev;
    });

    if (errors.seats) setErrors({ ...errors, seats: '' });
  };

  const validateForm = () => {
    const newErrors = { ...errors };
    let isValid = true;

    if (!newDate) {
      newErrors.date = 'Please select a new date';
      isValid = false;
    }

    if (!selectedTrip) {
      newErrors.trip = 'Please select a trip';
      isValid = false;
    }

    if (selectedSeats.length === 0) {
      newErrors.seats = 'Please select seats';
      isValid = false;
    }

    if (!modificationReason.trim()) {
      newErrors.reason = 'Please provide a reason for modification';
      isValid = false;
    }

    if (selectedPaymentMethod === 'bank_transfer' && fareDifference < 0) {
      // Only require bank details for refunds via bank transfer
      if (!bankAccountDetails.accountNumber.trim()) {
        newErrors.accountNumber = 'Please enter account number';
        isValid = false;
      }
      if (!bankAccountDetails.accountName.trim()) {
        newErrors.accountName = 'Please enter account holder name';
        isValid = false;
      }
      if (!bankAccountDetails.bankName.trim()) {
        newErrors.bankName = 'Please enter bank name';
        isValid = false;
      }
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleModify = async () => {
    if (!validateForm() || !booking) {
      return;
    }

    setIsModifying(true);

    try {
      const modificationData = {
        ticketType: isModifyingReturn ? 'return' : 'departure',
        newTripId: selectedTrip?.id,
        newDate,
        selectedSeats,
        modificationReason,
        fareDifference,
        paymentMethod: selectedPaymentMethod,
        bankAccountDetails:
          fareDifference < 0 && selectedPaymentMethod === 'bank_transfer'
            ? bankAccountDetails
            : null,
        agentNotes,
        modifiedByAgent: true,
      };

      await modifyBooking(booking.id, modificationData);

      // Handle MIB payment differently
      if (selectedPaymentMethod === 'mib' && fareDifference > 0) {
        // Prepare booking details for the payment modal
        const mibDetails = {
          bookingNumber: booking.bookingNumber,
          route: `${(booking.origin as any)?.name || booking.origin || 'N/A'} → ${(booking.destination as any)?.name || booking.destination || 'N/A'}`,
          travelDate:
            newDate || booking.departureDate || new Date().toISOString(),
          amount: fareDifference, // Pay only the difference (already includes agent discount)
          currency: 'MVR',
          passengerCount:
            booking.passengers?.length || booking.passengerCount || 1,
        };

        // Store the booking ID for payment
        setModifiedBookingId(booking.id);
        setMibBookingDetails(mibDetails);
        setShowMibPayment(true);
        setIsModifying(false);
        return; // Don't show success alert yet
      }

      let successMessage = `The ${ticketLabel.toLowerCase()} ticket has been modified successfully.`;

      if (fareDifference > 0) {
        if (selectedPaymentMethod === 'agent_credit') {
          successMessage += ` An additional charge of ${formatCurrency(fareDifference)} has been deducted from your agent credit balance.`;
        } else {
          successMessage += ` An additional payment of ${formatCurrency(fareDifference)} will be processed via bank transfer.`;
        }
      } else if (fareDifference < 0) {
        if (selectedPaymentMethod === 'agent_credit') {
          successMessage += ` A refund of ${formatCurrency(Math.abs(fareDifference))} has been credited to your agent account.`;
        } else {
          successMessage += ` A refund of ${formatCurrency(Math.abs(fareDifference))} will be processed via bank transfer within 72 hours.`;
        }
      } else {
        successMessage += ' No additional payment or refund is required.';
      }

      // Add discount information
      if (agentDiscountRate > 0 && fareDifference !== 0) {
        successMessage += `\n\nNote: Your ${agentDiscountRate}% agent discount was applied to the new fare calculation.`;
      }

      showSuccess(`${ticketLabel} Modified`, successMessage, () => {
        router.back();
      });
    } catch (error) {
      console.error('Modification error:', error);
      showError(
        'Error',
        `Failed to modify ${ticketLabel.toLowerCase()} ticket: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    } finally {
      setIsModifying(false);
    }
  };

  // MIB payment handlers
  const handleMibPaymentSuccess = (result: any) => {
    setShowMibPayment(false);

    let successMessage = `The ${ticketLabel.toLowerCase()} ticket has been modified successfully and payment of ${formatCurrency(fareDifference)} has been processed through MIB Gateway.`;

    if (agentDiscountRate > 0) {
      successMessage += ` (Your ${agentDiscountRate}% agent discount was applied to the new fare)`;
    }

    showSuccess('Payment Successful', successMessage, () => {
      router.back();
    });
  };

  const handleMibPaymentFailure = (error: string) => {
    setShowMibPayment(false);
    showError(
      'Payment Failed',
      `The booking was modified but payment failed: ${error}. Please contact support to complete the payment of ${formatCurrency(fareDifference)}.`,
      () => {
        router.back();
      }
    );
  };

  const handleMibPaymentCancel = () => {
    setShowMibPayment(false);
    showInfo(
      'Payment Cancelled',
      `The modification was saved but payment of ${formatCurrency(fareDifference)} was not completed. You can retry the payment later.`,
      () => {
        router.back();
      }
    );
  };

  // Loading and error states
  if (agentLoading && bookings.length === 0) {
    return (
      <View style={styles.notFoundContainer}>
        <Text style={styles.notFoundText}>Loading booking details...</Text>
      </View>
    );
  }

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

  const maxSeats = booking.passengers?.length || booking.passengerCount || 1;
  const originalDate = isModifyingReturn
    ? booking.returnDate
    : booking.departureDate;
  const originalSeats = booking.seats;

  return (
    <>
      <Stack.Screen
        options={{
          title: `Modify ${ticketLabel} Ticket`,
          headerTitleStyle: { fontSize: 18 },
        }}
      />
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 80}
        enabled
      >
        <ScrollView
          ref={scrollViewRef}
          style={styles.container}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps='handled'
        >
          {/* Current Ticket Details */}
          <CurrentTicketDetailsCard
            bookingNumber={booking?.bookingNumber || ''}
            clientName={booking?.clientName || ''}
            route={booking?.route || {}}
            origin={booking?.origin}
            destination={booking?.destination}
            currentDate={originalDate || ''}
            currentSeats={originalSeats || []}
            totalAmount={booking?.totalAmount || 0}
            ticketLabel={ticketLabel}
          />

          {/* Modification Form */}
          <Card variant='elevated' style={styles.modifyCard}>
            <Text style={styles.cardTitle}>Modify {ticketLabel} Ticket</Text>

            <DatePicker
              label={`New ${ticketLabel} Date`}
              value={newDate}
              onChange={date => {
                setNewDate(date);
                setSelectedTrip(null);
                setSelectedSeats([]);
                if (errors.date) setErrors({ ...errors, date: '' });
              }}
              minDate={new Date().toISOString().split('T')[0]}
              error={errors.date}
              required
            />

            {/* Trip Selection */}
            {newDate && booking?.route && (
              <View style={styles.tripSelection}>
                <Text style={styles.sectionTitle}>
                  Select New {ticketLabel} Trip
                </Text>
                {tripLoading ? (
                  <Text style={styles.loadingText}>
                    Loading available trips...
                  </Text>
                ) : trips.length > 0 ? (
                  trips.map(trip => (
                    <Pressable
                      key={trip.id}
                      style={[
                        styles.tripOption,
                        selectedTrip?.id === trip.id &&
                          styles.tripOptionSelected,
                      ]}
                      onPress={() => {
                        setSelectedTrip(trip);
                        setSelectedSeats([]);
                        if (errors.trip) setErrors({ ...errors, trip: '' });
                      }}
                    >
                      <Text style={styles.tripTime}>{trip.departure_time}</Text>
                      <Text style={styles.tripVessel}>
                        {trip.vessel_name || 'N/A'}
                      </Text>
                      <Text style={styles.tripSeats}>
                        Available: {trip.available_seats || 0} seats
                      </Text>
                    </Pressable>
                  ))
                ) : (
                  <Text style={styles.noSeatsText}>
                    No trips available for this date
                  </Text>
                )}
                {errors.trip ? (
                  <Text style={styles.errorText}>{errors.trip}</Text>
                ) : null}
              </View>
            )}

            {/* Seat Selection */}
            {selectedTrip && (
              <View style={styles.seatSelection}>
                <Text style={styles.sectionTitle}>
                  Select New Seats ({selectedSeats.length}/{maxSeats})
                </Text>
                {seatLoading ? (
                  <Text style={styles.loadingText}>
                    Loading available seats...
                  </Text>
                ) : availableSeats && availableSeats.length > 0 ? (
                  <SeatSelector
                    seats={availableSeats}
                    selectedSeats={selectedSeats}
                    onSeatToggle={toggleSeatSelection}
                    maxSeats={maxSeats}
                  />
                ) : (
                  <Text style={styles.noSeatsText}>
                    No seats available for this trip
                  </Text>
                )}
                {errors.seats ? (
                  <Text style={styles.errorText}>{errors.seats}</Text>
                ) : null}
              </View>
            )}

            {/* Modification Reason and Notes */}
            <ModificationReasonForm
              modificationReason={modificationReason}
              onReasonChange={reason => {
                setModificationReason(reason);
                if (errors.reason) setErrors({ ...errors, reason: '' });
              }}
              agentNotes={agentNotes}
              onNotesChange={setAgentNotes}
              reasonError={errors.reason}
              onReasonFocus={() => {
                setActiveInput('reason');
                scrollToInput('reason');
              }}
              onNotesFocus={() => {
                setActiveInput('agentNotes');
                scrollToInput('agentNotes');
              }}
              ticketLabel={ticketLabel}
              inputRefs={inputRefs}
            />
          </Card>

          {/* Fare Calculation */}
          {selectedTrip && booking && (
            <>
              <FareCalculationCard
                currentPaidAmount={
                  Number(booking.discountedAmount) ||
                  Number(booking.totalAmount) ||
                  0
                }
                newBookingFare={newTotalFare} // Use trip's multiplied fare
                agentDiscountRate={agentDiscountRate}
                discountedFare={discountedFare}
                fareDifference={fareDifference}
              />

              {agentDiscountRate > 0 && (
                <Card variant='elevated' style={styles.discountInfoCard}>
                  <Text style={styles.discountInfoText}>
                    ✨ Your agent discount of {agentDiscountRate}% is
                    automatically applied to the new booking fare.
                  </Text>
                </Card>
              )}
            </>
          )}

          {/* Payment Method Selection */}
          <PaymentMethodSelector
            fareDifference={fareDifference}
            selectedPaymentMethod={selectedPaymentMethod}
            onPaymentMethodChange={setSelectedPaymentMethod}
            bankAccountDetails={bankAccountDetails}
            onBankDetailsChange={setBankAccountDetails}
            errors={{
              accountNumber: errors.accountNumber,
              accountName: errors.accountName,
              bankName: errors.bankName,
            }}
            onErrorClear={field => setErrors({ ...errors, [field]: '' })}
            onFocus={field => {
              setActiveInput(field);
              scrollToInput(field);
            }}
            inputRefs={inputRefs}
          />

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <Button
              title='Cancel'
              onPress={() => router.back()}
              variant='outline'
              style={styles.backButton}
            />

            <Button
              title={`Modify Ticket`}
              onPress={handleModify}
              loading={isModifying || tripLoading || seatLoading}
              disabled={isModifying || tripLoading || seatLoading}
              style={styles.modifyButton}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* MIB Payment Modal */}
      {showMibPayment && mibBookingDetails && modifiedBookingId && (
        <MibPaymentWebView
          visible={showMibPayment}
          bookingDetails={mibBookingDetails}
          bookingId={modifiedBookingId}
          onClose={() => setShowMibPayment(false)}
          onSuccess={handleMibPaymentSuccess}
          onFailure={handleMibPaymentFailure}
          onCancel={handleMibPaymentCancel}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
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
  modifyCard: {
    marginBottom: 24,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 16,
  },
  tripSelection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  tripOption: {
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: Colors.background,
  },
  tripOptionSelected: {
    borderColor: Colors.primary,
    backgroundColor: '#f0f8ff',
  },
  tripTime: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  tripVessel: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  tripSeats: {
    fontSize: 12,
    color: Colors.primary,
    marginTop: 2,
  },
  seatSelection: {
    marginBottom: 16,
  },
  noSeatsText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    padding: 20,
    fontStyle: 'italic',
  },
  loadingText: {
    fontSize: 14,
    color: Colors.primary,
    textAlign: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 14,
    color: Colors.error,
    marginTop: 4,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  backButton: {
    flex: 1,
    marginRight: 8,
  },
  modifyButton: {
    flex: 1,
    marginLeft: 8,
  },
  discountInfoCard: {
    marginBottom: 16,
    backgroundColor: '#f0fdf4',
    borderLeftWidth: 3,
    borderLeftColor: Colors.success,
  },
  discountInfoText: {
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
  },
});
