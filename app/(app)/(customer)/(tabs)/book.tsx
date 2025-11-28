import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  BackHandler,
  KeyboardAvoidingView,
  Platform,
  AppState,
  AppStateStatus,
} from 'react-native';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Check } from 'lucide-react-native';
import {
  useBookingStore,
  useSeatStore,
  useBookingOperationsStore,
} from '@/store';
import Colors from '@/constants/colors';
import Card from '@/components/Card';
import Button from '@/components/Button';
import SeatSelector from '@/components/SeatSelector';
import Input from '@/components/Input';
import Dropdown from '@/components/Dropdown';
import type { Seat } from '@/types';
import { createEmptyFormErrors } from '@/utils/customerUtils';
import MibPaymentWebView from '@/components/MibPaymentWebView';
import {
  BOOKING_STEPS,
  STEP_LABELS,
  TRIP_TYPES,
  PAYMENT_OPTIONS,
  REFRESH_INTERVALS,
  BOOKING_BUFFER_MINUTES,
  BUFFER_MINUTES_PAYMENT_WINDOW,
} from '@/constants/customer';
import {
  getMinutesUntilDeparture,
  validateTripForBooking,
} from '@/utils/bookingUtils';
import {
  calculateBookingExpiry,
  combineTripDateTime,
} from '@/utils/bookingExpiryUtils';
import { cancelPendingBookingDirectly } from '@/utils/paymentUtils';
import { useAlertContext } from '@/components/AlertProvider';
import { useAuthStore } from '@/store/authStore';
import { usePaymentSessionStore } from '@/store/paymentSessionStore';
import { usePendingBookingWatcher } from '@/hooks/usePendingBookingWatcher';
import { supabase } from '@/utils/supabase';

// Import new step components
import IslandDateStep from '@/components/booking/steps/IslandDateStep';
import TripSelectionStep from '@/components/booking/steps/TripSelectionStep';
import { formatBookingDate, formatTimeAMPM } from '@/utils/dateUtils';

