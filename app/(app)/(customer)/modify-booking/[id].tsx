import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  Pressable,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useUserBookingsStore, useTripStore, useSeatStore } from '@/store';
import { supabase } from '@/utils/supabase';
import { useKeyboardHandler } from '@/hooks/useKeyboardHandler';
import { useFormValidation } from '@/hooks/useFormValidation';
import { useBookingEligibility } from '@/hooks/useBookingEligibility';
import {
  tempReserveSeat,
  releaseTempSeatReservation,
  cleanupUserTempReservations,
} from '@/utils/realtimeSeatReservation';
import Colors from '@/constants/colors';
import Card from '@/components/Card';
import Input from '@/components/Input';
import Button from '@/components/Button';
import DatePicker from '@/components/DatePicker';
import SeatSelector from '@/components/SeatSelector';
import MibPaymentWebView from '@/components/MibPaymentWebView';
import { processPayment, calculateFareDifference } from '@/utils/paymentUtils';
import type { Seat } from '@/types';
import type {
  PaymentMethod,
  BankDetails,
  ModifyBookingData,
  BookingFormErrors,
} from '@/types/pages/booking';
import { getTripsForSegment } from '@/utils/segmentBookingUtils';
import { formatTimeAMPM } from '@/utils/dateUtils';
import { useAlertContext } from '@/components/AlertProvider';
import SegmentTripCard from '@/components/booking/SegmentTripCard';
import {
  isTripBookable,
  getTripUnavailableMessage,
} from '@/utils/bookingUtils';
import { ActivityIndicator } from 'react-native';

