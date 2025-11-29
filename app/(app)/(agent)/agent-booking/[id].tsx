import React, {
  useState,
  useRef,
  useEffect,
  useMemo,
  useCallback,
} from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  Modal,
  AppState,
  AppStateStatus,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import {
  Clock,
  Share2,
  X,
  AlertCircle,
  Info,
  Phone,
  Luggage,
  FileText,
  DollarSign,
  Globe,
  Timer,
  ChevronDown,
  ChevronUp,
} from 'lucide-react-native';
import { useAgentStore } from '@/store/agent/agentStore';
import { useBookingEligibility } from '@/hooks/useBookingEligibility';
import {
  BookingDetailsHeader,
  TripDetailsCard,
  PassengerDetailsCard,
  ClientInfoCard,
  PaymentDetailsCard,
  BookingActions,
} from '@/components/booking';
import TicketCard from '@/components/TicketCard';
import TicketDesign from '@/components/TicketDesign';
import Button from '@/components/Button';
import Card from '@/components/Card';
import { shareBookingTicket } from '@/utils/shareUtils';
import Colors from '@/constants/colors';
import { useAlertContext } from '@/components/AlertProvider';
import { usePaymentSessionStore } from '@/store/paymentSessionStore';
import { usePaymentSessionValidator } from '@/hooks/usePaymentSessionValidator';
import { usePendingBookingWatcher } from '@/hooks/usePendingBookingWatcher';
import { supabase } from '@/utils/supabase';
import { BUFFER_MINUTES_PAYMENT_WINDOW } from '@/constants/customer';
import { getMinutesUntilDeparture } from '@/utils/bookingUtils';
import {
  calculateBookingExpiry,
  combineTripDateTime,
} from '@/utils/bookingExpiryUtils';
import { cancelPendingBookingDirectly } from '@/utils/paymentUtils';
import MibPaymentWebView from '@/components/MibPaymentWebView';
import ResumePaymentBanner from '@/components/agent/ResumePaymentBanner';