export default function BookScreen() {
  const { showSuccess, showError, showInfo } = useAlertContext();
  const { isAuthenticated, isGuestMode } = useAuthStore();
  const promptLoginForBooking = useCallback(() => {
    showError(
      'Login Required',
      'Please sign in or create an account to continue this booking.'
    );
    router.push('/(auth)' as any);
  }, [showError]);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [pricingNoticeAccepted, setPricingNoticeAccepted] = useState(false);

  // Local seat selection state
  const [localSelectedSeats, setLocalSelectedSeats] = useState<Seat[]>([]);
  const [localReturnSelectedSeats, setLocalReturnSelectedSeats] = useState<
    Seat[]
  >([]);
  const [loadingSeats, setLoadingSeats] = useState<Set<string>>(new Set());
  const [seatErrors, setSeatErrors] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState(createEmptyFormErrors());

  // MIB Payment state
  const [showMibPayment, setShowMibPayment] = useState(false);
  const [currentBookingId, setCurrentBookingId] = useState('');
  const [mibSessionData, setMibSessionData] = useState<any>(null);
  const [mibBookingDetails, setMibBookingDetails] = useState<any>(null);
  const paymentSession = usePaymentSessionStore(state => state.session);
  const setPaymentSession = usePaymentSessionStore(state => state.setSession);
  const updatePaymentSession = usePaymentSessionStore(
    state => state.updateSession
  );
  const clearPaymentSession = usePaymentSessionStore(
    state => state.clearSession
  );
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const timerExpiredRef = useRef(false);

  // Core booking state
  const {
    currentBooking,
    isLoading: bookingLoading,
    currentStep,
    setCurrentStep,
    updatePassengers,
    resetBooking: resetCurrentBooking,
    createCustomerBooking,
    setTripType,
  } = useBookingStore();

  // Seat management
  const {
    availableSeats,
    availableReturnSeats,
    fetchAvailableSeats,
    subscribeSeatUpdates,
    unsubscribeSeatUpdates,
    cleanupAllSeatSubscriptions,
    refreshAvailableSeatsSilently,
    isLoading: seatLoading,
  } = useSeatStore();

  // Booking operations
  const { isLoading: operationLoading } = useBookingOperationsStore();

  const isLoading = bookingLoading || seatLoading || operationLoading;

  const calculatePaymentWindowSeconds = useCallback(
    (tripInfo?: { travelDate: string; departureTime: string }) => {
      if (tripInfo?.travelDate && tripInfo?.departureTime) {
        const minutesUntilDeparture = getMinutesUntilDeparture(
          tripInfo.travelDate,
          tripInfo.departureTime
        );
        if (minutesUntilDeparture > 0) {
          return Math.max(
            30,
            Math.min(
              BUFFER_MINUTES_PAYMENT_WINDOW * 60,
              minutesUntilDeparture * 60
            )
          );
        }
        return 0;
      }
      return BUFFER_MINUTES_PAYMENT_WINDOW * 60;
    },
    []
  );

  // Helper function to check booking status
  const checkBookingStatus = useCallback(
    async (
      bookingId: string
    ): Promise<'cancelled' | 'confirmed' | 'pending_payment' | 'unknown'> => {
      try {
        const { data: booking, error } = await supabase
          .from('bookings')
          .select('status')
          .eq('id', bookingId)
          .single();

        if (error || !booking) return 'unknown';
        return booking.status as 'cancelled' | 'confirmed' | 'pending_payment';
      } catch (error) {
        console.error('Error checking booking status:', error);
        return 'unknown';
      }
    },
    []
  );

  const finalizePaymentFlow = useCallback(
    (
      bookingId: string,
      result: 'SUCCESS' | 'FAILURE' | 'CANCELLED',
      extraParams: Record<string, string> = {},
      skipPaymentSuccess: boolean = false
    ) => {
      const sessionContext = paymentSession?.context;
      const sessionOriginalBookingId = paymentSession?.originalBookingId;

      setShowMibPayment(false);
      setCurrentBookingId('');
      setMibSessionData(null);
      setMibBookingDetails(null);
      clearPaymentSession();

      if (skipPaymentSuccess) {
        // Redirect to bookings list instead of payment-success
        router.replace('/(app)/(customer)/(tabs)/bookings');
        return;
      }

      const finalParams: Record<string, string> = {
        bookingId,
        result,
        resetBooking:
          extraParams.resetBooking ??
          (sessionContext === 'modification' ? 'false' : 'true'),
        ...extraParams,
      };

      if (sessionContext === 'modification') {
        finalParams.isModification = 'true';
        if (sessionOriginalBookingId) {
          finalParams.originalBookingId = sessionOriginalBookingId;
        }
      } else if (!('isModification' in finalParams)) {
        finalParams.isModification = 'false';
      }

      router.replace({
        pathname: '/(app)/(customer)/payment-success',
        params: finalParams,
      });
    },
    [clearPaymentSession, router, paymentSession]
  );

  const startPaymentSessionTracking = useCallback(
    (
      bookingId: string,
      details: {
        bookingNumber: string;
        route: string;
        travelDate: string;
        amount: number;
        currency: string;
        passengerCount: number;
      },
      tripInfo?: { travelDate: string; departureTime: string }
    ) => {
      const seconds = calculatePaymentWindowSeconds(tripInfo);
      const expiresAt =
        seconds > 0
          ? new Date(Date.now() + seconds * 1000).toISOString()
          : new Date().toISOString();

      setPaymentSession({
        bookingId,
        bookingDetails: details,
        context: 'booking',
        tripInfo,
        sessionData: null,
        startedAt: new Date().toISOString(),
        expiresAt,
      });
    },
    [calculatePaymentWindowSeconds, setPaymentSession]
  );

  const handleResumePayment = useCallback(() => {
    if (!paymentSession) return;
    setMibBookingDetails(paymentSession.bookingDetails);
    setCurrentBookingId(paymentSession.bookingId);
    setMibSessionData(paymentSession.sessionData || null);
    setShowMibPayment(true);
  }, [paymentSession]);

  const handlePendingPaymentCancel = useCallback(async () => {
    if (!paymentSession) return;
    try {
      // Cancel booking directly for instant response
      await cancelPendingBookingDirectly(
        paymentSession.bookingId,
        'Cancelled by user from resume banner'
      );
      // Clear payment session immediately
      clearPaymentSession();
      finalizePaymentFlow(paymentSession.bookingId, 'CANCELLED');
    } catch (error: any) {
      console.error('Failed to cancel pending booking:', error);
      // Clear payment session even if cancellation fails
      clearPaymentSession();
      // Still navigate to cancelled screen even if cancellation fails
      finalizePaymentFlow(paymentSession.bookingId, 'CANCELLED');
    }
  }, [paymentSession, finalizePaymentFlow, clearPaymentSession]);

  const resetLocalFormState = useCallback(() => {
    setPaymentMethod('');
    setTermsAccepted(false);
    setPricingNoticeAccepted(false);
    setErrors(createEmptyFormErrors());
    setLocalSelectedSeats([]);
    setLocalReturnSelectedSeats([]);
    setSeatErrors({});
    setShowMibPayment(false);
    setCurrentBookingId('');
    setMibSessionData(null);
    setMibBookingDetails(null);
  }, []);

  const handlePaymentTimeout = useCallback(async () => {
    if (!paymentSession) return;

    const isModificationSession = paymentSession?.context === 'modification';

    try {
      // Call auto-cancel function
      await supabase.functions.invoke('auto-cancel-pending', {
        body: { bookingId: paymentSession.bookingId },
      });

      // Wait a moment for database update
      await new Promise(resolve => setTimeout(resolve, 500));

      // Check if booking was actually cancelled
      const status = await checkBookingStatus(paymentSession.bookingId);

      if (status === 'cancelled') {
        // Booking was auto-cancelled - don't show payment-success page
        clearPaymentSession();
        if (isModificationSession) {
          showInfo(
            'Modification Cancelled',
            'The payment window expired and the modification booking was automatically cancelled. Your original booking remains unchanged.'
          );
          router.replace('/(app)/(customer)/(tabs)/bookings');
        } else {
          showInfo(
            'Payment Session Expired',
            'The payment window expired and your booking was automatically cancelled. Seats have been released.'
          );
          resetCurrentBooking();
          setCurrentStep(BOOKING_STEPS.ISLAND_DATE_SELECTION);
          resetLocalFormState();
        }
        return;
      }
    } catch (error) {
      console.warn('Auto cancellation function failed:', error);
    }

    // Fallback: if status check fails, still show info but redirect to bookings
    clearPaymentSession();
    if (isModificationSession) {
      showInfo(
        'Modification Cancelled',
        'The payment window has expired. Your original booking remains unchanged.'
      );
      router.replace('/(app)/(customer)/(tabs)/bookings');
    } else {
      showInfo(
        'Payment Session Expired',
        'The payment window has expired. Please check your bookings for the current status.'
      );
      resetCurrentBooking();
      setCurrentStep(BOOKING_STEPS.ISLAND_DATE_SELECTION);
      resetLocalFormState();
    }
  }, [
    paymentSession,
    checkBookingStatus,
    clearPaymentSession,
    showInfo,
    resetCurrentBooking,
    setCurrentStep,
    resetLocalFormState,
    router,
  ]);

  const getActiveBookingId = useCallback(() => {
    return currentBookingId || paymentSession?.bookingId || '';
  }, [currentBookingId, paymentSession]);

  // Calculate smart expiry for resume banner
  const resumeBannerExpiry = useMemo(() => {
    if (!paymentSession || !paymentSession.tripInfo) {
      return null;
    }

    try {
      const bookingCreatedAt = new Date(paymentSession.startedAt);
      const tripDeparture = combineTripDateTime(
        paymentSession.tripInfo.travelDate,
        paymentSession.tripInfo.departureTime
      );
      return calculateBookingExpiry(bookingCreatedAt, tripDeparture);
    } catch (error) {
      console.error('Error calculating resume banner expiry:', error);
      return null;
    }
  }, [paymentSession]);

  const { status: pendingBookingStatus, isLoading: pendingStatusLoading } =
    usePendingBookingWatcher({
      bookingId: paymentSession?.bookingId,
      enabled: !!paymentSession,
    });
  const pendingStatusHandledRef = useRef(false);

  useEffect(() => {
    if (!paymentSession?.bookingId) {
      pendingStatusHandledRef.current = false;
      return;
    }

    if (
      !pendingStatusLoading &&
      pendingBookingStatus &&
      pendingBookingStatus !== 'pending_payment' &&
      !pendingStatusHandledRef.current
    ) {
      pendingStatusHandledRef.current = true;
      clearPaymentSession();
      if (pendingBookingStatus === 'cancelled') {
        showInfo(
          'Booking Cancelled',
          'The payment window expired and your booking was automatically cancelled.'
        );
      }
      router.replace('/(app)/(customer)/(tabs)/bookings');
    }
  }, [
    pendingBookingStatus,
    pendingStatusLoading,
    paymentSession?.bookingId,
    clearPaymentSession,
    showInfo,
    router,
  ]);

  const shouldShowResumeBanner =
    !!paymentSession &&
    !showMibPayment &&
    resumeBannerExpiry !== null &&
    !resumeBannerExpiry.isExpired &&
    pendingBookingStatus === 'pending_payment' &&
    !pendingStatusLoading;

  const hasBlockingPendingPayment =
    shouldShowResumeBanner && paymentSession?.context === 'modification';

  const [resumeCountdown, setResumeCountdown] = useState<{
    minutes: number;
    seconds: number;
    totalSeconds: number;
  } | null>(null);

  useEffect(() => {
    if (
      !shouldShowResumeBanner ||
      !resumeBannerExpiry?.expiresAt ||
      pendingBookingStatus !== 'pending_payment'
    ) {
      setResumeCountdown(null);
      return;
    }

    let timeoutTriggered = false;

    const updateCountdown = () => {
      const expiresAt =
        resumeBannerExpiry.expiresAt instanceof Date
          ? resumeBannerExpiry.expiresAt
          : new Date(resumeBannerExpiry.expiresAt);
      const diff = Math.max(0, expiresAt.getTime() - new Date().getTime());
      const totalSeconds = Math.floor(diff / 1000);
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;

      setResumeCountdown({ minutes, seconds, totalSeconds });

      if (totalSeconds === 0 && !timeoutTriggered) {
        timeoutTriggered = true;
        handlePaymentTimeout();
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [
    shouldShowResumeBanner,
    resumeBannerExpiry?.expiresAt,
    pendingBookingStatus,
    handlePaymentTimeout,
  ]);

  const formatResumeCountdown = () => {
    if (!resumeCountdown) return '--:--';
    const pad = (value: number) => value.toString().padStart(2, '0');
    return `${pad(resumeCountdown.minutes)}:${pad(resumeCountdown.seconds)}`;
  };

  // Initialize default trip type
  useEffect(() => {
    if (!currentBooking.tripType) {
      setTripType('one_way');
    }
  }, []);

  // Clear trip selection errors when trip is successfully selected
  useEffect(() => {
    if (currentBooking.trip && errors.trip) {
      setErrors({ ...errors, trip: '' });
    }
  }, [currentBooking.trip]);

  // Clear return trip selection errors when return trip is successfully selected
  useEffect(() => {
    if (currentBooking.returnTrip && errors.returnTrip) {
      setErrors({ ...errors, returnTrip: '' });
    }
  }, [currentBooking.returnTrip]);

  // Intercept system back button for step navigation
  useFocusEffect(
    React.useCallback(() => {
      const onBackPress = () => {
        // If on first step, allow normal back navigation to exit booking
        if (currentStep === BOOKING_STEPS.ISLAND_DATE_SELECTION) {
          return false; // Allow default back behavior
        }

        // Otherwise, navigate to previous booking step
        handleBack();
        return true; // Prevent default back behavior
      };

      const subscription = BackHandler.addEventListener(
        'hardwareBackPress',
        onBackPress
      );

      return () => subscription.remove();
    }, [currentStep])
  );

  // Fetch seats when trip is selected
  useEffect(() => {
    if (currentBooking.trip?.id) {
      fetchAvailableSeats(currentBooking.trip.id, false);
      subscribeSeatUpdates(currentBooking.trip.id, false);
    }
    if (currentBooking.returnTrip?.id) {
      fetchAvailableSeats(currentBooking.returnTrip.id, true);
      subscribeSeatUpdates(currentBooking.returnTrip.id, true);
    }

    return () => {
      if (currentBooking.trip?.id)
        unsubscribeSeatUpdates(currentBooking.trip.id);
      if (currentBooking.returnTrip?.id)
        unsubscribeSeatUpdates(currentBooking.returnTrip.id);
    };
  }, [currentBooking.trip?.id, currentBooking.returnTrip?.id]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupAllSeatSubscriptions();
    };
  }, []);

  useEffect(() => {
    if (!paymentSession || showMibPayment) return;
    if (new Date(paymentSession.expiresAt).getTime() <= Date.now()) {
      handlePaymentTimeout();
    }
  }, [paymentSession, showMibPayment, handlePaymentTimeout]);

  useEffect(() => {
    const subscription = AppState.addEventListener(
      'change',
      (nextState: AppStateStatus) => {
        if (
          appStateRef.current.match(/inactive|background/) &&
          nextState === 'active' &&
          paymentSession
        ) {
          const expired =
            new Date(paymentSession.expiresAt).getTime() <= Date.now();
          if (expired) {
            handlePaymentTimeout();
          }
        }
        appStateRef.current = nextState;
      }
    );

    return () => subscription.remove();
  }, [paymentSession, handlePaymentTimeout]);

  // Sync local seats with store
  useEffect(() => {
    setLocalSelectedSeats(currentBooking.selectedSeats);
  }, [currentBooking.selectedSeats]);

  useEffect(() => {
    setLocalReturnSelectedSeats(currentBooking.returnSelectedSeats);
  }, [currentBooking.returnSelectedSeats]);

  useEffect(() => {
    const isInitialState =
      currentStep === BOOKING_STEPS.ISLAND_DATE_SELECTION &&
      !currentBooking.trip &&
      !currentBooking.returnTrip &&
      !currentBooking.departureDate &&
      !currentBooking.returnDate &&
      currentBooking.selectedSeats.length === 0 &&
      currentBooking.returnSelectedSeats.length === 0 &&
      currentBooking.passengers.length === 0;

    const hasLocalState =
      paymentMethod !== '' ||
      termsAccepted ||
      pricingNoticeAccepted ||
      localSelectedSeats.length > 0 ||
      localReturnSelectedSeats.length > 0 ||
      showMibPayment ||
      Object.keys(seatErrors).length > 0;

    if (isInitialState && hasLocalState) {
      resetLocalFormState();
    }
  }, [
    currentStep,
    currentBooking.trip,
    currentBooking.returnTrip,
    currentBooking.departureDate,
    currentBooking.returnDate,
    currentBooking.selectedSeats.length,
    currentBooking.returnSelectedSeats.length,
    currentBooking.passengers.length,
    localSelectedSeats.length,
    localReturnSelectedSeats.length,
    paymentMethod,
    termsAccepted,
    pricingNoticeAccepted,
    showMibPayment,
    seatErrors,
    resetLocalFormState,
  ]);

  // Periodic seat refresh
  useEffect(() => {
    if (currentStep === BOOKING_STEPS.SEAT_SELECTION) {
      const interval = setInterval(() => {
        if (currentBooking.trip?.id) {
          refreshAvailableSeatsSilently(currentBooking.trip.id, false);
        }
        if (currentBooking.returnTrip?.id) {
          refreshAvailableSeatsSilently(currentBooking.returnTrip.id, true);
        }
      }, REFRESH_INTERVALS.SEAT_AVAILABILITY);

      return () => clearInterval(interval);
    }
  }, [currentStep, currentBooking.trip?.id, currentBooking.returnTrip?.id]);

  const validateStep = (step: number) => {
    const newErrors = { ...errors };
    let isValid = true;

    switch (step) {
      case BOOKING_STEPS.ISLAND_DATE_SELECTION:
        // Validation handled in IslandDateStep component
        break;

      case BOOKING_STEPS.TRIP_SELECTION:
        if (!currentBooking.trip) {
          newErrors.trip = 'Please select a trip';
          isValid = false;
        } else {
          // Validate trip status and time
          const tripValidation = validateTripForBooking(
            {
              travel_date: currentBooking.trip.travel_date,
              departure_time: currentBooking.trip.departure_time,
              status:
                currentBooking.trip.status ||
                currentBooking.trip.computed_status,
            },
            BOOKING_BUFFER_MINUTES
          );
          if (!tripValidation.isValid) {
            newErrors.trip = tripValidation.error || 'Trip is not available';
            isValid = false;
          }
        }
        if (
          currentBooking.tripType === TRIP_TYPES.ROUND_TRIP &&
          !currentBooking.returnTrip
        ) {
          newErrors.returnTrip = 'Please select a return trip';
          isValid = false;
        } else if (
          currentBooking.tripType === TRIP_TYPES.ROUND_TRIP &&
          currentBooking.returnTrip
        ) {
          // Validate return trip status and time
          const returnValidation = validateTripForBooking(
            {
              travel_date: currentBooking.returnTrip.travel_date,
              departure_time: currentBooking.returnTrip.departure_time,
              status:
                currentBooking.returnTrip.status ||
                currentBooking.returnTrip.computed_status,
            },
            BOOKING_BUFFER_MINUTES
          );
          if (!returnValidation.isValid) {
            newErrors.returnTrip =
              returnValidation.error || 'Return trip is not available';
            isValid = false;
          }
        }
        break;

      case BOOKING_STEPS.SEAT_SELECTION:
        if (localSelectedSeats.length === 0) {
          newErrors.seats = 'Please select at least one seat';
          isValid = false;
        }
        if (
          currentBooking.tripType === TRIP_TYPES.ROUND_TRIP &&
          localReturnSelectedSeats.length === 0
        ) {
          newErrors.seats = 'Please select return seats';
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

      case BOOKING_STEPS.PASSENGER_DETAILS:
        const incomplete = currentBooking.passengers.find(
          p => !p.fullName.trim()
        );
        if (incomplete) {
          newErrors.passengers = 'Please enter all passenger details';
          isValid = false;
        }
        // Check if accessible seat passengers have special assistance
        const accessibleSeatPassengers = currentBooking.passengers.filter(
          (p, index) => {
            const seat = localSelectedSeats[index];
            return seat && (seat.isDisabled || seat.seatType === 'disabled');
          }
        );
        const missingAssistance = accessibleSeatPassengers.find(
          p => !p.specialAssistance || !p.specialAssistance.trim()
        );
        if (missingAssistance) {
          newErrors.passengers =
            'Special assistance is required for accessible/wheelchair seats. Please provide details for all passengers using accessible seats.';
          isValid = false;
        }
        break;

      case BOOKING_STEPS.PAYMENT:
        if (!paymentMethod) {
          newErrors.paymentMethod = 'Please select payment method';
          isValid = false;
        }
        if (!termsAccepted) {
          newErrors.terms = 'Please accept terms and conditions';
          isValid = false;
        }
        if (!pricingNoticeAccepted) {
          newErrors.pricingNotice = 'Please acknowledge pricing notice';
          isValid = false;
        }
        break;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleNext = () => {
    if (isGuestMode && currentStep >= BOOKING_STEPS.TRIP_SELECTION) {
      promptLoginForBooking();
      return;
    }

    if (validateStep(currentStep)) {
      setCurrentStep(currentStep + 1);

      // Refresh seat availability when user reaches seat selection step
      if (currentStep + 1 === BOOKING_STEPS.SEAT_SELECTION) {
        if (currentBooking.trip?.id) {
          refreshAvailableSeatsSilently(currentBooking.trip.id, false);
        }
        if (currentBooking.returnTrip?.id) {
          refreshAvailableSeatsSilently(currentBooking.returnTrip.id, true);
        }
      }
    } else {
      // Show validation errors to user
      if (currentStep === BOOKING_STEPS.TRIP_SELECTION) {
        if (errors.trip) {
          showError('Validation Error', errors.trip);
        }
        if (errors.returnTrip) {
          showError('Validation Error', errors.returnTrip);
        }
      }
    }
  };

  const handleBack = () => {
    setCurrentStep(currentStep - 1);
  };

  const handleFindTrips = () => {
    // Move to trip selection step
    setCurrentStep(BOOKING_STEPS.TRIP_SELECTION);
  };

  const handleConfirmBooking = async () => {
    if (isGuestMode) {
      promptLoginForBooking();
      return;
    }

    if (validateStep(BOOKING_STEPS.PAYMENT)) {
      try {
        // Final validation before booking - check trip status and time
        if (currentBooking.trip) {
          const departureValidation = validateTripForBooking(
            {
              travel_date: currentBooking.trip.travel_date,
              departure_time: currentBooking.trip.departure_time,
              status:
                currentBooking.trip.status ||
                currentBooking.trip.computed_status,
            },
            BOOKING_BUFFER_MINUTES
          );

          if (!departureValidation.isValid) {
            showError(
              'Booking Unavailable',
              departureValidation.error ||
                'Departure trip is no longer available for booking. Please select a different trip.'
            );
            return;
          }
        }

        // Validate return trip if round trip
        if (
          currentBooking.tripType === TRIP_TYPES.ROUND_TRIP &&
          currentBooking.returnTrip
        ) {
          const returnValidation = validateTripForBooking(
            {
              travel_date: currentBooking.returnTrip.travel_date,
              departure_time: currentBooking.returnTrip.departure_time,
              status:
                currentBooking.returnTrip.status ||
                currentBooking.returnTrip.computed_status,
            },
            BOOKING_BUFFER_MINUTES
          );

          if (!returnValidation.isValid) {
            showError(
              'Booking Unavailable',
              returnValidation.error ||
                'Return trip is no longer available for booking. Please select a different trip.'
            );
            return;
          }
        }

        const bookingResult = await createCustomerBooking(paymentMethod);

        if (paymentMethod === 'mib') {
          // Fetch receipt_number from payment record
          let receiptNumber = null;
          try {
            const { data: payment } = await supabase
              .from('payments')
              .select('receipt_number')
              .eq('booking_id', bookingResult.bookingId)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle();

            if (payment?.receipt_number) {
              receiptNumber = payment.receipt_number;
            }
          } catch (error) {
            // Silently handle error - receipt_number is optional for display
          }

          // Build route string - include return route for round trips
          let routeString = `${currentBooking.boardingIslandName} → ${currentBooking.destinationIslandName}`;
          if (
            currentBooking.tripType === TRIP_TYPES.ROUND_TRIP &&
            currentBooking.returnBoardingIslandName &&
            currentBooking.returnDestinationIslandName
          ) {
            routeString += ` / ${currentBooking.returnBoardingIslandName} → ${currentBooking.returnDestinationIslandName}`;
          }

          // Build booking numbers string - include return booking number for round trips
          let bookingNumbersString = bookingResult.booking_number;
          if (bookingResult.return_booking_number) {
            bookingNumbersString += ` / ${bookingResult.return_booking_number}`;
          }

          const bookingDetails = {
            bookingNumber: bookingNumbersString,
            route: routeString,
            travelDate:
              currentBooking.departureDate || new Date().toISOString(),
            returnDate:
              currentBooking.tripType === TRIP_TYPES.ROUND_TRIP &&
              currentBooking.returnDate
                ? currentBooking.returnDate
                : null,
            amount: currentBooking.totalFare,
            currency: 'MVR',
            passengerCount: localSelectedSeats.length,
            receiptNumber: receiptNumber,
            isRoundTrip: currentBooking.tripType === TRIP_TYPES.ROUND_TRIP,
          };

          setCurrentBookingId(bookingResult.bookingId);
          setMibBookingDetails(bookingDetails);
          setMibSessionData(null);
          const tripInfoDetails = currentBooking.trip
            ? {
                travelDate: currentBooking.trip.travel_date,
                departureTime: currentBooking.trip.departure_time,
              }
            : undefined;
          startPaymentSessionTracking(
            bookingResult.bookingId,
            bookingDetails,
            tripInfoDetails
          );
          setShowMibPayment(true);
        } else {
          resetCurrentBooking();
          setCurrentStep(BOOKING_STEPS.ISLAND_DATE_SELECTION);
          resetLocalFormState();

          let successMessage = `Your ${
            currentBooking.tripType === TRIP_TYPES.ROUND_TRIP
              ? 'round trip'
              : 'one way'
          } booking has been confirmed.`;
          successMessage += `\n\nBooking Number: ${bookingResult.booking_number}`;

          if (bookingResult.returnBookingId) {
            successMessage += `\nReturn Booking Number: ${bookingResult.return_booking_number || 'N/A'}`;
          }

          showSuccess('Booking Confirmed', successMessage, () =>
            router.replace('/(app)/(customer)/(tabs)/bookings')
          );
        }
      } catch (error: any) {
        showError('Booking Failed', error?.message || 'Please try again');

        // Refresh seat availability
        if (currentBooking.trip?.id) {
          refreshAvailableSeatsSilently(currentBooking.trip.id, false);
        }
        if (currentBooking.returnTrip?.id) {
          refreshAvailableSeatsSilently(currentBooking.returnTrip.id, true);
        }
      }
    }
  };

  const updatePassengerDetail = (
    index: number,
    field: string,
    value: string
  ) => {
    const updated = [...currentBooking.passengers];
    updated[index] = { ...updated[index], [field]: value };
    updatePassengers(updated);
  };

  const handleSeatToggle = async (seat: Seat, isReturn: boolean = false) => {
    if (loadingSeats.has(seat.id)) return;

    setLoadingSeats(prev => new Set(prev).add(seat.id));
    setSeatErrors(prev => ({ ...prev, [seat.id]: '' }));

    try {
      await useSeatStore.getState().toggleSeatSelection(seat, isReturn);
      if (errors.seats) setErrors({ ...errors, seats: '' });
    } catch (error: any) {
      setSeatErrors(prev => ({ ...prev, [seat.id]: error.message }));
      showError('Seat Selection Error', error.message);
    } finally {
      setLoadingSeats(prev => {
        const newSet = new Set(prev);
        newSet.delete(seat.id);
        return newSet;
      });
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.select({ ios: 64, android: 0 })}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps='handled'
        automaticallyAdjustKeyboardInsets
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

        {shouldShowResumeBanner && paymentSession && (
          <Card variant='elevated' style={styles.paymentReminderCard}>
            <Text style={styles.paymentReminderTitle}>
              Complete Payment for Booking #
              {paymentSession.bookingDetails.bookingNumber}
            </Text>
            <Text style={styles.paymentReminderText}>
              Seats are reserved for{' '}
              <Text style={styles.paymentReminderTime}>
                {formatResumeCountdown()}
              </Text>
              {resumeBannerExpiry?.reason === 'departure_time' && (
                <Text style={styles.paymentReminderNote}>
                  {' '}
                  (until departure time)
                </Text>
              )}
              . Resume payment now or cancel the booking to release the seats.
            </Text>
            <View style={styles.paymentReminderActions}>
              <Button
                title='Continue Payment'
                onPress={handleResumePayment}
                style={styles.paymentReminderButton}
              />
              <Button
                title='Cancel Booking'
                onPress={handlePendingPaymentCancel}
                variant='outline'
                style={styles.paymentReminderButton}
                textStyle={styles.cancelButtonText}
              />
            </View>
          </Card>
        )}

        <Card variant='elevated' style={styles.bookingCard}>
          {/* Step 1: Island & Date Selection */}
          {currentStep === BOOKING_STEPS.ISLAND_DATE_SELECTION && (
            <IslandDateStep onFindTrips={handleFindTrips} />
          )}

          {/* Step 2: Trip Selection */}
          {currentStep === BOOKING_STEPS.TRIP_SELECTION && (
            <>
              <TripSelectionStep />
              {isGuestMode && (
                <View style={styles.guestNotice}>
                  <Text style={styles.guestNoticeTitle}>
                    Sign in to continue booking
                  </Text>
                  <Text style={styles.guestNoticeText}>
                    You can browse available routes as a guest, but you need an
                    account to select seats, add passenger details, and confirm
                    your booking.
                  </Text>
                  <Button
                    title='Sign In or Create Account'
                    onPress={promptLoginForBooking}
                    fullWidth
                  />
                </View>
              )}
            </>
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
                loadingSeats={loadingSeats}
                seatErrors={seatErrors}
                allowDisabledSeats={true}
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
                    allowDisabledSeats={true}
                  />
                </>
              )}

              {errors.seats && (
                <Text style={styles.errorText}>{errors.seats}</Text>
              )}

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
                    label='Phone Number'
                    placeholder='Enter phone number (optional)'
                    value={passenger.phoneNumber || ''}
                    onChangeText={text =>
                      updatePassengerDetail(index, 'phoneNumber', text)
                    }
                    keyboardType='phone-pad'
                  />

                  <Input
                    label='Special Assistance'
                    placeholder={
                      localSelectedSeats[index] &&
                      (localSelectedSeats[index].isDisabled ||
                        localSelectedSeats[index].seatType === 'disabled')
                        ? 'Please describe accessibility requirements (required for accessible seats)'
                        : 'Any special requirements? (optional)'
                    }
                    value={passenger.specialAssistance || ''}
                    onChangeText={text =>
                      updatePassengerDetail(index, 'specialAssistance', text)
                    }
                    multiline
                    numberOfLines={2}
                    required={
                      localSelectedSeats[index] &&
                      (localSelectedSeats[index].isDisabled ||
                        localSelectedSeats[index].seatType === 'disabled')
                    }
                    error={
                      localSelectedSeats[index] &&
                      (localSelectedSeats[index].isDisabled ||
                        localSelectedSeats[index].seatType === 'disabled') &&
                      !passenger.specialAssistance?.trim()
                        ? 'Special assistance is required for accessible seats'
                        : undefined
                    }
                  />
                </View>
              ))}

              {errors.passengers && (
                <Text style={styles.errorText}>{errors.passengers}</Text>
              )}
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
                    {currentBooking.boardingIslandName} →{' '}
                    {currentBooking.destinationIslandName}
                  </Text>
                </View>

                {currentBooking.tripType === TRIP_TYPES.ROUND_TRIP && (
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Return Route:</Text>
                    <Text style={styles.summaryValue}>
                      {currentBooking.returnBoardingIslandName} →{' '}
                      {currentBooking.returnDestinationIslandName}
                    </Text>
                  </View>
                )}

                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Departure Date:</Text>
                  <Text style={styles.summaryValue}>
                    {currentBooking.departureDate
                      ? formatBookingDate(currentBooking.departureDate)
                      : '-'}
                  </Text>
                </View>

                {currentBooking.trip?.departure_time && (
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Departure Time:</Text>
                    <Text style={styles.summaryValue}>
                      {formatTimeAMPM(currentBooking.trip.departure_time)}
                    </Text>
                  </View>
                )}

                {currentBooking.tripType === TRIP_TYPES.ROUND_TRIP &&
                  currentBooking.returnDate && (
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>Return Date:</Text>
                      <Text style={styles.summaryValue}>
                        {formatBookingDate(currentBooking.returnDate)}
                      </Text>
                    </View>
                  )}

                {currentBooking.tripType === TRIP_TYPES.ROUND_TRIP &&
                  currentBooking.returnTrip?.departure_time && (
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>Return Time:</Text>
                      <Text style={styles.summaryValue}>
                        {formatTimeAMPM(
                          currentBooking.returnTrip.departure_time
                        )}
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
                  I acknowledge that the ticket prices shown are valid for
                  locals and Work Permit holders only. For tourist pricing, I
                  will contact the hotlines{' '}
                  <Text style={styles.hotlineNumber}>3323113</Text> or{' '}
                  <Text style={styles.hotlineNumber}>7892929</Text>.
                </Text>
              </View>

              {errors.terms && (
                <Text style={styles.errorText}>{errors.terms}</Text>
              )}
              {errors.pricingNotice && (
                <Text style={styles.errorText}>{errors.pricingNotice}</Text>
              )}
            </View>
          )}

          {/* Navigation Buttons */}
          <View style={styles.buttonContainer}>
            {currentStep > BOOKING_STEPS.ISLAND_DATE_SELECTION &&
              currentStep !== BOOKING_STEPS.TRIP_SELECTION && (
                <Button
                  title='Back'
                  onPress={handleBack}
                  variant='outline'
                  style={styles.navigationButton}
                />
              )}

            {currentStep === BOOKING_STEPS.TRIP_SELECTION && (
              <Button
                title='Back'
                onPress={handleBack}
                variant='outline'
                style={styles.navigationButton}
              />
            )}

            {currentStep === BOOKING_STEPS.TRIP_SELECTION && (
              <Button
                title={
                  hasBlockingPendingPayment
                    ? 'Complete Pending Payment'
                    : 'Next'
                }
                onPress={
                  hasBlockingPendingPayment
                    ? () =>
                        showInfo(
                          'Pending Payment',
                          'Please complete or cancel the pending modification payment before creating a new booking.'
                        )
                    : handleNext
                }
                style={styles.navigationButton}
                disabled={
                  hasBlockingPendingPayment ||
                  !currentBooking.trip ||
                  (currentBooking.tripType === TRIP_TYPES.ROUND_TRIP &&
                    !currentBooking.returnTrip)
                }
              />
            )}

            {currentStep > BOOKING_STEPS.TRIP_SELECTION &&
              currentStep < BOOKING_STEPS.PAYMENT && (
                <Button
                  title={
                    hasBlockingPendingPayment
                      ? 'Complete Pending Payment'
                      : 'Next'
                  }
                  onPress={
                    hasBlockingPendingPayment
                      ? () =>
                          showInfo(
                            'Pending Payment',
                            'Please complete or cancel the pending modification payment before creating a new booking.'
                          )
                      : handleNext
                  }
                  style={styles.navigationButton}
                  disabled={hasBlockingPendingPayment}
                />
              )}

            {currentStep === BOOKING_STEPS.PAYMENT && (
              <Button
                title={
                  hasBlockingPendingPayment
                    ? 'Complete Pending Payment'
                    : 'Confirm Booking'
                }
                onPress={
                  hasBlockingPendingPayment
                    ? () =>
                        showInfo(
                          'Pending Payment',
                          'Please complete or cancel the pending modification payment before creating a new booking.'
                        )
                    : handleConfirmBooking
                }
                loading={isLoading && !hasBlockingPendingPayment}
                disabled={isLoading || hasBlockingPendingPayment}
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
            tripInfo={
              currentBooking.trip
                ? {
                    travelDate: currentBooking.trip.travel_date,
                    departureTime: currentBooking.trip.departure_time,
                  }
                : paymentSession?.tripInfo
            }
            sessionData={
              mibSessionData || paymentSession?.sessionData || undefined
            }
            onClose={() => {
              setShowMibPayment(false);
              setCurrentBookingId('');
              setMibSessionData(null);
              setMibBookingDetails(null);
              clearPaymentSession();
            }}
            onSuccess={result => {
              const bookingIdForResult = getActiveBookingId();
              if (!bookingIdForResult) {
                showError(
                  'Payment Error',
                  'Unable to verify booking reference after payment.'
                );
                return;
              }
              finalizePaymentFlow(bookingIdForResult, 'SUCCESS', {
                sessionId: result.sessionId,
              });
            }}
            onFailure={error => {
              const bookingIdForResult = getActiveBookingId();
              if (!bookingIdForResult) {
                showError(
                  'Payment Error',
                  error || 'Unable to continue payment.'
                );
                return;
              }
              finalizePaymentFlow(bookingIdForResult, 'FAILURE');
            }}
            onCancel={() => {
              if (timerExpiredRef.current) {
                timerExpiredRef.current = false;
                return;
              }
              const bookingIdForResult = getActiveBookingId();
              if (!bookingIdForResult) {
                showError(
                  'Payment Cancelled',
                  'Booking reference missing while cancelling payment.'
                );
                return;
              }
              finalizePaymentFlow(bookingIdForResult, 'CANCELLED');
            }}
            onSessionCreated={session => {
              setMibSessionData(session);
              updatePaymentSession({ sessionData: session });
            }}
            onTimerExpired={async () => {
              timerExpiredRef.current = true;
              resetLocalFormState();
              const bookingIdForResult = getActiveBookingId();
              if (!bookingIdForResult) {
                handlePaymentTimeout();
                return;
              }

              // Check booking status before calling handlePaymentTimeout
              const status = await checkBookingStatus(bookingIdForResult);

              if (status === 'cancelled') {
                // Already cancelled, just clear session and show message
                clearPaymentSession();
                showInfo(
                  'Payment Session Expired',
                  'The payment window expired and your booking was automatically cancelled.'
                );
                router.replace('/(app)/(customer)/(tabs)/bookings');
              } else {
                // Call timeout handler
                handlePaymentTimeout();
              }
            }}
          />
        )}
      </ScrollView>
    </KeyboardAvoidingView>
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
  guestNotice: {
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#fff5e6',
    borderWidth: 1,
    borderColor: '#ffe0b2',
    gap: 12,
  },
  guestNoticeTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
  guestNoticeText: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 24,
    textAlign: 'center',
  },
  seatSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
    marginTop: 16,
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
  hotlineNumber: {
    fontWeight: '700',
    color: Colors.primary,
  },
  paymentReminderCard: {
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
    padding: 16,
    gap: 12,
  },
  paymentReminderTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
  paymentReminderText: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  paymentReminderTime: {
    fontWeight: '700',
    color: Colors.primary,
  },
  paymentReminderNote: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontStyle: 'italic',
  },
  paymentReminderActions: {
    flexDirection: 'row',
    gap: 12,
  },
  paymentReminderButton: {
    flex: 1,
  },
  cancelButtonText: {
    color: Colors.error,
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
  errorText: {
    color: Colors.error,
    fontSize: 14,
    marginBottom: 16,
    marginTop: 8,
  },
});
