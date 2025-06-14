import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ViewStyle
} from 'react-native';
import { router } from 'expo-router';
import {
  ArrowRight,
  Calendar,
  MapPin,
  Users,
  CreditCard,
  Check
} from 'lucide-react-native';
import { useBookingStore } from '@/store/bookingStore';
import Colors from '@/constants/colors';
import Card from '@/components/Card';
import Button from '@/components/Button';
import DatePicker from '@/components/DatePicker';
import Dropdown from '@/components/Dropdown';
import SeatSelector from '@/components/SeatSelector';
import Input from '@/components/Input';
import { Seat } from '@/types';

// Define the Supabase seat data type
type SupabaseSeat = {
  id: string;
  vessel_id: string;
  seat_number: string;
  row_number: number;
  is_window: boolean;
  is_aisle: boolean;
  created_at: string;
};

// Transform Supabase seats data to match our app's Seat interface
const transformSeatsData = (seatsData: SupabaseSeat[]): Seat[] => {
  return seatsData.map(seat => ({
    id: seat.id,
    number: seat.seat_number,
    rowNumber: seat.row_number,
    isWindow: seat.is_window,
    isAisle: seat.is_aisle,
    isAvailable: Math.random() > 0.3, // Temporarily keeping random availability until we implement real availability
    isSelected: false
  }));
};