export default function BookingDetailsScreen() {
  const { showError, showSuccess, showInfo } = useAlertContext();
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { agent, bookings, clients, refreshBookingsData } = useAgentStore();
  const ticketDesignRef = useRef<any>(null);
  const imageGenerationTicketRef = useRef<any>(null);
  const [showTicketPopup, setShowTicketPopup] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [expandedPolicies, setExpandedPolicies] = useState<{
    checkin: boolean;
    luggage: boolean;
    cancellation: boolean;
    refund: boolean;
    conditions: boolean;
  }>({
    checkin: false,
    luggage: false,
    cancellation: false,
    refund: false,
    conditions: false,
  });

  // Payment session management
  const paymentSession = usePaymentSessionStore(state => state.session);
  const setPaymentSession = usePaymentSessionStore(state => state.setSession);
  const updatePaymentSession = usePaymentSessionStore(
    state => state.updateSession
  );
  const clearPaymentSession = usePaymentSessionStore(
    state => state.clearSession
  );
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  // Payment modal state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentBookingDetails, setPaymentBookingDetails] = useState<any>(null);
  const [paymentSessionData, setPaymentSessionData] = useState<any>(null);
  const [activePaymentBookingId, setActivePaymentBookingId] = useState('');
  const [autoCancelTriggered, setAutoCancelTriggered] = useState(false);
  const [showCancelConfirmModal, setShowCancelConfirmModal] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancellationInfo, setCancellationInfo] = useState<{
    refundAmount: number;
  } | null>(null);

  // Validate payment session on app resume and clear expired sessions
  usePaymentSessionValidator();

  // Find the booking by id
  const booking = bookings.find(b => b.id === id);

  // Use booking eligibility hook - convert agent booking to main booking type
  const convertedBooking = booking
    ? {
        ...booking,
        totalFare: Number(booking.totalAmount) || 0,
        createdAt: String(booking.bookingDate || new Date().toISOString()),
        bookingNumber: String(booking.bookingNumber || booking.id || 'N/A'),
      }
    : null;

  const { isModifiable, isCancellable, message } = useBookingEligibility({
    booking: convertedBooking as any,
    isFromModification: (booking as any)?.isFromModification || false,
  });

  // Load cancellation / refund info when booking is cancelled
  useEffect(() => {
    const loadCancellationInfo = async () => {
      if (!booking || booking.status !== 'cancelled') {
        setCancellationInfo(null);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('cancellations')
          .select('refund_amount')
          .eq('booking_id', booking.id)
          .maybeSingle();

        if (!error && data && typeof data.refund_amount === 'number') {
          setCancellationInfo({ refundAmount: Number(data.refund_amount) });
        } else {
          setCancellationInfo(null);
        }
      } catch (loadError) {
        console.warn(
          '[Agent Booking] Failed to load cancellation/refund info:',
          loadError
        );
        setCancellationInfo(null);
      }
    };

    loadCancellationInfo();
  }, [booking?.id, booking?.status]);

  // Re-check booking status to ensure it's still pending (handles auto-cancellation)
  const [actualBookingStatus, setActualBookingStatus] = useState<string | null>(
    booking?.status ?? null
  );
  const [statusCheckReady, setStatusCheckReady] = useState(false);

  // Payment pending state - check if booking status is pending_payment (from database)
  const isPaymentPending = useMemo(() => {
    if (!booking) return false;
    // Check both the booking object status and actualBookingStatus
    // Note: booking.status may be 'pending' but actualBookingStatus from DB is 'pending_payment'
    return (
      booking.status === 'pending' ||
      actualBookingStatus === 'pending_payment' ||
      (booking.status as string) === 'pending_payment'
    );
  }, [booking, actualBookingStatus]);

  const bookingCreatedAt = useMemo(
    () =>
      booking
        ? new Date(booking.bookingDate || new Date().toISOString())
        : new Date(0),
    [booking]
  );

  // Calculate smart expiry time based on booking creation and trip departure
  const expiryCalculation = useMemo(() => {
    if (
      !booking ||
      !isPaymentPending ||
      !booking.departureDate ||
      !booking.departureTime
    ) {
      return null;
    }

    try {
      const tripDeparture = combineTripDateTime(
        booking.departureDate,
        booking.departureTime
      );
      return calculateBookingExpiry(bookingCreatedAt, tripDeparture);
    } catch (error) {
      console.error('Error calculating booking expiry:', error);
      return null;
    }
  }, [booking, isPaymentPending, bookingCreatedAt]);

  const paymentWindowExpiresAt = useMemo(() => {
    return expiryCalculation?.expiresAt || new Date(0);
  }, [expiryCalculation]);

  // Countdown timer state
  const [countdown, setCountdown] = useState<{
    minutes: number;
    seconds: number;
    totalSeconds: number;
  } | null>(null);

  // Real-time booking status monitoring
  const { status: pendingBookingStatus, isLoading: pendingStatusLoading } =
    usePendingBookingWatcher({
      bookingId: paymentSession?.bookingId || booking?.id,
      enabled: !!isPaymentPending && (!!paymentSession || !!booking),
    });

  // Calculate initial countdown with booking status check
  useEffect(() => {
    if (
      !booking ||
      !isPaymentPending ||
      !expiryCalculation ||
      expiryCalculation.isExpired
    ) {
      setCountdown(null);
      return;
    }

    const updateCountdown = async () => {
      // Check booking status from database to detect auto-cancellation
      try {
        const { data: currentBooking, error } = await supabase
          .from('bookings')
          .select('status')
          .eq('id', booking.id)
          .single();

        // If booking is no longer pending, stop countdown and refresh
        if (!error && currentBooking) {
          if (currentBooking.status !== 'pending_payment') {
            // Booking was cancelled or confirmed - stop countdown and refresh
            setCountdown(null);
            await refreshBookingsData();
            return;
          }
        }
      } catch (error) {
        console.error('Error checking booking status in countdown:', error);
      }

      // Calculate countdown time
      const now = new Date();
      const expiresAt = expiryCalculation.expiresAt;
      const diff = Math.max(0, expiresAt.getTime() - now.getTime());
      const totalSeconds = Math.floor(diff / 1000);
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;

      setCountdown({ minutes, seconds, totalSeconds });

      // If countdown reached zero, check booking status one more time
      if (totalSeconds === 0) {
        // Give backend a moment to process cancellation
        setTimeout(async () => {
          await refreshBookingsData();
        }, 1000);
      }
    };

    // Update immediately
    updateCountdown();

    // Update every second, but check booking status every 5 seconds to avoid too many DB calls
    let checkCounter = 0;
    const interval = setInterval(() => {
      checkCounter++;
      // Check booking status every 5 seconds
      if (checkCounter % 5 === 0) {
        updateCountdown();
      } else {
        // Just update countdown display
        const now = new Date();
        const expiresAt = expiryCalculation.expiresAt;
        const diff = Math.max(0, expiresAt.getTime() - now.getTime());
        const totalSeconds = Math.floor(diff / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        setCountdown({ minutes, seconds, totalSeconds });

        // If countdown reached zero, check booking status
        if (totalSeconds === 0) {
          setTimeout(async () => {
            await refreshBookingsData();
          }, 1000);
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [booking, isPaymentPending, expiryCalculation, refreshBookingsData]);

  const paymentMinutesRemaining = countdown?.minutes || 0;
  const paymentSecondsRemaining = countdown?.seconds || 0;

  // Periodically check booking status to detect auto-cancellation
  useEffect(() => {
    if (!booking || !isPaymentPending) {
      setActualBookingStatus(booking?.status ?? null);
      setStatusCheckReady(true);
      return;
    }

    let isMounted = true;

    const checkBookingStatus = async () => {
      try {
        const { data: currentBooking, error } = await supabase
          .from('bookings')
          .select('status')
          .eq('id', booking.id)
          .single();

        if (!error && currentBooking && isMounted) {
          setActualBookingStatus(currentBooking.status);

          // If booking is no longer pending, refresh bookings list
          if (currentBooking.status !== 'pending_payment') {
            await refreshBookingsData();
          }
        }
      } catch (error) {
        console.error('Error checking booking status:', error);
      } finally {
        if (isMounted) {
          setStatusCheckReady(true);
        }
      }
    };

    // Check immediately
    checkBookingStatus();

    // Check every 3 seconds to catch auto-cancellations quickly
    const statusInterval = setInterval(checkBookingStatus, 3000);

    return () => {
      isMounted = false;
      clearInterval(statusInterval);
    };
  }, [booking?.id, booking?.status, isPaymentPending, refreshBookingsData]);

  const isWithinPaymentWindow =
    !!booking &&
    isPaymentPending &&
    actualBookingStatus === 'pending_payment' && // Check actual status from DB
    expiryCalculation !== null &&
    !expiryCalculation.isExpired &&
    countdown !== null &&
    countdown.totalSeconds > 0;

  // Refresh booking when screen comes into focus (handles auto-cancellation updates)
  useFocusEffect(
    useCallback(() => {
      refreshBookingsData();
    }, [refreshBookingsData])
  );

  // Payment window calculation
  const calculatePaymentWindowSeconds = useCallback(
    (tripInfo?: { travelDate: string; departureTime: string }) => {
      let maxTimerSeconds = BUFFER_MINUTES_PAYMENT_WINDOW * 60;
      if (tripInfo?.travelDate && tripInfo?.departureTime) {
        const minutesUntilDeparture = getMinutesUntilDeparture(
          tripInfo.travelDate,
          tripInfo.departureTime
        );
        if (minutesUntilDeparture > 0) {
          maxTimerSeconds = Math.max(
            30,
            Math.min(maxTimerSeconds, minutesUntilDeparture * 60)
          );
        } else {
          maxTimerSeconds = 0;
        }
      }
      return maxTimerSeconds;
    },
    []
  );

  const computeSessionExpiry = useCallback(
    (tripInfo?: { travelDate: string; departureTime: string }) => {
      const seconds = calculatePaymentWindowSeconds(tripInfo);
      const timerExpiry = new Date(Date.now() + seconds * 1000);
      return new Date(
        Math.min(timerExpiry.getTime(), paymentWindowExpiresAt.getTime())
      );
    },
    [calculatePaymentWindowSeconds, paymentWindowExpiresAt]
  );

  const getActivePaymentBookingId = useCallback(
    () =>
      activePaymentBookingId || paymentSession?.bookingId || booking?.id || '',
    [activePaymentBookingId, paymentSession?.bookingId, booking?.id]
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

  // Auto-cancellation handler
  const handlePaymentTimeout = useCallback(async () => {
    const targetBookingId = getActivePaymentBookingId();
    if (!targetBookingId || autoCancelTriggered) {
      return;
    }

    setAutoCancelTriggered(true);

    try {
      await supabase.functions.invoke('auto-cancel-pending', {
        body: { bookingId: targetBookingId },
      });

      // Wait a moment for database update
      await new Promise(resolve => setTimeout(resolve, 500));

      // Check if booking was actually cancelled
      const status = await checkBookingStatus(targetBookingId);

      if (status === 'cancelled') {
        // Booking was auto-cancelled
        clearPaymentSession();
        showInfo(
          'Payment Expired',
          'The payment window expired and the booking was automatically cancelled.'
        );
        await refreshBookingsData();
        return;
      }
    } catch (error) {
      console.warn('Auto cancellation function failed:', error);
    }

    // Fallback: if status check fails, still show info but refresh
    clearPaymentSession();
    showInfo(
      'Payment Session Expired',
      'The payment window has expired. Please check your bookings for the current status.'
    );
    await refreshBookingsData();
  }, [
    getActivePaymentBookingId,
    autoCancelTriggered,
    clearPaymentSession,
    showInfo,
    refreshBookingsData,
    checkBookingStatus,
  ]);

  // Cancel pending booking handler
  const handleCancelPendingBooking = useCallback(() => {
    if (!booking || !isPaymentPending) {
      return;
    }
    setShowCancelConfirmModal(true);
  }, [booking, isPaymentPending]);

  const confirmCancelPendingBooking = useCallback(async () => {
    if (!booking || !isPaymentPending || isCancelling) {
      return;
    }

    setIsCancelling(true);
    try {
      // Use direct database update for instant cancellation
      await cancelPendingBookingDirectly(booking.id, 'Cancelled by agent');
      setShowCancelConfirmModal(false);
      showInfo(
        'Booking Cancelled',
        'The pending booking has been cancelled and seats have been released.'
      );
      await refreshBookingsData();
    } catch (error: any) {
      showError(
        'Cancellation Failed',
        error?.message || 'Failed to cancel booking. Please try again.'
      );
    } finally {
      setIsCancelling(false);
    }
  }, [
    booking,
    isPaymentPending,
    isCancelling,
    showInfo,
    showError,
    refreshBookingsData,
  ]);

  // Continue payment handler
  const handleContinuePayment = useCallback(() => {
    if (!booking) {
      return;
    }
    if (!isPaymentPending || !isWithinPaymentWindow) {
      showInfo(
        'Payment Window Expired',
        'This booking can no longer be paid because the payment window passed.'
      );
      return;
    }

    const routeLabel = booking.route
      ? `${booking.route.fromIsland?.name || booking.origin || 'N/A'} → ${booking.route.toIsland?.name || booking.destination || 'N/A'}`
      : `${booking.origin || 'N/A'} → ${booking.destination || 'N/A'}`;

    const details = {
      bookingNumber: booking.bookingNumber || booking.id || 'N/A',
      route: routeLabel,
      travelDate: booking.departureDate || new Date().toISOString(),
      amount: Number(booking.totalAmount) || 0,
      currency: 'MVR',
      passengerCount: booking.passengers?.length || booking.passengerCount || 0,
    };

    const tripInfo = {
      travelDate: booking.departureDate || new Date().toISOString(),
      departureTime: booking.departureTime || '00:00',
    };

    const expiresAtDate = computeSessionExpiry(tripInfo);

    setActivePaymentBookingId(booking.id);
    setPaymentBookingDetails(details);
    setPaymentSessionData(
      paymentSession && paymentSession.bookingId === booking.id
        ? paymentSession.sessionData
        : null
    );
    setPaymentSession({
      bookingId: booking.id,
      bookingDetails: details,
      context: 'booking',
      tripInfo,
      sessionData:
        paymentSession && paymentSession.bookingId === booking.id
          ? paymentSession.sessionData
          : null,
      startedAt: new Date().toISOString(),
      expiresAt: expiresAtDate.toISOString(),
    });
    setShowPaymentModal(true);
  }, [
    booking,
    computeSessionExpiry,
    isPaymentPending,
    isWithinPaymentWindow,
    paymentSession,
    setPaymentSession,
    showInfo,
  ]);

  // Resume payment handler
  const handleResumePayment = useCallback(() => {
    if (!paymentSession) return;
    setPaymentBookingDetails(paymentSession.bookingDetails);
    setActivePaymentBookingId(paymentSession.bookingId);
    setPaymentSessionData(paymentSession.sessionData || null);
    setShowPaymentModal(true);
  }, [paymentSession]);

  // Auto-cancel pending booking when timeout
  const autoCancelPendingBooking = useCallback(async () => {
    if (
      !booking ||
      !isPaymentPending ||
      countdown === null ||
      isWithinPaymentWindow ||
      autoCancelTriggered ||
      !statusCheckReady ||
      actualBookingStatus !== 'pending_payment'
    ) {
      return;
    }
    setAutoCancelTriggered(true);
    try {
      await supabase.functions.invoke('auto-cancel-pending', {
        body: { bookingId: booking.id },
      });
      showInfo(
        'Booking Cancelled',
        'The payment window expired and the booking was automatically cancelled.'
      );
      await refreshBookingsData();
    } catch (error: any) {
      showError(
        'Auto cancellation failed',
        error?.message || 'Failed to cancel booking automatically.'
      );
    }
  }, [
    booking,
    isPaymentPending,
    isWithinPaymentWindow,
    countdown,
    autoCancelTriggered,
    statusCheckReady,
    actualBookingStatus,
    showInfo,
    showError,
    refreshBookingsData,
  ]);

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

  const [resumeCountdown, setResumeCountdown] = useState<{
    minutes: number;
    seconds: number;
    totalSeconds: number;
  } | null>(null);

  useEffect(() => {
    autoCancelPendingBooking();
  }, [autoCancelPendingBooking]);

  useEffect(() => {
    if (
      !paymentSession ||
      showPaymentModal ||
      !resumeBannerExpiry?.expiresAt ||
      resumeBannerExpiry.isExpired ||
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
    paymentSession,
    showPaymentModal,
    resumeBannerExpiry?.expiresAt,
    resumeBannerExpiry?.isExpired,
    pendingBookingStatus,
    handlePaymentTimeout,
  ]);

  const shouldShowResumeBanner =
    !!paymentSession &&
    // Only show banner if the session belongs to the currently logged-in agent
    !!agent?.id &&
    paymentSession.userId === agent.id &&
    !showPaymentModal &&
    resumeBannerExpiry !== null &&
    !resumeBannerExpiry.isExpired &&
    pendingBookingStatus === 'pending_payment' &&
    !pendingStatusLoading;

  // Monitor payment session expiry
  useEffect(() => {
    // Clear any session that belongs to a different agent
    if (paymentSession && agent?.id && paymentSession.userId !== agent.id) {
      clearPaymentSession();
      return;
    }

    if (
      !booking ||
      !paymentSession ||
      paymentSession.bookingId !== booking.id ||
      showPaymentModal
    ) {
      return;
    }
    if (new Date(paymentSession.expiresAt).getTime() <= Date.now()) {
      handlePaymentTimeout();
    }
  }, [booking, paymentSession, showPaymentModal, handlePaymentTimeout]);

  // Handle app state changes
  useEffect(() => {
    const subscription = AppState.addEventListener(
      'change',
      (nextState: AppStateStatus) => {
        if (
          appStateRef.current.match(/inactive|background/) &&
          nextState === 'active'
        ) {
          // Refresh bookings when app comes to foreground (handles auto-cancellation)
          refreshBookingsData();

          // Check if payment session expired while app was in background
          if (
            booking &&
            paymentSession &&
            paymentSession.bookingId === booking.id
          ) {
            if (new Date(paymentSession.expiresAt).getTime() <= Date.now()) {
              handlePaymentTimeout();
            }
          }
        }
        appStateRef.current = nextState;
      }
    );

    return () => subscription.remove();
  }, [booking, paymentSession, handlePaymentTimeout, refreshBookingsData]);

  // Monitor pending booking status changes
  useEffect(() => {
    if (
      !paymentSession?.bookingId ||
      pendingStatusLoading ||
      !pendingBookingStatus ||
      pendingBookingStatus === 'pending_payment'
    ) {
      return;
    }

    clearPaymentSession();
    if (pendingBookingStatus === 'cancelled') {
      showInfo(
        'Booking Cancelled',
        'The payment window expired and your booking was automatically cancelled.'
      );
    }
    refreshBookingsData();
  }, [
    pendingBookingStatus,
    pendingStatusLoading,
    paymentSession?.bookingId,
    clearPaymentSession,
    showInfo,
    refreshBookingsData,
  ]);

  const finalizePaymentFlow = useCallback(
    (
      targetBookingId: string,
      result: 'SUCCESS' | 'FAILURE' | 'CANCELLED',
      extraParams: Record<string, string> = {}
    ) => {
      setShowPaymentModal(false);
      setActivePaymentBookingId('');
      setPaymentBookingDetails(null);
      setPaymentSessionData(null);
      clearPaymentSession();
      router.replace({
        pathname: '/(app)/(agent)/payment-success',
        params: {
          bookingId: targetBookingId,
          result,
          resetBooking: 'false',
          ...extraParams,
        },
      });
    },
    [clearPaymentSession, router]
  );

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

  const handleShareTicket = () => {
    setShowTicketPopup(true);
  };

  const handleShareIconPress = async () => {
    try {
      setIsSharing(true);

      // Small delay to ensure component is ready
      await new Promise(resolve => setTimeout(resolve, 300));

      // Use the robust shareUtils function with image generation TicketDesign ref
      await shareBookingTicket(
        ticketBookingData as any,
        imageGenerationTicketRef,
        showError
      );

      setShowTicketPopup(false);
    } catch (error) {
      showError('Sharing Error', 'Failed to share ticket. Please try again.');
    } finally {
      setIsSharing(false);
    }
  };

  const handleCloseTicketPopup = () => {
    setShowTicketPopup(false);
  };

  const togglePolicySection = (section: keyof typeof expandedPolicies) => {
    setExpandedPolicies(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const renderPoliciesAndConditions = () => (
    <View style={styles.policiesCard}>
      <Text style={styles.cardTitle}>Important Information & Policies</Text>

      {/* Check-in & Boarding */}
      <View style={styles.policySection}>
        <Pressable
          style={styles.policySectionHeader}
          onPress={() => togglePolicySection('checkin')}
        >
          <Timer size={18} color={Colors.primary} />
          <Text style={styles.policySectionTitle}>Check-in & Boarding</Text>
          {expandedPolicies.checkin ? (
            <ChevronUp size={18} color={Colors.primary} />
          ) : (
            <ChevronDown size={18} color={Colors.primary} />
          )}
        </Pressable>
        <Text style={styles.policyText}>
          Check-in: 30 min before departure • Boarding: 10 min before departure
        </Text>
        {expandedPolicies.checkin && (
          <View style={styles.expandedContent}>
            <Text style={styles.policyText}>
              Passengers must check in at least 30 minutes before departure time
              at the jetty and be at the boarding gate at least 10 minutes
              before departure time at the ferry. Late arrivals may result in
              denied boarding without refund.
            </Text>
          </View>
        )}
      </View>

      {/* Luggage Policy */}
      <View style={styles.policySection}>
        <Pressable
          style={styles.policySectionHeader}
          onPress={() => togglePolicySection('luggage')}
        >
          <Luggage size={18} color={Colors.primary} />
          <Text style={styles.policySectionTitle}>Luggage Policy</Text>
          {expandedPolicies.luggage ? (
            <ChevronUp size={18} color={Colors.primary} />
          ) : (
            <ChevronDown size={18} color={Colors.primary} />
          )}
        </Pressable>
        <Text style={styles.policyText}>
          1 luggage per ticket • 1 handbag per ticket • Prohibited items apply
        </Text>
        {expandedPolicies.luggage && (
          <View style={styles.expandedContent}>
            <View style={styles.policyList}>
              <Text style={styles.policyListItem}>
                • 1 luggage per ticket: Max 15kg, dimensions 67x43x26cm
              </Text>
              <Text style={styles.policyListItem}>
                • 1 handbag per ticket: Max 5kg, dimensions 25x20x6cm
              </Text>
              <Text style={styles.policyListItem}>
                • Large/excessively long articles (fishing rods, poles, pipes,
                tubes) not allowed
              </Text>
              <Text style={styles.policyListItem}>
                • Prohibited: Chemicals, aerosols, alcohol, drugs, sharp
                objects, weapons, ammunition, valuables, fragile articles,
                dangerous goods
              </Text>
            </View>
          </View>
        )}
      </View>

      {/* Cancellation & Modification Policy */}
      <View style={styles.policySection}>
        <Pressable
          style={styles.policySectionHeader}
          onPress={() => togglePolicySection('cancellation')}
        >
          <FileText size={18} color={Colors.primary} />
          <Text style={styles.policySectionTitle}>
            Cancellation & Modification
          </Text>
          {expandedPolicies.cancellation ? (
            <ChevronUp size={18} color={Colors.primary} />
          ) : (
            <ChevronDown size={18} color={Colors.primary} />
          )}
        </Pressable>
        <Text style={styles.policyText}>
          Cancel: 48+ hrs allowed • Modify: 72+ hrs • 50% charge applies
        </Text>
        {expandedPolicies.cancellation && (
          <View style={styles.expandedContent}>
            <View style={styles.policyList}>
              <Text style={styles.policyListItem}>
                • Cancellation allowed: 48+ hours before departure
              </Text>
              <Text style={styles.policyListItem}>
                • Cancellation not possible: Less than 72 hours before departure
              </Text>
              <Text style={styles.policyListItem}>
                • Cancellation charge: 50% of ticket fare
              </Text>
              <Text style={styles.policyListItem}>
                • Modification allowed: 72+ hours before departure
              </Text>
              <Text style={styles.policyListItem}>
                • No refund for no-shows or late arrivals
              </Text>
            </View>
          </View>
        )}
      </View>

      {/* Refund Policy */}
      <View style={styles.policySection}>
        <Pressable
          style={styles.policySectionHeader}
          onPress={() => togglePolicySection('refund')}
        >
          <DollarSign size={18} color={Colors.primary} />
          <Text style={styles.policySectionTitle}>Refund Policy</Text>
          {expandedPolicies.refund ? (
            <ChevronUp size={18} color={Colors.primary} />
          ) : (
            <ChevronDown size={18} color={Colors.primary} />
          )}
        </Pressable>
        <Text style={styles.policyText}>
          Processing: 72 hrs • Bank transfer • 50% charge applies
        </Text>
        {expandedPolicies.refund && (
          <View style={styles.expandedContent}>
            <View style={styles.policyList}>
              <Text style={styles.policyListItem}>
                • Refund processing time: 72 hours after cancellation request
              </Text>
              <Text style={styles.policyListItem}>
                • Refunds processed to bank account provided during cancellation
              </Text>
              <Text style={styles.policyListItem}>
                • Cancellation charge of 50% applies to all eligible
                cancellations
              </Text>
              <Text style={styles.policyListItem}>
                • Operator cancellations: Full refund or rebooking on next
                available service
              </Text>
            </View>
          </View>
        )}
      </View>

      {/* Conditions of Carriage */}
      <View style={styles.policySection}>
        <Pressable
          style={styles.policySectionHeader}
          onPress={() => togglePolicySection('conditions')}
        >
          <Info size={18} color={Colors.primary} />
          <Text style={styles.policySectionTitle}>Conditions of Carriage</Text>
          {expandedPolicies.conditions ? (
            <ChevronUp size={18} color={Colors.primary} />
          ) : (
            <ChevronDown size={18} color={Colors.primary} />
          )}
        </Pressable>
        <Text style={styles.policyText}>
          Contract terms • ID required • Age restrictions • Behavior rules
        </Text>
        {expandedPolicies.conditions && (
          <View style={styles.expandedContent}>
            <View style={styles.policyList}>
              <Text style={styles.policyListItem}>
                • By purchasing a ticket, you enter into a contract of carriage
                with the ferry operator
              </Text>
              <Text style={styles.policyListItem}>
                • Valid identification required and must be presented upon
                request
              </Text>
              <Text style={styles.policyListItem}>
                • Passengers must be 18+ years to travel unaccompanied
              </Text>
              <Text style={styles.policyListItem}>
                • Tickets are non-transferable and valid only for specified
                date/time
              </Text>
              <Text style={styles.policyListItem}>
                • Fare covers journey from departure point to destination
              </Text>
              <Text style={styles.policyListItem}>
                • Additional services or excess baggage may incur extra charges
              </Text>
              <Text style={styles.policyListItem}>
                • Passengers must behave appropriately and follow crew
                instructions
              </Text>
              <Text style={styles.policyListItem}>
                • Drugs, alcohol, and smoking are prohibited on board
              </Text>
              <Text style={styles.policyListItem}>
                • Special assistance requests must be made at time of booking
              </Text>
              <Text style={styles.policyListItem}>
                • Operator may cancel/delay services due to weather or
                unforeseen circumstances
              </Text>
            </View>
          </View>
        )}
      </View>

      {/* Contact Information */}
      <View style={[styles.policySection, styles.contactSection]}>
        <View style={styles.policySectionHeader}>
          <Phone size={18} color={Colors.primary} />
          <Text style={styles.policySectionTitle}>Contact Information</Text>
        </View>
        <View style={styles.contactInfo}>
          <View style={styles.contactItem}>
            <Phone size={14} color={Colors.primary} />
            <Text style={styles.contactText}>Hotline: 3323113 or 7892929</Text>
          </View>
          <View style={styles.contactItem}>
            <Info size={14} color={Colors.primary} />
            <Text style={styles.contactText}>
              Email: crystalhotelsmv@gmail.com
            </Text>
          </View>
          <View style={styles.contactItem}>
            <Globe size={14} color={Colors.primary} />
            <Text style={styles.contactText}>
              Website: www.crystalhotels.mv
            </Text>
          </View>
          <View style={styles.contactItem}>
            <Clock size={14} color={Colors.primary} />
            <Text style={styles.contactText}>
              Office Hours: 6:00 AM - 10:00 PM
            </Text>
          </View>
        </View>
      </View>
    </View>
  );

  // Prepare data for components
  const pickupDisplayName =
    booking.pickupName ||
    booking.origin ||
    booking.route?.fromIsland?.name ||
    'Unknown';
  const dropoffDisplayName =
    booking.dropoffName ||
    booking.destination ||
    booking.route?.toIsland?.name ||
    'Unknown';

  const ticketRoute = booking.route
    ? {
        ...booking.route,
        fromIsland: {
          ...(booking.route.fromIsland || {}),
          id: booking.route.fromIsland?.id || 'from',
          zone: booking.route.fromIsland?.zone || 'A',
          name: pickupDisplayName,
        },
        toIsland: {
          ...(booking.route.toIsland || {}),
          id: booking.route.toIsland?.id || 'to',
          zone: booking.route.toIsland?.zone || 'A',
          name: dropoffDisplayName,
        },
      }
    : ({
        id: 'unknown',
        fromIsland: {
          id: 'from',
          name: pickupDisplayName,
          zone: 'A',
        },
        toIsland: {
          id: 'to',
          name: dropoffDisplayName,
          zone: 'A',
        },
        baseFare: Number(booking.totalAmount) || 0,
      } as any);

  const ticketBookingData = {
    ...booking,
    totalFare: Number(booking.totalAmount) || 0,
    createdAt: String(booking.bookingDate || new Date().toISOString()),
    bookingNumber: String(booking.bookingNumber || booking.id || 'N/A'),
    tripType: String(booking.tripType || 'one_way'),
    departureTime: String(booking.departureTime || '00:00'),
    route: ticketRoute,
    seats: Array.isArray(booking.seats) ? booking.seats : [],
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Booking Details',
        }}
      />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
      >
        {/* Header with booking number and status */}
        <BookingDetailsHeader
          bookingNumber={String(booking.bookingNumber || 'N/A')}
          status={String(booking.status || 'unknown')}
          onShare={handleShareTicket}
        />

        {/* Resume Payment Banner */}
        {shouldShowResumeBanner && paymentSession && (
          <ResumePaymentBanner
            bookingNumber={paymentSession.bookingDetails.bookingNumber}
            countdown={resumeCountdown}
            expiryReason={resumeBannerExpiry?.reason}
            onResume={handleResumePayment}
            onCancel={handleCancelPendingBooking}
          />
        )}

        {/* Payment Pending Card (only when there is no active resume banner) */}
        {isPaymentPending && !shouldShowResumeBanner && (
          <Card variant='elevated' style={styles.paymentPendingCard}>
            <View style={styles.paymentPendingHeader}>
              <Clock size={20} color={Colors.primary} />
              <Text style={styles.paymentPendingTitle}>Payment Pending</Text>
            </View>
            <Text style={styles.paymentPendingText}>
              {actualBookingStatus === 'cancelled' ? (
                'This booking has been automatically cancelled. The payment window expired.'
              ) : isWithinPaymentWindow ? (
                <>
                  This booking is awaiting payment. Seats are reserved for{' '}
                  <Text style={styles.paymentPendingTime}>
                    {paymentMinutesRemaining.toString().padStart(2, '0')}:
                    {paymentSecondsRemaining.toString().padStart(2, '0')}
                  </Text>
                  {expiryCalculation?.reason === 'departure_time' && (
                    <Text style={styles.paymentPendingNote}>
                      {' '}
                      (until departure time)
                    </Text>
                  )}
                  .
                </>
              ) : (
                'The payment window expired. This booking will be cancelled automatically.'
              )}
            </Text>
            {isWithinPaymentWindow && (
              <View style={styles.paymentPendingActions}>
                <Button
                  title='Continue Payment'
                  onPress={handleContinuePayment}
                  style={styles.paymentPendingButton}
                />
                <Button
                  title='Cancel Booking'
                  onPress={handleCancelPendingBooking}
                  variant='outline'
                  style={styles.paymentPendingButton}
                  textStyle={styles.cancelButtonText}
                />
              </View>
            )}
          </Card>
        )}

        {/* Ticket Card with QR Code */}
        <TicketCard booking={ticketBookingData as any} />

        {/* Ticket Modal */}
        <Modal
          visible={showTicketPopup}
          animationType='slide'
          presentationStyle='pageSheet'
          onRequestClose={handleCloseTicketPopup}
        >
          <SafeAreaView style={styles.modalContainer}>
            {/* Header with buttons */}
            <View style={styles.modalHeader}>
              {/* Close Button */}
              <Pressable
                style={styles.modalCloseButton}
                onPress={handleCloseTicketPopup}
              >
                <X size={24} color={Colors.text} />
              </Pressable>

              {/* Title */}
              <Text style={styles.modalTitle}>Ticket Details</Text>

              {/* Share Button - Only show for confirmed, completed, and checked_in bookings */}
              {(booking.status === 'confirmed' ||
                booking.status === 'completed' ||
                booking.status === 'checked_in') && (
                <Pressable
                  style={[
                    styles.modalShareButton,
                    isSharing && styles.shareIconButtonDisabled,
                  ]}
                  onPress={handleShareIconPress}
                  disabled={isSharing}
                >
                  <Share2
                    size={24}
                    color={isSharing ? Colors.textSecondary : Colors.primary}
                  />
                </Pressable>
              )}
            </View>

            {/* Ticket Content */}
            <ScrollView
              style={styles.modalScrollView}
              contentContainerStyle={styles.modalScrollContent}
              showsVerticalScrollIndicator={false}
              showsHorizontalScrollIndicator={false}
              bounces={false}
            >
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.modalTicketContainer}
                bounces={false}
              >
                <TicketDesign
                  booking={ticketBookingData as any}
                  size='large'
                  ref={ticketDesignRef}
                />
              </ScrollView>
            </ScrollView>
          </SafeAreaView>
        </Modal>

        {/* Trip Details */}
        <TripDetailsCard
          departureDate={booking.departureDate}
          departureTime={booking.departureTime}
          returnDate={booking.returnDate}
          tripType={booking.tripType}
          route={booking.route || undefined}
          origin={booking.origin}
          destination={booking.destination}
          pickupName={booking.pickupName || booking.origin}
          dropoffName={booking.dropoffName || booking.destination}
          passengerCount={
            booking.passengers?.length || booking.passengerCount || 0
          }
          vessel={booking.vessel || undefined}
          status={booking.status}
        />

        {/* Passenger Details */}
        <PassengerDetailsCard
          passengers={booking.passengers || []}
          seats={booking.seats || []}
        />

        {/* Client Information */}
        <ClientInfoCard
          clientName={booking.clientName}
          clientEmail={booking.clientEmail}
          clientPhone={booking.clientPhone}
          clientHasAccount={booking.clientHasAccount}
          clients={clients}
        />

        {/* Payment Details */}
        <PaymentDetailsCard
          totalAmount={Number(booking.totalAmount) || 0}
          discountedAmount={
            booking.discountedAmount
              ? Number(booking.discountedAmount)
              : undefined
          }
          paymentMethod={booking.paymentMethod}
          payment={booking.payment || undefined}
          commission={
            booking.commission ? Number(booking.commission) : undefined
          }
          refundAmount={cancellationInfo?.refundAmount}
        />

        {/* Pricing Disclaimer */}
        <View style={styles.pricingDisclaimerCard}>
          <View style={styles.pricingDisclaimerHeader}>
            <AlertCircle size={20} color={Colors.error} />
            <Text style={styles.pricingDisclaimerTitle}>
              Important Pricing Notice
            </Text>
          </View>
          <Text style={styles.pricingDisclaimerText}>
            The ticket price(s) shown are valid for locals and Work Permit
            holders only. For tickets related to tourists, please reach us on
            our hotlines <Text style={styles.hotlineNumber}>3323113</Text> or{' '}
            <Text style={styles.hotlineNumber}>7892929</Text>.
          </Text>
        </View>

        {/* Policies and Conditions */}
        {renderPoliciesAndConditions()}

        {/* Terms and Conditions Link */}
        <View style={styles.termsLinkSection}>
          <Pressable
            style={styles.termsLinkButton}
            onPress={() => router.push('/(app)/terms-and-conditions')}
          >
            <FileText size={18} color={Colors.primary} />
            <Text style={styles.termsLinkText}>
              View Full Terms & Conditions
            </Text>
          </Pressable>
        </View>

        {/* Action Buttons */}
        <BookingActions
          bookingId={String(booking.id || '')}
          status={String(booking.status || '')}
          tripType={booking.tripType}
          returnDate={booking.returnDate}
          onShare={handleShareTicket}
          paymentStatus={booking.payment?.status || 'pending'}
          isModifiable={isModifiable}
          isCancellable={isCancellable}
          eligibilityMessage={message}
        />

        <Text style={styles.bookingId}>
          Booking ID: {String(booking.id || 'N/A')}
        </Text>

        {/* Hidden TicketDesign for standardized image generation */}
        <View style={styles.hiddenTicketContainer}>
          <TicketDesign
            booking={ticketBookingData as any}
            size='large'
            forImageGeneration={true}
            ref={imageGenerationTicketRef}
          />
        </View>
      </ScrollView>

      {/* MIB Payment WebView */}
      {showPaymentModal && paymentBookingDetails && activePaymentBookingId && (
        <MibPaymentWebView
          visible={showPaymentModal}
          bookingDetails={paymentBookingDetails}
          bookingId={activePaymentBookingId}
          tripInfo={
            booking
              ? {
                  travelDate: booking.departureDate || new Date().toISOString(),
                  departureTime: booking.departureTime || '00:00',
                }
              : paymentSession?.tripInfo
          }
          sessionData={
            paymentSessionData ||
            (paymentSession?.bookingId === booking?.id
              ? paymentSession.sessionData || undefined
              : undefined)
          }
          onClose={() => {
            setShowPaymentModal(false);
            setPaymentBookingDetails(null);
            setPaymentSessionData(null);
            setActivePaymentBookingId('');
            clearPaymentSession();
          }}
          onSuccess={result => {
            const bookingIdForResult = getActivePaymentBookingId();
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
            const bookingIdForResult = getActivePaymentBookingId();
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
            const bookingIdForResult = getActivePaymentBookingId();
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
            setPaymentSessionData(session);
            updatePaymentSession({ sessionData: session });
          }}
          onTimerExpired={async () => {
            const bookingIdForResult = getActivePaymentBookingId();
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
              await refreshBookingsData();
            } else {
              // Call timeout handler
              handlePaymentTimeout();
            }
          }}
        />
      )}

      {/* Cancel Booking Confirmation Modal */}
      <Modal
        visible={showCancelConfirmModal}
        transparent={true}
        animationType='fade'
        onRequestClose={() => !isCancelling && setShowCancelConfirmModal(false)}
      >
        <View style={styles.modalOverlay}>
          <Card variant='elevated' style={styles.confirmModalCard}>
            <View style={styles.confirmModalHeader}>
              <AlertCircle size={24} color={Colors.warning} />
              <Text style={styles.confirmModalTitle}>Cancel Booking</Text>
            </View>
            <Text style={styles.confirmModalText}>
              Are you sure you want to cancel this pending booking? This action
              will release the reserved seats and cannot be undone.
            </Text>
            {booking && (
              <View style={styles.confirmModalBookingInfo}>
                <Text style={styles.confirmModalBookingLabel}>
                  Booking Number:
                </Text>
                <Text style={styles.confirmModalBookingValue}>
                  {booking.bookingNumber || booking.id}
                </Text>
              </View>
            )}
            <View style={styles.confirmModalActions}>
              <Button
                title='No, Keep Booking'
                onPress={() => setShowCancelConfirmModal(false)}
                variant='outline'
                style={styles.confirmModalButton}
                disabled={isCancelling}
                textStyle={styles.confirmModalCancelText}
              />
              <Button
                title={isCancelling ? 'Cancelling...' : 'Yes, Cancel Booking'}
                onPress={confirmCancelPendingBooking}
                style={styles.confirmModalButton}
                disabled={isCancelling}
                textStyle={styles.confirmModalConfirmText}
              />
            </View>
          </Card>
        </View>
      </Modal>
    </>
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
  bookingId: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 16,
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.card,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    flex: 1,
    textAlign: 'center',
  },
  modalCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  modalShareButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  modalScrollView: {
    flex: 1,
  },
  modalScrollContent: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  modalTicketContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '100%',
  },
  shareIconButtonDisabled: {
    opacity: 0.5,
  },
  // Policies and Conditions Styles
  policiesCard: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 16,
  },
  policySection: {
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  policySectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  policySectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginLeft: 8,
    flex: 1,
  },
  expandedContent: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  policyText: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  policyList: {
    gap: 6,
  },
  policyListItem: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  contactSection: {
    borderBottomWidth: 0,
    backgroundColor: Colors.card,
    padding: 12,
    borderRadius: 8,
  },
  contactInfo: {
    gap: 12,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  contactText: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  // Pricing Disclaimer Styles
  pricingDisclaimerCard: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: Colors.error,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  pricingDisclaimerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  pricingDisclaimerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.error,
  },
  pricingDisclaimerText: {
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
  },
  hotlineNumber: {
    fontWeight: '700',
    color: Colors.primary,
  },
  // Terms Link Styles
  termsLinkSection: {
    marginBottom: 16,
  },
  termsLinkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.card,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.primary,
    gap: 8,
  },
  termsLinkText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary,
  },
  // Hidden container for image generation ticket
  hiddenTicketContainer: {
    position: 'absolute',
    left: -10000, // Move far off-screen
    top: -10000,
    opacity: 0,
    pointerEvents: 'none',
  },
  // Payment Pending Styles
  paymentPendingCard: {
    marginBottom: 16,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
  },
  paymentPendingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  paymentPendingTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  paymentPendingText: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: 16,
  },
  paymentPendingTime: {
    fontWeight: '700',
    color: Colors.primary,
  },
  paymentPendingNote: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontStyle: 'italic',
  },
  paymentPendingActions: {
    flexDirection: 'row',
    gap: 12,
  },
  paymentPendingButton: {
    flex: 1,
  },
  cancelButtonText: {
    color: Colors.error,
  },
  // Cancel Confirmation Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  confirmModalCard: {
    width: '100%',
    maxWidth: 400,
    padding: 20,
  },
  confirmModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  confirmModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
  },
  confirmModalText: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: 16,
  },
  confirmModalBookingInfo: {
    backgroundColor: Colors.highlight,
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  confirmModalBookingLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  confirmModalBookingValue: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
  confirmModalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  confirmModalButton: {
    flex: 1,
  },
  confirmModalCancelText: {
    color: Colors.textSecondary,
  },
  confirmModalConfirmText: {
    color: Colors.error,
  },
});
