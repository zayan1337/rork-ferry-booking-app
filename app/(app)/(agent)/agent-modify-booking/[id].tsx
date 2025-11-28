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
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useAgentStore } from '@/store/agent/agentStore';
import { useSeatStore } from '@/store/seatStore';
import {
  CurrentTicketDetailsCard,
  FareCalculationCard,
  PaymentMethodSelector,
  ModificationReasonForm,
} from '@/components/booking';
import CalendarDatePicker from '@/components/CalendarDatePicker';
import SeatSelector from '@/components/SeatSelector';
import Button from '@/components/Button';
import Card from '@/components/Card';
import MibPaymentWebView from '@/components/MibPaymentWebView';
import {
  calculateDiscountedFare,
  isTripBookable,
  getTripUnavailableMessage,
} from '@/utils/bookingUtils';
import { usePaymentSessionStore } from '@/store/paymentSessionStore';
import { BUFFER_MINUTES_PAYMENT_WINDOW } from '@/constants/customer';
import { getMinutesUntilDeparture } from '@/utils/bookingUtils';
import {
  calculateBookingExpiry,
  combineTripDateTime,
} from '@/utils/bookingExpiryUtils';
import { formatCurrency } from '@/utils/agentFormatters';
import Colors from '@/constants/colors';
import { Seat } from '@/types';
import { useAlertContext } from '@/components/AlertProvider';
import { useBookingEligibility } from '@/hooks/useBookingEligibility';
import { getTripsForSegment } from '@/utils/segmentBookingUtils';
import SegmentTripCard from '@/components/booking/SegmentTripCard';
import { supabase } from '@/utils/supabase';
import { AlertCircle } from 'lucide-react-native';

type PaymentMethod = 'agent_credit' | 'mib';

