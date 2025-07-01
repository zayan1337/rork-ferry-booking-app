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
  TouchableOpacity
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useUserBookingsStore, useRouteStore, useTripStore, useSeatStore } from '@/store';
import { supabase } from '@/utils/supabase';
import { Seat } from '@/types';
import Colors from '@/constants/colors';
import Card from '@/components/Card';
import Input from '@/components/Input';
import Button from '@/components/Button';
import DatePicker from '@/components/DatePicker';
import SeatSelector from '@/components/SeatSelector';

type PaymentMethod = 'gateway' | 'bank_transfer' | 'cash';

export default function ModifyBookingScreen() {
  const { id } = useLocalSearchParams();
  const scrollViewRef = useRef<ScrollView>(null);

  // Store hooks
  const {
    bookings,
    modifyBooking,
    fetchUserBookings,
    isLoading: bookingsLoading
  } = useUserBookingsStore();

  const {
    fetchTrips,
    trips,
    isLoading: tripLoading
  } = useTripStore();

  const {
    availableSeats,
    fetchAvailableSeats,
    isLoading: seatLoading
  } = useSeatStore();

  // State management
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTrip, setSelectedTrip] = useState<any>(null);
  const [selectedSeats, setSelectedSeats] = useState<Seat[]>([]);
  const [modificationReason, setModificationReason] = useState('');
  const [fareDifference, setFareDifference] = useState(0);
  const [tripSeatCounts, setTripSeatCounts] = useState<Record<string, number>>({});
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod>('gateway');
  const [bankAccountDetails, setBankAccountDetails] = useState({
    accountNumber: '',
    accountName: '',
    bankName: '',
  });
  const [errors, setErrors] = useState({
    date: '',
    trip: '',
    seats: '',
    reason: '',
    payment: '',
    accountNumber: '',
    accountName: '',
    bankName: '',
  });

  // Enhanced keyboard handling
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [activeInput, setActiveInput] = useState<string | null>(null);
  const inputRefs = useRef({
    reason: null as any,
    accountNumber: null as any,
    accountName: null as any,
    bankName: null as any,
  });

  const isLoading = bookingsLoading || tripLoading || seatLoading;

  // Find the specific booking
  const booking = bookings.find((b: any) => String(b.id) === String(id));

  // Enhanced keyboard event listeners
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

  // Initialize component
  useEffect(() => {
    if (bookings.length === 0) {
      fetchUserBookings();
    }
  }, [fetchUserBookings, bookings.length]);

  // Initialize form data when booking is loaded
  useEffect(() => {
    if (booking) {
      setSelectedDate(booking.departureDate);
      setSelectedSeats(booking.seats || []);
      // Set default payment method based on original booking
      if (booking.payment?.method) {
        setSelectedPaymentMethod(booking.payment.method as PaymentMethod);
      }
    }
  }, [booking]);

  // Fetch trips when date changes
  useEffect(() => {
    if (selectedDate && booking?.route?.id) {
      fetchTrips(booking.route.id, selectedDate);
    }
  }, [selectedDate, booking?.route?.id, fetchTrips]);

  // Fetch seats when trip is selected
  useEffect(() => {
    if (selectedTrip?.id) {
      fetchAvailableSeats(selectedTrip.id, false);
      fetchTripSeatAvailability(selectedTrip.id);
    }
  }, [selectedTrip?.id, fetchAvailableSeats]);

  // Calculate fare difference when trip changes
  useEffect(() => {
    if (selectedTrip && booking && booking.passengers && booking.route) {
      // Simple fare calculation - you may need to adjust based on your pricing logic
      const currentFarePerSeat = booking.totalFare / booking.passengers.length;
      const newFarePerSeat = booking.route.baseFare; // Assuming base fare from route
      const difference = (newFarePerSeat - currentFarePerSeat) * booking.passengers.length;
      setFareDifference(difference);
    }
  }, [selectedTrip, booking]);

  // Function to fetch actual seat availability for a trip
  const fetchTripSeatAvailability = async (tripId: string) => {
    try {
      const { data: seatReservations, error } = await supabase
        .from('seat_reservations')
        .select('is_available, booking_id')
        .eq('trip_id', tripId);

      if (error) {
        console.error('Error fetching seat availability:', error);
        return;
      }

      const availableCount = seatReservations?.filter(
        (seat: any) => seat.is_available && !seat.booking_id
      ).length || 0;

      setTripSeatCounts(prev => ({ ...prev, [tripId]: availableCount }));
    } catch (error) {
      console.error('Error fetching trip seat availability:', error);
    }
  };

  const handleSeatToggle = (seat: Seat) => {
    setSelectedSeats(prevSeats => {
      const isSelected = prevSeats.some(s => s.id === seat.id);

      if (isSelected) {
        return prevSeats.filter(s => s.id !== seat.id);
      } else {
        if (prevSeats.length >= (booking?.passengers?.length || 0)) {
          Alert.alert(
            'Maximum Seats Selected',
            `You can only select ${booking?.passengers?.length || 0} seat(s) for this booking.`
          );
          return prevSeats;
        }
        return [...prevSeats, { ...seat, isSelected: true }];
      }
    });

    if (errors.seats) {
      setErrors({ ...errors, seats: '' });
    }
  };

  const validateForm = () => {
    let isValid = true;
    const newErrors = { ...errors };

    if (!selectedDate) {
      newErrors.date = 'Please select a new date';
      isValid = false;
    }

    if (!selectedTrip) {
      newErrors.trip = 'Please select a trip';
      isValid = false;
    }

    if (selectedSeats.length !== (booking?.passengers?.length || 0)) {
      newErrors.seats = `Please select ${booking?.passengers?.length || 0} seat(s)`;
      isValid = false;
    }

    if (!modificationReason.trim()) {
      newErrors.reason = 'Please provide a reason for modification';
      isValid = false;
    }

    // Validate payment details for refunds
    if (fareDifference < 0 && selectedPaymentMethod === 'bank_transfer') {
      if (!bankAccountDetails.accountNumber.trim()) {
        newErrors.accountNumber = 'Account number is required for refunds';
        isValid = false;
      }
      if (!bankAccountDetails.accountName.trim()) {
        newErrors.accountName = 'Account name is required for refunds';
        isValid = false;
      }
      if (!bankAccountDetails.bankName.trim()) {
        newErrors.bankName = 'Bank name is required for refunds';
        isValid = false;
      }
    }

    setErrors(newErrors);
    return isValid;
  };

  const processPayment = async (bookingId: string, amount: number) => {
    try {
      if (selectedPaymentMethod === 'gateway') {
        // Simulate payment gateway processing
        Alert.alert(
          'Payment Processing',
          'Please complete the payment using the payment gateway.',
          [
            {
              text: 'Cancel',
              style: 'cancel'
            },
            {
              text: 'Pay Now',
              onPress: () => {
                // Here you would integrate with actual payment gateway
                Alert.alert(
                  'Payment Successful',
                  `Payment of MVR ${amount.toFixed(2)} has been processed successfully.`
                );
              }
            }
          ]
        );
      } else if (selectedPaymentMethod === 'bank_transfer') {
        Alert.alert(
          'Bank Transfer',
          'Please transfer the amount to our bank account. Details will be provided via SMS/Email.'
        );
      } else if (selectedPaymentMethod === 'cash') {
        Alert.alert(
          'Cash Payment',
          'Please visit our office to complete the cash payment.'
        );
      }
    } catch (error) {
      console.error('Payment processing error:', error);
      Alert.alert('Payment Error', 'Failed to process payment. Please try again.');
    }
  };

  const handleModify = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      if (!booking) {
        throw new Error('Booking not found');
      }

      await modifyBooking(booking.id, {
        newTripId: selectedTrip.id,
        newDate: selectedDate,
        selectedSeats,
        modificationReason,
        fareDifference,
        paymentMethod: selectedPaymentMethod,
        bankAccountDetails: fareDifference < 0 ? bankAccountDetails : null,
      });

      if (fareDifference > 0) {
        // Additional payment required
        Alert.alert(
          "Booking Modified",
          `Your booking has been modified successfully. An additional payment of MVR ${fareDifference.toFixed(2)} is required.`,
          [
            {
              text: "Pay Later",
              onPress: () => router.replace('/(app)/(customer)/(tabs)/bookings')
            },
            {
              text: "Pay Now",
              onPress: async () => {
                await processPayment(booking.id, fareDifference);
                router.replace('/(app)/(customer)/(tabs)/bookings');
              }
            }
          ]
        );
      } else if (fareDifference < 0) {
        // Refund scenario
        Alert.alert(
          "Booking Modified",
          `Your booking has been modified successfully. A refund of MVR ${Math.abs(fareDifference).toFixed(2)} will be processed within 72 hours.`,
          [
            {
              text: "OK",
              onPress: () => router.replace('/(app)/(customer)/(tabs)/bookings')
            }
          ]
        );
      } else {
        // No fare difference
        Alert.alert(
          "Booking Modified",
          "Your booking has been modified successfully. No additional payment or refund is required.",
          [
            {
              text: "OK",
              onPress: () => router.replace('/(app)/(customer)/(tabs)/bookings')
            }
          ]
        );
      }
    } catch (error) {
      Alert.alert("Error", "Failed to modify booking. Please try again.");
    }
  };

  // Loading state
  if (bookingsLoading && bookings.length === 0) {
    return (
      <View style={styles.notFoundContainer}>
        <Text style={styles.notFoundText}>Loading booking details...</Text>
      </View>
    );
  }

  // Booking not found
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
        {/* Current Booking Details */}
        <Card variant="elevated" style={styles.bookingCard}>
          <Text style={styles.cardTitle}>Current Booking Details</Text>

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
            <Text style={styles.detailLabel}>Current Date:</Text>
            <Text style={styles.detailValue}>
              {new Date(booking.departureDate).toLocaleDateString()}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Current Time:</Text>
            <Text style={styles.detailValue}>{booking.departureTime}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Current Seats:</Text>
            <Text style={styles.detailValue}>
              {booking.seats.map(seat => seat.number).join(', ')}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Passengers:</Text>
            <Text style={styles.detailValue}>{booking.passengers.length}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Current Fare:</Text>
            <Text style={styles.detailValue}>MVR {booking.totalFare.toFixed(2)}</Text>
          </View>
        </Card>

        {/* Modification Form */}
        <Card variant="elevated" style={styles.modifyCard}>
          <Text style={styles.cardTitle}>Modify Booking</Text>

          <DatePicker
            label="New Travel Date"
            value={selectedDate}
            onChange={(date) => {
              setSelectedDate(date);
              setSelectedTrip(null);
              setSelectedSeats([]);
              if (errors.date) setErrors({ ...errors, date: '' });
            }}
            minDate={new Date().toISOString().split('T')[0]}
            error={errors.date}
            required
          />

          {/* Trip Selection */}
          {trips.length > 0 && (
            <View style={styles.tripSelection}>
              <Text style={styles.sectionTitle}>Select New Trip</Text>
              {trips.map((trip) => (
                <TouchableOpacity
                  key={trip.id}
                  style={[
                    styles.tripOption,
                    selectedTrip?.id === trip.id && styles.tripOptionSelected
                  ]}
                  onPress={() => {
                    setSelectedTrip(trip);
                    setSelectedSeats([]);
                    if (errors.trip) setErrors({ ...errors, trip: '' });
                  }}
                >
                  <Text style={styles.tripTime}>{trip.departure_time}</Text>
                  <Text style={styles.tripVessel}>{trip.vessel_name}</Text>
                  <Text style={styles.tripSeats}>
                    {tripSeatCounts[trip.id] !== undefined ? tripSeatCounts[trip.id] : '...'} seats available
                  </Text>
                </TouchableOpacity>
              ))}
              {errors.trip ? (
                <Text style={styles.errorText}>{errors.trip}</Text>
              ) : null}
            </View>
          )}

          {/* Seat Selection */}
          <Text style={styles.seatSectionTitle}>
            Select New Seats ({selectedSeats.length}/{booking.passengers.length})
          </Text>
          {!selectedTrip ? (
            <Text style={styles.noSeatsText}>Please select a trip first</Text>
          ) : isLoading ? (
            <Text style={styles.loadingText}>Loading available seats...</Text>
          ) : availableSeats.length > 0 ? (
            <SeatSelector
              seats={availableSeats}
              selectedSeats={selectedSeats}
              onSeatToggle={handleSeatToggle}
              maxSeats={booking.passengers.length}
            />
          ) : (
            <Text style={styles.noSeatsText}>No seats available for this trip</Text>
          )}
          {errors.seats ? (
            <Text style={styles.errorText}>{errors.seats}</Text>
          ) : null}

          {/* Modification Reason */}
          <View
            style={styles.reasonContainer}
            ref={(ref) => { inputRefs.current.reason = ref; }}
          >
            <Input
              label="Reason for Modification"
              placeholder="Please provide a reason for this modification"
              value={modificationReason}
              onChangeText={(text) => {
                setModificationReason(text);
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
        </Card>

        {/* Fare Difference and Payment Options */}
        {selectedTrip && (
          <Card variant="elevated" style={styles.fareDifferenceContainer}>
            <Text style={styles.fareDifferenceTitle}>Fare Difference & Payment</Text>

            <View style={styles.fareRow}>
              <View style={styles.fareColumn}>
                <Text style={styles.fareLabel}>Current Fare</Text>
                <Text style={styles.fareValue}>MVR {booking.totalFare.toFixed(2)}</Text>
              </View>

              <View style={styles.fareColumn}>
                <Text style={styles.fareLabel}>New Fare</Text>
                <Text style={styles.fareValue}>
                  MVR {(booking.totalFare + fareDifference).toFixed(2)}
                </Text>
              </View>
            </View>

            <View style={styles.differenceRow}>
              <Text style={styles.differenceLabel}>Difference:</Text>
              <Text style={[
                styles.differenceValue,
                fareDifference > 0 ? styles.additionalPayment : styles.refundAmount
              ]}>
                {fareDifference > 0 ? '+' : ''}MVR {fareDifference.toFixed(2)}
              </Text>
            </View>

            {/* Payment Method Selection */}
            {fareDifference !== 0 && (
              <View style={styles.paymentMethodContainer}>
                <Text style={styles.paymentMethodTitle}>
                  {fareDifference > 0 ? 'Payment Method' : 'Refund Method'}
                </Text>

                <View style={styles.paymentOptions}>
                  <TouchableOpacity
                    style={[
                      styles.paymentOption,
                      selectedPaymentMethod === 'gateway' && styles.paymentOptionSelected
                    ]}
                    onPress={() => setSelectedPaymentMethod('gateway')}
                  >
                    <Text style={[
                      styles.paymentOptionText,
                      selectedPaymentMethod === 'gateway' && styles.paymentOptionTextSelected
                    ]}>
                      {fareDifference > 0 ? 'Online Payment' : 'Original Method'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.paymentOption,
                      selectedPaymentMethod === 'bank_transfer' && styles.paymentOptionSelected
                    ]}
                    onPress={() => setSelectedPaymentMethod('bank_transfer')}
                  >
                    <Text style={[
                      styles.paymentOptionText,
                      selectedPaymentMethod === 'bank_transfer' && styles.paymentOptionTextSelected
                    ]}>
                      Bank Transfer
                    </Text>
                  </TouchableOpacity>

                  {fareDifference > 0 && (
                    <TouchableOpacity
                      style={[
                        styles.paymentOption,
                        selectedPaymentMethod === 'cash' && styles.paymentOptionSelected
                      ]}
                      onPress={() => setSelectedPaymentMethod('cash')}
                    >
                      <Text style={[
                        styles.paymentOptionText,
                        selectedPaymentMethod === 'cash' && styles.paymentOptionTextSelected
                      ]}>
                        Cash Payment
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            )}

            {/* Bank Account Details for Refunds */}
            {fareDifference < 0 && selectedPaymentMethod === 'bank_transfer' && (
              <View style={styles.bankDetailsContainer}>
                <Text style={styles.bankDetailsTitle}>Bank Account Details for Refund</Text>

                <View ref={(ref) => { inputRefs.current.accountNumber = ref; }}>
                  <Input
                    label="Account Number"
                    placeholder="Enter your bank account number"
                    value={bankAccountDetails.accountNumber}
                    onChangeText={(text) => {
                      setBankAccountDetails({ ...bankAccountDetails, accountNumber: text });
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

                <View ref={(ref) => { inputRefs.current.accountName = ref; }}>
                  <Input
                    label="Account Holder Name"
                    placeholder="Enter account holder name"
                    value={bankAccountDetails.accountName}
                    onChangeText={(text) => {
                      setBankAccountDetails({ ...bankAccountDetails, accountName: text });
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

                <View ref={(ref) => { inputRefs.current.bankName = ref; }}>
                  <Input
                    label="Bank Name"
                    placeholder="Enter bank name"
                    value={bankAccountDetails.bankName}
                    onChangeText={(text) => {
                      setBankAccountDetails({ ...bankAccountDetails, bankName: text });
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
              </View>
            )}

            <Text style={styles.differenceNote}>
              {fareDifference > 0
                ? "Additional payment will be required"
                : fareDifference < 0
                  ? "Refund will be processed within 72 hours"
                  : "No additional payment or refund required"
              }
            </Text>
          </Card>
        )}

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <Button
            title="Cancel"
            onPress={() => router.back()}
            variant="outline"
            style={styles.cancelButton}
          />

          <Button
            title="Confirm Modification"
            onPress={handleModify}
            loading={isLoading}
            disabled={isLoading}
            style={styles.confirmButton}
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
  bookingCard: {
    marginBottom: 16,
  },
  modifyCard: {
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
    alignItems: 'flex-start',
  },
  detailLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
    textAlign: 'right',
    flex: 1,
    marginLeft: 8,
  },
  tripSelection: {
    marginTop: 16,
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
  },
  tripOptionSelected: {
    backgroundColor: Colors.highlight,
    borderColor: Colors.primary,
  },
  tripTime: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  tripVessel: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  tripSeats: {
    fontSize: 14,
    color: Colors.primary,
  },
  seatSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginTop: 16,
    marginBottom: 12,
  },
  reasonContainer: {
    marginTop: 16,
  },
  fareDifferenceContainer: {
    marginBottom: 24,
    backgroundColor: Colors.highlight,
  },
  fareDifferenceTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 12,
  },
  fareRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  fareColumn: {
    alignItems: 'center',
  },
  fareLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  fareValue: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  differenceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    marginBottom: 16,
  },
  differenceLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  differenceValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  additionalPayment: {
    color: Colors.error,
  },
  refundAmount: {
    color: Colors.success,
  },
  paymentMethodContainer: {
    marginBottom: 16,
  },
  paymentMethodTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  paymentOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  paymentOption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
  },
  paymentOptionSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  paymentOptionText: {
    fontSize: 14,
    color: Colors.text,
    fontWeight: '500',
  },
  paymentOptionTextSelected: {
    color: '#fff',
  },
  bankDetailsContainer: {
    marginBottom: 16,
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  bankDetailsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  differenceNote: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontStyle: 'italic',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 32,
  },
  cancelButton: {
    flex: 1,
    marginRight: 8,
  },
  confirmButton: {
    flex: 1,
    marginLeft: 8,
  },
  errorText: {
    color: Colors.error,
    fontSize: 14,
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
  loadingText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    padding: 20,
    fontStyle: 'italic',
  },
  noSeatsText: {
    fontSize: 14,
    color: Colors.error,
    textAlign: 'center',
    padding: 20,
    fontStyle: 'italic',
  },
});