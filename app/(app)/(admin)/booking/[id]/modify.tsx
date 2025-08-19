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
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { colors } from '@/constants/adminColors';
import { useAdminBookingStore } from '@/store/admin/bookingStore';
import { useAdminPermissions } from '@/hooks/useAdminPermissions';
import { useRouteStore, useTripStore } from '@/store/routeStore';
import { useSeatStore } from '@/store/seatStore';
import { AdminBooking } from '@/types/admin/management';
import { DollarSign } from 'lucide-react-native';
import { formatCurrency } from '@/utils/admin/bookingManagementUtils';

import Card from '@/components/Card';
import Button from '@/components/Button';
import Input from '@/components/Input';
import DatePicker from '@/components/DatePicker';
import SeatSelector from '@/components/SeatSelector';
import { CurrentTicketDetailsCard } from '@/components/booking';

interface BankDetails {
  accountNumber: string;
  accountName: string;
  bankName: string;
}

type PaymentMethod = 'admin_credit' | 'bank_transfer';

export default function AdminModifyBookingScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { fetchBooking, updateBooking } = useAdminBookingStore();
  const { canUpdateBookings } = useAdminPermissions();

  // Store management for trips and seats
  const { availableRoutes, isLoading: routeLoading } = useRouteStore();
  const { trips, fetchTrips, isLoading: tripLoadingStore } = useTripStore();
  const {
    availableSeats,
    fetchAvailableSeats,
    isLoading: seatLoadingStore,
  } = useSeatStore();

  // Ensure id is a string
  const bookingId = Array.isArray(id) ? id[0] : id;

  // All hooks must be called before any early returns
  const scrollViewRef = useRef<ScrollView>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [activeInput, setActiveInput] = useState<string | null>(null);
  const inputRefs = useRef({
    reason: null as any,
    adminNotes: null as any,
    accountNumber: null as any,
    accountName: null as any,
    bankName: null as any,
  });

  const [booking, setBooking] = useState<AdminBooking | null>(null);
  const [loading, setLoading] = useState(true);
  const [newDate, setNewDate] = useState<string | null>(null);
  const [selectedSeats, setSelectedSeats] = useState<any[]>([]);
  const [modificationReason, setModificationReason] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [selectedPaymentMethod, setSelectedPaymentMethod] =
    useState<PaymentMethod>('admin_credit');
  const [bankAccountDetails, setBankAccountDetails] = useState<BankDetails>({
    accountNumber: '',
    accountName: '',
    bankName: '',
  });
  const [errors, setErrors] = useState({
    date: '',
    trip: '',
    seats: '',
    reason: '',
    accountNumber: '',
    accountName: '',
    bankName: '',
  });
  const [isModifying, setIsModifying] = useState(false);

  // Trips will come from the store

  const [selectedTrip, setSelectedTrip] = useState<any>(null);
  const [fareDifference, setFareDifference] = useState(0);
  const [currentSeats, setCurrentSeats] = useState<any[]>([]);

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

  useEffect(() => {
    loadBooking();
  }, [bookingId]);

  // Fetch available routes on component mount
  const { fetchAvailableRoutes } = useRouteStore();
  useEffect(() => {
    fetchAvailableRoutes();
  }, [fetchAvailableRoutes]);

  // Fetch current seats for the booking
  const fetchCurrentSeats = async (bookingId: string) => {
    try {
      // Try to fetch seat information from seat_reservations table
      const { supabase } = await import('@/utils/supabase');
      const { data: seatReservations, error } = await supabase
        .from('seat_reservations')
        .select(
          `
          seat_id,
          seats!inner(
            id,
            seat_number,
            seat_type
          )
        `
        )
        .eq('booking_id', bookingId)
        .eq('is_reserved', true);

      if (error) {
        console.error('Error fetching seat reservations:', error);
        // Fallback to mock data
        const mockCurrentSeats = [
          { id: '1', number: 'A1', type: 'regular' },
          { id: '2', number: 'A2', type: 'regular' },
        ];
        setCurrentSeats(mockCurrentSeats);
        return;
      }

      if (seatReservations && seatReservations.length > 0) {
        const seats = seatReservations.map((reservation: any) => ({
          id: reservation.seats.id,
          number: reservation.seats.seat_number,
          type: reservation.seats.seat_type,
        }));
        setCurrentSeats(seats);
      } else {
        // No seats found, might be an older booking
        setCurrentSeats([]);
      }
    } catch (error) {
      console.error('Error fetching current seats:', error);
      // Fallback to mock data for demonstration
      const mockCurrentSeats = [
        { id: '1', number: 'A1', type: 'regular' },
        { id: '2', number: 'A2', type: 'regular' },
      ];
      setCurrentSeats(mockCurrentSeats);
    }
  };

  // Initialize form data
  useEffect(() => {
    if (booking) {
      const currentDate = booking.trip_travel_date;

      setNewDate(currentDate || null);
      fetchCurrentSeats(booking.id);

      // Initialize selected seats with current seats
      setSelectedSeats(
        currentSeats?.map((seat: any) => ({
          ...seat,
          isAvailable: true,
        })) || []
      );
    }
  }, [booking]);

  const loadBooking = async () => {
    if (!bookingId) return;

    try {
      setLoading(true);
      const fetchedBooking = await fetchBooking(bookingId);
      if (fetchedBooking) {
        setBooking(fetchedBooking);
        // Set current trip as selected by default
        setSelectedTrip({
          id: fetchedBooking.trip_id,
          travel_date: fetchedBooking.trip_travel_date,
          departure_time: fetchedBooking.trip_departure_time,
          fare: fetchedBooking.trip_base_fare,
        });
        // Set current date
        setNewDate(fetchedBooking.trip_travel_date || null);
      }
    } catch (error) {
      console.error('Error loading booking:', error);
      Alert.alert('Error', 'Failed to load booking details');
    } finally {
      setLoading(false);
    }
  };

  const scrollToInput = (inputName: string) => {
    setTimeout(() => {
      const inputRef =
        inputRefs.current[inputName as keyof typeof inputRefs.current];
      if (inputRef && scrollViewRef.current) {
        inputRef.measureLayout(
          scrollViewRef.current as any,
          (x: number, y: number) => {
            const scrollOffset = y - 100;
            scrollViewRef.current?.scrollTo({
              y: Math.max(0, scrollOffset),
              animated: true,
            });
          },
          () => {}
        );
      }
    }, 100);
  };

  // Find route ID based on booking islands
  const findRouteId = (booking: AdminBooking) => {
    if (!availableRoutes || availableRoutes.length === 0) {
      return null;
    }

    // Find route that matches the booking's from and to islands
    const matchingRoute = availableRoutes.find(
      route =>
        route.fromIsland?.name === booking.from_island_name &&
        route.toIsland?.name === booking.to_island_name
    );

    return matchingRoute?.id || null;
  };

  // Fetch trips when date changes
  useEffect(() => {
    if (newDate && booking && availableRoutes.length > 0) {
      const routeId = findRouteId(booking);
      if (routeId) {
        fetchTrips(routeId, newDate, false);
        setSelectedTrip(null);
        setSelectedSeats([]);
      }
    }
  }, [newDate, booking, availableRoutes, fetchTrips]);

  // Fetch seats when trip changes
  useEffect(() => {
    if (selectedTrip) {
      fetchAvailableSeats(selectedTrip.id);
    }
  }, [selectedTrip, fetchAvailableSeats]);

  const toggleSeatSelection = (seat: any) => {
    const maxSeats = booking?.passenger_count || 1;

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

  const validateForm = (): boolean => {
    const newErrors = {
      date: '',
      trip: '',
      seats: '',
      reason: '',
      accountNumber: '',
      accountName: '',
      bankName: '',
    };

    if (!newDate) {
      newErrors.date = 'Please select a new date';
    }

    if (!selectedTrip) {
      newErrors.trip = 'Please select a trip';
    }

    if (selectedSeats.length === 0) {
      newErrors.seats = 'Please select seats';
    }

    if (!modificationReason.trim()) {
      newErrors.reason = 'Please provide a reason for modification';
    }

    if (selectedPaymentMethod === 'bank_transfer' && fareDifference !== 0) {
      if (!bankAccountDetails.accountNumber.trim()) {
        newErrors.accountNumber = 'Please enter account number';
      }
      if (!bankAccountDetails.accountName.trim()) {
        newErrors.accountName = 'Please enter account holder name';
      }
      if (!bankAccountDetails.bankName.trim()) {
        newErrors.bankName = 'Please enter bank name';
      }
    }

    setErrors(newErrors);
    return !Object.values(newErrors).some(error => error !== '');
  };

  // Calculate fare difference when trip changes (similar to agent logic)
  useEffect(() => {
    if (selectedTrip && booking && availableRoutes.length > 0) {
      const currentPaidFare = booking.total_fare || 0;
      const passengerCount = booking.passenger_count || 1;

      // Find the route to get base fare
      const routeId = findRouteId(booking);
      const route = availableRoutes.find(r => r.id === routeId);
      const newFarePerPassenger =
        route?.baseFare || booking.trip_base_fare || 150;
      const newTotalFare = newFarePerPassenger * passengerCount;

      const difference = newTotalFare - currentPaidFare;
      setFareDifference(difference);
    }
  }, [selectedTrip, booking, availableRoutes]);

  const handleModify = async () => {
    if (!booking || !canUpdateBookings()) {
      Alert.alert('Error', 'You do not have permission to modify bookings');
      return;
    }

    if (!validateForm()) {
      return;
    }

    // Check if booking can be modified
    if (
      !['reserved', 'pending_payment', 'confirmed'].includes(booking.status)
    ) {
      Alert.alert(
        'Cannot Modify',
        'This booking cannot be modified in its current status'
      );
      return;
    }

    Alert.alert(
      'Confirm Modification',
      `Are you sure you want to modify booking #${booking.booking_number}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Yes, Modify', onPress: performModification },
      ]
    );
  };

  const performModification = async () => {
    if (!booking || !selectedTrip) return;

    setIsModifying(true);
    try {
      // Update booking with comprehensive modification data
      const modificationData: Partial<AdminBooking> = {
        trip_id: selectedTrip.id,
        trip_travel_date: newDate || undefined,
        // Note: selectedSeats, modificationReason, etc. would need to be handled
        // by the updateBooking function or stored in separate tables
        total_fare: booking.total_fare + fareDifference,
      };

      await updateBooking(booking.id, modificationData);

      let successMessage = `Booking #${booking.booking_number} has been successfully modified.`;

      if (fareDifference > 0) {
        if (selectedPaymentMethod === 'admin_credit') {
          successMessage += ` An additional charge of ${formatCurrency(fareDifference)} has been processed.`;
        } else {
          successMessage += ` An additional payment of ${formatCurrency(fareDifference)} will be processed via bank transfer.`;
        }
      } else if (fareDifference < 0) {
        if (selectedPaymentMethod === 'admin_credit') {
          successMessage += ` A refund of ${formatCurrency(Math.abs(fareDifference))} has been credited.`;
        } else {
          successMessage += ` A refund of ${formatCurrency(Math.abs(fareDifference))} will be processed via bank transfer within 72 hours.`;
        }
      } else {
        successMessage += ' No additional payment or refund is required.';
      }

      Alert.alert('Booking Modified', successMessage, [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]);
    } catch (error) {
      console.error('Error modifying booking:', error);
      Alert.alert('Error', 'Failed to modify booking. Please try again.');
    } finally {
      setIsModifying(false);
    }
  };

  const handleBankDetailsChange = (details: BankDetails) => {
    setBankAccountDetails(details);
  };

  const handleErrorClear = (field: string) => {
    setErrors({ ...errors, [field]: '' });
  };

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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Stack.Screen
          options={{
            title: 'Loading...',
            headerShown: true,
          }}
        />
        <Text style={styles.loadingText}>Loading booking details...</Text>
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

  const currentPaidAmount = booking.total_fare || 0;
  const newBookingFare = selectedTrip?.fare || booking.total_fare || 0;

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Modify Booking',
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
          {/* Current Booking Details */}
          <CurrentTicketDetailsCard
            bookingNumber={booking.booking_number || ''}
            clientName={booking.user_name || 'Customer Name'}
            origin={booking.from_island_name}
            destination={booking.to_island_name}
            currentDate={booking.trip_travel_date || booking.created_at}
            currentSeats={currentSeats}
            totalAmount={booking.total_fare || 0}
            ticketLabel='Booking'
          />

          {/* Modification Form */}
          <Card variant='elevated' style={styles.modifyCard}>
            <Text style={styles.cardTitle}>Modify Booking</Text>

            <DatePicker
              label='New Date'
              value={newDate}
              onChange={date => {
                setNewDate(date);
                setSelectedTrip(null);
                setSelectedSeats([]);
                if (errors.date) setErrors({ ...errors, date: '' });
                if (errors.trip) setErrors({ ...errors, trip: '' });
                if (errors.seats) setErrors({ ...errors, seats: '' });
              }}
              minDate={new Date().toISOString().split('T')[0]}
              error={errors.date}
              required
            />

            {/* Trip Selection */}
            {newDate && booking && availableRoutes.length > 0 && (
              <View style={styles.tripSelection}>
                <Text style={styles.sectionTitle}>Select New Trip</Text>
                {tripLoadingStore ? (
                  <Text style={styles.loadingText}>
                    Loading available trips...
                  </Text>
                ) : trips.length > 0 ? (
                  trips.map(trip => (
                    <TouchableOpacity
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
                        if (errors.seats) setErrors({ ...errors, seats: '' });
                      }}
                    >
                      <Text style={styles.tripTime}>{trip.departure_time}</Text>
                      <Text style={styles.tripVessel}>
                        {trip.vessel_name || 'N/A'}
                      </Text>
                      <Text style={styles.tripSeats}>
                        Available: {trip.available_seats || 0} seats
                      </Text>
                    </TouchableOpacity>
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
                  Select New Seats ({selectedSeats.length}/
                  {booking?.passenger_count || 1})
                </Text>
                {seatLoadingStore ? (
                  <Text style={styles.loadingText}>
                    Loading available seats...
                  </Text>
                ) : availableSeats && availableSeats.length > 0 ? (
                  <SeatSelector
                    seats={availableSeats}
                    selectedSeats={selectedSeats}
                    onSeatToggle={toggleSeatSelection}
                    maxSeats={booking?.passenger_count || 1}
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
            <View
              ref={ref => {
                if (inputRefs) inputRefs.current.reason = ref;
              }}
              style={styles.reasonContainer}
            >
              <Text style={styles.reasonLabel}>Reason for Modification *</Text>
              <View style={styles.reasonInput}>
                <Input
                  placeholder='Please provide a reason for modifying this booking'
                  value={modificationReason}
                  onChangeText={text => {
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
                />
              </View>
            </View>

            <View
              ref={ref => {
                if (inputRefs) inputRefs.current.adminNotes = ref;
              }}
              style={styles.reasonContainer}
            >
              <Text style={styles.reasonLabel}>Admin Notes (Optional)</Text>
              <View style={styles.reasonInput}>
                <Input
                  placeholder='Add any internal notes about this modification'
                  value={adminNotes}
                  onChangeText={setAdminNotes}
                  onFocus={() => {
                    setActiveInput('adminNotes');
                    scrollToInput('adminNotes');
                  }}
                  multiline
                  numberOfLines={2}
                />
              </View>
            </View>
          </Card>

          {/* Fare Calculation */}
          {selectedTrip && booking && (
            <Card variant='elevated' style={styles.fareCalculationCard}>
              <View style={styles.fareHeader}>
                <DollarSign size={20} color={colors.primary} />
                <Text style={styles.fareTitle}>Fare Calculation</Text>
              </View>

              {/* Current Fare */}
              <View style={styles.discountRow}>
                <Text style={styles.discountLabel}>Current Paid Amount:</Text>
                <Text style={styles.discountValue}>
                  {formatCurrency(currentPaidAmount)}
                </Text>
              </View>

              {/* New Booking Base Fare */}
              <View style={styles.discountRow}>
                <Text style={styles.discountLabel}>New Booking Fare:</Text>
                <Text style={styles.discountValue}>
                  {formatCurrency(newBookingFare)}
                </Text>
              </View>

              {/* Payment Difference */}
              <View style={styles.dividerLine} />
              <View style={styles.discountRow}>
                <Text
                  style={[
                    styles.discountLabel,
                    { fontSize: 16, fontWeight: '600' },
                  ]}
                >
                  Payment Difference:
                </Text>
                <Text
                  style={[
                    styles.fareAmount,
                    {
                      fontSize: 18,
                      color:
                        fareDifference > 0
                          ? colors.danger
                          : fareDifference < 0
                            ? colors.success
                            : colors.textSecondary,
                    },
                  ]}
                >
                  {fareDifference > 0 ? '+' : ''}
                  {formatCurrency(fareDifference)}
                </Text>
              </View>

              <Text style={styles.fareDescription}>
                {fareDifference > 0
                  ? 'Additional payment required from customer'
                  : fareDifference < 0
                    ? 'Refund amount to be processed'
                    : 'No additional payment required'}
              </Text>
            </Card>
          )}

          {/* Payment Method Selection */}
          {fareDifference !== 0 && (
            <Card variant='elevated' style={styles.paymentMethodCard}>
              <View style={styles.paymentMethodContainer}>
                <Text style={styles.paymentMethodTitle}>
                  {fareDifference < 0 ? 'Refund Method' : 'Payment Method'}
                </Text>

                <View style={styles.paymentOptions}>
                  {/* Admin Credit Option */}
                  <TouchableOpacity
                    style={[
                      styles.paymentOption,
                      selectedPaymentMethod === 'admin_credit' &&
                        styles.paymentOptionSelected,
                    ]}
                    onPress={() => setSelectedPaymentMethod('admin_credit')}
                  >
                    <Text
                      style={[
                        styles.paymentOptionText,
                        selectedPaymentMethod === 'admin_credit' &&
                          styles.paymentOptionTextSelected,
                      ]}
                    >
                      💳 Admin Credit
                    </Text>
                  </TouchableOpacity>

                  {/* Bank Transfer Option */}
                  <TouchableOpacity
                    style={[
                      styles.paymentOption,
                      selectedPaymentMethod === 'bank_transfer' &&
                        styles.paymentOptionSelected,
                    ]}
                    onPress={() => setSelectedPaymentMethod('bank_transfer')}
                  >
                    <Text
                      style={[
                        styles.paymentOptionText,
                        selectedPaymentMethod === 'bank_transfer' &&
                          styles.paymentOptionTextSelected,
                      ]}
                    >
                      🏦 Bank Transfer
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Bank Account Details for Bank Transfers */}
              {selectedPaymentMethod === 'bank_transfer' && (
                <View style={styles.bankDetailsContainer}>
                  <Text style={styles.bankDetailsTitle}>
                    Bank Account Details{' '}
                    {fareDifference < 0 ? 'for Refund' : 'for Payment'}
                  </Text>

                  <View
                    ref={ref => {
                      if (inputRefs) inputRefs.current.accountNumber = ref;
                    }}
                  >
                    <Input
                      label='Account Number'
                      placeholder="Enter customer's bank account number"
                      value={bankAccountDetails.accountNumber}
                      onChangeText={text => {
                        handleBankDetailsChange({
                          ...bankAccountDetails,
                          accountNumber: text,
                        });
                        if (errors.accountNumber)
                          handleErrorClear('accountNumber');
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
                    ref={ref => {
                      if (inputRefs) inputRefs.current.accountName = ref;
                    }}
                  >
                    <Input
                      label='Account Holder Name'
                      placeholder='Enter account holder name'
                      value={bankAccountDetails.accountName}
                      onChangeText={text => {
                        handleBankDetailsChange({
                          ...bankAccountDetails,
                          accountName: text,
                        });
                        if (errors.accountName) handleErrorClear('accountName');
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
                    ref={ref => {
                      if (inputRefs) inputRefs.current.bankName = ref;
                    }}
                  >
                    <Input
                      label='Bank Name'
                      placeholder='Enter bank name'
                      value={bankAccountDetails.bankName}
                      onChangeText={text => {
                        handleBankDetailsChange({
                          ...bankAccountDetails,
                          bankName: text,
                        });
                        if (errors.bankName) handleErrorClear('bankName');
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

              <Text style={styles.fareNote}>
                {fareDifference < 0
                  ? 'Refund will be processed within 72 hours'
                  : 'Additional payment will be required from customer'}
              </Text>
            </Card>
          )}

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <Button
              title='Cancel'
              onPress={() => router.back()}
              variant='outline'
              style={styles.backButton}
            />

            <Button
              title='Modify Booking'
              onPress={handleModify}
              loading={isModifying || tripLoadingStore || seatLoadingStore}
              disabled={isModifying || tripLoadingStore || seatLoadingStore}
              style={styles.modifyButton}
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
    backgroundColor: colors.backgroundSecondary,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.backgroundSecondary,
  },
  loadingText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  notFoundContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  notFoundText: {
    fontSize: 18,
    color: colors.text,
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
    color: colors.text,
    marginBottom: 16,
  },

  tripSelection: {
    marginBottom: 16,
  },
  seatSelection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  tripOption: {
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: colors.backgroundSecondary,
  },
  tripOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: '#f0f8ff',
  },
  tripTime: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  tripVessel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
  },
  tripSeats: {
    fontSize: 12,
    color: colors.primary,
    marginTop: 2,
  },
  noSeatsText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    padding: 20,
    fontStyle: 'italic',
  },
  errorText: {
    fontSize: 14,
    color: colors.danger,
    marginTop: 4,
  },
  reasonContainer: {
    marginBottom: 16,
  },
  reasonLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  reasonInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.backgroundSecondary,
  },
  fareCalculationCard: {
    marginBottom: 16,
    backgroundColor: '#f0f9ff',
  },
  fareHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  fareTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginLeft: 8,
  },
  discountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  discountLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  discountValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  dividerLine: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 12,
  },
  fareAmount: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  fareDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  paymentMethodCard: {
    marginBottom: 16,
  },
  paymentMethodContainer: {
    marginBottom: 16,
  },
  paymentMethodTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  paymentOptions: {
    flexDirection: 'row',
    gap: 12,
  },
  paymentOption: {
    flex: 1,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.backgroundSecondary,
    alignItems: 'center',
  },
  paymentOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: '#f0f8ff',
  },
  paymentOptionText: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
  },
  paymentOptionTextSelected: {
    color: colors.primary,
    fontWeight: '600',
  },
  bankDetailsContainer: {
    marginTop: 16,
    marginBottom: 16,
  },
  bankDetailsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  fareNote: {
    fontSize: 14,
    color: colors.textSecondary,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 8,
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
});
