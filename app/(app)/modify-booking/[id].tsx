import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TextInput as RNTextInput,
  TouchableOpacity,
  ViewStyle,
  TextStyle,
  KeyboardAvoidingView,
  Platform,
  Keyboard
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Calendar, ArrowRight } from 'lucide-react-native';
import { useBookingStore } from '@/store/bookingStore';
import { supabase } from '@/utils/supabase';
import { Seat } from '@/types';
import Colors from '@/constants/colors';
import Card from '@/components/Card';
import Button from '@/components/Button';
import DatePicker from '@/components/DatePicker';
import SeatSelector from '@/components/SeatSelector';

// Define interface for custom TextInput props
interface CustomTextInputProps {
  placeholder: string;
  value: string;
  onChangeText: (text: string) => void;
  multiline?: boolean;
  numberOfLines?: number;
  style?: ViewStyle;
}

export default function ModifyBookingScreen() {
  const { id } = useLocalSearchParams();
  const scrollViewRef = useRef<ScrollView>(null);

  // Enhanced keyboard handling
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [activeInput, setActiveInput] = useState<string | null>(null);
  const inputRefs = useRef({
    reason: null as any,
  });

  const {
    bookings,
    modifyBooking,
    isLoading,
    availableRoutes,
    trips,
    returnTrips,
    availableSeats,
    availableReturnSeats,
    fetchTrips,
    fetchAvailableSeats
  } = useBookingStore();

  // State to track actual seat availability for each trip
  const [tripSeatCounts, setTripSeatCounts] = useState<Record<string, number>>({});
  const [newDepartureDate, setNewDepartureDate] = useState<string | null>(null);
  const [newReturnDate, setNewReturnDate] = useState<string | null>(null);
  const [selectedSeats, setSelectedSeats] = useState<Seat[]>([]);
  const [returnSelectedSeats, setReturnSelectedSeats] = useState<Seat[]>([]);
  const [modificationReason, setModificationReason] = useState('');
  const [fareDifference, setFareDifference] = useState(0);
  const [selectedTrip, setSelectedTrip] = useState<any>(null);
  const [selectedReturnTrip, setSelectedReturnTrip] = useState<any>(null);
  const [errors, setErrors] = useState({
    departureDate: '',
    returnDate: '',
    seats: '',
    reason: '',
    trip: '',
  });

  // Enhanced keyboard event listeners
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

  // Enhanced scroll to input function
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
            console.log('measureLayout failed for', inputKey);
          }
        );
      }
    }, 100);
  };

  // Find the booking by id
  const booking = bookings.find(b => b.id === id);

  useEffect(() => {
    if (booking) {
      setNewDepartureDate(booking.departureDate);
      setNewReturnDate(booking.returnDate || null);
      setSelectedSeats(booking.seats);
      setReturnSelectedSeats(booking.returnSeats || []);

      // Calculate a random fare difference for demo purposes
      const randomDiff = Math.floor(Math.random() * 40) - 20; // Between -20 and 20
      setFareDifference(randomDiff);
    }
  }, [booking]);

  // Function to fetch actual seat availability for a trip
  const fetchTripSeatAvailability = async (tripId: string) => {
    try {
      const { data: seatReservations, error } = await supabase
        .from('seat_reservations')
        .select('is_available, booking_id')
        .eq('trip_id', tripId);

      if (error) {
        console.error('Error fetching seat availability:', error);
        return 0;
      }

      // Count available seats (is_available = true AND booking_id is null)
      const availableCount = seatReservations?.filter(
        reservation => reservation.is_available && !reservation.booking_id
      ).length || 0;

      return availableCount;
    } catch (error) {
      console.error('Error in fetchTripSeatAvailability:', error);
      return 0;
    }
  };

  // Fetch trips when date or route changes
  useEffect(() => {
    if (booking?.route && newDepartureDate) {
      fetchTrips(booking.route.id, newDepartureDate, false);
    }
  }, [booking?.route, newDepartureDate, fetchTrips]);

  // Fetch seat availability for all trips when trips are loaded
  useEffect(() => {
    const updateTripSeatCounts = async () => {
      if (trips.length > 0) {
        const newCounts: Record<string, number> = {};

        // Fetch seat availability for each trip
        await Promise.all(
          trips.map(async (trip) => {
            const availableCount = await fetchTripSeatAvailability(trip.id);
            newCounts[trip.id] = availableCount;
          })
        );

        setTripSeatCounts(newCounts);
      }
    };

    updateTripSeatCounts();
  }, [trips]);

  useEffect(() => {
    if (booking?.returnRoute && newReturnDate) {
      fetchTrips(booking.returnRoute.id, newReturnDate, true);
    }
  }, [booking?.returnRoute, newReturnDate, fetchTrips]);

  // Fetch seat availability for return trips when they are loaded
  useEffect(() => {
    const updateReturnTripSeatCounts = async () => {
      if (returnTrips.length > 0) {
        const newCounts: Record<string, number> = {};

        // Fetch seat availability for each return trip
        await Promise.all(
          returnTrips.map(async (trip) => {
            const availableCount = await fetchTripSeatAvailability(trip.id);
            newCounts[trip.id] = availableCount;
          })
        );

        setTripSeatCounts(prev => ({ ...prev, ...newCounts }));
      }
    };

    updateReturnTripSeatCounts();
  }, [returnTrips]);

  // Fetch available seats when trip is selected
  useEffect(() => {
    if (selectedTrip?.id) {
      fetchAvailableSeats(selectedTrip.id, false);
      // Clear previously selected seats when changing trip
      setSelectedSeats([]);
    }
  }, [selectedTrip?.id, fetchAvailableSeats]);

  useEffect(() => {
    if (selectedReturnTrip?.id) {
      fetchAvailableSeats(selectedReturnTrip.id, true);
      // Clear previously selected return seats when changing trip
      setReturnSelectedSeats([]);
    }
  }, [selectedReturnTrip?.id, fetchAvailableSeats]);

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

  const toggleSeatSelection = (seat: Seat, isReturn = false) => {
    if (isReturn) {
      const isSelected = returnSelectedSeats.some(s => s.id === seat.id);
      if (isSelected) {
        setReturnSelectedSeats(returnSelectedSeats.filter(s => s.id !== seat.id));
      } else {
        if (returnSelectedSeats.length < booking.passengers.length) {
          setReturnSelectedSeats([...returnSelectedSeats, { ...seat, isSelected: true }]);
        }
      }
    } else {
      const isSelected = selectedSeats.some(s => s.id === seat.id);
      if (isSelected) {
        setSelectedSeats(selectedSeats.filter(s => s.id !== seat.id));
      } else {
        if (selectedSeats.length < booking.passengers.length) {
          setSelectedSeats([...selectedSeats, { ...seat, isSelected: true }]);
        }
      }
    }

    if (errors.seats) {
      setErrors({ ...errors, seats: '' });
    }
  };

  const validateForm = () => {
    let isValid = true;
    const newErrors = { ...errors };

    if (!newDepartureDate) {
      newErrors.departureDate = 'Please select a departure date';
      isValid = false;
    }

    if (booking.tripType === 'round_trip' && !newReturnDate) {
      newErrors.returnDate = 'Please select a return date';
      isValid = false;
    }

    if (!selectedTrip) {
      newErrors.trip = 'Please select a departure trip';
      isValid = false;
    }

    if (selectedSeats.length !== booking.passengers.length) {
      newErrors.seats = `Please select exactly ${booking.passengers.length} seat(s)`;
      isValid = false;
    }

    if (booking.tripType === 'round_trip' && returnSelectedSeats.length !== booking.passengers.length) {
      newErrors.seats = `Please select exactly ${booking.passengers.length} return seat(s)`;
      isValid = false;
    }

    if (!modificationReason.trim()) {
      newErrors.reason = 'Please provide a reason for modification';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleModify = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      await modifyBooking(booking.id, {
        newTripId: selectedTrip?.id,
        newReturnTripId: selectedReturnTrip?.id,
        newDepartureDate,
        newReturnDate,
        selectedSeats,
        returnSelectedSeats,
        modificationReason,
        fareDifference,
      });

      Alert.alert(
        "Booking Modified",
        `Your booking has been modified successfully. ${fareDifference > 0
          ? `An additional payment of MVR ${fareDifference.toFixed(2)} is required.`
          : fareDifference < 0
            ? `A refund of MVR ${Math.abs(fareDifference).toFixed(2)} will be processed.`
            : "No fare difference to process."
        }`,
        [
          {
            text: "OK",
            onPress: () => router.replace('/bookings')
          }
        ]
      );
    } catch (error) {
      Alert.alert("Error", "Failed to modify booking. Please try again.");
    }
  };

  return (
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
        keyboardShouldPersistTaps="handled"
      >
        <Card variant="elevated" style={styles.bookingCard}>
          <Text style={styles.cardTitle}>Current Booking</Text>

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

          {booking.tripType === 'round_trip' && booking.returnDate && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Return Date:</Text>
              <Text style={styles.detailValue}>
                {new Date(booking.returnDate).toLocaleDateString()}
              </Text>
            </View>
          )}

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Current Seats:</Text>
            <Text style={styles.detailValue}>
              {booking.seats.map(seat => seat.number).join(', ')}
            </Text>
          </View>

          {booking.tripType === 'round_trip' && booking.returnSeats && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Return Seats:</Text>
              <Text style={styles.detailValue}>
                {booking.returnSeats.map(seat => seat.number).join(', ')}
              </Text>
            </View>
          )}
        </Card>

        <Card variant="elevated" style={styles.modifyCard}>
          <Text style={styles.cardTitle}>Modify Booking</Text>

          <DatePicker
            label="New Departure Date"
            value={newDepartureDate}
            onChange={(date) => {
              setNewDepartureDate(date);
              setSelectedTrip(null);
              if (errors.departureDate) setErrors({ ...errors, departureDate: '' });
            }}
            minDate={new Date().toISOString().split('T')[0]}
            error={errors.departureDate}
            required
          />

          {trips.length > 0 && (
            <View style={styles.tripSelection}>
              <Text style={styles.sectionTitle}>Select Departure Trip</Text>
              {trips.map((trip) => (
                <TouchableOpacity
                  key={trip.id}
                  style={[
                    styles.tripOption,
                    selectedTrip?.id === trip.id && styles.tripOptionSelected
                  ]}
                  onPress={() => {
                    setSelectedTrip(trip);
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

          {booking.tripType === 'round_trip' && (
            <DatePicker
              label="New Return Date"
              value={newReturnDate}
              onChange={(date) => {
                setNewReturnDate(date);
                setSelectedReturnTrip(null);
                if (errors.returnDate) setErrors({ ...errors, returnDate: '' });
              }}
              minDate={newDepartureDate || new Date().toISOString().split('T')[0]}
              error={errors.returnDate}
              required
            />
          )}

          {booking.tripType === 'round_trip' && returnTrips.length > 0 && (
            <View style={styles.tripSelection}>
              <Text style={styles.sectionTitle}>Select Return Trip</Text>
              {returnTrips.map((trip) => (
                <TouchableOpacity
                  key={trip.id}
                  style={[
                    styles.tripOption,
                    selectedReturnTrip?.id === trip.id && styles.tripOptionSelected
                  ]}
                  onPress={() => {
                    setSelectedReturnTrip(trip);
                  }}
                >
                  <Text style={styles.tripTime}>{trip.departure_time}</Text>
                  <Text style={styles.tripVessel}>{trip.vessel_name}</Text>
                  <Text style={styles.tripSeats}>
                    {tripSeatCounts[trip.id] !== undefined ? tripSeatCounts[trip.id] : '...'} seats available
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <Text style={styles.seatSectionTitle}>Select New Departure Seats ({selectedSeats.length}/{booking.passengers.length})</Text>
          {!selectedTrip ? (
            <Text style={styles.noSeatsText}>Please select a departure trip first</Text>
          ) : isLoading ? (
            <Text style={styles.loadingText}>Loading available seats...</Text>
          ) : availableSeats.length > 0 ? (
            <SeatSelector
              seats={availableSeats}
              selectedSeats={selectedSeats}
              onSeatToggle={(seat) => toggleSeatSelection(seat)}
              maxSeats={booking.passengers.length}
            />
          ) : (
            <Text style={styles.noSeatsText}>No seats available for this trip</Text>
          )}

          {booking.tripType === 'round_trip' && (
            <>
              <Text style={styles.seatSectionTitle}>Select New Return Seats ({returnSelectedSeats.length}/{booking.passengers.length})</Text>
              {!selectedReturnTrip ? (
                <Text style={styles.noSeatsText}>Please select a return trip first</Text>
              ) : isLoading ? (
                <Text style={styles.loadingText}>Loading available return seats...</Text>
              ) : availableReturnSeats.length > 0 ? (
                <SeatSelector
                  seats={availableReturnSeats}
                  selectedSeats={returnSelectedSeats}
                  onSeatToggle={(seat) => toggleSeatSelection(seat, true)}
                  maxSeats={booking.passengers.length}
                />
              ) : (
                <Text style={styles.noSeatsText}>No return seats available for this trip</Text>
              )}
            </>
          )}

          {errors.seats ? (
            <Text style={styles.errorText}>{errors.seats}</Text>
          ) : null}

          <View
            ref={(el) => {
              inputRefs.current.reason = el;
            }}
            style={styles.reasonContainer}
          >
            <Text style={styles.reasonLabel}>Reason for Modification *</Text>
            <View style={styles.reasonInput}>
              <RNTextInput
                style={styles.reasonTextInput}
                placeholder="Please provide a reason for modifying your booking"
                value={modificationReason}
                onChangeText={(text: string) => {
                  setModificationReason(text);
                  if (errors.reason) setErrors({ ...errors, reason: '' });
                }}
                onFocus={() => {
                  setActiveInput('reason');
                  scrollToInput('reason');
                }}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>
            {errors.reason ? (
              <Text style={styles.errorText}>{errors.reason}</Text>
            ) : null}
          </View>

          <View style={styles.fareDifferenceContainer}>
            <Text style={styles.fareDifferenceTitle}>Fare Difference</Text>

            <View style={styles.fareRow}>
              <View style={styles.fareColumn}>
                <Text style={styles.fareLabel}>Original Fare</Text>
                <Text style={styles.fareValue}>MVR {booking.totalFare.toFixed(2)}</Text>
              </View>

              <ArrowRight size={20} color={Colors.textSecondary} />

              <View style={styles.fareColumn}>
                <Text style={styles.fareLabel}>New Fare</Text>
                <Text style={styles.fareValue}>
                  MVR {(booking.totalFare + fareDifference).toFixed(2)}
                </Text>
              </View>
            </View>

            <View style={styles.differenceRow}>
              <Text style={styles.differenceLabel}>Difference:</Text>
              <Text
                style={[
                  styles.differenceValue,
                  fareDifference > 0 ? styles.additionalPayment : styles.refundAmount
                ]}
              >
                {fareDifference > 0 ? '+' : ''}{fareDifference.toFixed(2)} MVR
              </Text>
            </View>

            <Text style={styles.differenceNote}>
              {fareDifference > 0
                ? "Additional payment required"
                : fareDifference < 0
                  ? "Refund will be processed to your original payment method"
                  : "No additional payment or refund required"}
            </Text>
          </View>
        </Card>

        <View style={styles.buttonContainer}>
          <Button
            title="Cancel"
            onPress={() => router.back()}
            variant="outline"
            style={styles.cancelButton}
          />

          <Button
            title="Confirm Changes"
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
  keyboardAvoidingView: {
    flex: 1,
  },
  container: {
    flexGrow: 1,
    backgroundColor: Colors.background,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
    flexGrow: 1,
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
    textAlign: 'right',
    flex: 1,
    marginLeft: 8,
  },
  modifyCard: {
    marginBottom: 24,
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
  reasonLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  reasonInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: 12,
  },
  reasonTextInput: {
    fontSize: 16,
    color: Colors.text,
    textAlignVertical: 'top',
  },
  textInputContainer: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: 12,
  },
  textInput: {
    fontSize: 16,
    color: Colors.text,
  },
  placeholder: {
    color: Colors.textSecondary,
  },
  fareDifferenceContainer: {
    marginTop: 24,
    padding: 16,
    backgroundColor: Colors.highlight,
    borderRadius: 8,
  },
  fareDifferenceTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 12,
  },
  fareRow: {
    flexDirection: 'row',
    alignItems: 'center',
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
    marginBottom: 8,
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
  tripSelection: {
    marginTop: 16,
    marginBottom: 24,
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