export default function ModifyBookingScreen() {
  const { id } = useLocalSearchParams();
  const scrollViewRef = useRef<ScrollView>(null);
  const { showError, showSuccess, showWarning, showConfirmation } =
    useAlertContext();

  // Store hooks
  const {
    bookings,
    modifyBooking,
    fetchUserBookings,
    isLoading: bookingsLoading,
  } = useUserBookingsStore();

  const { fetchTrips, trips, isLoading: tripLoading } = useTripStore();

  const {
    availableSeats,
    fetchAvailableSeats,
    fetchRealtimeSeatStatus,
    subscribeSeatUpdates,
    unsubscribeSeatUpdates,
    cleanupAllSeatSubscriptions,
    refreshAvailableSeatsSilently,
    isLoading: seatLoading,
  } = useSeatStore();

  // Custom hooks
  const { handleInputFocus, setInputRef } = useKeyboardHandler({
    scrollViewRef,
  });
  const { errors, setErrors, clearError, validateRequired } =
    useFormValidation();

  // State management
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTrip, setSelectedTrip] = useState<any>(null);
  const [selectedSeats, setSelectedSeats] = useState<Seat[]>([]);
  const [modificationReason, setModificationReason] = useState('');
  const [fareDifference, setFareDifference] = useState(0);
  const [tripSeatCounts, setTripSeatCounts] = useState<Record<string, number>>(
    {}
  );
  const [loadingSeats, setLoadingSeats] = useState<Set<string>>(new Set());
  const [seatErrors, setSeatErrors] = useState<Record<string, string>>({});
  const [selectedPaymentMethod, setSelectedPaymentMethod] =
    useState<PaymentMethod>('wallet');
  const [bankAccountDetails, setBankAccountDetails] = useState<BankDetails>({
    accountNumber: '',
    accountName: '',
    bankName: '',
  });
  const [localTrips, setLocalTrips] = useState<any[]>([]);
  const [localTripsLoading, setLocalTripsLoading] = useState(false);

  // MIB Payment WebView state
  const [showMibPayment, setShowMibPayment] = useState(false);
  const [currentModificationId, setCurrentModificationId] = useState('');
  const [mibSessionData, setMibSessionData] = useState<any>(null);
  const [mibBookingDetails, setMibBookingDetails] = useState<any>(null);

  // Enhanced keyboard handling
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [activeInput, setActiveInput] = useState<string | null>(null);
  const inputRefs = useRef({
    reason: null as any,
    accountNumber: null as any,
    accountName: null as any,
    bankName: null as any,
  });

  const isLoading = bookingsLoading || localTripsLoading || seatLoading;

  // Find the specific booking
  const booking =
    bookings.find((b: any) => String(b.id) === String(id)) || null;

  // Use booking eligibility hook
  const { isModifiable, message } = useBookingEligibility({ booking });

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

  // Cleanup all subscriptions and temporary reservations when component unmounts
  useEffect(() => {
    return () => {
      cleanupAllSeatSubscriptions();
      // Also cleanup any temporary reservations
      if (selectedTrip?.trip_id) {
        cleanupUserTempReservations(selectedTrip.trip_id).catch(() => {
          // Silently handle cleanup errors
        });
      }
    };
  }, []);

  // Periodic seat refresh as fallback for real-time updates
  useEffect(() => {
    if (selectedTrip?.trip_id) {
      const refreshInterval = setInterval(() => {
        // Refresh seat availability without showing loading
        refreshAvailableSeatsSilently(selectedTrip.trip_id, false).catch(() => {
          // Silently handle refresh errors
        });
      }, 30000); // Refresh every 30 seconds

      return () => clearInterval(refreshInterval);
    }
  }, [selectedTrip?.trip_id, refreshAvailableSeatsSilently]);

  // Monitor seat availability changes and notify user
  // Skip initial check to avoid false alerts for currently booked seats
  const [hasUserInteracted, setHasUserInteracted] = useState(false);

  useEffect(() => {
    if (
      selectedSeats.length > 0 &&
      availableSeats.length > 0 &&
      hasUserInteracted
    ) {
      const checkSeatAvailability = () => {
        const unavailableSeats: string[] = [];

        selectedSeats.forEach(selectedSeat => {
          const currentSeat = availableSeats.find(
            s => s.id === selectedSeat.id
          );

          // Skip if seat belongs to current booking (has booking_id matching current booking)
          // Only alert if seat is unavailable AND not reserved by current user
          if (
            currentSeat &&
            !currentSeat.isAvailable &&
            !currentSeat.isCurrentUserReservation
          ) {
            unavailableSeats.push(currentSeat.number);
          }
        });

        if (unavailableSeats.length > 0) {
          showWarning(
            'Seat Availability Changed',
            `The following seats are no longer available: ${unavailableSeats.join(', ')}. Please select different seats.`
          );
          // Remove unavailable seats from selection
          setSelectedSeats(prevSeats =>
            prevSeats.filter(seat => {
              const currentSeat = availableSeats.find(s => s.id === seat.id);
              return (
                currentSeat &&
                (currentSeat.isAvailable ||
                  currentSeat.isCurrentUserReservation)
              );
            })
          );
        }
      };

      // Don't check immediately on first render, wait a bit
      const checkInterval = setInterval(checkSeatAvailability, 5000); // Check every 5 seconds

      return () => clearInterval(checkInterval);
    }
  }, [selectedSeats, availableSeats, hasUserInteracted]);

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

  // Initialize component
  useEffect(() => {
    if (bookings.length === 0) {
      fetchUserBookings();
    }
  }, [fetchUserBookings, bookings.length]);

  // Initialize form data when booking is loaded
  useEffect(() => {
    if (booking) {
      // Format date to YYYY-MM-DD if needed
      let formattedDate = booking.departureDate;
      if (formattedDate) {
        try {
          const dateObj = new Date(formattedDate);
          if (!isNaN(dateObj.getTime())) {
            formattedDate = dateObj.toISOString().split('T')[0];
          }
        } catch (e) {
          // Silently handle date formatting errors
        }
      }
      setSelectedDate(formattedDate);
      setSelectedSeats(booking.seats || []);
      // Set default payment method based on original booking
      if (booking.payment?.method) {
        // Ensure the payment method is valid, fallback to 'wallet' if not
        const validMethods: PaymentMethod[] = [
          'bank_transfer',
          'bml',
          'mib',
          'ooredoo_m_faisa',
          'fahipay',
          'wallet',
        ];
        const method = validMethods.includes(
          booking.payment.method as PaymentMethod
        )
          ? (booking.payment.method as PaymentMethod)
          : 'wallet';
        setSelectedPaymentMethod(method);
      }
    }
  }, [booking]);

  // Fetch trips when date changes
  useEffect(() => {
    if (!selectedDate) {
      return;
    }

    if (!booking) {
      return;
    }

    if (!booking.route) {
      return;
    }

    // Helper function to get island ID from route stops or fetch by name
    const getIslandIds = async () => {
      let fromIslandId = booking.route.fromIsland?.id;
      let toIslandId = booking.route.toIsland?.id;

      // If IDs are missing, try to get them from route stops
      if ((!fromIslandId || fromIslandId === '') && booking.route.routeStops) {
        const fromIslandName = booking.route.fromIsland?.name;
        const fromStop = booking.route.routeStops.find(
          (stop: any) => stop.island?.name === fromIslandName
        );
        if (fromStop?.island?.id) {
          fromIslandId = fromStop.island.id;
        }
      }

      if ((!toIslandId || toIslandId === '') && booking.route.routeStops) {
        const toIslandName = booking.route.toIsland?.name;
        const toStop = booking.route.routeStops.find(
          (stop: any) => stop.island?.name === toIslandName
        );
        if (toStop?.island?.id) {
          toIslandId = toStop.island.id;
        }
      }

      // If still missing, fetch by name from database
      if (
        (!fromIslandId || fromIslandId === '') &&
        booking.route.fromIsland?.name
      ) {
        const { data: island } = await supabase
          .from('islands')
          .select('id')
          .eq('name', booking.route.fromIsland.name)
          .single();
        if (island?.id) {
          fromIslandId = island.id;
        }
      }

      if ((!toIslandId || toIslandId === '') && booking.route.toIsland?.name) {
        const { data: island } = await supabase
          .from('islands')
          .select('id')
          .eq('name', booking.route.toIsland.name)
          .single();
        if (island?.id) {
          toIslandId = island.id;
        }
      }

      return { fromIslandId, toIslandId };
    };

    // Fetch island IDs and then trips
    getIslandIds()
      .then(({ fromIslandId, toIslandId }) => {
        if (!fromIslandId || !toIslandId) {
          showError(
            'Error',
            'Could not determine route information. Please contact support.'
          );
          return;
        }

        setLocalTripsLoading(true);
        return getTripsForSegment(fromIslandId, toIslandId, selectedDate);
      })
      .then((fetchedTrips: any[] | null | undefined) => {
        if (!fetchedTrips || fetchedTrips.length === 0) {
          // Error already handled above or no trips found
          setLocalTripsLoading(false);
          setLocalTrips([]);
          return;
        }
        // Filter out trips that have already departed
        const futureTrips = fetchedTrips.filter(trip =>
          isTripBookable(trip.travel_date, trip.departure_time)
        );

        // If all trips were filtered out, show all trips anyway for debugging
        // (or if user wants to see past trips for reference)
        const tripsToShow = futureTrips.length > 0 ? futureTrips : fetchedTrips;
        setLocalTrips(tripsToShow);

        // Populate seat counts from the fetched trips
        const seatCounts: Record<string, number> = {};
        tripsToShow.forEach(trip => {
          seatCounts[trip.trip_id] = trip.available_seats_for_segment || 0;
        });
        setTripSeatCounts(seatCounts);
        setSelectedTrip(null);
        setSelectedSeats([]);
        setLocalTripsLoading(false);
      })
      .catch((error: any) => {
        setLocalTrips([]);
        setLocalTripsLoading(false);
        showError(
          'Error',
          `Failed to load trips: ${error?.message || 'Please try again.'}`
        );
      });
  }, [selectedDate, booking, showError]);

  // Fetch seats when trip is selected
  useEffect(() => {
    const initializeSeatsForTrip = async () => {
      if (selectedTrip?.trip_id) {
        // Reset interaction flag when trip changes to prevent false alerts
        setHasUserInteracted(false);

        try {
          // Use real-time seat status fetching
          await fetchRealtimeSeatStatus(selectedTrip.trip_id, false);
          // Subscribe to real-time updates for this trip
          subscribeSeatUpdates(selectedTrip.trip_id, false);
          // Also fetch trip seat availability for display
          fetchTripSeatAvailability(selectedTrip.trip_id);
        } catch (error) {
          // Silently handle seat initialization errors
        }
      }
    };

    initializeSeatsForTrip();

    // Cleanup subscriptions when trip changes
    return () => {
      if (selectedTrip?.trip_id) {
        unsubscribeSeatUpdates(selectedTrip.trip_id);
      }
    };
  }, [
    selectedTrip?.trip_id,
    fetchRealtimeSeatStatus,
    subscribeSeatUpdates,
    unsubscribeSeatUpdates,
  ]);

  // Calculate fare difference when trip changes
  useEffect(() => {
    if (selectedTrip && booking && booking.passengers) {
      // Calculate fare using segment_fare (already includes fare_multiplier consideration)
      const newFarePerSeat = selectedTrip.segment_fare || 0;
      const newTotalFare = newFarePerSeat * booking.passengers.length;
      const difference = calculateFareDifference(
        booking.totalFare,
        newTotalFare
      );
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
        return;
      }

      const availableCount =
        seatReservations?.filter(
          (seat: any) => seat.is_available && !seat.booking_id
        ).length || 0;

      setTripSeatCounts(prev => ({ ...prev, [tripId]: availableCount }));
    } catch (error) {
      // Silently handle seat availability fetch errors
    }
  };

  const handleSeatToggle = async (seat: Seat) => {
    // Mark that user has started interacting (enable availability monitoring)
    setHasUserInteracted(true);

    // Check if seat is already being processed
    if (loadingSeats.has(seat.id)) {
      return;
    }

    // Check if seat is temporarily reserved by another user
    if (seat.isTempReserved && !seat.isCurrentUserReservation) {
      showWarning(
        'Seat Unavailable',
        'This seat is temporarily reserved by another user. Please select a different seat.'
      );
      return;
    }

    // Set loading state for this seat
    setLoadingSeats(prev => new Set(prev).add(seat.id));
    setSeatErrors(prev => ({ ...prev, [seat.id]: '' }));

    try {
      const isSelected = selectedSeats.some(s => s.id === seat.id);
      const tripId = selectedTrip?.trip_id;

      if (!tripId) {
        throw new Error('No trip selected');
      }

      if (isSelected) {
        // Release the temporary reservation
        const result = await releaseTempSeatReservation(tripId, seat.id);
        if (result.success) {
          setSelectedSeats(prevSeats =>
            prevSeats.filter(s => s.id !== seat.id)
          );
          // Refresh seat status to show updated availability
          await fetchRealtimeSeatStatus(tripId, false);
        } else {
          throw new Error(
            result.message || 'Failed to release seat reservation'
          );
        }
      } else {
        // Check max seats limit
        if (selectedSeats.length >= (booking?.passengers?.length || 0)) {
          showWarning(
            'Maximum Seats Selected',
            `You can only select ${booking?.passengers?.length || 0} seat(s) for this booking.`
          );
          return;
        }

        // Double-check availability at selection time
        if (!seat.isAvailable && !seat.isCurrentUserReservation) {
          throw new Error('This seat is no longer available');
        }

        // Try to temporarily reserve the seat
        const result = await tempReserveSeat(tripId, seat.id, 10); // 10 minute expiry
        if (result.success) {
          setSelectedSeats(prevSeats => [
            ...prevSeats,
            { ...seat, isSelected: true },
          ]);
          // Refresh seat status to show updated availability
          await fetchRealtimeSeatStatus(tripId, false);
        } else {
          throw new Error(result.message || 'Unable to reserve this seat');
        }
      }

      clearError('seats');
    } catch (error: any) {
      const errorMessage =
        error.message || 'Failed to select seat. Please try again.';
      setSeatErrors(prev => ({ ...prev, [seat.id]: errorMessage }));

      showError('Seat Selection Error', errorMessage);

      // Refresh seat availability to show current status
      if (selectedTrip?.trip_id) {
        try {
          await fetchRealtimeSeatStatus(selectedTrip.trip_id, false);
        } catch (refreshError) {
          // Silently handle refresh errors
        }
      }
    } finally {
      // Remove loading state for this seat
      setLoadingSeats(prev => {
        const newSet = new Set(prev);
        newSet.delete(seat.id);
        return newSet;
      });
    }
  };

  const validateForm = () => {
    let isValid = true;
    const newErrors: BookingFormErrors = {};

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

    const reasonError = validateRequired(
      modificationReason,
      'Modification reason'
    );
    if (reasonError) {
      newErrors.reason = reasonError;
      isValid = false;
    }

    // Validate payment details for refunds
    if (fareDifference < 0 && selectedPaymentMethod === 'bank_transfer') {
      const accountNumberError = validateRequired(
        bankAccountDetails.accountNumber,
        'Account number'
      );
      if (accountNumberError) {
        newErrors.accountNumber = accountNumberError;
        isValid = false;
      }

      const accountNameError = validateRequired(
        bankAccountDetails.accountName,
        'Account name'
      );
      if (accountNameError) {
        newErrors.accountName = accountNameError;
        isValid = false;
      }

      const bankNameError = validateRequired(
        bankAccountDetails.bankName,
        'Bank name'
      );
      if (bankNameError) {
        newErrors.bankName = bankNameError;
        isValid = false;
      }
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleModify = async () => {
    if (!isModifiable) {
      showWarning(
        'Cannot Modify',
        message || 'This booking cannot be modified'
      );
      return;
    }

    if (!validateForm()) {
      return;
    }

    try {
      if (!booking) {
        throw new Error('Booking not found');
      }

      const modificationData: ModifyBookingData = {
        newTripId: selectedTrip.trip_id,
        newDate: selectedDate,
        selectedSeats,
        modificationReason,
        fareDifference,
        paymentMethod: selectedPaymentMethod,
        bankAccountDetails: fareDifference < 0 ? bankAccountDetails : null,
      };

      const modificationResult = await modifyBooking(
        booking.id,
        modificationData
      );

      // Cleanup temporary seat reservations after modification is processed
      if (selectedTrip?.trip_id) {
        try {
          await cleanupUserTempReservations(selectedTrip.trip_id);
        } catch (cleanupError) {
          // Silently handle cleanup errors (non-critical)
        }
      }

      if (fareDifference > 0) {
        // Additional payment required
        if (selectedPaymentMethod === 'mib') {
          // Handle MIB payment differently - show payment modal immediately
          const bookingDetails = {
            bookingNumber:
              modificationResult.newBookingNumber || `MOD-${Date.now()}`,
            route: `${booking.route.fromIsland.name} → ${booking.route.toIsland.name}`,
            travelDate: selectedDate || booking.departureDate,
            amount: fareDifference,
            currency: 'MVR',
            passengerCount: booking.passengers.length,
          };

          // Show modal immediately with booking details
          setCurrentModificationId(modificationResult.newBookingId);
          setMibBookingDetails(bookingDetails);
          setShowMibPayment(true);
        } else {
          // For other payment methods, show the existing alert
          showConfirmation(
            'Booking Modified',
            `Your booking has been modified successfully. An additional payment of MVR ${fareDifference.toFixed(2)} is required.`,
            async () => {
              await processPayment(
                selectedPaymentMethod,
                fareDifference,
                modificationResult.newBookingId
              );
              router.replace('/(app)/(customer)/(tabs)/bookings');
            },
            () => {
              router.replace('/(app)/(customer)/(tabs)/bookings');
            }
          );
        }
      } else if (fareDifference < 0) {
        // Refund scenario - check if refund was processed or needs manual handling
        let refundMessage = '';

        if (booking.payment?.method === 'mib') {
          // For MIB payments, check if automatic refund was successful
          // The modification result might include refund status
          const refundStatus = (modificationResult as any)?.refundStatus;

          if (refundStatus === 'completed') {
            refundMessage = `Your booking has been modified successfully. A refund of MVR ${Math.abs(fareDifference).toFixed(2)} has been processed via MIB and will be reflected in your account within 3-5 business days.`;
          } else if (
            refundStatus === 'pending_manual' ||
            refundStatus === 'failed'
          ) {
            refundMessage = `Your booking has been modified successfully. However, the automatic refund of MVR ${Math.abs(fareDifference).toFixed(2)} could not be processed. Our team will manually process your refund within 3-5 business days. You will receive a confirmation email once completed.`;
          } else {
            // Default message if status is unclear
            refundMessage = `Your booking has been modified successfully. A refund of MVR ${Math.abs(fareDifference).toFixed(2)} has been initiated via MIB. If you do not see the refund within 5 business days, please contact our support team.`;
          }
        } else {
          refundMessage = `Your booking has been modified successfully. A refund of MVR ${Math.abs(fareDifference).toFixed(2)} will be processed within 72 hours.`;
        }

        showSuccess('Booking Modified', refundMessage, () => {
          router.replace('/(app)/(customer)/(tabs)/bookings');
        });
      } else {
        // No fare difference
        showSuccess(
          'Booking Modified',
          'Your booking has been modified successfully. No additional payment or refund is required.',
          () => {
            router.replace('/(app)/(customer)/(tabs)/bookings');
          }
        );
      }
    } catch (error) {
      showError('Error', 'Failed to modify booking. Please try again.');
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
          title='Go Back'
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
        keyboardShouldPersistTaps='handled'
      >
        {/* Current Booking Details */}
        <Card variant='elevated' style={styles.bookingCard}>
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
              {new Date(booking.departureDate).toLocaleDateString('en-GB')}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Current Time:</Text>
            <Text style={styles.detailValue}>
              {formatTimeAMPM(booking.departureTime)}
            </Text>
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
            <Text style={styles.detailValue}>
              MVR {booking.totalFare.toFixed(2)}
            </Text>
          </View>
        </Card>

        {/* Modification Form */}
        <Card variant='elevated' style={styles.modifyCard}>
          <Text style={styles.cardTitle}>Modify Booking</Text>

          <DatePicker
            label='New Travel Date'
            value={selectedDate}
            onChange={date => {
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
          {selectedDate && (
            <View style={styles.tripSelection}>
              <Text style={styles.sectionTitle}>Select New Trip</Text>

              {localTripsLoading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size='large' color={Colors.primary} />
                  <Text style={styles.loadingText}>
                    Finding available trips...
                  </Text>
                </View>
              ) : localTrips.length > 0 ? (
                <View style={styles.tripsList}>
                  {localTrips.map(trip => (
                    <SegmentTripCard
                      key={trip.trip_id}
                      trip={trip}
                      selected={selectedTrip?.trip_id === trip.trip_id}
                      onPress={() => {
                        // Validate trip hasn't departed
                        if (
                          !isTripBookable(trip.travel_date, trip.departure_time)
                        ) {
                          showWarning(
                            'Trip Unavailable',
                            getTripUnavailableMessage(
                              trip.travel_date,
                              trip.departure_time
                            )
                          );
                          return;
                        }
                        setSelectedTrip(trip);
                        setSelectedSeats([]);
                        if (errors.trip) setErrors({ ...errors, trip: '' });
                      }}
                    />
                  ))}
                </View>
              ) : selectedDate ? (
                <View style={styles.noTripsContainer}>
                  <Text style={styles.noTripsTitle}>No Trips Available</Text>
                  <Text style={styles.noTripsText}>
                    No trips available for this route on{' '}
                    {new Date(selectedDate).toLocaleDateString()}.{'\n\n'}
                    Please try selecting a different date.
                  </Text>
                </View>
              ) : null}

              {errors.trip ? (
                <Text style={styles.errorText}>{errors.trip}</Text>
              ) : null}
            </View>
          )}

          {/* Seat Selection */}
          <Text style={styles.seatSectionTitle}>
            Select New Seats ({selectedSeats.length}/{booking.passengers.length}
            )
          </Text>
          {!selectedTrip ? (
            <Text style={styles.noSeatsText}>Please select a trip first</Text>
          ) : isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size='small' color={Colors.primary} />
              <Text style={styles.loadingText}>Loading available seats...</Text>
            </View>
          ) : availableSeats.length > 0 ? (
            <SeatSelector
              seats={availableSeats}
              selectedSeats={selectedSeats}
              onSeatToggle={handleSeatToggle}
              maxSeats={booking.passengers.length}
              isLoading={seatLoading}
              loadingSeats={loadingSeats}
              seatErrors={seatErrors}
            />
          ) : (
            <Text style={styles.noSeatsText}>
              No seats available for this trip
            </Text>
          )}
          {errors.seats ? (
            <Text style={styles.errorText}>{errors.seats}</Text>
          ) : null}

          {/* Modification Reason */}
          <View
            style={styles.reasonContainer}
            ref={ref => {
              inputRefs.current.reason = ref;
            }}
          >
            <Input
              label='Reason for Modification'
              placeholder='Please provide a reason for this modification'
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
              required
            />
          </View>
        </Card>

        {/* Fare Difference and Payment Options */}
        {selectedTrip && (
          <Card variant='elevated' style={styles.fareDifferenceContainer}>
            <Text style={styles.fareDifferenceTitle}>
              Fare Difference & Payment
            </Text>

            <View style={styles.fareRow}>
              <View style={styles.fareColumn}>
                <Text style={styles.fareLabel}>Current Fare</Text>
                <Text style={styles.fareValue}>
                  MVR {booking.totalFare.toFixed(2)}
                </Text>
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
              <Text
                style={[
                  styles.differenceValue,
                  fareDifference > 0
                    ? styles.additionalPayment
                    : styles.refundAmount,
                ]}
              >
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
                  {fareDifference > 0 && (
                    <Pressable
                      style={[
                        styles.paymentOption,
                        selectedPaymentMethod === 'mib' &&
                          styles.paymentOptionSelected,
                      ]}
                      onPress={() => setSelectedPaymentMethod('mib')}
                    >
                      <Text
                        style={[
                          styles.paymentOptionText,
                          selectedPaymentMethod === 'mib' &&
                            styles.paymentOptionTextSelected,
                        ]}
                      >
                        MIB Payment
                      </Text>
                    </Pressable>
                  )}

                  {/* <Pressable
                    style={[
                      styles.paymentOption,
                      selectedPaymentMethod === 'wallet' &&
                        styles.paymentOptionSelected,
                    ]}
                    onPress={() => setSelectedPaymentMethod('wallet')}
                  >
                    <Text
                      style={[
                        styles.paymentOptionText,
                        selectedPaymentMethod === 'wallet' &&
                          styles.paymentOptionTextSelected,
                      ]}
                    >
                      {fareDifference > 0
                        ? 'Online Payment'
                        : 'Original Method'}
                    </Text>
                  </Pressable>

                  <Pressable
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
                      Bank Transfer
                    </Text>
                  </Pressable> */}
                </View>
              </View>
            )}

            {/* Bank Account Details for Refunds */}
            {fareDifference < 0 &&
              selectedPaymentMethod === 'bank_transfer' && (
                <View style={styles.bankDetailsContainer}>
                  <Text style={styles.bankDetailsTitle}>
                    Bank Account Details for Refund
                  </Text>

                  <View
                    ref={ref => {
                      inputRefs.current.accountNumber = ref;
                    }}
                  >
                    <Input
                      label='Account Number'
                      placeholder='Enter your bank account number'
                      value={bankAccountDetails.accountNumber}
                      onChangeText={text => {
                        setBankAccountDetails({
                          ...bankAccountDetails,
                          accountNumber: text,
                        });
                        if (errors.accountNumber)
                          setErrors({ ...errors, accountNumber: '' });
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
                      inputRefs.current.accountName = ref;
                    }}
                  >
                    <Input
                      label='Account Holder Name'
                      placeholder='Enter account holder name'
                      value={bankAccountDetails.accountName}
                      onChangeText={text => {
                        setBankAccountDetails({
                          ...bankAccountDetails,
                          accountName: text,
                        });
                        if (errors.accountName)
                          setErrors({ ...errors, accountName: '' });
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
                      inputRefs.current.bankName = ref;
                    }}
                  >
                    <Input
                      label='Bank Name'
                      placeholder='Enter bank name'
                      value={bankAccountDetails.bankName}
                      onChangeText={text => {
                        setBankAccountDetails({
                          ...bankAccountDetails,
                          bankName: text,
                        });
                        if (errors.bankName)
                          setErrors({ ...errors, bankName: '' });
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
                ? 'Additional payment will be required'
                : fareDifference < 0
                  ? 'Refund will be processed within 72 hours'
                  : 'No additional payment or refund required'}
            </Text>
          </Card>
        )}

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <Button
            title='Cancel'
            onPress={() => router.back()}
            variant='outline'
            style={styles.cancelButton}
          />

          <Button
            title='Confirm'
            onPress={handleModify}
            loading={isLoading}
            disabled={isLoading}
            style={styles.confirmButton}
          />
        </View>
      </ScrollView>

      {/* MIB Payment WebView */}
      {showMibPayment && mibBookingDetails && currentModificationId && (
        <MibPaymentWebView
          visible={showMibPayment}
          bookingDetails={mibBookingDetails}
          bookingId={currentModificationId}
          sessionData={mibSessionData}
          onClose={() => {
            setShowMibPayment(false);
            setCurrentModificationId('');
            setMibSessionData(null);
            setMibBookingDetails(null);
          }}
          onSuccess={result => {
            // Close the modal first
            setShowMibPayment(false);
            setCurrentModificationId('');
            setMibSessionData(null);
            setMibBookingDetails(null);

            // Navigate to payment success page with modification success
            router.push({
              pathname: '/(app)/(customer)/payment-success',
              params: {
                bookingId: currentModificationId,
                result: 'SUCCESS',
                sessionId: result.sessionId,
                resetBooking: 'false', // Don't reset booking for modifications
                isModification: 'true', // Flag to indicate this is a modification
              },
            });
          }}
          onFailure={error => {
            // Close the modal first
            setShowMibPayment(false);
            setCurrentModificationId('');
            setMibSessionData(null);
            setMibBookingDetails(null);

            // Navigate to payment success page with failure status
            // The new booking will be cancelled, old booking remains unchanged
            router.push({
              pathname: '/(app)/(customer)/payment-success',
              params: {
                bookingId: currentModificationId,
                result: 'FAILURE',
                resetBooking: 'false',
                isModification: 'true',
              },
            });
          }}
          onCancel={() => {
            // Close the modal first
            setShowMibPayment(false);
            setCurrentModificationId('');
            setMibSessionData(null);
            setMibBookingDetails(null);

            // Navigate to payment success page with cancelled status
            // The new booking will be cancelled, old booking remains unchanged
            router.push({
              pathname: '/(app)/(customer)/payment-success',
              params: {
                bookingId: currentModificationId,
                result: 'CANCELLED',
                resetBooking: 'false',
                isModification: 'true',
              },
            });
          }}
        />
      )}
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
    marginBottom: 12,
  },
  tripsList: {
    gap: 12,
  },
  loadingContainer: {
    padding: 32,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: Colors.textSecondary,
  },
  noTripsContainer: {
    padding: 24,
    backgroundColor: Colors.highlight,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 16,
  },
  noTripsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  noTripsText: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
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
  noSeatsText: {
    fontSize: 14,
    color: Colors.error,
    textAlign: 'center',
    padding: 20,
    fontStyle: 'italic',
  },
});
