import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { Check } from 'lucide-react-native';
import {
  useBookingStore,
  useRouteStore,
  useTripStore,
  useSeatStore,
  useBookingOperationsStore,
} from '@/store';
import Colors from '@/constants/colors';
import Card from '@/components/Card';
import Button from '@/components/Button';
import DatePicker from '@/components/DatePicker';
import Dropdown from '@/components/Dropdown';
import SeatSelector from '@/components/SeatSelector';
import Input from '@/components/Input';
import type { Seat } from '@/types';
import {
  toggleSeatSelection,
  updatePassengersForSeats,
} from '@/utils/seatSelectionUtils';
import {
  createRouteLabel,
  formatTime,
  createEmptyFormErrors,
} from '@/utils/customerUtils';
import MibPaymentWebView from '@/components/MibPaymentWebView';
import {
  BOOKING_STEPS,
  STEP_LABELS,
  TRIP_TYPES,
  PAYMENT_OPTIONS,
  REFRESH_INTERVALS,
} from '@/constants/customer';

// Note: SupabaseSeat type and transformSeatsData function are now imported from utils

export default function BookScreen() {
  // Removed local currentStep state - using store's currentStep
  const [paymentMethod, setPaymentMethod] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);

  // Local seat selection state to avoid store circular dependencies
  const [localSelectedSeats, setLocalSelectedSeats] = useState<Seat[]>([]);
  const [localReturnSelectedSeats, setLocalReturnSelectedSeats] = useState<
    Seat[]
  >([]);

  const [errors, setErrors] = useState(createEmptyFormErrors());

  // MIB Payment WebView state
  const [showMibPayment, setShowMibPayment] = useState(false);
  const [currentBookingId, setCurrentBookingId] = useState('');
  const [mibSessionData, setMibSessionData] = useState<any>(null);
  const [mibBookingDetails, setMibBookingDetails] = useState<any>(null);

  // Core booking state
  const {
    currentBooking,
    isLoading: bookingLoading,
    currentStep,
    setCurrentStep,
    setTripType,
    setDepartureDate,
    setReturnDate,
    setRoute,
    setReturnRoute,
    setTrip,
    setReturnTrip,
    updatePassengers,
    resetBooking: resetCurrentBooking,
    calculateTotalFare,
    createCustomerBooking,
  } = useBookingStore();

  // Route management
  const {
    availableIslands,
    availableRoutes,
    fetchAvailableIslands,
    fetchAvailableRoutes,
    isLoading: routeLoading,
  } = useRouteStore();

  // Trip management
  const {
    trips,
    returnTrips,
    fetchTrips,
    isLoading: tripLoading,
  } = useTripStore();

  // Seat management
  const {
    availableSeats,
    availableReturnSeats,
    seats,
    fetchSeats,
    fetchAvailableSeats,
    subscribeSeatUpdates,
    unsubscribeSeatUpdates,
    cleanupAllSeatSubscriptions,
    refreshAvailableSeatsSilently,
    isLoading: seatLoading,
  } = useSeatStore();

  // Booking operations
  const { confirmBooking, isLoading: operationLoading } =
    useBookingOperationsStore();

  // Combined states
  const isLoading =
    bookingLoading ||
    routeLoading ||
    tripLoading ||
    seatLoading ||
    operationLoading;

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
      fetchTrips(
        currentBooking.returnRoute.id,
        currentBooking.returnDate,
        true
      );
    }
  }, [currentBooking.returnRoute?.id, currentBooking.returnDate]);

  // Fetch seats when trip is selected
  useEffect(() => {
    const initializeSeatsForTrip = async () => {
      if (currentBooking.trip?.id) {
        try {
          // Fetch available seats from seat_reservations table
          await fetchAvailableSeats(currentBooking.trip.id, false);
          // Subscribe to real-time updates for this trip
          subscribeSeatUpdates(currentBooking.trip.id, false);
        } catch (error) {}
      }
    };

    const initializeSeatsForReturnTrip = async () => {
      if (currentBooking.returnTrip?.id) {
        try {
          // Fetch available seats for return trip from seat_reservations table
          await fetchAvailableSeats(currentBooking.returnTrip.id, true);
          // Subscribe to real-time updates for return trip
          subscribeSeatUpdates(currentBooking.returnTrip.id, true);
        } catch (error) {}
      }
    };

    initializeSeatsForTrip();
    initializeSeatsForReturnTrip();

    // Cleanup subscriptions when trips change
    return () => {
      if (currentBooking.trip?.id) {
        unsubscribeSeatUpdates(currentBooking.trip.id);
      }
      if (currentBooking.returnTrip?.id) {
        unsubscribeSeatUpdates(currentBooking.returnTrip.id);
      }
    };
  }, [currentBooking.trip?.id, currentBooking.returnTrip?.id]);

  // Cleanup all subscriptions when component unmounts
  useEffect(() => {
    return () => {
      cleanupAllSeatSubscriptions();
    };
  }, []);

  // Sync local seat selection with booking store
  useEffect(() => {
    setLocalSelectedSeats(currentBooking.selectedSeats);
  }, [currentBooking.selectedSeats]);

  useEffect(() => {
    setLocalReturnSelectedSeats(currentBooking.returnSelectedSeats);
  }, [currentBooking.returnSelectedSeats]);

  // Periodic seat refresh when on seat selection step (as fallback for real-time updates)
  useEffect(() => {
    if (currentStep === BOOKING_STEPS.SEAT_SELECTION) {
      const refreshInterval = setInterval(() => {
        // Refresh seat availability without showing loading
        if (currentBooking.trip?.id) {
          refreshAvailableSeatsSilently(currentBooking.trip.id, false);
        }
        if (currentBooking.returnTrip?.id) {
          refreshAvailableSeatsSilently(currentBooking.returnTrip.id, true);
        }
      }, REFRESH_INTERVALS.SEAT_AVAILABILITY);

      return () => clearInterval(refreshInterval);
    }
  }, [currentStep, currentBooking.trip?.id, currentBooking.returnTrip?.id]);

  const validateStep = (step: number) => {
    const newErrors = { ...errors };
    let isValid = true;

    switch (step) {
      case BOOKING_STEPS.TRIP_TYPE_DATE: // Trip Type & Date
        if (!currentBooking.tripType) {
          newErrors.tripType = 'Please select a trip type';
          isValid = false;
        }

        if (!currentBooking.departureDate) {
          newErrors.departureDate = 'Please select a departure date';
          isValid = false;
        }

        if (
          currentBooking.tripType === TRIP_TYPES.ROUND_TRIP &&
          !currentBooking.returnDate
        ) {
          newErrors.returnDate = 'Please select a return date';
          isValid = false;
        }
        break;

      case BOOKING_STEPS.ROUTE_SELECTION: // Route & Trip Selection
        if (!currentBooking.route) {
          newErrors.route = 'Please select a route';
          isValid = false;
        }

        // Check if trips are available for the selected route and date
        if (
          currentBooking.route &&
          currentBooking.departureDate &&
          trips.length === 0
        ) {
          newErrors.trip = 'No trips available for the selected route and date';
          isValid = false;
        }

        if (!currentBooking.trip) {
          newErrors.trip = 'Please select a departure time';
          isValid = false;
        }

        if (currentBooking.tripType === TRIP_TYPES.ROUND_TRIP) {
          if (!currentBooking.returnRoute) {
            newErrors.returnRoute = 'Please select a return route';
            isValid = false;
          }

          // Check if return trips are available for the selected return route and date
          if (
            currentBooking.returnRoute &&
            currentBooking.returnDate &&
            returnTrips.length === 0
          ) {
            newErrors.returnTrip =
              'No return trips available for the selected route and date';
            isValid = false;
          }

          if (!currentBooking.returnTrip) {
            newErrors.returnTrip = 'Please select a return time';
            isValid = false;
          }
        }
        break;

      case BOOKING_STEPS.SEAT_SELECTION: // Seat Selection
        if (localSelectedSeats.length === 0) {
          newErrors.seats = 'Please select at least one seat';
          isValid = false;
        }

        if (
          currentBooking.tripType === TRIP_TYPES.ROUND_TRIP &&
          localReturnSelectedSeats.length === 0
        ) {
          newErrors.seats = 'Please select at least one return seat';
          isValid = false;
        }

        if (
          currentBooking.tripType === TRIP_TYPES.ROUND_TRIP &&
          localSelectedSeats.length !== localReturnSelectedSeats.length
        ) {
          newErrors.seats = 'Number of departure and return seats must match';
          isValid = false;
        }
        break;

      case BOOKING_STEPS.PASSENGER_DETAILS: // Passenger Details
        const incompletePassenger = currentBooking.passengers.find(
          p => !p.fullName.trim()
        );
        if (incompletePassenger) {
          newErrors.passengers = 'Please enter details for all passengers';
          isValid = false;
        }
        break;

      case BOOKING_STEPS.PAYMENT: // Payment
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
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);

      // Refresh seat availability when user reaches seat selection step
      if (nextStep === BOOKING_STEPS.SEAT_SELECTION) {
        if (currentBooking.trip?.id) {
          refreshAvailableSeatsSilently(currentBooking.trip.id, false);
        }
        if (currentBooking.returnTrip?.id) {
          refreshAvailableSeatsSilently(currentBooking.returnTrip.id, true);
        }
      }
    }
  };

  const handleBack = () => {
    setCurrentStep(currentStep - 1);
  };
  const handleConfirmBooking = async () => {
    if (validateStep(5)) {
      try {
        const bookingResult = await createCustomerBooking(paymentMethod);

        // Handle MIB payment differently
        if (paymentMethod === 'mib') {
          // Prepare booking details for the payment modal
          const bookingDetails = {
            bookingNumber: bookingResult.booking_number,
            route: `${currentBooking.route?.fromIsland?.name || 'N/A'} → ${currentBooking.route?.toIsland?.name || 'N/A'}`,
            travelDate:
              currentBooking.departureDate || new Date().toISOString(),
            amount: currentBooking.totalFare,
            currency: 'MVR',
            passengerCount: localSelectedSeats.length,
          };

          // Show modal immediately with booking details
          setCurrentBookingId(bookingResult.bookingId);
          setMibBookingDetails(bookingDetails);
          setShowMibPayment(true);

          // Note: MIB session will be created when user clicks "Proceed to Payment" in the modal
        } else {
          // For other payment methods, show success message
          resetCurrentBooking();
          setCurrentStep(BOOKING_STEPS.TRIP_TYPE_DATE);
          setPaymentMethod('');
          setTermsAccepted(false);
          setLocalSelectedSeats([]);
          setLocalReturnSelectedSeats([]);
          setErrors(createEmptyFormErrors());

          // Create success message based on booking type
          let successMessage = `Your ${
            currentBooking.tripType === TRIP_TYPES.ROUND_TRIP
              ? 'round trip'
              : 'one way'
          } booking has been confirmed.`;
          successMessage += `\n\nDeparture Booking ID: ${bookingResult.bookingId}`;
          successMessage += `\nBooking Number: ${bookingResult.booking_number}`;

          if (bookingResult.returnBookingId) {
            successMessage += `\nReturn Booking ID: ${bookingResult.returnBookingId}`;
            if (bookingResult.return_booking_number) {
              successMessage += `\nReturn Booking Number: ${bookingResult.return_booking_number}`;
            }
          }

          Alert.alert('Booking Confirmed', successMessage, [
            {
              text: 'View Tickets',
              onPress: () =>
                router.push({
                  pathname: '/(app)/(customer)/(tabs)/bookings',
                }),
            },
          ]);
        }
      } catch (error: any) {
        const errorMessage =
          error?.message ||
          'There was an error processing your booking. Please try again.';

        Alert.alert('Booking Failed', errorMessage);

        // Refresh seat availability to show current status
        if (currentBooking.trip?.id) {
          try {
            await refreshAvailableSeatsSilently(currentBooking.trip.id, false);
          } catch (refreshError) {}
        }

        if (currentBooking.returnTrip?.id) {
          try {
            await refreshAvailableSeatsSilently(
              currentBooking.returnTrip.id,
              true
            );
          } catch (refreshError) {}
        }
      }
    }
  };

  const updatePassengerDetail = (
    index: number,
    field: string,
    value: string
  ) => {
    const updatedPassengers = [...currentBooking.passengers];
    updatedPassengers[index] = {
      ...updatedPassengers[index],
      [field]: value,
    };
    updatePassengers(updatedPassengers);
  };

  // Handle seat selection using utility function
  const handleSeatToggle = (seat: Seat, isReturn: boolean = false) => {
    const currentSeats = isReturn
      ? localReturnSelectedSeats
      : localSelectedSeats;

    toggleSeatSelection(
      seat,
      currentSeats,
      {
        onSeatsChange: (newSeats, isReturnSeat) => {
          if (isReturnSeat) {
            setLocalReturnSelectedSeats(newSeats);
            // Update booking store with return seats
            const updatedBooking = {
              ...currentBooking,
              returnSelectedSeats: newSeats,
            };
            useBookingStore.setState({ currentBooking: updatedBooking });
          } else {
            setLocalSelectedSeats(newSeats);
            // Update booking store with departure seats
            const updatedBooking = {
              ...currentBooking,
              selectedSeats: newSeats,
            };

            // Update passengers array to match seat count
            const newPassengers = updatePassengersForSeats(
              currentBooking.passengers,
              newSeats.length
            );
            updatedBooking.passengers = newPassengers;

            useBookingStore.setState({ currentBooking: updatedBooking });
          }

          // Recalculate total fare
          calculateTotalFare();
        },
        onError: error => {
          Alert.alert('Seat Selection Error', error);
        },
        maxSeats: undefined, // No specific limit here, validation will happen later
      },
      isReturn
    );

    if (errors.seats) setErrors({ ...errors, seats: '' });
  };

  // Format route options for dropdown
  const routeOptions = availableRoutes.map(route => ({
    label: createRouteLabel(route),
    value: route.id,
  }));

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    >
      {/* Progress Steps */}
      <View style={styles.progressContainer}>
        {Object.values(BOOKING_STEPS).map(step => (
          <View key={step} style={styles.progressStep}>
            <View
              style={[
                styles.progressDot,
                currentStep >= step && styles.progressDotActive,
              ]}
            >
              {currentStep > step && <Check size={12} color='#fff' />}
            </View>
            <Text
              style={[
                styles.progressText,
                currentStep >= step && styles.progressTextActive,
              ]}
            >
              {STEP_LABELS[step]}
            </Text>
          </View>
        ))}
        <View style={styles.progressLine} />
      </View>

      <Card variant='elevated' style={styles.bookingCard}>
        {/* Step 1: Trip Type & Date Selection */}
        {currentStep === BOOKING_STEPS.TRIP_TYPE_DATE && (
          <View>
            <Text style={styles.stepTitle}>Select Trip Type & Date</Text>

            <View style={styles.tripTypeContainer}>
              <TouchableOpacity
                style={[
                  styles.tripTypeButton,
                  currentBooking.tripType === TRIP_TYPES.ONE_WAY &&
                    styles.tripTypeButtonActive,
                ]}
                onPress={() => {
                  setTripType(TRIP_TYPES.ONE_WAY);
                  if (errors.tripType) setErrors({ ...errors, tripType: '' });
                }}
              >
                <Text
                  style={[
                    styles.tripTypeText,
                    currentBooking.tripType === TRIP_TYPES.ONE_WAY &&
                      styles.tripTypeTextActive,
                  ]}
                >
                  One Way
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.tripTypeButton,
                  currentBooking.tripType === TRIP_TYPES.ROUND_TRIP &&
                    styles.tripTypeButtonActive,
                ]}
                onPress={() => {
                  setTripType(TRIP_TYPES.ROUND_TRIP);
                  if (errors.tripType) setErrors({ ...errors, tripType: '' });
                }}
              >
                <Text
                  style={[
                    styles.tripTypeText,
                    currentBooking.tripType === TRIP_TYPES.ROUND_TRIP &&
                      styles.tripTypeTextActive,
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
              label='Departure Date'
              value={currentBooking.departureDate}
              onChange={date => {
                setDepartureDate(date);
                if (errors.departureDate)
                  setErrors({ ...errors, departureDate: '' });
              }}
              minDate={new Date().toISOString().split('T')[0]}
              error={errors.departureDate}
              required
            />

            {currentBooking.tripType === TRIP_TYPES.ROUND_TRIP && (
              <DatePicker
                label='Return Date'
                value={currentBooking.returnDate}
                onChange={date => {
                  setReturnDate(date);
                  if (errors.returnDate)
                    setErrors({ ...errors, returnDate: '' });
                }}
                minDate={
                  currentBooking.departureDate ||
                  new Date().toISOString().split('T')[0]
                }
                error={errors.returnDate}
                required
              />
            )}
          </View>
        )}

        {/* Step 2: Route Selection */}
        {currentStep === BOOKING_STEPS.ROUTE_SELECTION && (
          <View>
            <Text style={styles.stepTitle}>Select Route</Text>

            <Dropdown
              label='Departure Route'
              items={routeOptions}
              value={currentBooking.route?.id || ''}
              onChange={routeId => {
                const selectedRoute = availableRoutes.find(
                  r => r.id === routeId
                );
                if (selectedRoute) {
                  setRoute(selectedRoute);
                  // Clear any previously selected trip when route changes
                  setTrip(null);
                  if (errors.route) setErrors({ ...errors, route: '' });
                  if (errors.trip) setErrors({ ...errors, trip: '' });
                }
              }}
              placeholder='Select departure route'
              error={errors.route}
              searchable
              required
            />

            {currentBooking.route && currentBooking.departureDate && (
              <>
                {tripLoading ? (
                  <View style={styles.loadingContainer}>
                    <Text style={styles.loadingText}>
                      Loading available trips...
                    </Text>
                  </View>
                ) : trips.length > 0 ? (
                  <Dropdown
                    label='Select Departure Time'
                    items={trips.map(trip => ({
                      label: `${formatTime(trip.departure_time)} - ${
                        trip.vessel_name
                      } (${trip.available_seats} seats)`,
                      value: trip.id,
                    }))}
                    value={currentBooking.trip?.id || ''}
                    onChange={tripId => {
                      const selectedTrip = trips.find(t => t.id === tripId);
                      if (selectedTrip) {
                        setTrip(selectedTrip);
                        if (errors.trip) setErrors({ ...errors, trip: '' });
                      }
                    }}
                    placeholder='Select departure time'
                    error={errors.trip}
                    required
                  />
                ) : (
                  <View style={styles.noTripsContainer}>
                    <Text style={styles.noTripsTitle}>No Trips Available</Text>
                    <Text style={styles.noTripsMessage}>
                      There are no trips available for the selected route on{' '}
                      {currentBooking.departureDate}. Please try a different
                      date or route.
                    </Text>
                  </View>
                )}
              </>
            )}

            {currentBooking.tripType === TRIP_TYPES.ROUND_TRIP && (
              <Dropdown
                label='Return Route'
                items={routeOptions}
                value={currentBooking.returnRoute?.id || ''}
                onChange={routeId => {
                  const selectedRoute = availableRoutes.find(
                    r => r.id === routeId
                  );
                  if (selectedRoute) {
                    setReturnRoute(selectedRoute);
                    // Clear any previously selected return trip when return route changes
                    setReturnTrip(null);
                    if (errors.returnRoute)
                      setErrors({ ...errors, returnRoute: '' });
                    if (errors.returnTrip)
                      setErrors({ ...errors, returnTrip: '' });
                  }
                }}
                placeholder='Select return route'
                error={errors.returnRoute}
                searchable
                required
              />
            )}

            {currentBooking.tripType === TRIP_TYPES.ROUND_TRIP &&
              currentBooking.returnRoute &&
              currentBooking.returnDate && (
                <>
                  {tripLoading ? (
                    <View style={styles.loadingContainer}>
                      <Text style={styles.loadingText}>
                        Loading available return trips...
                      </Text>
                    </View>
                  ) : returnTrips.length > 0 ? (
                    <Dropdown
                      label='Select Return Time'
                      items={returnTrips.map(trip => ({
                        label: `${formatTime(trip.departure_time)} - ${
                          trip.vessel_name
                        } (${trip.available_seats} seats available)`,
                        value: trip.id,
                      }))}
                      value={currentBooking.returnTrip?.id || ''}
                      onChange={tripId => {
                        const selectedTrip = returnTrips.find(
                          t => t.id === tripId
                        );
                        if (selectedTrip) {
                          setReturnTrip(selectedTrip);
                          if (errors.returnTrip)
                            setErrors({ ...errors, returnTrip: '' });
                        }
                      }}
                      placeholder='Select return time'
                      error={errors.returnTrip}
                      required
                    />
                  ) : (
                    <View style={styles.noTripsContainer}>
                      <Text style={styles.noTripsTitle}>
                        No Return Trips Available
                      </Text>
                      <Text style={styles.noTripsMessage}>
                        There are no return trips available for the selected
                        route on {currentBooking.returnDate}. Please try a
                        different date or route.
                      </Text>
                    </View>
                  )}
                </>
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
        {currentStep === BOOKING_STEPS.SEAT_SELECTION && (
          <View>
            <Text style={styles.stepTitle}>Select Seats</Text>

            <Text style={styles.seatSectionTitle}>Departure Seats</Text>
            <SeatSelector
              seats={availableSeats}
              selectedSeats={localSelectedSeats}
              onSeatToggle={seat => handleSeatToggle(seat, false)}
              isLoading={isLoading}
            />

            {currentBooking.tripType === TRIP_TYPES.ROUND_TRIP && (
              <>
                <Text style={styles.seatSectionTitle}>Return Seats</Text>
                <SeatSelector
                  seats={availableReturnSeats}
                  selectedSeats={localReturnSelectedSeats}
                  onSeatToggle={seat => handleSeatToggle(seat, true)}
                  isLoading={isLoading}
                />
              </>
            )}

            {errors.seats ? (
              <Text style={styles.errorText}>{errors.seats}</Text>
            ) : null}

            {localSelectedSeats.length > 0 && (
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
        {currentStep === BOOKING_STEPS.PASSENGER_DETAILS && (
          <View>
            <Text style={styles.stepTitle}>Passenger Details</Text>

            {currentBooking.passengers.map((passenger, index) => (
              <View key={index} style={styles.passengerContainer}>
                <Text style={styles.passengerTitle}>
                  Passenger {index + 1} - Seat{' '}
                  {localSelectedSeats[index]?.number}
                </Text>

                <Input
                  label='Full Name'
                  placeholder='Enter passenger name'
                  value={passenger.fullName}
                  onChangeText={text =>
                    updatePassengerDetail(index, 'fullName', text)
                  }
                  required
                />

                <Input
                  label='ID Number'
                  placeholder='Enter ID number (optional)'
                  value={passenger.idNumber || ''}
                  onChangeText={text =>
                    updatePassengerDetail(index, 'idNumber', text)
                  }
                />

                <Input
                  label='Special Assistance'
                  placeholder='Any special requirements? (optional)'
                  value={passenger.specialAssistance || ''}
                  onChangeText={text =>
                    updatePassengerDetail(index, 'specialAssistance', text)
                  }
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
        {currentStep === BOOKING_STEPS.PAYMENT && (
          <View>
            <Text style={styles.stepTitle}>Payment</Text>

            <View style={styles.summaryContainer}>
              <Text style={styles.summaryTitle}>Booking Summary</Text>

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Trip Type:</Text>
                <Text style={styles.summaryValue}>
                  {currentBooking.tripType === 'one_way'
                    ? 'One Way'
                    : 'Round Trip'}
                </Text>
              </View>

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Route:</Text>
                <Text style={styles.summaryValue}>
                  {currentBooking.route?.fromIsland.name} →{' '}
                  {currentBooking.route?.toIsland.name}
                </Text>
              </View>

              {currentBooking.tripType === TRIP_TYPES.ROUND_TRIP &&
                currentBooking.returnRoute && (
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Return Route:</Text>
                    <Text style={styles.summaryValue}>
                      {currentBooking.returnRoute.fromIsland.name} →{' '}
                      {currentBooking.returnRoute.toIsland.name}
                    </Text>
                  </View>
                )}

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Departure Date:</Text>
                <Text style={styles.summaryValue}>
                  {currentBooking.departureDate &&
                    new Date(currentBooking.departureDate).toLocaleDateString()}
                </Text>
              </View>

              {currentBooking.tripType === TRIP_TYPES.ROUND_TRIP &&
                currentBooking.returnDate && (
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Return Date:</Text>
                    <Text style={styles.summaryValue}>
                      {new Date(currentBooking.returnDate).toLocaleDateString()}
                    </Text>
                  </View>
                )}

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Passengers:</Text>
                <Text style={styles.summaryValue}>
                  {currentBooking.passengers.length}
                </Text>
              </View>

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Seats:</Text>
                <Text style={styles.summaryValue}>
                  {localSelectedSeats.map(seat => seat.number).join(', ')}
                </Text>
              </View>

              {currentBooking.tripType === TRIP_TYPES.ROUND_TRIP &&
                localReturnSelectedSeats.length > 0 && (
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Return Seats:</Text>
                    <Text style={styles.summaryValue}>
                      {localReturnSelectedSeats
                        .map(seat => seat.number)
                        .join(', ')}
                    </Text>
                  </View>
                )}

              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total Amount:</Text>
                <Text style={styles.totalValue}>
                  MVR {currentBooking.totalFare.toFixed(2)}
                </Text>
              </View>
            </View>

            <Dropdown
              label='Payment Method'
              items={[...PAYMENT_OPTIONS]}
              value={paymentMethod}
              onChange={value => {
                setPaymentMethod(value);
                if (errors.paymentMethod)
                  setErrors({ ...errors, paymentMethod: '' });
              }}
              placeholder='Select payment method'
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
                <View
                  style={[
                    styles.checkboxInner,
                    termsAccepted && styles.checkboxChecked,
                  ]}
                />
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
          {currentStep > BOOKING_STEPS.TRIP_TYPE_DATE && (
            <Button
              title='Back'
              onPress={handleBack}
              variant='outline'
              style={styles.navigationButton}
            />
          )}

          {currentStep < BOOKING_STEPS.PAYMENT ? (
            <Button
              title='Next'
              onPress={handleNext}
              style={
                currentStep === BOOKING_STEPS.TRIP_TYPE_DATE
                  ? styles.singleButton
                  : styles.navigationButton
              }
            />
          ) : (
            <Button
              title='Confirm Booking'
              onPress={handleConfirmBooking}
              loading={isLoading}
              disabled={isLoading}
              style={styles.navigationButton}
            />
          )}
        </View>
      </Card>

      {/* MIB Payment WebView */}
      {showMibPayment && mibBookingDetails && currentBookingId && (
        <MibPaymentWebView
          visible={showMibPayment}
          bookingDetails={mibBookingDetails}
          bookingId={currentBookingId}
          sessionData={mibSessionData}
          onClose={() => {
            setShowMibPayment(false);
            setCurrentBookingId('');
            setMibSessionData(null);
            setMibBookingDetails(null);
          }}
          onSuccess={result => {
            // Close the modal first
            setShowMibPayment(false);
            setCurrentBookingId('');
            setMibSessionData(null);
            setMibBookingDetails(null);

            // Navigate to payment success page immediately without resetting booking state
            // The payment success page will handle the booking state reset
            router.push({
              pathname: '/(app)/(customer)/payment-success',
              params: {
                bookingId: currentBookingId,
                result: 'SUCCESS',
                sessionId: result.sessionId,
                resetBooking: 'true', // Flag to indicate booking should be reset
              },
            });
          }}
          onFailure={error => {
            // Close the modal first
            setShowMibPayment(false);
            setCurrentBookingId('');
            setMibSessionData(null);
            setMibBookingDetails(null);

            // Navigate to payment success page with failure status
            // Don't reset booking state so user can retry payment
            router.push({
              pathname: '/(app)/(customer)/payment-success',
              params: {
                bookingId: currentBookingId,
                result: 'FAILURE',
                resetBooking: 'false', // Don't reset booking on failure
              },
            });
          }}
          onCancel={() => {
            // Close the modal first
            setShowMibPayment(false);
            setCurrentBookingId('');
            setMibSessionData(null);
            setMibBookingDetails(null);

            // Navigate to payment success page with cancelled status
            // Don't reset booking state so user can retry payment
            router.push({
              pathname: '/(app)/(customer)/payment-success',
              params: {
                bookingId: currentBookingId,
                result: 'CANCELLED',
                resetBooking: 'false', // Don't reset booking on cancellation
              },
            });
          }}
        />
      )}
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
  noTripsContainer: {
    padding: 16,
    backgroundColor: Colors.highlight,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.warning,
    marginVertical: 8,
  },
  noTripsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.warning,
    marginBottom: 8,
  },
  noTripsMessage: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
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
  loadingContainer: {
    padding: 16,
    backgroundColor: Colors.highlight,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    marginVertical: 8,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontStyle: 'italic',
  },
});
