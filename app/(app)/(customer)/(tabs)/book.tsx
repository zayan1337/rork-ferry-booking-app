import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
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
import CalendarDatePicker from '@/components/CalendarDatePicker';
import Dropdown from '@/components/Dropdown';
import SeatSelector from '@/components/SeatSelector';
import Input from '@/components/Input';
import type { Seat } from '@/types';
import type { RouteStop } from '@/types/multiStopRoute';
// Removed unused imports
import {
  createRouteLabel,
  formatTime,
  createEmptyFormErrors,
} from '@/utils/customerUtils';
import {
  isTripBookable,
  getTripUnavailableMessage,
} from '@/utils/bookingUtils';
import {
  getAllBoardingIslands,
  getDestinationIslandsFromBoarding,
  getTripsForSegment,
} from '@/utils/segmentBookingUtils';
import MibPaymentWebView from '@/components/MibPaymentWebView';
// Removed unused SeatStatusIndicator import
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
  const [pricingNoticeAccepted, setPricingNoticeAccepted] = useState(false);

  // Local seat selection state to avoid store circular dependencies
  const [localSelectedSeats, setLocalSelectedSeats] = useState<Seat[]>([]);
  const [localReturnSelectedSeats, setLocalReturnSelectedSeats] = useState<
    Seat[]
  >([]);
  const [loadingSeats, setLoadingSeats] = useState<Set<string>>(new Set());
  const [seatErrors, setSeatErrors] = useState<Record<string, string>>({});

  // Island selection state
  const [boardingIslands, setBoardingIslands] = useState<any[]>([]);
  const [destinationIslands, setDestinationIslands] = useState<any[]>([]);
  const [returnDestinationIslands, setReturnDestinationIslands] = useState<any[]>([]);
  const [loadingIslands, setLoadingIslands] = useState(false);

  // Available trips for selected segment
  const [availableTripsForSegment, setAvailableTripsForSegment] = useState<any[]>([]);
  const [returnAvailableTripsForSegment, setReturnAvailableTripsForSegment] = useState<any[]>([]);
  const [loadingTripsForSegment, setLoadingTripsForSegment] = useState(false);

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
    // Multi-stop island selection actions
    setBoardingIsland,
    setDestinationIsland,
    setReturnBoardingIsland,
    setReturnDestinationIsland,
    // Multi-stop segment actions
    setBoardingStop,
    setDestinationStop,
    setReturnBoardingStop,
    setReturnDestinationStop,
    setSegmentFare,
    setReturnSegmentFare,
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
    const loadBoardingIslands = async () => {
      setLoadingIslands(true);
      try {
        const islands = await getAllBoardingIslands();
        setBoardingIslands(islands);
      } catch (error) {
        console.error('Failed to load boarding islands:', error);
      } finally {
        setLoadingIslands(false);
      }
    };

    loadBoardingIslands();

    // Set default trip type if none is selected
    if (!currentBooking.tripType) {
      setTripType('one_way');
    }
  }, []);

  // Fetch destination islands when boarding island is selected
  useEffect(() => {
    const loadDestinationIslands = async () => {
      if (currentBooking.boardingIslandId) {
        setLoadingIslands(true);
        try {
          const islands = await getDestinationIslandsFromBoarding(
            currentBooking.boardingIslandId
          );
          setDestinationIslands(islands);
        } catch (error) {
          console.error('Failed to load destination islands:', error);
          setDestinationIslands([]);
        } finally {
          setLoadingIslands(false);
        }
      } else {
        setDestinationIslands([]);
      }
    };

    loadDestinationIslands();
  }, [currentBooking.boardingIslandId]);

  // Fetch return destination islands when return boarding island is selected
  useEffect(() => {
    const loadReturnDestinationIslands = async () => {
      if (currentBooking.returnBoardingIslandId) {
        setLoadingIslands(true);
        try {
          const islands = await getDestinationIslandsFromBoarding(
            currentBooking.returnBoardingIslandId
          );
          setReturnDestinationIslands(islands);
        } catch (error) {
          console.error('Failed to load return destination islands:', error);
          setReturnDestinationIslands([]);
        } finally {
          setLoadingIslands(false);
        }
      } else {
        setReturnDestinationIslands([]);
      }
    };

    loadReturnDestinationIslands();
  }, [currentBooking.returnBoardingIslandId]);

  // Fetch available trips when both boarding and destination islands are selected
  useEffect(() => {
    const loadTripsForSegment = async () => {
      if (
        currentBooking.boardingIslandId &&
        currentBooking.destinationIslandId &&
        currentBooking.departureDate
      ) {
        setLoadingTripsForSegment(true);
        try {
          const trips = await getTripsForSegment(
            currentBooking.boardingIslandId,
            currentBooking.destinationIslandId,
            currentBooking.departureDate
          );
          setAvailableTripsForSegment(trips);
        } catch (error) {
          console.error('Failed to load trips for segment:', error);
          setAvailableTripsForSegment([]);
        } finally {
          setLoadingTripsForSegment(false);
        }
      } else {
        setAvailableTripsForSegment([]);
      }
    };

    loadTripsForSegment();
  }, [
    currentBooking.boardingIslandId,
    currentBooking.destinationIslandId,
    currentBooking.departureDate,
  ]);

  // Fetch available return trips when both return islands are selected
  useEffect(() => {
    const loadReturnTripsForSegment = async () => {
      if (
        currentBooking.returnBoardingIslandId &&
        currentBooking.returnDestinationIslandId &&
        currentBooking.returnDate
      ) {
        setLoadingTripsForSegment(true);
        try {
          const trips = await getTripsForSegment(
            currentBooking.returnBoardingIslandId,
            currentBooking.returnDestinationIslandId,
            currentBooking.returnDate
          );
          setReturnAvailableTripsForSegment(trips);
        } catch (error) {
          console.error('Failed to load return trips for segment:', error);
          setReturnAvailableTripsForSegment([]);
        } finally {
          setLoadingTripsForSegment(false);
        }
      } else {
        setReturnAvailableTripsForSegment([]);
      }
    };

    loadReturnTripsForSegment();
  }, [
    currentBooking.returnBoardingIslandId,
    currentBooking.returnDestinationIslandId,
    currentBooking.returnDate,
  ]);

  // Fetch seats when trip is selected
  useEffect(() => {
    const initializeSeatsForTrip = async () => {
      if (currentBooking.trip?.id) {
        try {
          // Fetch available seats from seat_reservations table
          await fetchAvailableSeats(currentBooking.trip.id, false);
          // Subscribe to real-time updates for this trip
          subscribeSeatUpdates(currentBooking.trip.id, false);
        } catch (error) {
          // Silently handle seat initialization errors
        }
      }
    };

    const initializeSeatsForReturnTrip = async () => {
      if (currentBooking.returnTrip?.id) {
        try {
          // Fetch available seats for return trip from seat_reservations table
          await fetchAvailableSeats(currentBooking.returnTrip.id, true);
          // Subscribe to real-time updates for return trip
          subscribeSeatUpdates(currentBooking.returnTrip.id, true);
        } catch (error) {
          // Silently handle seat initialization errors
        }
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
      // Also cleanup any temporary reservations
      if (currentBooking.trip?.id) {
        import('@/utils/realtimeSeatReservation').then(
          ({ cleanupUserTempReservations }) => {
            cleanupUserTempReservations(currentBooking.trip!.id);
          }
        );
      }
      if (currentBooking.returnTrip?.id) {
        import('@/utils/realtimeSeatReservation').then(
          ({ cleanupUserTempReservations }) => {
            cleanupUserTempReservations(currentBooking.returnTrip!.id);
          }
        );
      }
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

  // Monitor seat availability changes and notify user
  useEffect(() => {
    if (currentStep === BOOKING_STEPS.SEAT_SELECTION) {
      // Check if any selected seats are no longer available
      const checkSeatAvailability = () => {
        const unavailableSeats: string[] = [];

        localSelectedSeats.forEach(selectedSeat => {
          const currentSeat = availableSeats.find(
            s => s.id === selectedSeat.id
          );
          if (
            currentSeat &&
            !currentSeat.isAvailable &&
            !currentSeat.isCurrentUserReservation
          ) {
            unavailableSeats.push(currentSeat.number);
          }
        });

        localReturnSelectedSeats.forEach(selectedSeat => {
          const currentSeat = availableReturnSeats.find(
            s => s.id === selectedSeat.id
          );
          if (
            currentSeat &&
            !currentSeat.isAvailable &&
            !currentSeat.isCurrentUserReservation
          ) {
            unavailableSeats.push(`Return ${currentSeat.number}`);
          }
        });

        if (unavailableSeats.length > 0) {
          Alert.alert(
            'Seat Availability Changed',
            `The following seats are no longer available: ${unavailableSeats.join(', ')}. Please select different seats.`,
            [{ text: 'OK' }]
          );
        }
      };

      // Check immediately and then periodically
      checkSeatAvailability();
      const checkInterval = setInterval(checkSeatAvailability, 5000); // Check every 5 seconds

      return () => clearInterval(checkInterval);
    }
  }, [
    currentStep,
    localSelectedSeats,
    localReturnSelectedSeats,
    availableSeats,
    availableReturnSeats,
  ]);

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

        if (!pricingNoticeAccepted) {
          newErrors.pricingNotice =
            'You must acknowledge the pricing notice for locals and work permit holders';
          isValid = false;
        }
        break;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      // Additional validation before advancing to seat selection
      if (currentStep === BOOKING_STEPS.ROUTE_SELECTION) {
        // Validate departure trip hasn't departed
        if (currentBooking.trip) {
          if (
            !isTripBookable(
              currentBooking.trip.travel_date,
              currentBooking.trip.departure_time
            )
          ) {
            Alert.alert(
              'Trip No Longer Available',
              getTripUnavailableMessage(
                currentBooking.trip.travel_date,
                currentBooking.trip.departure_time
              ),
              [
                {
                  text: 'OK',
                  onPress: () => {
                    // Clear the trip selection and refresh trips
                    setTrip(null);
                    if (
                      currentBooking.route?.id &&
                      currentBooking.departureDate
                    ) {
                      fetchTrips(
                        currentBooking.route.id,
                        currentBooking.departureDate,
                        false
                      );
                    }
                  },
                },
              ]
            );
            return;
          }
        }

        // Validate return trip if round trip
        if (
          currentBooking.tripType === TRIP_TYPES.ROUND_TRIP &&
          currentBooking.returnTrip
        ) {
          if (
            !isTripBookable(
              currentBooking.returnTrip.travel_date,
              currentBooking.returnTrip.departure_time
            )
          ) {
            Alert.alert(
              'Return Trip No Longer Available',
              getTripUnavailableMessage(
                currentBooking.returnTrip.travel_date,
                currentBooking.returnTrip.departure_time
              ),
              [
                {
                  text: 'OK',
                  onPress: () => {
                    setReturnTrip(null);
                    if (
                      currentBooking.returnRoute?.id &&
                      currentBooking.returnDate
                    ) {
                      fetchTrips(
                        currentBooking.returnRoute.id,
                        currentBooking.returnDate,
                        true
                      );
                    }
                  },
                },
              ]
            );
            return;
          }
        }
      }

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
      // Final validation before creating booking - check trip hasn't departed
      if (currentBooking.trip) {
        if (
          !isTripBookable(
            currentBooking.trip.travel_date,
            currentBooking.trip.departure_time
          )
        ) {
          Alert.alert(
            'Booking Failed',
            'The selected trip has departed and is no longer available. Your booking could not be completed.',
            [
              {
                text: 'OK',
                onPress: () => {
                  // Reset to trip selection step
                  setCurrentStep(BOOKING_STEPS.ROUTE_SELECTION);
                  setTrip(null);
                },
              },
            ]
          );
          return;
        }
      }

      // Validate return trip if round trip
      if (
        currentBooking.tripType === TRIP_TYPES.ROUND_TRIP &&
        currentBooking.returnTrip
      ) {
        if (
          !isTripBookable(
            currentBooking.returnTrip.travel_date,
            currentBooking.returnTrip.departure_time
          )
        ) {
          Alert.alert(
            'Booking Failed',
            'The selected return trip has departed and is no longer available. Your booking could not be completed.',
            [
              {
                text: 'OK',
                onPress: () => {
                  // Reset to trip selection step
                  setCurrentStep(BOOKING_STEPS.ROUTE_SELECTION);
                  setReturnTrip(null);
                },
              },
            ]
          );
          return;
        }
      }

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
          setPricingNoticeAccepted(false);
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
          } catch (refreshError) {
            // Silently handle refresh errors
          }
        }

        if (currentBooking.returnTrip?.id) {
          try {
            await refreshAvailableSeatsSilently(
              currentBooking.returnTrip.id,
              true
            );
          } catch (refreshError) {
            // Silently handle refresh errors
          }
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

  // Handle seat selection with real-time reservation
  const handleSeatToggle = async (seat: Seat, isReturn: boolean = false) => {
    // Check if seat is already being processed
    if (loadingSeats.has(seat.id)) {
      return;
    }

    // Set loading state for this seat
    setLoadingSeats(prev => new Set(prev).add(seat.id));
    setSeatErrors(prev => ({ ...prev, [seat.id]: '' }));

    try {
      // Use the seat store's toggleSeatSelection which handles real-time reservations
      await useSeatStore.getState().toggleSeatSelection(seat, isReturn);

      // Clear any seat-related errors
      if (errors.seats) setErrors({ ...errors, seats: '' });
    } catch (error: any) {
      const errorMessage =
        error.message || 'Unable to select this seat. Please try again.';
      setSeatErrors(prev => ({ ...prev, [seat.id]: errorMessage }));

      // Show error message to user
      Alert.alert('Seat Selection Error', errorMessage);
    } finally {
      // Remove loading state for this seat
      setLoadingSeats(prev => {
        const newSet = new Set(prev);
        newSet.delete(seat.id);
        return newSet;
      });
    }
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
              <Pressable
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
              </Pressable>

              <Pressable
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
              </Pressable>
            </View>

            {errors.tripType ? (
              <Text style={styles.errorText}>{errors.tripType}</Text>
            ) : null}

            <CalendarDatePicker
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
              <CalendarDatePicker
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

        {/* Step 2: Island & Trip Selection */}
        {currentStep === BOOKING_STEPS.ROUTE_SELECTION && (
          <View>
            <Text style={styles.stepTitle}>Where do you want to go?</Text>

            {/* Boarding Island Selection */}
            <Dropdown
              label='From (Boarding Island)'
              items={boardingIslands.map(island => ({
                label: island.name,
                value: island.id,
              }))}
              value={currentBooking.boardingIslandId || ''}
              onChange={islandId => {
                if (!islandId) {
                  setBoardingIsland(null, null);
                  return;
                }

                const selectedIsland = boardingIslands.find(
                  i => i.id === islandId
                );
                if (selectedIsland) {
                  setBoardingIsland(selectedIsland.id, selectedIsland.name);
                  if (errors.route) setErrors({ ...errors, route: '' });
                }
              }}
              placeholder='Select boarding island'
              error={errors.route}
              searchable
              required
            />

            {/* Destination Island Selection */}
            {currentBooking.boardingIslandId && destinationIslands.length > 0 && (
              <Dropdown
                label='To (Destination Island)'
                items={destinationIslands.map(island => ({
                  label: island.name,
                  value: island.id,
                }))}
                value={currentBooking.destinationIslandId || ''}
                onChange={islandId => {
                  if (!islandId) {
                    setDestinationIsland(null, null);
                    return;
                  }

                  const selectedIsland = destinationIslands.find(
                    i => i.id === islandId
                  );
                  if (selectedIsland) {
                    setDestinationIsland(selectedIsland.id, selectedIsland.name);
                  }
                }}
                placeholder='Select destination island'
                searchable
                required
              />
            )}

            {/* Show Available Trips for Selected Segment */}
            {currentBooking.boardingIslandId &&
              currentBooking.destinationIslandId &&
              currentBooking.departureDate && (
              <>
                {loadingTripsForSegment ? (
                  <View style={styles.loadingContainer}>
                    <Text style={styles.loadingText}>
                      Finding available trips...
                    </Text>
                  </View>
                ) : availableTripsForSegment.length > 0 ? (
                  <>
                    <Text style={styles.seatSectionTitle}>
                      Available Trips ({availableTripsForSegment.length})
                    </Text>
                    <Dropdown
                      label='Select Trip'
                      items={availableTripsForSegment.map(tripData => ({
                        label: `${formatTime(tripData.departure_time)} - ${
                          tripData.vessel_name
                        } via ${tripData.route_name} - MVR ${tripData.segment_fare.toFixed(
                          2
                        )} (${tripData.available_seats} seats)`,
                        value: tripData.trip_id,
                      }))}
                      value={currentBooking.trip?.id || ''}
                      onChange={tripId => {
                        if (!tripId) {
                          setTrip(null);
                          setBoardingStop(null);
                          setDestinationStop(null);
                          if (errors.trip) setErrors({ ...errors, trip: '' });
                          return;
                        }

                        const tripData = availableTripsForSegment.find(
                          t => t.trip_id === tripId
                        );
                        if (tripData) {
                          // IMPORTANT: Set route FIRST, then trip (to avoid route resetting trip)
                          // Create a minimal route object
                          const route = {
                            id: tripData.route_id,
                            fromIsland: {
                              id: currentBooking.boardingIslandId!,
                              name: currentBooking.boardingIslandName!,
                              zone: 'A' as const,
                            },
                            toIsland: {
                              id: currentBooking.destinationIslandId!,
                              name: currentBooking.destinationIslandName!,
                              zone: 'A' as const,
                            },
                            baseFare: tripData.segment_fare,
                          };
                          setRoute(route);

                          // Set boarding and destination stops
                          setBoardingStop({
                            id: tripData.boarding_stop_id,
                            route_id: tripData.route_id,
                            island_id: currentBooking.boardingIslandId!,
                            island_name: currentBooking.boardingIslandName!,
                            stop_sequence: tripData.boarding_stop_sequence,
                            stop_type: 'pickup' as const,
                            estimated_travel_time_from_previous: null,
                            notes: null,
                            created_at: '',
                            updated_at: '',
                          });
                          setDestinationStop({
                            id: tripData.destination_stop_id,
                            route_id: tripData.route_id,
                            island_id: currentBooking.destinationIslandId!,
                            island_name: currentBooking.destinationIslandName!,
                            stop_sequence: tripData.destination_stop_sequence,
                            stop_type: 'dropoff' as const,
                            estimated_travel_time_from_previous: null,
                            notes: null,
                            created_at: '',
                            updated_at: '',
                          });

                          // Set the segment fare
                          setSegmentFare(tripData.segment_fare);

                          // Create trip object - SET THIS LAST so route doesn't reset it
                          const trip = {
                            id: tripData.trip_id,
                            route_id: tripData.route_id,
                            travel_date: tripData.travel_date,
                            departure_time: tripData.departure_time,
                            vessel_id: tripData.vessel_id,
                            vessel_name: tripData.vessel_name,
                            available_seats: tripData.available_seats,
                            is_active: tripData.is_active,
                            base_fare: tripData.segment_fare,
                            fare_multiplier: 1.0, // Already included in segment_fare
                          };
                          setTrip(trip);

                          if (errors.trip) setErrors({ ...errors, trip: '' });
                        }
                      }}
                      placeholder='Choose your trip'
                      error={errors.trip}
                      required
                    />
                  </>
                ) : (
                  <View style={styles.noTripsContainer}>
                    <Text style={styles.noTripsTitle}>No Trips Available</Text>
                    <Text style={styles.noTripsMessage}>
                      No trips available from {currentBooking.boardingIslandName} to{' '}
                      {currentBooking.destinationIslandName} on{' '}
                      {currentBooking.departureDate}. Please try a different date or
                      destination.
                    </Text>
                  </View>
                )}
              </>
            )}

            {/* Return Trip for Round Trip */}
            {currentBooking.tripType === TRIP_TYPES.ROUND_TRIP && (
              <>
                <View style={styles.sectionDivider} />
                <Text style={styles.sectionTitle}>Return Trip</Text>

                {/* Return Boarding Island */}
                <Dropdown
                  label='Return From (Boarding Island)'
                  items={boardingIslands.map(island => ({
                    label: island.name,
                    value: island.id,
                  }))}
                  value={currentBooking.returnBoardingIslandId || ''}
                  onChange={islandId => {
                    if (!islandId) {
                      setReturnBoardingIsland(null, null);
                      return;
                    }

                    const selectedIsland = boardingIslands.find(
                      i => i.id === islandId
                    );
                    if (selectedIsland) {
                      setReturnBoardingIsland(selectedIsland.id, selectedIsland.name);
                      if (errors.returnRoute) setErrors({ ...errors, returnRoute: '' });
                    }
                  }}
                  placeholder='Select return boarding island'
                  error={errors.returnRoute}
                  searchable
                  required
                />

                {/* Return Destination Island */}
                {currentBooking.returnBoardingIslandId &&
                  returnDestinationIslands.length > 0 && (
                    <Dropdown
                      label='Return To (Destination Island)'
                      items={returnDestinationIslands.map(island => ({
                        label: island.name,
                        value: island.id,
                      }))}
                      value={currentBooking.returnDestinationIslandId || ''}
                      onChange={islandId => {
                        if (!islandId) {
                          setReturnDestinationIsland(null, null);
                          return;
                        }

                        const selectedIsland = returnDestinationIslands.find(
                          i => i.id === islandId
                        );
                        if (selectedIsland) {
                          setReturnDestinationIsland(
                            selectedIsland.id,
                            selectedIsland.name
                          );
                        }
                      }}
                      placeholder='Select return destination island'
                      searchable
                      required
                    />
                  )}

                {/* Show Available Return Trips */}
                {currentBooking.returnBoardingIslandId &&
                  currentBooking.returnDestinationIslandId &&
                  currentBooking.returnDate && (
                    <>
                      {loadingTripsForSegment ? (
                        <View style={styles.loadingContainer}>
                          <Text style={styles.loadingText}>
                            Finding available return trips...
                          </Text>
                        </View>
                      ) : returnAvailableTripsForSegment.length > 0 ? (
                        <>
                          <Text style={styles.seatSectionTitle}>
                            Available Return Trips ({returnAvailableTripsForSegment.length})
                          </Text>
                          <Dropdown
                            label='Select Return Trip'
                            items={returnAvailableTripsForSegment.map(tripData => ({
                              label: `${formatTime(tripData.departure_time)} - ${
                                tripData.vessel_name
                              } via ${tripData.route_name} - MVR ${tripData.segment_fare.toFixed(
                                2
                              )} (${tripData.available_seats} seats)`,
                              value: tripData.trip_id,
                            }))}
                            value={currentBooking.returnTrip?.id || ''}
                            onChange={tripId => {
                              if (!tripId) {
                                setReturnTrip(null);
                                setReturnBoardingStop(null);
                                setReturnDestinationStop(null);
                                if (errors.returnTrip)
                                  setErrors({ ...errors, returnTrip: '' });
                                return;
                              }

                              const tripData = returnAvailableTripsForSegment.find(
                                t => t.trip_id === tripId
                              );
                              if (tripData) {
                                // IMPORTANT: Set route FIRST, then trip (to avoid route resetting trip)
                                // Create return route object
                                const route = {
                                  id: tripData.route_id,
                                  fromIsland: {
                                    id: currentBooking.returnBoardingIslandId!,
                                    name: currentBooking.returnBoardingIslandName!,
                                    zone: 'A' as const,
                                  },
                                  toIsland: {
                                    id: currentBooking.returnDestinationIslandId!,
                                    name: currentBooking.returnDestinationIslandName!,
                                    zone: 'A' as const,
                                  },
                                  baseFare: tripData.segment_fare,
                                };
                                setReturnRoute(route);

                                // Set return boarding and destination stops
                                setReturnBoardingStop({
                                  id: tripData.boarding_stop_id,
                                  route_id: tripData.route_id,
                                  island_id: currentBooking.returnBoardingIslandId!,
                                  island_name: currentBooking.returnBoardingIslandName!,
                                  stop_sequence: tripData.boarding_stop_sequence,
                                  stop_type: 'pickup' as const,
                                  estimated_travel_time_from_previous: null,
                                  notes: null,
                                  created_at: '',
                                  updated_at: '',
                                });
                                setReturnDestinationStop({
                                  id: tripData.destination_stop_id,
                                  route_id: tripData.route_id,
                                  island_id: currentBooking.returnDestinationIslandId!,
                                  island_name: currentBooking.returnDestinationIslandName!,
                                  stop_sequence: tripData.destination_stop_sequence,
                                  stop_type: 'dropoff' as const,
                                  estimated_travel_time_from_previous: null,
                                  notes: null,
                                  created_at: '',
                                  updated_at: '',
                                });

                                // Set the return segment fare
                                setReturnSegmentFare(tripData.segment_fare);

                                // Create return trip object - SET THIS LAST so route doesn't reset it
                                const trip = {
                                  id: tripData.trip_id,
                                  route_id: tripData.route_id,
                                  travel_date: tripData.travel_date,
                                  departure_time: tripData.departure_time,
                                  vessel_id: tripData.vessel_id,
                                  vessel_name: tripData.vessel_name,
                                  available_seats: tripData.available_seats,
                                  is_active: tripData.is_active,
                                  base_fare: tripData.segment_fare,
                                  fare_multiplier: 1.0,
                                };
                                setReturnTrip(trip);

                                if (errors.returnTrip)
                                  setErrors({ ...errors, returnTrip: '' });
                              }
                            }}
                            placeholder='Choose your return trip'
                            error={errors.returnTrip}
                            required
                          />
                        </>
                      ) : (
                        <View style={styles.noTripsContainer}>
                          <Text style={styles.noTripsTitle}>
                            No Return Trips Available
                          </Text>
                          <Text style={styles.noTripsMessage}>
                            No return trips available from{' '}
                            {currentBooking.returnBoardingIslandName} to{' '}
                            {currentBooking.returnDestinationIslandName} on{' '}
                            {currentBooking.returnDate}. Please try a different date or
                            destination.
                          </Text>
                        </View>
                      )}
                    </>
                  )}
              </>
            )}

            {currentBooking.trip && (
              <View style={styles.fareContainer}>
                <Text style={styles.fareLabel}>Fare per seat:</Text>
                <Text style={styles.fareValue}>
                  MVR{' '}
                  {(
                    (currentBooking.trip.base_fare || 0) *
                    (currentBooking.trip.fare_multiplier || 1.0)
                  ).toFixed(2)}
                  {currentBooking.trip.fare_multiplier !== 1.0 && (
                    <Text style={styles.fareMultiplierText}>
                      {' '}
                      (Base: MVR {currentBooking.trip.base_fare?.toFixed(
                        2
                      )} × {currentBooking.trip.fare_multiplier})
                    </Text>
                  )}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Step 3: Seat Selection */}
        {currentStep === BOOKING_STEPS.SEAT_SELECTION && (
          <View>
            <Text style={styles.stepTitle}>Select Seats</Text>

            {/* Seat status indicator removed */}

            <Text style={styles.seatSectionTitle}>Departure Seats</Text>
            <SeatSelector
              seats={availableSeats}
              selectedSeats={localSelectedSeats}
              onSeatToggle={seat => handleSeatToggle(seat, false)}
              isLoading={isLoading}
              loadingSeats={loadingSeats}
              seatErrors={seatErrors}
              maxSeats={10}
            />

            {currentBooking.tripType === TRIP_TYPES.ROUND_TRIP && (
              <>
                <Text style={styles.seatSectionTitle}>Return Seats</Text>
                <SeatSelector
                  seats={availableReturnSeats}
                  selectedSeats={localReturnSelectedSeats}
                  onSeatToggle={seat => handleSeatToggle(seat, true)}
                  isLoading={isLoading}
                  loadingSeats={loadingSeats}
                  seatErrors={seatErrors}
                  maxSeats={10}
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
                  {currentBooking.boardingStop?.island_name ||
                    currentBooking.route?.fromIsland.name}{' '}
                  →{' '}
                  {currentBooking.destinationStop?.island_name ||
                    currentBooking.route?.toIsland.name}
                </Text>
              </View>

              {currentBooking.tripType === TRIP_TYPES.ROUND_TRIP &&
                currentBooking.returnRoute && (
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Return Route:</Text>
                    <Text style={styles.summaryValue}>
                      {currentBooking.returnBoardingStop?.island_name ||
                        currentBooking.returnRoute.fromIsland.name}{' '}
                      →{' '}
                      {currentBooking.returnDestinationStop?.island_name ||
                        currentBooking.returnRoute.toIsland.name}
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
              <Pressable
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
              </Pressable>
              <Text style={styles.termsText}>
                I accept the{' '}
                <Text
                  style={styles.termsLink}
                  onPress={() => router.push('/(app)/terms-and-conditions')}
                >
                  Terms and Conditions
                </Text>
              </Text>
            </View>
            <View style={styles.termsContainer}>
              <Pressable
                style={styles.checkbox}
                onPress={() => {
                  setPricingNoticeAccepted(!pricingNoticeAccepted);
                  if (errors.pricingNotice)
                    setErrors({ ...errors, pricingNotice: '' });
                }}
              >
                <View
                  style={[
                    styles.checkboxInner,
                    pricingNoticeAccepted && styles.checkboxChecked,
                  ]}
                />
              </Pressable>
              <Text style={styles.termsText}>
                I acknowledge that the ticket prices shown are valid for locals
                and Work Permit holders only. For tourist pricing, I will
                contact the hotlines{' '}
                <Text style={styles.hotlineNumber}>3323113</Text> or{' '}
                <Text style={styles.hotlineNumber}>7892929</Text>.
              </Text>
            </View>

            {errors.pricingNotice ? (
              <Text style={styles.errorText}>{errors.pricingNotice}</Text>
            ) : null}

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
  fareMultiplierText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '400',
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
  hotlineNumber: {
    fontWeight: '700',
    color: Colors.primary,
  },
  sectionDivider: {
    height: 2,
    backgroundColor: Colors.border,
    marginVertical: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 16,
  },
});