export default function AgentModifyBookingScreen() {
  const { showSuccess, showError, showInfo } = useAlertContext();
  const { id, ticketType } = useLocalSearchParams<{
    id?: string | string[];
    ticketType?: string | string[];
  }>();
  const router = useRouter();
  const scrollViewRef = useRef<ScrollView>(null);

  // Enhanced keyboard handling
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [activeInput, setActiveInput] = useState<string | null>(null);
  const inputRefs = useRef({
    reason: null as any,
    agentNotes: null as any,
  });

  // Store management
  const {
    bookings,
    modifyBooking,
    isLoading: agentLoading,
    agent,
  } = useAgentStore();

  const {
    availableSeats,
    fetchAvailableSeats,
    fetchRealtimeSeatStatus,
    subscribeSeatUpdates,
    unsubscribeSeatUpdates,
    cleanupAllSeatSubscriptions,
    toggleSeatSelection: toggleSeatSelectionStore,
    isLoading: seatLoading,
  } = useSeatStore();

  // Local trips state for segment-based booking
  const [localTrips, setLocalTrips] = useState<any[]>([]);
  const [localTripsLoading, setLocalTripsLoading] = useState(false);

  const normalizedTicketType = Array.isArray(ticketType)
    ? ticketType[0]
    : ticketType;
  const [activeTicketType, setActiveTicketType] = useState<
    'departure' | 'return'
  >(normalizedTicketType === 'return' ? 'return' : 'departure');
  const isModifyingReturn = activeTicketType === 'return';
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
  const [tripSeatCounts, setTripSeatCounts] = useState<Record<string, number>>(
    {}
  );
  const [isModifying, setIsModifying] = useState(false);
  const [agentDiscountRate, setAgentDiscountRate] = useState(0);
  const [newTotalFare, setNewTotalFare] = useState(0); // Fare with multiplier, before discount
  const [discountedFare, setDiscountedFare] = useState(0);
  const [errors, setErrors] = useState({
    date: '',
    seats: '',
    reason: '',
    trip: '',
    paymentMethod: '',
  });

  // MIB payment states
  const [showMibPayment, setShowMibPayment] = useState(false);
  const [mibBookingDetails, setMibBookingDetails] = useState<any>(null);
  const [modifiedBookingId, setModifiedBookingId] = useState<string | null>(
    null
  );

  // Payment session management
  const setPaymentSession = usePaymentSessionStore(state => state.setSession);
  const clearPaymentSession = usePaymentSessionStore(
    state => state.clearSession
  );
  const updatePaymentSession = usePaymentSessionStore(
    state => state.updateSession
  );

  // Find the booking by id
  const booking = bookings.find((b: any) => b.id === id);
  const bookingData = booking as any;
  const eligibilityBooking = booking
    ? {
        status: booking.status,
        departureDate: booking.departureDate,
      }
    : null;

  const { isModifiable, message: eligibilityMessage } = useBookingEligibility({
    booking: eligibilityBooking as any,
  });

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
      const currentSeats = isModifyingReturn
        ? (booking as any)?.returnSeats
        : booking.seats;

      setNewDate(currentDate || null);
      setSelectedSeats(
        currentSeats?.map((seat: any) => ({
          ...seat,
          isAvailable: true,
        })) || []
      );
      setSelectedTrip(null);
    }
  }, [booking, isModifyingReturn]);

  // Initialize agent discount rate
  useEffect(() => {
    if (agent?.discountRate) {
      setAgentDiscountRate(Number(agent.discountRate) || 0);
    }
  }, [agent]);

  // Calculate fare difference when trip or seats change
  useEffect(() => {
    if (selectedTrip && booking) {
      const currentPaidFare =
        Number(booking.discountedAmount) || Number(booking.totalAmount) || 0;
      const passengerCount =
        selectedSeats.length ||
        booking.passengers?.length ||
        booking.passengerCount ||
        1;

      // Calculate fare using segment_fare (already includes fare_multiplier consideration)
      const newFarePerSeat = selectedTrip.segment_fare || 0;
      const calculatedNewTotalFare = newFarePerSeat * passengerCount;

      setNewTotalFare(calculatedNewTotalFare); // Store total fare with multiplier

      const discountCalculation = calculateDiscountedFare(
        calculatedNewTotalFare,
        agentDiscountRate
      );
      setDiscountedFare(discountCalculation.discountedFare);

      const difference = discountCalculation.discountedFare - currentPaidFare;
      setFareDifference(difference);
    }
  }, [selectedTrip, selectedSeats.length, booking, agentDiscountRate]);

  // Fetch trips when date changes (island-based segment fetching)
  useEffect(() => {
    if (!newDate || !booking) {
      return;
    }

    const route = bookingData?.route;

    if (!route) {
      return;
    }

    const getIslandIds = async () => {
      const segmentEntry = Array.isArray(bookingData?.booking_segments)
        ? bookingData.booking_segments[0]
        : bookingData?.booking_segments || null;

      const routeStops =
        route?.routeStops ||
        route?.route_stops ||
        bookingData?.trip?.route?.routeStops ||
        bookingData?.trip?.route?.route_stops ||
        [];

      const normalizeName = (name?: string | null) =>
        name?.trim().toLowerCase() || '';

      const getSegmentIslandId = (stop: any) => {
        if (!stop) return null;
        if (typeof stop === 'string') return stop;
        if (stop.island?.id) return stop.island.id;
        if (stop.island_id) return stop.island_id;
        if (stop.islands) {
          if (Array.isArray(stop.islands)) {
            return stop.islands[0]?.id || null;
          }
          return stop.islands.id || null;
        }
        if (stop.islandId) return stop.islandId;
        return null;
      };

      const bookingPickupName = isModifyingReturn
        ? bookingData?.returnPickupName || bookingData?.origin
        : bookingData?.pickupName || bookingData?.origin;
      const bookingDropoffName = isModifyingReturn
        ? bookingData?.returnDropoffName || bookingData?.destination
        : bookingData?.dropoffName || bookingData?.destination;

      let fromIslandId =
        getSegmentIslandId(segmentEntry?.boarding_stop) || null;
      let toIslandId =
        getSegmentIslandId(segmentEntry?.destination_stop) || null;

      const preferredFromName = bookingPickupName || route.fromIsland?.name;
      const preferredToName = bookingDropoffName || route.toIsland?.name;

      const findStopIdByName = (name?: string | null) => {
        if (!name) return null;
        const normalized = normalizeName(name);
        if (!normalized || !routeStops?.length) return null;
        const match = routeStops.find((stop: any) => {
          const stopName =
            stop.island?.name ||
            stop?.island_name ||
            stop?.island?.island_name ||
            '';
          return normalizeName(stopName) === normalized;
        });
        if (match?.island?.id) return match.island.id;
        if (match?.island_id) return match.island_id;
        if (match?.island?.island_id) return match.island.island_id;
        return null;
      };

      if ((!fromIslandId || fromIslandId === '') && routeStops?.length) {
        const fromStop = findStopIdByName(preferredFromName);
        if (fromStop) {
          fromIslandId = fromStop;
        }
      }

      if ((!toIslandId || toIslandId === '') && routeStops?.length) {
        const toStop = findStopIdByName(preferredToName);
        if (toStop) {
          toIslandId = toStop;
        }
      }

      if ((!fromIslandId || fromIslandId === '') && bookingPickupName) {
        const { data: island } = await supabase
          .from('islands')
          .select('id')
          .eq('name', bookingPickupName)
          .single();
        if (island?.id) {
          fromIslandId = island.id;
        }
      }

      if (
        (!toIslandId || toIslandId === '') &&
        bookingDropoffName &&
        bookingDropoffName.trim() !== ''
      ) {
        const { data: island } = await supabase
          .from('islands')
          .select('id')
          .eq('name', bookingDropoffName)
          .single();
        if (island?.id) {
          toIslandId = island.id;
        }
      }

      if ((!fromIslandId || fromIslandId === '') && route.fromIsland?.name) {
        const { data: island } = await supabase
          .from('islands')
          .select('id')
          .eq('name', route.fromIsland.name)
          .single();
        if (island?.id) {
          fromIslandId = island.id;
        }
      }

      if ((!toIslandId || toIslandId === '') && route.toIsland?.name) {
        const { data: island } = await supabase
          .from('islands')
          .select('id')
          .eq('name', route.toIsland.name)
          .single();
        if (island?.id) {
          toIslandId = island.id;
        }
      }

      return { fromIslandId, toIslandId };
    };

    getIslandIds()
      .then(ids => {
        if (!ids) {
          showError(
            'Error',
            'Could not determine route information. Please contact support.'
          );
          return null;
        }

        const { fromIslandId, toIslandId } = ids;
        if (!fromIslandId || !toIslandId) {
          showError(
            'Error',
            'Could not determine route information. Please contact support.'
          );
          return null;
        }

        setLocalTripsLoading(true);
        return getTripsForSegment(fromIslandId, toIslandId, newDate);
      })
      .then((fetchedTrips: any[] | null | undefined) => {
        if (!fetchedTrips || fetchedTrips.length === 0) {
          setLocalTrips([]);
          setTripSeatCounts({});
          setLocalTripsLoading(false);
          return;
        }

        const futureTrips = fetchedTrips.filter(trip =>
          isTripBookable(trip.travel_date, trip.departure_time)
        );

        const tripsToShow = futureTrips.length > 0 ? futureTrips : fetchedTrips;
        setLocalTrips(tripsToShow);

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
        setTripSeatCounts({});
        setLocalTripsLoading(false);
        showError(
          'Error',
          `Failed to load trips: ${error?.message || 'Please try again.'}`
        );
      });
  }, [newDate, booking, showError, isModifyingReturn]);

  // Fetch seats and subscribe to real-time updates when trip changes
  useEffect(() => {
    if (selectedTrip?.trip_id) {
      const initializeSeatsForTrip = async () => {
        try {
          // Use real-time seat status fetching
          await fetchRealtimeSeatStatus(selectedTrip.trip_id, false);
          // Subscribe to real-time updates for this trip
          subscribeSeatUpdates(selectedTrip.trip_id, false);
        } catch (error) {
          // Fallback to regular fetch if real-time fails
          console.warn('Real-time seat fetch failed, using fallback:', error);
          await fetchAvailableSeats(selectedTrip.trip_id);
        }
      };

      initializeSeatsForTrip();

      // Cleanup subscriptions when trip changes
      return () => {
        unsubscribeSeatUpdates(selectedTrip.trip_id);
      };
    }
  }, [
    selectedTrip?.trip_id,
    fetchAvailableSeats,
    fetchRealtimeSeatStatus,
    subscribeSeatUpdates,
    unsubscribeSeatUpdates,
  ]);

  // Cleanup all subscriptions when component unmounts
  useEffect(() => {
    return () => {
      cleanupAllSeatSubscriptions();
    };
  }, [cleanupAllSeatSubscriptions]);

  // Sync selected seats from store when available seats update
  useEffect(() => {
    if (availableSeats && availableSeats.length > 0) {
      const selectedFromStore = availableSeats.filter(
        s => s.isSelected || s.isCurrentUserReservation
      );
      // Only update if there are selected seats in store and they differ from local state
      if (selectedFromStore.length > 0) {
        const localSelectedIds = new Set(selectedSeats.map(s => s.id));
        const storeSelectedIds = new Set(selectedFromStore.map(s => s.id));

        // Check if they differ
        if (
          localSelectedIds.size !== storeSelectedIds.size ||
          ![...localSelectedIds].every(id => storeSelectedIds.has(id))
        ) {
          setSelectedSeats(selectedFromStore);
        }
      }
    }
  }, [availableSeats]);

  const toggleSeatSelection = async (seat: Seat) => {
    if (!selectedTrip?.trip_id) {
      showError('Error', 'Please select a trip first');
      return;
    }

    // Check if trying to select a disabled/accessible seat
    const isDisabledSeat = seat.isDisabled || seat.seatType === 'disabled';

    if (isDisabledSeat) {
      // Get current seats from booking (departure or return based on what we're modifying)
      const currentSeats = isModifyingReturn
        ? (bookingData?.returnSeats as any[]) || []
        : booking?.seats || [];

      // Check if user already has a disabled seat in their current booking
      const hasDisabledSeatInBooking = currentSeats.some(
        (bSeat: Seat) => bSeat.isDisabled || bSeat.seatType === 'disabled'
      );

      // Also check if they've already selected a disabled seat in the new selection
      const hasDisabledSeatInSelection = selectedSeats.some(
        s => s.isDisabled || s.seatType === 'disabled'
      );

      if (!hasDisabledSeatInBooking && !hasDisabledSeatInSelection) {
        showInfo(
          'Accessible Seat',
          'Accessible/wheelchair seats are only available for passengers who already have accessible seating in their booking. If you need an accessible seat, please contact support or ensure the original booking includes accessible seating.'
        );
        return;
      }
    }

    // Check if seat is already selected locally
    const isSelected = selectedSeats.find(s => s.id === seat.id);

    try {
      if (isSelected) {
        // Deselect seat - release temporary reservation
        await toggleSeatSelectionStore(seat, false, selectedTrip.trip_id);
        // Update local state
        setSelectedSeats(prev => prev.filter(s => s.id !== seat.id));
      } else {
        // Select seat - create temporary reservation
        await toggleSeatSelectionStore(seat, false, selectedTrip.trip_id);
        // Update local state from store
        const updatedSeats = availableSeats.filter(
          s => s.isSelected || s.isCurrentUserReservation
        );
        setSelectedSeats(updatedSeats);
      }

      if (errors.seats) setErrors({ ...errors, seats: '' });
    } catch (error: any) {
      console.error('Error toggling seat selection:', error);
      showError(
        'Seat Selection Error',
        error.message || 'Failed to select/deselect seat. Please try again.'
      );
    }
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

    setErrors(newErrors);
    return isValid;
  };

  const handleModify = async () => {
    if (!validateForm() || !booking) {
      return;
    }

    if (!isModifiable) {
      showInfo(
        'Cannot Modify Booking',
        eligibilityMessage ||
          'Bookings can only be modified at least 72 hours before departure.'
      );
      return;
    }

    setIsModifying(true);

    try {
      const modificationData = {
        ticketType: isModifyingReturn ? 'return' : 'departure',
        newTripId: selectedTrip?.trip_id || selectedTrip?.id,
        newDate,
        selectedSeats,
        modificationReason,
        fareDifference,
        paymentMethod: selectedPaymentMethod,
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
        } else if (selectedPaymentMethod === 'mib') {
          successMessage += ` An additional payment of ${formatCurrency(fareDifference)} will be processed via MIB Gateway.`;
        }
      } else if (fareDifference < 0) {
        successMessage += ` A refund of ${formatCurrency(Math.abs(fareDifference))} has been credited to your agent account.`;
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
    clearPaymentSession();

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
    clearPaymentSession();
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
    clearPaymentSession();
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

  const originalDate = isModifyingReturn
    ? bookingData?.returnDate
    : booking?.departureDate;
  const originalTime = isModifyingReturn
    ? (bookingData?.returnDepartureTime as string | undefined) ||
      (bookingData?.returnTrip?.departure_time as string | undefined) ||
      ''
    : booking?.departureTime ||
      (bookingData?.trip?.departure_time as string | undefined) ||
      '';
  const originalSeats = isModifyingReturn
    ? (bookingData?.returnSeats as any[]) || []
    : booking?.seats;

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
            clientEmail={booking?.clientEmail || ''}
            route={booking?.route || {}}
            origin={booking?.origin}
            destination={booking?.destination}
            currentDate={originalDate || ''}
            currentTime={originalTime || ''}
            currentSeats={originalSeats || []}
            totalAmount={booking?.totalAmount || 0}
            ticketLabel={ticketLabel}
          />

          {/* Warning Card */}
          <Card variant='elevated' style={styles.warningCard}>
            <View style={styles.warningContent}>
              <AlertCircle size={24} color={Colors.warning} />
              <View style={styles.warningTextContainer}>
                <Text style={styles.warningTitle}>Important Notice</Text>
                <Text style={styles.warningText}>
                  Once you modify this booking, you will not be able to cancel
                  or modify it again. Please ensure all details are correct
                  before proceeding.
                </Text>
              </View>
            </View>
          </Card>

          {booking?.tripType === 'round_trip' && (
            <View style={styles.segmentToggle}>
              {[
                { label: 'Departure Ticket', value: 'departure' as const },
                { label: 'Return Ticket', value: 'return' as const },
              ].map(option => {
                const isActive = activeTicketType === option.value;
                return (
                  <Pressable
                    key={option.value}
                    style={[
                      styles.segmentButton,
                      isActive && styles.segmentButtonActive,
                    ]}
                    onPress={() => setActiveTicketType(option.value)}
                  >
                    <Text
                      style={[
                        styles.segmentButtonText,
                        isActive && styles.segmentButtonTextActive,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}

          {!isModifiable && (
            <Card variant='outlined' style={styles.noticeCard}>
              <Text style={styles.noticeTitle}>Modification Unavailable</Text>
              <Text style={styles.noticeText}>
                {eligibilityMessage ||
                  'This booking can no longer be modified because it is within 72 hours of departure.'}
              </Text>
            </Card>
          )}

          {/* Modification Form */}
          <Card variant='elevated' style={styles.modifyCard}>
            <Text style={styles.cardTitle}>Modify {ticketLabel} Ticket</Text>

            <CalendarDatePicker
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
            {newDate && (
              <View style={styles.tripSelection}>
                <Text style={styles.sectionTitle}>
                  Select New {ticketLabel} Trip
                </Text>

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
                            !isTripBookable(
                              trip.travel_date,
                              trip.departure_time
                            )
                          ) {
                            showInfo(
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
                ) : newDate ? (
                  <View style={styles.noTripsContainer}>
                    <Text style={styles.noTripsTitle}>No Trips Available</Text>
                    <Text style={styles.noTripsText}>
                      No trips available for this route on{' '}
                      {new Date(newDate).toLocaleDateString()}.{'\n\n'}
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
            {selectedTrip && (
              <View style={styles.seatSelection}>
                <Text style={styles.sectionTitle}>
                  Select New Seats ({selectedSeats.length})
                </Text>
                {seatLoading ? (
                  <Text style={styles.seatLoadingText}>
                    Loading available seats...
                  </Text>
                ) : availableSeats && availableSeats.length > 0 ? (
                  <SeatSelector
                    seats={availableSeats}
                    selectedSeats={selectedSeats}
                    onSeatToggle={toggleSeatSelection}
                    tripId={selectedTrip?.trip_id}
                    allowDisabledSeats={
                      (() => {
                        const currentSeats = isModifyingReturn
                          ? (bookingData?.returnSeats as any[]) || []
                          : booking?.seats || [];
                        return currentSeats.some(
                          (bSeat: Seat) =>
                            bSeat.isDisabled || bSeat.seatType === 'disabled'
                        );
                      })() || false
                    }
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
            onPaymentMethodChange={method => {
              setSelectedPaymentMethod(method);
              if (errors.paymentMethod) {
                setErrors({ ...errors, paymentMethod: '' });
              }
            }}
            error={errors.paymentMethod}
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
              loading={isModifying || localTripsLoading || seatLoading}
              disabled={
                !isModifiable || isModifying || localTripsLoading || seatLoading
              }
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
          tripInfo={
            newDate && selectedTrip
              ? {
                  travelDate: newDate,
                  departureTime:
                    selectedTrip.departure_time ||
                    selectedTrip.departureTime ||
                    '00:00',
                }
              : booking
                ? {
                    travelDate:
                      booking.departureDate || new Date().toISOString(),
                    departureTime: booking.departureTime || '00:00',
                  }
                : undefined
          }
          onClose={() => {
            setShowMibPayment(false);
            clearPaymentSession();
          }}
          onSuccess={handleMibPaymentSuccess}
          onFailure={handleMibPaymentFailure}
          onCancel={handleMibPaymentCancel}
          onSessionCreated={session => {
            updatePaymentSession({ sessionData: session });
          }}
          onTimerExpired={async () => {
            // Clear session and show message
            clearPaymentSession();
            setShowMibPayment(false);
            showError(
              'Payment Session Expired',
              'The payment window has expired. The modification payment may have been cancelled.'
            );
          }}
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
  noticeCard: {
    marginBottom: 16,
    borderColor: Colors.warning,
    backgroundColor: '#fff8e1',
  },
  noticeTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.warning,
    marginBottom: 8,
  },
  noticeText: {
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
  },
  segmentToggle: {
    flexDirection: 'row',
    backgroundColor: Colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 4,
    marginBottom: 16,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  segmentButtonActive: {
    backgroundColor: Colors.primary,
  },
  segmentButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  segmentButtonTextActive: {
    color: '#fff',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 16,
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
  seatLoadingText: {
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
  warningCard: {
    marginBottom: 16,
    backgroundColor: '#fff7ed',
    borderLeftWidth: 3,
    borderLeftColor: Colors.warning,
  },
  warningContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  warningTextContainer: {
    flex: 1,
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  warningText: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
});