export default function BookScreen() {
  const [currentStep, setCurrentStep] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [errors, setErrors] = useState({
    tripType: '',
    departureDate: '',
    returnDate: '',
    route: '',
    returnRoute: '',
    seats: '',
    passengers: '',
    paymentMethod: '',
    terms: '',
    trip: '',
    returnTrip: '',
  });

  const {
    currentBooking,
    seats,
    fetchSeats,
    setTripType,
    setDepartureDate,
    setReturnDate,
    setRoute,
    setReturnRoute,
    setTrip,
    setReturnTrip,
    toggleSeatSelection,
    updatePassengers,
    fetchAvailableIslands,
    fetchAvailableRoutes,
    fetchTrips,
    availableIslands,
    availableRoutes,
    trips,
    returnTrips,
    isLoading,
    confirmBooking,
    resetCurrentBooking,
  } = useBookingStore();

  // Fetch initial data
  useEffect(() => {
    fetchAvailableIslands();
    fetchAvailableRoutes();

    // Set default trip type if none is selected
    if (!currentBooking.tripType) {
      setTripType('one_way');
    }
  }, []);

  // Handle pre-populated data and step advancement in a separate effect
  useEffect(() => {
    // If route and date are already selected from quick booking, advance to step 2
    if (currentBooking.route && currentBooking.departureDate) {
      setCurrentStep(2);
    }
  }, [currentBooking.route, currentBooking.departureDate]);

  // Fetch trips when route or date changes
  useEffect(() => {
    if (currentBooking.route?.id && currentBooking.departureDate) {
      fetchTrips(currentBooking.route.id, currentBooking.departureDate, false);
    }
  }, [currentBooking.route?.id, currentBooking.departureDate]);

  useEffect(() => {
    if (currentBooking.returnRoute?.id && currentBooking.returnDate) {
      fetchTrips(currentBooking.returnRoute.id, currentBooking.returnDate, true);
    }
  }, [currentBooking.returnRoute?.id, currentBooking.returnDate]);

  // Fetch seats when trip is selected
  useEffect(() => {
    if (currentBooking.trip?.vessel_id) {
      fetchSeats(currentBooking.trip.vessel_id);
    }
  }, [currentBooking.trip?.vessel_id]);

  const validateStep = (step: number) => {
    const newErrors = { ...errors };
    let isValid = true;

    switch (step) {
      case 1: // Trip Type & Date
        if (!currentBooking.tripType) {
          newErrors.tripType = 'Please select a trip type';
          isValid = false;
        }

        if (!currentBooking.departureDate) {
          newErrors.departureDate = 'Please select a departure date';
          isValid = false;
        }

        if (currentBooking.tripType === 'round_trip' && !currentBooking.returnDate) {
          newErrors.returnDate = 'Please select a return date';
          isValid = false;
        }
        break;

      case 2: // Route & Trip Selection
        if (!currentBooking.route) {
          newErrors.route = 'Please select a route';
          isValid = false;
        }

        if (!currentBooking.trip) {
          newErrors.trip = 'Please select a departure time';
          isValid = false;
        }

        if (currentBooking.tripType === 'round_trip') {
          if (!currentBooking.returnRoute) {
            newErrors.returnRoute = 'Please select a return route';
            isValid = false;
          }
          if (!currentBooking.returnTrip) {
            newErrors.returnTrip = 'Please select a return time';
            isValid = false;
          }
        }
        break;

      case 3: // Seat Selection
        if (currentBooking.selectedSeats.length === 0) {
          newErrors.seats = 'Please select at least one seat';
          isValid = false;
        }

        if (currentBooking.tripType === 'round_trip' && currentBooking.returnSelectedSeats.length === 0) {
          newErrors.seats = 'Please select at least one return seat';
          isValid = false;
        }

        if (currentBooking.tripType === 'round_trip' &&
          currentBooking.selectedSeats.length !== currentBooking.returnSelectedSeats.length) {
          newErrors.seats = 'Number of departure and return seats must match';
          isValid = false;
        }
        break;

      case 4: // Passenger Details
        const incompletePassenger = currentBooking.passengers.find(p => !p.fullName.trim());
        if (incompletePassenger) {
          newErrors.passengers = 'Please enter details for all passengers';
          isValid = false;
        }
        break;

      case 5: // Payment
        if (!paymentMethod) {
          newErrors.paymentMethod = 'Please select a payment method';
          isValid = false;
        }

        if (!termsAccepted) {
          newErrors.terms = 'You must accept the terms and conditions';
          isValid = false;
        }
        break;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    setCurrentStep(currentStep - 1);
  };

  const handleConfirmBooking = async () => {
    if (validateStep(5)) {
      try {
        const booking = await confirmBooking(paymentMethod);

        // Reset the booking state after successful booking
        resetCurrentBooking();
        setCurrentStep(1);
        setPaymentMethod('');
        setTermsAccepted(false);
        setErrors({
          tripType: '',
          departureDate: '',
          returnDate: '',
          route: '',
          returnRoute: '',
          seats: '',
          passengers: '',
          paymentMethod: '',
          terms: '',
          trip: '',
          returnTrip: '',
        });

        Alert.alert(
          "Booking Confirmed",
          `Your booking has been confirmed. Booking number: ${booking.booking_number}`,
          [
            {
              text: "View Ticket",
              onPress: () => router.push({
                pathname: "/(app)/(tabs)/bookings",
                params: { id: booking.id }
              })
            }
          ]
        );
      } catch (error) {
        Alert.alert(
          "Booking Failed",
          "There was an error processing your booking. Please try again."
        );
        // Do not reset state on error
      }
    }
  };

  const updatePassengerDetail = (index: number, field: string, value: string) => {
    const updatedPassengers = [...currentBooking.passengers];
    updatedPassengers[index] = {
      ...updatedPassengers[index],
      [field]: value
    };
    updatePassengers(updatedPassengers);
  };

  // Format route options for dropdown
  const routeOptions = availableRoutes.map(route => ({
    label: `${route.fromIsland.name} → ${route.toIsland.name}`,
    value: route.id
  }));

  // Payment method options
  const paymentOptions = [
    { label: 'Bank Transfer', value: 'bank_transfer' },
    { label: 'BML', value: 'bml' },
    { label: 'MIB', value: 'mib' },
    { label: 'Ooredoo', value: 'ooredoo_m_faisa' },
    { label: 'FahiPay', value: 'fahipay' },
  ];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    >
      {/* Progress Steps */}
      <View style={styles.progressContainer}>
        {[1, 2, 3, 4, 5].map(step => (
          <View key={step} style={styles.progressStep}>
            <View
              style={[
                styles.progressDot,
                currentStep >= step && styles.progressDotActive
              ]}
            >
              {currentStep > step && (
                <Check size={12} color="#fff" />
              )}
            </View>
            <Text
              style={[
                styles.progressText,
                currentStep >= step && styles.progressTextActive
              ]}
            >
              {step === 1 && "Trip"}
              {step === 2 && "Route"}
              {step === 3 && "Seats"}
              {step === 4 && "Details"}
              {step === 5 && "Payment"}
            </Text>
          </View>
        ))}
        <View style={styles.progressLine} />
      </View>

      <Card variant="elevated" style={styles.bookingCard}>
        {/* Step 1: Trip Type & Date Selection */}
        {currentStep === 1 && (
          <View>
            <Text style={styles.stepTitle}>Select Trip Type & Date</Text>

            <View style={styles.tripTypeContainer}>
              <TouchableOpacity
                style={[
                  styles.tripTypeButton,
                  currentBooking.tripType === 'one_way' && styles.tripTypeButtonActive
                ]}
                onPress={() => {
                  setTripType('one_way');
                  if (errors.tripType) setErrors({ ...errors, tripType: '' });
                }}
              >
                <Text
                  style={[
                    styles.tripTypeText,
                    currentBooking.tripType === 'one_way' && styles.tripTypeTextActive
                  ]}
                >
                  One Way
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.tripTypeButton,
                  currentBooking.tripType === 'round_trip' && styles.tripTypeButtonActive
                ]}
                onPress={() => {
                  setTripType('round_trip');
                  if (errors.tripType) setErrors({ ...errors, tripType: '' });
                }}
              >
                <Text
                  style={[
                    styles.tripTypeText,
                    currentBooking.tripType === 'round_trip' && styles.tripTypeTextActive
                  ]}
                >
                  Round Trip
                </Text>
              </TouchableOpacity>
            </View>

            {errors.tripType ? (
              <Text style={styles.errorText}>{errors.tripType}</Text>
            ) : null}

            <DatePicker
              label="Departure Date"
              value={currentBooking.departureDate}
              onChange={(date) => {
                setDepartureDate(date);
                if (errors.departureDate) setErrors({ ...errors, departureDate: '' });
              }}
              minDate={new Date().toISOString().split('T')[0]}
              error={errors.departureDate}
              required
            />

            {currentBooking.tripType === 'round_trip' && (
              <DatePicker
                label="Return Date"
                value={currentBooking.returnDate}
                onChange={(date) => {
                  setReturnDate(date);
                  if (errors.returnDate) setErrors({ ...errors, returnDate: '' });
                }}
                minDate={currentBooking.departureDate || new Date().toISOString().split('T')[0]}
                error={errors.returnDate}
                required
              />
            )}
          </View>
        )}

        {/* Step 2: Route Selection */}
        {currentStep === 2 && (
          <View>
            <Text style={styles.stepTitle}>Select Route</Text>

            <Dropdown
              label="Departure Route"
              items={routeOptions}
              value={currentBooking.route?.id || ''}
              onChange={(routeId) => {
                const selectedRoute = availableRoutes.find(r => r.id === routeId);
                if (selectedRoute) {
                  setRoute(selectedRoute);
                  if (errors.route) setErrors({ ...errors, route: '' });
                }
              }}
              placeholder="Select departure route"
              error={errors.route}
              searchable
              required
            />

            {currentBooking.route && currentBooking.departureDate && (
              <Dropdown
                label="Select Departure Time"
                items={trips.map(trip => ({
                  label: trip.departure_time.slice(0, 5), // Format HH:mm
                  value: trip.id
                }))}
                value={currentBooking.trip?.id || ''}
                onChange={(tripId) => {
                  const selectedTrip = trips.find(t => t.id === tripId);
                  if (selectedTrip) {
                    setTrip(selectedTrip);
                    if (errors.trip) setErrors({ ...errors, trip: '' });
                  }
                }}
                placeholder="Select departure time"
                error={errors.trip}
                required
              />
            )}

            {currentBooking.tripType === 'round_trip' && (
              <Dropdown
                label="Return Route"
                items={routeOptions}
                value={currentBooking.returnRoute?.id || ''}
                onChange={(routeId) => {
                  const selectedRoute = availableRoutes.find(r => r.id === routeId);
                  if (selectedRoute) {
                    setReturnRoute(selectedRoute);
                    if (errors.returnRoute) setErrors({ ...errors, returnRoute: '' });
                  }
                }}
                placeholder="Select return route"
                error={errors.returnRoute}
                searchable
                required
              />
            )}

            {currentBooking.tripType === 'round_trip' &&
              currentBooking.returnRoute &&
              currentBooking.returnDate && (
                <Dropdown
                  label="Select Return Time"
                  items={returnTrips.map(trip => ({
                    label: trip.departure_time.slice(0, 5), // Format HH:mm
                    value: trip.id
                  }))}
                  value={currentBooking.returnTrip?.id || ''}
                  onChange={(tripId) => {
                    const selectedTrip = returnTrips.find(t => t.id === tripId);
                    if (selectedTrip) {
                      setReturnTrip(selectedTrip);
                      if (errors.returnTrip) setErrors({ ...errors, returnTrip: '' });
                    }
                  }}
                  placeholder="Select return time"
                  error={errors.returnTrip}
                  required
                />
              )}

            {currentBooking.route && (
              <View style={styles.fareContainer}>
                <Text style={styles.fareLabel}>Base Fare:</Text>
                <Text style={styles.fareValue}>
                  MVR {currentBooking.route.baseFare.toFixed(2)} per seat
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Step 3: Seat Selection */}
        {currentStep === 3 && (
          <View>
            <Text style={styles.stepTitle}>Select Seats</Text>

            <Text style={styles.seatSectionTitle}>Departure Seats</Text>
            <SeatSelector
              seats={seats}
              selectedSeats={currentBooking.selectedSeats}
              onSeatToggle={(seat) => {
                toggleSeatSelection(seat);
                if (errors.seats) setErrors({ ...errors, seats: '' });
              }}
            />

            {currentBooking.tripType === 'round_trip' && (
              <>
                <Text style={styles.seatSectionTitle}>Return Seats</Text>
                <SeatSelector
                  seats={seats}
                  selectedSeats={currentBooking.returnSelectedSeats}
                  onSeatToggle={(seat) => {
                    toggleSeatSelection(seat, true);
                    if (errors.seats) setErrors({ ...errors, seats: '' });
                  }}
                />
              </>
            )}

            {errors.seats ? (
              <Text style={styles.errorText}>{errors.seats}</Text>
            ) : null}

            {currentBooking.selectedSeats.length > 0 && (
              <View style={styles.fareContainer}>
                <Text style={styles.fareLabel}>Total Fare:</Text>
                <Text style={styles.fareValue}>
                  MVR {currentBooking.totalFare.toFixed(2)}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Step 4: Passenger Details */}
        {currentStep === 4 && (
          <View>
            <Text style={styles.stepTitle}>Passenger Details</Text>

            {currentBooking.passengers.map((passenger, index) => (
              <View key={index} style={styles.passengerContainer}>
                <Text style={styles.passengerTitle}>
                  Passenger {index + 1} - Seat {currentBooking.selectedSeats[index]?.number}
                </Text>

                <Input
                  label="Full Name"
                  placeholder="Enter passenger name"
                  value={passenger.fullName}
                  onChangeText={(text) => updatePassengerDetail(index, 'fullName', text)}
                  required
                />

                <Input
                  label="ID Number"
                  placeholder="Enter ID number (optional)"
                  value={passenger.idNumber || ''}
                  onChangeText={(text) => updatePassengerDetail(index, 'idNumber', text)}
                />

                <Input
                  label="Special Assistance"
                  placeholder="Any special requirements? (optional)"
                  value={passenger.specialAssistance || ''}
                  onChangeText={(text) => updatePassengerDetail(index, 'specialAssistance', text)}
                  multiline
                  numberOfLines={2}
                />
              </View>
            ))}

            {errors.passengers ? (
              <Text style={styles.errorText}>{errors.passengers}</Text>
            ) : null}
          </View>
        )}

        {/* Step 5: Payment */}
        {currentStep === 5 && (
          <View>
            <Text style={styles.stepTitle}>Payment</Text>

            <View style={styles.summaryContainer}>
              <Text style={styles.summaryTitle}>Booking Summary</Text>

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Trip Type:</Text>
                <Text style={styles.summaryValue}>
                  {currentBooking.tripType === 'one_way' ? 'One Way' : 'Round Trip'}
                </Text>
              </View>

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Route:</Text>
                <Text style={styles.summaryValue}>
                  {currentBooking.route?.fromIsland.name} → {currentBooking.route?.toIsland.name}
                </Text>
              </View>

              {currentBooking.tripType === 'round_trip' && currentBooking.returnRoute && (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Return Route:</Text>
                  <Text style={styles.summaryValue}>
                    {currentBooking.returnRoute.fromIsland.name} → {currentBooking.returnRoute.toIsland.name}
                  </Text>
                </View>
              )}

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Departure Date:</Text>
                <Text style={styles.summaryValue}>
                  {currentBooking.departureDate && new Date(currentBooking.departureDate).toLocaleDateString()}
                </Text>
              </View>

              {currentBooking.tripType === 'round_trip' && currentBooking.returnDate && (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Return Date:</Text>
                  <Text style={styles.summaryValue}>
                    {new Date(currentBooking.returnDate).toLocaleDateString()}
                  </Text>
                </View>
              )}

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Passengers:</Text>
                <Text style={styles.summaryValue}>{currentBooking.passengers.length}</Text>
              </View>

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Seats:</Text>
                <Text style={styles.summaryValue}>
                  {currentBooking.selectedSeats.map(seat => seat.number).join(', ')}
                </Text>
              </View>

              {currentBooking.tripType === 'round_trip' && currentBooking.returnSelectedSeats.length > 0 && (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Return Seats:</Text>
                  <Text style={styles.summaryValue}>
                    {currentBooking.returnSelectedSeats.map(seat => seat.number).join(', ')}
                  </Text>
                </View>
              )}

              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total Amount:</Text>
                <Text style={styles.totalValue}>MVR {currentBooking.totalFare.toFixed(2)}</Text>
              </View>
            </View>

            <Dropdown
              label="Payment Method"
              items={paymentOptions}
              value={paymentMethod}
              onChange={(value) => {
                setPaymentMethod(value);
                if (errors.paymentMethod) setErrors({ ...errors, paymentMethod: '' });
              }}
              placeholder="Select payment method"
              error={errors.paymentMethod}
              required
            />

            <View style={styles.termsContainer}>
              <TouchableOpacity
                style={styles.checkbox}
                onPress={() => {
                  setTermsAccepted(!termsAccepted);
                  if (errors.terms) setErrors({ ...errors, terms: '' });
                }}
              >
                <View style={[
                  styles.checkboxInner,
                  termsAccepted && styles.checkboxChecked
                ]} />
              </TouchableOpacity>
              <Text style={styles.termsText}>
                I accept the{' '}
                <Text style={styles.termsLink}>Terms and Conditions</Text>
              </Text>
            </View>

            {errors.terms ? (
              <Text style={styles.errorText}>{errors.terms}</Text>
            ) : null}
          </View>
        )}

        {/* Navigation Buttons */}
        <View style={styles.buttonContainer}>
          {currentStep > 1 && (
            <Button
              title="Back"
              onPress={handleBack}
              variant="outline"
              style={styles.navigationButton}
            />
          )}

          {currentStep < 5 ? (
            <Button
              title="Next"
              onPress={handleNext}
              style={currentStep === 1 ? styles.singleButton : styles.navigationButton}
            />
          ) : (
            <Button
              title="Confirm Booking"
              onPress={handleConfirmBooking}
              loading={isLoading}
              disabled={isLoading}
              style={styles.navigationButton}
            />
          )}
        </View>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    position: 'relative',
  },
  progressLine: {
    position: 'absolute',
    top: 12,
    left: 25,
    right: 25,
    height: 2,
    backgroundColor: Colors.border,
    zIndex: -1,
  },
  progressStep: {
    alignItems: 'center',
  },
  progressDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.card,
    borderWidth: 2,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  progressDotActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  progressText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  progressTextActive: {
    color: Colors.primary,
    fontWeight: '600',
  },
  bookingCard: {
    marginBottom: 16,
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 24,
    textAlign: 'center',
  },
  tripTypeContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  tripTypeButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tripTypeButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  tripTypeText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  tripTypeTextActive: {
    color: Colors.card,
  },
  fareContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  fareLabel: {
    fontSize: 16,
    color: Colors.text,
  },
  fareValue: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.primary,
  },
  seatSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  passengerContainer: {
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  passengerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 16,
  },
  summaryContainer: {
    marginBottom: 24,
    padding: 16,
    backgroundColor: Colors.highlight,
    borderRadius: 8,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
    textAlign: 'right',
    flex: 1,
    marginLeft: 8,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.primary,
  },
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 4,
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxInner: {
    width: 12,
    height: 12,
    borderRadius: 2,
  },
  checkboxChecked: {
    backgroundColor: Colors.primary,
  },
  termsText: {
    flex: 1,
    fontSize: 14,
    color: Colors.text,
  },
  termsLink: {
    color: Colors.primary,
    fontWeight: '600',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
  },
  navigationButton: {
    flex: 1,
    marginHorizontal: 8,
  },
  singleButton: {
    flex: 1,
    marginLeft: 'auto',
    marginRight: 8,
  },
  errorText: {
    color: Colors.error,
    fontSize: 14,
    marginBottom: 16,
  },
});