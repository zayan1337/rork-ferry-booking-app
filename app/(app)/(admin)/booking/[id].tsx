import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Dimensions,
  Text,
  Pressable,
  ActivityIndicator,
  Modal,
  Linking,
  Alert,
  Platform,
  Keyboard,
} from 'react-native';
import {
  Stack,
  router,
  useLocalSearchParams,
  useFocusEffect,
} from 'expo-router';
import { colors } from '@/constants/adminColors';
import { AdminBooking, BookingStatus } from '@/types/admin/management';
import { useAdminBookingStore } from '@/store/admin/bookingStore';
import { useAdminPermissions } from '@/hooks/useAdminPermissions';
import {
  BookingActionsSection,
  BookingQRCode,
  BookingTripDetails,
  BookingPaymentDetails,
  BookingPassengerDetails,
} from '@/components/admin/bookings';
import {
  AlertTriangle,
  ArrowLeft,
  RefreshCw,
  Users,
  CreditCard,
  Calendar,
  MapPin,
  Clock,
  User,
  Phone,
  Mail,
  X,
  Share2,
  Receipt,
  DollarSign,
  Percent,
  TrendingUp,
} from 'lucide-react-native';
import {
  formatDateTime,
  formatCurrency,
} from '@/utils/admin/bookingManagementUtils';
import { formatBookingDate, formatTimeAMPM } from '@/utils/dateUtils';
import { supabase } from '@/utils/supabase';
import { getRouteStops } from '@/utils/segmentUtils';
import { getBookingSegment } from '@/utils/segmentBookingUtils';
import type { RouteStop } from '@/types/multiStopRoute';
import { useAlertContext } from '@/components/AlertProvider';
import { SafeAreaView } from 'react-native-safe-area-context';
import TicketDesign from '@/components/TicketDesign';
import { shareBookingTicket } from '@/utils/shareUtils';
import Card from '@/components/Card';
import Button from '@/components/Button';
import Input from '@/components/Input';
import { calculateRefundAmount } from '@/utils/paymentUtils';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export default function BookingDetailsPage() {
  const { id } = useLocalSearchParams();
  const {
    fetchBooking,
    updateBooking,
    updatePaymentStatus,
    loading: storeLoading,
    error: storeError,
  } = useAdminBookingStore();
  const { canViewBookings, canUpdateBookings } = useAdminPermissions();
  const { showSuccess, showError, showInfo } = useAlertContext();

  const [booking, setBooking] = useState<AdminBooking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [routeStops, setRouteStops] = useState<RouteStop[]>([]);
  const [boardingStopName, setBoardingStopName] = useState<string | null>(null);
  const [destinationStopName, setDestinationStopName] = useState<string | null>(
    null
  );
  const [boardingStop, setBoardingStop] = useState<any | null>(null);
  const [destinationStop, setDestinationStop] = useState<any | null>(null);
  const [bookingSegment, setBookingSegment] = useState<any | null>(null);
  const [actualPaymentAmount, setActualPaymentAmount] = useState<number | null>(
    null
  );
  const [cancellationData, setCancellationData] = useState<{
    refund_amount: number;
    cancellation_fee: number;
    refund_status?: string;
  } | null>(null);
  const [originalPaymentAmount, setOriginalPaymentAmount] = useState<
    number | null
  >(null);
  const [paymentRefundStatus, setPaymentRefundStatus] = useState<string | null>(
    null
  );

  // Modal states
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  // Helper functions to close modals with keyboard dismissal
  const closeTicketModal = () => {
    Keyboard.dismiss();
    setShowTicketModal(false);
  };

  const closeCancelModal = () => {
    Keyboard.dismiss();
    setShowCancelModal(false);
  };

  const closeReceiptModal = () => {
    Keyboard.dismiss();
    setShowReceiptModal(false);
  };
  const [isSharing, setIsSharing] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  // Cancel booking modal state
  const [cancelReason, setCancelReason] = useState('');
  const [refundType, setRefundType] = useState<'full' | 'half' | 'none'>(
    'half'
  );
  const [refundMethod, setRefundMethod] = useState<'mib' | 'bank_transfer'>(
    'mib'
  );
  const [bankDetails, setBankDetails] = useState({
    accountNumber: '',
    accountName: '',
    bankName: '',
  });

  // Ticket refs
  const ticketDesignRef = useRef<any>(null);
  const imageGenerationTicketRef = useRef<any>(null);

  // Receipt data
  const [receiptNumber, setReceiptNumber] = useState<string | null>(null);
  const [bookingPassengers, setBookingPassengers] = useState<any[]>([]);
  const [bookingSeats, setBookingSeats] = useState<any[]>([]);

  // Auto-refresh when page is focused
  useFocusEffect(
    React.useCallback(() => {
      loadBooking();
    }, [])
  );

  useEffect(() => {
    loadBooking();
  }, [id]);

  const loadBooking = async (showRefreshIndicator = false) => {
    try {
      if (showRefreshIndicator) {
        setIsRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      if (!id || typeof id !== 'string') {
        setError('Invalid booking ID');
        return;
      }

      const fetchedBooking = await fetchBooking(id);

      if (fetchedBooking) {
        setBooking(fetchedBooking);

        // For cancelled bookings, fetch actual payment history and cancellation data
        // The view only counts 'completed' payments, but we need to see all payments
        if (fetchedBooking.status === 'cancelled') {
          await Promise.all([
            loadActualPaymentAmount(fetchedBooking.id),
            loadCancellationData(fetchedBooking.id),
          ]);
        } else {
          setActualPaymentAmount(null); // Use view's payment_amount for non-cancelled bookings
          setCancellationData(null);
          setOriginalPaymentAmount(null);
          setPaymentRefundStatus(null);
        }

        // Always try to fetch booking segments first (for accurate pickup/dropoff display)
        // This ensures we show the actual boarding/destination stops from booking_segments
        // rather than the route endpoints
        await loadMultiStopRouteData(fetchedBooking);
      } else {
        setError(`Booking with ID "${id}" not found`);
      }
    } catch (err) {
      setError('Failed to load booking details');
      console.error('Error loading booking:', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  const loadCancellationData = async (bookingId: string) => {
    try {
      const { data: cancellation, error: cancellationError } = await supabase
        .from('cancellations')
        .select('refund_amount, cancellation_fee, status')
        .eq('booking_id', bookingId)
        .single();

      if (cancellationError) {
        // No cancellation record found - that's okay, booking might have been cancelled without a record
        if (cancellationError.code !== 'PGRST116') {
          console.error('Error fetching cancellation data:', cancellationError);
        }
        setCancellationData(null);
        return;
      }

      if (cancellation) {
        setCancellationData({
          refund_amount: Number(cancellation.refund_amount || 0),
          cancellation_fee: Number(cancellation.cancellation_fee || 0),
          refund_status: cancellation.status,
        });
      }
    } catch (err) {
      console.error('Error loading cancellation data:', err);
      setCancellationData(null);
    }
  };

  const loadActualPaymentAmount = async (bookingId: string) => {
    try {
      // Fetch all payments for this booking to get actual payment history
      const { data: payments, error: paymentsError } = await supabase
        .from('payments')
        .select('amount, status, payment_method')
        .eq('booking_id', bookingId)
        .order('created_at', { ascending: false });

      if (paymentsError) {
        console.error('Error fetching payment history:', paymentsError);
        return;
      }

      if (payments && payments.length > 0) {
        // Find the original payment (completed payment before refund)
        const completedPayment = payments.find(p => p.status === 'completed');
        const refundedPayment = payments.find(
          p => p.status === 'refunded' || p.status === 'partially_refunded'
        );
        const latestPayment = payments[0];

        // Get original payment amount (before refund)
        if (completedPayment) {
          setOriginalPaymentAmount(Number(completedPayment.amount || 0));
        } else if (refundedPayment) {
          // If payment was refunded, the amount in the payment record is the original amount
          setOriginalPaymentAmount(Number(refundedPayment.amount || 0));
          setPaymentRefundStatus(refundedPayment.status);
        } else if (latestPayment && latestPayment.amount) {
          // Fallback: use latest payment amount
          setOriginalPaymentAmount(Number(latestPayment.amount || 0));
        }

        // For cancelled bookings, we want to see what was actually paid
        // Sum all payments that were completed (regardless of current status)
        // But also check if there are any payments at all
        const completedPayments = payments.filter(
          p => p.status === 'completed'
        );
        const totalPaid = completedPayments.reduce(
          (sum, p) => sum + Number(p.amount || 0),
          0
        );

        // If there are payments but none are 'completed', check the latest payment
        // This handles cases where payment was made but status changed
        if (totalPaid === 0 && payments.length > 0) {
          // Check if latest payment has an amount (might be pending or cancelled)
          if (latestPayment.amount && Number(latestPayment.amount) > 0) {
            // For cancelled bookings, if there's a payment record with amount,
            // it likely means payment was attempted/made before cancellation
            // We'll use the view's payment_amount (which is 0 for non-completed) as fallback
            // But we'll note that there was a payment attempt
            setActualPaymentAmount(0); // Use 0 since payment wasn't completed
          } else {
            setActualPaymentAmount(0);
          }
        } else {
          setActualPaymentAmount(totalPaid);
        }
      } else {
        // No payments found
        setActualPaymentAmount(0);
        setOriginalPaymentAmount(0);
      }
    } catch (err) {
      console.error('Error loading actual payment amount:', err);
      setActualPaymentAmount(null); // Fallback to view's payment_amount
      setOriginalPaymentAmount(null);
    }
  };

  const loadMultiStopRouteData = async (booking: AdminBooking) => {
    // Reset state first to avoid showing stale data from previous bookings
    setRouteStops([]);
    setBoardingStopName(null);
    setDestinationStopName(null);
    setBoardingStop(null);
    setDestinationStop(null);
    setBookingSegment(null);

    try {
      // Fetch booking segments directly from booking_segments table
      const segmentData = await getBookingSegment(booking.id);

      if (segmentData) {
        // Store the full booking segment data
        setBookingSegment(segmentData);

        // Extract boarding and destination stop information from booking_segments
        const boardingStopData = segmentData.boarding_stop;
        const destinationStopData = segmentData.destination_stop;

        setBoardingStop(boardingStopData);
        setDestinationStop(destinationStopData);
        setBoardingStopName(boardingStopData?.island?.name || null);
        setDestinationStopName(destinationStopData?.island?.name || null);

        // Fetch trip to get route_id
        const { data: trip, error: tripError } = await supabase
          .from('trips')
          .select('route_id')
          .eq('id', booking.trip_id)
          .single();

        if (!tripError && trip) {
          // Fetch all route stops
          const stops = await getRouteStops(trip.route_id);
          setRouteStops(stops);
        }
      }
    } catch (err: any) {
      // If booking segment doesn't exist, it's okay - not all bookings have segments
      // State has already been reset above, so we'll fall back to from_island_name/to_island_name
      if (err?.code !== 'PGRST116') {
        console.error('Error loading multi-stop route data:', err);
      }
    }
  };

  const handleRefresh = async () => {
    if (!id || typeof id !== 'string') return;
    await loadBooking(true);
  };

  // Fetch receipt number from payments table
  const loadReceiptNumber = useCallback(async (bookingId: string) => {
    try {
      const { data: payment, error } = await supabase
        .from('payments')
        .select('receipt_number')
        .eq('booking_id', bookingId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!error && payment?.receipt_number) {
        setReceiptNumber(payment.receipt_number);
      } else {
        setReceiptNumber(null);
      }
    } catch (err) {
      console.error('Error loading receipt number:', err);
      setReceiptNumber(null);
    }
  }, []);

  // Fetch booking data for ticket generation
  const loadBookingDataForTicket = useCallback(
    async (booking: AdminBooking) => {
      try {
        // Fetch passengers
        const { data: passengersData, error: passengersError } = await supabase
          .from('passengers')
          .select(
            `
          id,
          passenger_name,
          passenger_contact_number,
          seat_id,
          seats (
            seat_number,
            row_number,
            position_x
          )
        `
          )
          .eq('booking_id', booking.id);

        if (!passengersError && passengersData) {
          const transformedPassengers = passengersData.map((p: any) => ({
            id: p.id,
            fullName: p.passenger_name,
            phoneNumber: p.passenger_contact_number || '',
            seat: p.seats
              ? {
                  id: p.seat_id,
                  number: p.seats.seat_number || '',
                  rowNumber: p.seats.row_number || 0,
                }
              : null,
          }));

          setBookingPassengers(transformedPassengers);

          // Extract seats
          const seats = passengersData
            .filter((p: any) => p.seats)
            .map((p: any) => ({
              id: p.seat_id,
              number: p.seats.seat_number || '',
              rowNumber: p.seats.row_number || 0,
            }));
          setBookingSeats(seats);
        }
      } catch (err) {
        console.error('Error loading booking data for ticket:', err);
      }
    },
    []
  );

  // Load receipt number when booking is loaded
  useEffect(() => {
    if (booking?.id) {
      loadReceiptNumber(booking.id);
      loadBookingDataForTicket(booking);
    }
  }, [booking?.id, loadReceiptNumber, loadBookingDataForTicket]);

  const handleStatusUpdate = async (newStatus: BookingStatus) => {
    if (!booking) return;

    setUpdating(true);
    try {
      await updateBooking(booking.id, { status: newStatus });
      // Refresh the booking data
      const updatedBooking = await fetchBooking(booking.id);
      if (updatedBooking) {
        setBooking(updatedBooking);
      }
      showSuccess(
        'Success',
        `Booking status updated to ${newStatus.replace('_', ' ')}`
      );
    } catch (error) {
      showError('Error', 'Failed to update booking status');
    } finally {
      setUpdating(false);
    }
  };

  const handlePaymentStatusUpdate = async (newStatus: string) => {
    if (!booking) return;

    setUpdating(true);
    try {
      await updatePaymentStatus(
        booking.id,
        newStatus,
        booking.total_fare,
        booking.payment_method || booking.payment_method_type || 'gateway'
      );
      // Refresh the booking data
      const updatedBooking = await fetchBooking(booking.id);
      if (updatedBooking) {
        setBooking(updatedBooking);
      }
      showSuccess('Success', 'Payment status updated successfully');
    } catch (error) {
      showError('Error', 'Failed to update payment status');
    } finally {
      setUpdating(false);
    }
  };

  const handleEdit = () => {
    if (!booking) return;
    router.push(`../booking/${booking.id}/modify` as any);
  };

  const handleViewCustomer = () => {
    if (!booking?.user_id) return;
    router.push(`../user/${booking.user_id}` as any);
  };

  const handleShareQR = () => {
    showInfo(
      'Share QR Code',
      'QR code sharing functionality will be implemented here.'
    );
  };

  const handleDownloadQR = () => {
    showInfo(
      'Download QR Code',
      'QR code download functionality will be implemented here.'
    );
  };

  // Contact customer handler
  const handleContactCustomer = () => {
    if (!booking) return;

    Alert.alert(
      'Contact Customer',
      'Choose how you want to contact the customer',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        ...(booking.user_mobile
          ? [
              {
                text: 'Call',
                onPress: () => {
                  Linking.openURL(`tel:${booking.user_mobile}`);
                },
              },
            ]
          : []),
        ...(booking.user_email
          ? [
              {
                text: 'Email',
                onPress: () => {
                  Linking.openURL(`mailto:${booking.user_email}`);
                },
              },
            ]
          : []),
      ],
      { cancelable: true }
    );
  };

  // Print ticket handler
  const handlePrintTicket = () => {
    if (!booking) return;
    setShowTicketModal(true);
  };

  // Share ticket handler
  const handleShareTicket = async () => {
    if (!booking) return;

    try {
      setIsSharing(true);
      await new Promise(resolve => setTimeout(resolve, 300));

      // Convert AdminBooking to Booking format for TicketDesign
      const bookingForTicket = convertAdminBookingToBooking(booking);
      if (bookingForTicket) {
        await shareBookingTicket(
          bookingForTicket,
          imageGenerationTicketRef,
          showError
        );
      }
    } catch (error) {
      showError('Sharing Error', 'Failed to share ticket. Please try again.');
    } finally {
      setIsSharing(false);
    }
  };

  // Generate receipt handler
  const handleGenerateReceipt = () => {
    if (!booking) return;

    if (!receiptNumber) {
      showInfo(
        'No Receipt Available',
        'Receipt number is not available for this booking.'
      );
      return;
    }

    setShowReceiptModal(true);
  };

  // Cancel booking handler
  const handleCancelBooking = () => {
    if (!booking) return;
    if (!canUpdateBookings()) {
      showError(
        'Access Denied',
        'You do not have permission to cancel bookings.'
      );
      return;
    }
    // Initialize refund method based on payment type
    const isMibPayment =
      booking.payment_method_type === 'mib' || booking.payment_method === 'mib';
    setRefundMethod(isMibPayment ? 'mib' : 'bank_transfer');
    setShowCancelModal(true);
  };

  // Confirm cancel booking with refund options
  const handleConfirmCancelBooking = async () => {
    if (!booking || !cancelReason.trim()) {
      showError('Validation Error', 'Please provide a cancellation reason.');
      return;
    }

    setIsCancelling(true);
    try {
      // Calculate refund amount based on refund type
      let refundAmount = 0;
      if (refundType === 'full') {
        refundAmount = booking.total_fare || 0;
      } else if (refundType === 'half') {
        refundAmount = calculateRefundAmount(booking.total_fare || 0);
      }

      // 1. Update booking status to cancelled
      await updateBooking(booking.id, { status: 'cancelled' });

      // 2. Release seat reservations
      const { error: seatError } = await supabase
        .from('seat_reservations')
        .update({
          is_available: true,
          booking_id: null,
          is_reserved: false,
        })
        .eq('booking_id', booking.id);

      if (seatError) {
        console.error('Error releasing seats:', seatError);
      }

      // 3. Create cancellation record
      const cancellationData = {
        booking_id: booking.id,
        reason: cancelReason,
        refund_amount: refundAmount,
        cancellation_fee: booking.total_fare - refundAmount,
        status: refundAmount > 0 ? 'pending' : 'no_payment',
        cancelled_by: 'admin', // Admin cancellation
        created_at: new Date().toISOString(),
      };

      const { error: cancellationError } = await supabase
        .from('cancellations')
        .insert(cancellationData);

      if (cancellationError) {
        console.error('Error creating cancellation record:', cancellationError);
      }

      // 4. Process refund if applicable
      if (refundAmount > 0) {
        // Check if payment was made via MIB
        const { data: payment } = await supabase
          .from('payments')
          .select('id, payment_method, receipt_number, status')
          .eq('booking_id', booking.id)
          .eq('status', 'completed')
          .maybeSingle();

        const isMibPayment =
          payment?.payment_method === 'mib' ||
          booking.payment_method_type === 'mib';

        // Process refund based on selected refund method
        if (refundMethod === 'mib' && isMibPayment && payment?.receipt_number) {
          // Process MIB refund via edge function
          try {
            const { data: refundResult, error: refundError } =
              await supabase.functions.invoke('mib-payment', {
                body: {
                  action: 'process-refund',
                  bookingId: booking.id,
                  refundAmount: refundAmount,
                  currency: 'MVR',
                },
              });

            if (refundError || !refundResult?.success) {
              console.error(
                'Refund processing error:',
                refundError || refundResult
              );
              // Update cancellation status to indicate refund failure
              await supabase
                .from('cancellations')
                .update({ status: 'refund_failed' })
                .eq('booking_id', booking.id);
            }
          } catch (refundErr) {
            console.error('Error processing refund:', refundErr);
          }
        } else if (refundMethod === 'bank_transfer') {
          // Bank transfer refund - update cancellation with bank details
          await supabase
            .from('cancellations')
            .update({
              bank_account_number: bankDetails.accountNumber,
              bank_account_name: bankDetails.accountName,
              bank_name: bankDetails.bankName,
            })
            .eq('booking_id', booking.id);
        }
      }

      // 5. Update payment status if refund was processed
      if (refundAmount > 0) {
        await supabase
          .from('payments')
          .update({
            status:
              refundAmount === booking.total_fare
                ? 'refunded'
                : 'partially_refunded',
            updated_at: new Date().toISOString(),
          })
          .eq('booking_id', booking.id)
          .eq('status', 'completed');
      }

      // Refresh booking data
      await loadBooking();

      showSuccess(
        'Booking Cancelled',
        `Booking #${booking.booking_number} has been cancelled${
          refundAmount > 0
            ? ` and a refund of MVR ${refundAmount.toFixed(2)} has been initiated.`
            : '.'
        }`
      );

      closeCancelModal();
      setCancelReason('');
      setRefundType('half');
      // Reset refund method based on payment type
      const isMibPayment =
        booking?.payment_method_type === 'mib' ||
        booking?.payment_method === 'mib';
      setRefundMethod(isMibPayment ? 'mib' : 'bank_transfer');
      setBankDetails({ accountNumber: '', accountName: '', bankName: '' });
    } catch (error: any) {
      showError(
        'Cancellation Failed',
        error?.message || 'Failed to cancel booking. Please try again.'
      );
    } finally {
      setIsCancelling(false);
    }
  };

  // Convert AdminBooking to Booking type for TicketDesign
  const convertAdminBookingToBooking = (
    adminBooking: AdminBooking | null
  ): any => {
    if (!adminBooking) return null;

    // Calculate original fare (before discount) for ticket display
    // For agent bookings, we want to show the original fare, not the discounted total_fare
    const passengerCount = adminBooking.passenger_count || 1;
    const segmentFare =
      bookingSegment?.fare_amount ||
      (adminBooking as any).segment_fare ||
      ((adminBooking as any).booking_segments?.[0]?.fare_amount as
        | number
        | undefined) ||
      0;
    const baseFare = adminBooking.trip_base_fare || 0;
    const farePerPassenger = segmentFare > 0 ? segmentFare : baseFare;
    const originalFare = farePerPassenger * passengerCount;
    // Use original fare for display on ticket (before discount)
    // This shows the fare the customer would see, not the discounted agent price
    const displayFare =
      originalFare > 0 ? originalFare : adminBooking.total_fare;

    return {
      id: adminBooking.id,
      bookingNumber: adminBooking.booking_number,
      totalFare: displayFare, // Show original fare on ticket (before discount)
      displayFare: displayFare, // Show original fare on ticket (before discount)
      departureDate: adminBooking.trip_travel_date || adminBooking.created_at,
      departureTime: adminBooking.trip_departure_time || '00:00',
      createdAt: adminBooking.created_at,
      status: adminBooking.status,
      passengers:
        bookingPassengers.length > 0
          ? bookingPassengers
          : [
              {
                id: 'temp',
                fullName: 'Passenger',
                phoneNumber: '',
              },
            ],
      seats: bookingSeats.length > 0 ? bookingSeats : [],
      route: {
        id: 'route-id',
        fromIsland: {
          id: 'from',
          name: boardingStopName || adminBooking.from_island_name || 'Unknown',
          zone: 'A',
        },
        toIsland: {
          id: 'to',
          name: destinationStopName || adminBooking.to_island_name || 'Unknown',
          zone: 'A',
        },
        baseFare: adminBooking.trip_base_fare || adminBooking.total_fare,
      },
      vessel: adminBooking.vessel_name
        ? {
            id: 'vessel-id',
            name: adminBooking.vessel_name,
          }
        : undefined,
      qrCodeUrl: adminBooking.qr_code_url || '',
      payment: receiptNumber
        ? {
            receiptNumber: receiptNumber,
            status: adminBooking.payment_status || 'completed',
            method:
              adminBooking.payment_method ||
              adminBooking.payment_method_type ||
              'gateway',
          }
        : undefined,
    };
  };

  const getBookingStatusInfo = (booking: AdminBooking) => {
    const status = booking.status;
    const paymentStatus = booking.payment_status;
    const passengerCount = booking.passenger_count || 1;
    const totalFare = booking.total_fare || 0;
    const baseFare = booking.trip_base_fare || 0;

    // Calculate actual payment amount
    // Always use the payment_amount from the database view first
    // The view sums payments with status 'completed', which is correct for most cases
    // For cancelled bookings, if payment_amount is 0, it means no completed payment was made
    let paymentAmount = 0;

    // Use the payment amount from the database view
    // Note: The view only counts 'completed' payments, which is correct
    // For cancelled bookings, if a payment was made and then cancelled/refunded,
    // the payment status would be 'cancelled' or 'refunded', not 'completed'
    // So payment_amount = 0 is correct in that case
    if (
      booking.payment_amount !== null &&
      booking.payment_amount !== undefined
    ) {
      paymentAmount = Number(booking.payment_amount);
    } else {
      // Fallback: If no payment amount in database, infer based on status
      switch (booking.status) {
        case 'confirmed':
        case 'checked_in':
        case 'completed':
          // For confirmed bookings without payment records, assume they paid the total fare
          paymentAmount = totalFare;
          break;
        case 'pending_payment':
          paymentAmount = 0; // No payment yet
          break;
        case 'cancelled':
          // For cancelled bookings, payment_amount from view should already be correct
          // If it's 0, it means no completed payment was made (or it was refunded)
          paymentAmount = 0;
          break;
        default:
          paymentAmount = 0;
      }
    }

    // Calculate discount (difference between total fare and what was actually paid)
    const discount = Math.max(0, totalFare - paymentAmount);

    // Calculate any additional charges (if payment amount is more than total fare)
    const additionalCharges = Math.max(0, paymentAmount - totalFare);

    return {
      status,
      paymentStatus,
      passengerCount,
      totalFare,
      baseFare,
      paymentAmount,
      discount,
      additionalCharges,
      isAgentBooking: !!booking.agent_id,
    };
  };

  // Helper function to determine payment status
  const getPaymentStatus = (booking: AdminBooking) => {
    // If there's a specific payment status from the payments table, use it
    if (booking.payment_status) {
      return booking.payment_status;
    }

    // Otherwise, infer from booking status
    switch (booking.status) {
      case 'confirmed':
      case 'checked_in':
      case 'completed':
        return 'completed';
      case 'pending_payment':
        return 'pending';
      case 'cancelled':
        return 'cancelled'; // Changed from 'refunded' to 'cancelled' for payment cancellations
      default:
        return 'pending';
    }
  };

  // Helper function to determine payment amount
  const getPaymentAmount = (booking: AdminBooking) => {
    // If there's a specific payment amount from the payments table, use it
    if (booking.payment_amount && booking.payment_amount > 0) {
      return booking.payment_amount;
    }

    // Otherwise, infer from booking status
    switch (booking.status) {
      case 'confirmed':
      case 'checked_in':
      case 'completed':
        return booking.total_fare; // Assume full payment for confirmed bookings
      case 'pending_payment':
        return 0; // No payment yet
      case 'cancelled':
        return 0; // No payment for cancelled bookings
      default:
        return 0;
    }
  };

  if (!canViewBookings()) {
    return (
      <View style={styles.noPermissionContainer}>
        <Stack.Screen
          options={{
            title: 'Access Denied',
            headerShown: true,
            headerLeft: () => (
              <Pressable
                onPress={() => router.back()}
                style={styles.backButton}
              >
                <ArrowLeft size={24} color={colors.primary} />
              </Pressable>
            ),
          }}
        />
        <AlertTriangle size={48} color={colors.warning} />
        <Text style={styles.noPermissionText}>
          You don't have permission to view booking details.
        </Text>
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
            headerLeft: () => (
              <Pressable
                onPress={() => router.back()}
                style={styles.backButton}
              >
                <ArrowLeft size={24} color={colors.primary} />
              </Pressable>
            ),
          }}
        />
        <ActivityIndicator size='large' color={colors.primary} />
        <Text style={styles.loadingText}>Loading booking details...</Text>
      </View>
    );
  }

  if (error || !booking) {
    return (
      <View style={styles.errorContainer}>
        <Stack.Screen
          options={{
            title: 'Booking Not Found',
            headerShown: true,
            headerLeft: () => (
              <Pressable
                onPress={() => router.back()}
                style={styles.backButton}
              >
                <ArrowLeft size={24} color={colors.primary} />
              </Pressable>
            ),
          }}
        />
        <Text style={styles.errorTitle}>Booking Not Found</Text>
        <Text style={styles.errorMessage}>
          {error ||
            'The requested booking could not be found. It may have been cancelled or removed.'}
        </Text>
        <Pressable style={styles.retryButton} onPress={() => loadBooking()}>
          <RefreshCw size={16} color='#FFFFFF' />
          <Text style={styles.retryButtonText}>Try Again</Text>
        </Pressable>
      </View>
    );
  }

  const bookingInfo = getBookingStatusInfo(booking);
  const paymentStatus = getPaymentStatus(booking);
  const paymentAmount = getPaymentAmount(booking);

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: `Booking #${booking.booking_number}`,
          headerShown: true,
          presentation: 'card',
          headerLeft: () => (
            <Pressable onPress={() => router.back()} style={styles.backButton}>
              <ArrowLeft size={24} color={colors.primary} />
            </Pressable>
          ),
          // headerRight: () =>
          //   canUpdateBookings() ? (
          //     <Pressable onPress={handleEdit} style={styles.editButton}>
          //       <Edit size={20} color={colors.primary} />
          //     </Pressable>
          //   ) : null,
        }}
      />

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Booking Overview Card */}
        <View style={styles.overviewCard}>
          {/* Header */}
          <View style={styles.overviewHeader}>
            <View style={styles.overviewHeaderLeft}>
              <Text style={styles.bookingId}>
                Booking #{booking.booking_number}
              </Text>
              <View style={styles.routeInfo}>
                <MapPin size={16} color={colors.primary} />
                <Text style={styles.routeName}>
                  {(() => {
                    // Prioritize booking segments (actual boarding/destination stops)
                    if (boardingStopName && destinationStopName) {
                      return `${boardingStopName} → ${destinationStopName}`;
                    }
                    // Fallback to booking's from_island_name and to_island_name
                    if (booking.from_island_name && booking.to_island_name) {
                      return `${booking.from_island_name} → ${booking.to_island_name}`;
                    }
                    // If we have route stops, show first and last
                    if (routeStops.length > 0) {
                      const firstStop = routeStops[0];
                      const lastStop = routeStops[routeStops.length - 1];
                      return `${firstStop.island_name || 'Unknown'} → ${lastStop.island_name || 'Unknown'}`;
                    }
                    return 'Route information unavailable';
                  })()}
                </Text>
              </View>
            </View>
          </View>

          {/* Details Grid */}
          <View style={styles.detailsGrid}>
            <View style={styles.detailRow}>
              <View style={styles.detailItem}>
                <Calendar size={16} color={colors.textSecondary} />
                <Text style={styles.detailText}>
                  {formatBookingDate(
                    booking.trip_travel_date || booking.created_at
                  )}
                </Text>
              </View>
              <View style={styles.detailItem}>
                <Clock size={16} color={colors.textSecondary} />
                <Text style={styles.detailText}>
                  {booking.trip_departure_time
                    ? formatTimeAMPM(booking.trip_departure_time)
                    : 'N/A'}
                </Text>
              </View>
            </View>
            <View style={styles.statusContainer}>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: `${getStatusColor(booking.status)}20` },
                ]}
              >
                <Text
                  style={[
                    styles.statusText,
                    { color: getStatusColor(booking.status) },
                  ]}
                >
                  {booking.status.replace('_', ' ').toUpperCase()}
                </Text>
              </View>
              <View
                style={[
                  styles.statusBadge,
                  {
                    backgroundColor: `${getPaymentStatusColor(paymentStatus)}20`,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.statusText,
                    { color: getPaymentStatusColor(paymentStatus) },
                  ]}
                >
                  {paymentStatus.toUpperCase()}
                </Text>
              </View>
            </View>

            <View style={styles.detailRow}>
              <View style={styles.detailItem}>
                <Users size={16} color={colors.textSecondary} />
                <Text style={styles.detailText}>
                  {bookingInfo.passengerCount} passenger(s)
                </Text>
              </View>
              <View style={styles.detailItem}>
                <CreditCard size={16} color={colors.textSecondary} />
                <Text style={styles.detailText}>
                  Payment: {paymentStatus.toUpperCase()}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Quick Stats Cards */}
        {/* <View style={styles.quickStatsContainer}>
          <View style={styles.statCard}>
            <View style={styles.statIconContainer}>
              <DollarSign size={20} color={colors.success} />
            </View>
            <View style={styles.statContent}>
              <Text style={styles.statValue}>
                {formatCurrency(bookingInfo.paymentAmount)}
              </Text>
              <Text style={styles.statLabel}>Revenue</Text>
            </View>
            <View style={styles.statTrend}>
              <TrendingUp size={16} color={colors.success} />
              <Text style={styles.statTrendText}>+8%</Text>
            </View>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statIconContainer}>
              <Users size={20} color={colors.primary} />
            </View>
            <View style={styles.statContent}>
              <Text style={styles.statValue}>{bookingInfo.passengerCount}</Text>
              <Text style={styles.statLabel}>Passengers</Text>
            </View>
            <View style={styles.statTrend}>
              <Percent size={16} color={colors.primary} />
              <Text style={styles.statTrendText}>100%</Text>
            </View>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statIconContainer}>
              <CheckCircle size={20} color={colors.warning} />
            </View>
            <View style={styles.statContent}>
              <Text style={styles.statValue}>
                {booking.status === 'confirmed'
                  ? 'Confirmed'
                  : booking.status.replace('_', ' ')}
              </Text>
              <Text style={styles.statLabel}>Status</Text>
            </View>
            <View style={styles.statTrend}>
              <Calendar size={16} color={colors.textSecondary} />
              <Text style={styles.statTrendText}>Today</Text>
            </View>
          </View>
        </View> */}

        {/* Customer Information */}
        <View style={styles.customerCard}>
          <View style={styles.cardHeader}>
            <User size={20} color={colors.primary} />
            <Text style={styles.cardTitle}>Customer Information</Text>
          </View>
          <View style={styles.customerInfo}>
            <Text style={styles.customerName}>
              {booking.user_name || 'Customer Name'}
            </Text>
            <View style={styles.contactInfo}>
              {booking.user_email && (
                <View style={styles.contactRow}>
                  <Mail size={14} color={colors.textSecondary} />
                  <Text style={styles.contactText}>{booking.user_email}</Text>
                </View>
              )}
              {booking.user_mobile && (
                <View style={styles.contactRow}>
                  <Phone size={14} color={colors.textSecondary} />
                  <Text style={styles.contactText}>{booking.user_mobile}</Text>
                </View>
              )}
            </View>
          </View>
        </View>
        {/* QR Code Section */}
        <BookingQRCode
          booking={booking}
          onShare={handleShareQR}
          onDownload={handleDownloadQR}
        />

        {/* Trip Details Section */}
        <BookingTripDetails
          booking={booking}
          boardingStopName={boardingStopName}
          destinationStopName={destinationStopName}
          boardingStop={boardingStop}
          destinationStop={destinationStop}
          bookingSegment={bookingSegment}
        />

        {/* Payment Details Section */}
        <BookingPaymentDetails
          booking={booking}
          actualPaymentAmount={actualPaymentAmount}
          cancellationData={cancellationData}
          originalPaymentAmount={originalPaymentAmount}
          paymentRefundStatus={paymentRefundStatus}
          receiptNumber={receiptNumber}
        />

        {/* Agent Booking Financial Details */}
        {booking.agent_id && (
          <View style={styles.agentFinancialCard}>
            <View style={styles.agentFinancialHeader}>
              <DollarSign size={20} color={colors.primary} />
              <Text style={styles.agentFinancialTitle}>
                Agent Booking Financial Details
              </Text>
            </View>
            {(() => {
              const passengerCount = booking.passenger_count || 1;
              const totalFare = booking.total_fare || 0;

              // Use segment fare from booking_segments if available, otherwise fall back to base fare
              // bookingSegment comes from booking_segments table which has fare_amount field
              const segmentFare = bookingSegment?.fare_amount || 0;
              const baseFare = booking.trip_base_fare || 0;

              // Use segment fare if available, otherwise calculate from base fare
              const farePerPassenger = segmentFare > 0 ? segmentFare : baseFare;

              // Calculate original fare: segment/base fare per passenger × number of passengers
              const originalFare = farePerPassenger * passengerCount;
              const discountAmount = Math.max(0, originalFare - totalFare);
              const commission = discountAmount; // Commission is the discount amount
              const totalPaidByAgent = totalFare;

              return (
                <View style={styles.agentFinancialContent}>
                  <View style={styles.agentFinancialRow}>
                    <View style={styles.agentFinancialLabelContainer}>
                      <DollarSign size={16} color={colors.textSecondary} />
                      <Text style={styles.agentFinancialLabel}>
                        Booking Fare (Total{' '}
                        {passengerCount > 1 && `- ${passengerCount} passengers`}
                        ):
                      </Text>
                    </View>
                    <Text style={styles.agentFinancialValue}>
                      {formatCurrency(originalFare)}
                    </Text>
                  </View>
                  {passengerCount > 1 && (
                    <View style={styles.agentFinancialSubRow}>
                      <Text style={styles.agentFinancialSubText}>
                        ({formatCurrency(farePerPassenger)} per passenger ×{' '}
                        {passengerCount} passengers)
                      </Text>
                    </View>
                  )}

                  {discountAmount > 0 && (
                    <View style={styles.agentFinancialRow}>
                      <View style={styles.agentFinancialLabelContainer}>
                        <Percent size={16} color={colors.success} />
                        <Text style={styles.agentFinancialLabel}>
                          Discount:
                        </Text>
                      </View>
                      <Text
                        style={[
                          styles.agentFinancialValue,
                          styles.agentDiscountValue,
                        ]}
                      >
                        -{formatCurrency(discountAmount)}
                      </Text>
                    </View>
                  )}

                  {commission > 0 && (
                    <View style={styles.agentFinancialRow}>
                      <View style={styles.agentFinancialLabelContainer}>
                        <TrendingUp size={16} color={colors.primary} />
                        <Text style={styles.agentFinancialLabel}>
                          Agent Commission:
                        </Text>
                      </View>
                      <Text
                        style={[
                          styles.agentFinancialValue,
                          styles.agentCommissionValue,
                        ]}
                      >
                        {formatCurrency(commission)}
                      </Text>
                    </View>
                  )}

                  <View
                    style={[
                      styles.agentFinancialRow,
                      styles.agentFinancialRowTotal,
                    ]}
                  >
                    <View style={styles.agentFinancialLabelContainer}>
                      <DollarSign size={18} color={colors.primary} />
                      <Text
                        style={[
                          styles.agentFinancialLabel,
                          styles.agentTotalLabel,
                        ]}
                      >
                        Total Paid by Agent:
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.agentFinancialValue,
                        styles.agentTotalValue,
                      ]}
                    >
                      {formatCurrency(totalPaidByAgent)}
                    </Text>
                  </View>
                </View>
              );
            })()}
          </View>
        )}

        {/* Passenger Details Section */}
        <BookingPassengerDetails booking={booking} />

        {/* Booking Actions Section */}
        <BookingActionsSection
          booking={booking}
          onStatusUpdate={handleStatusUpdate}
          onPaymentStatusUpdate={handlePaymentStatusUpdate}
          onViewCustomer={handleViewCustomer}
          onContactCustomer={handleContactCustomer}
          onPrintTicket={handlePrintTicket}
          onGenerateReceipt={handleGenerateReceipt}
          onCancelBooking={handleCancelBooking}
          canUpdateBookings={canUpdateBookings()}
          loading={updating}
        />

        {/* Additional booking information */}
        <View style={styles.infoCard}>
          <Text style={styles.sectionTitle}>Booking Information</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Booking ID:</Text>
            <Text
              style={styles.infoValue}
              numberOfLines={1}
              ellipsizeMode='middle'
            >
              #{booking.id}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Created:</Text>
            <Text style={styles.infoValue}>
              {formatDateTime(booking.created_at)}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Last Updated:</Text>
            <Text style={styles.infoValue}>
              {booking.updated_at
                ? formatDateTime(booking.updated_at)
                : formatDateTime(booking.created_at)}
            </Text>
          </View>
          {booking.agent_id && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Agent:</Text>
              <Text style={styles.infoValue}>
                {booking.agent_name || 'N/A'}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Ticket Print Modal */}
      <Modal
        visible={showTicketModal}
        animationType='slide'
        {...(Platform.OS === 'ios' && { presentationStyle: 'pageSheet' })}
        onRequestClose={closeTicketModal}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Pressable
              style={styles.modalCloseButton}
              onPress={closeTicketModal}
            >
              <X size={24} color={colors.text} />
            </Pressable>
            <Text style={styles.modalTitle}>Ticket Details</Text>
            <Pressable
              style={[
                styles.modalShareButton,
                isSharing && styles.shareIconButtonDisabled,
              ]}
              onPress={handleShareTicket}
              disabled={isSharing}
            >
              <Share2
                size={24}
                color={isSharing ? colors.textSecondary : colors.primary}
              />
            </Pressable>
          </View>
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
                booking={convertAdminBookingToBooking(booking)}
                size='large'
                ref={ticketDesignRef}
              />
            </ScrollView>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Cancel Booking Modal */}
      <Modal
        visible={showCancelModal}
        transparent={true}
        animationType='slide'
        {...(Platform.OS === 'ios' && { presentationStyle: 'pageSheet' })}
        onRequestClose={() => {
          if (!isCancelling) {
            closeCancelModal();
          }
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalOverlayContent}>
            <Card variant='elevated' style={styles.cancelModalCard}>
              <View style={styles.cancelModalHeader}>
                <AlertTriangle size={24} color={colors.danger} />
                <Text style={styles.cancelModalTitle}>Cancel Booking</Text>
              </View>

              <ScrollView
                style={styles.cancelModalScrollView}
                contentContainerStyle={styles.cancelModalScrollContent}
                showsVerticalScrollIndicator={true}
                keyboardShouldPersistTaps='handled'
                nestedScrollEnabled={true}
              >
                <Text style={styles.cancelModalText}>
                  Are you sure you want to cancel booking #
                  {booking?.booking_number}? This action will release the
                  reserved seats.
                </Text>

                <View style={styles.refundSection}>
                  <Text style={styles.refundSectionTitle}>Refund Options</Text>

                  <Pressable
                    style={[
                      styles.refundOption,
                      refundType === 'full' && styles.refundOptionSelected,
                    ]}
                    onPress={() => setRefundType('full')}
                  >
                    <Text
                      style={[
                        styles.refundOptionText,
                        refundType === 'full' &&
                          styles.refundOptionTextSelected,
                      ]}
                    >
                      Full Refund (100%)
                    </Text>
                    <Text style={styles.refundOptionAmount}>
                      MVR {(booking?.total_fare || 0).toFixed(2)}
                    </Text>
                  </Pressable>

                  <Pressable
                    style={[
                      styles.refundOption,
                      refundType === 'half' && styles.refundOptionSelected,
                    ]}
                    onPress={() => setRefundType('half')}
                  >
                    <Text
                      style={[
                        styles.refundOptionText,
                        refundType === 'half' &&
                          styles.refundOptionTextSelected,
                      ]}
                    >
                      Half Refund (50%)
                    </Text>
                    <Text style={styles.refundOptionAmount}>
                      MVR{' '}
                      {calculateRefundAmount(booking?.total_fare || 0).toFixed(
                        2
                      )}
                    </Text>
                  </Pressable>

                  <Pressable
                    style={[
                      styles.refundOption,
                      refundType === 'none' && styles.refundOptionSelected,
                    ]}
                    onPress={() => setRefundType('none')}
                  >
                    <Text
                      style={[
                        styles.refundOptionText,
                        refundType === 'none' &&
                          styles.refundOptionTextSelected,
                      ]}
                    >
                      No Refund (0%)
                    </Text>
                    <Text style={styles.refundOptionAmount}>MVR 0.00</Text>
                  </Pressable>
                </View>

                <View style={styles.inputSection}>
                  <Text style={styles.inputLabel}>Cancellation Reason *</Text>
                  <Input
                    placeholder='Enter reason for cancellation'
                    value={cancelReason}
                    onChangeText={setCancelReason}
                    multiline
                    numberOfLines={3}
                    style={styles.reasonInput}
                  />
                </View>

                {refundType !== 'none' &&
                  (() => {
                    // Check if payment was made via MIB
                    const isMibPayment =
                      booking?.payment_method_type === 'mib' ||
                      booking?.payment_method === 'mib';

                    return (
                      <View style={styles.refundMethodSection}>
                        <Text style={styles.inputLabel}>Refund Method</Text>

                        {isMibPayment && (
                          <Pressable
                            style={[
                              styles.refundMethodOption,
                              refundMethod === 'mib' &&
                                styles.refundMethodOptionSelected,
                            ]}
                            onPress={() => setRefundMethod('mib')}
                          >
                            <Text
                              style={[
                                styles.refundMethodText,
                                refundMethod === 'mib' &&
                                  styles.refundMethodTextSelected,
                              ]}
                            >
                              MIB Refund
                            </Text>
                            <Text style={styles.refundMethodDescription}>
                              Refund will be automatically processed to the
                              original payment method
                            </Text>
                          </Pressable>
                        )}

                        <Pressable
                          style={[
                            styles.refundMethodOption,
                            refundMethod === 'bank_transfer' &&
                              styles.refundMethodOptionSelected,
                          ]}
                          onPress={() => setRefundMethod('bank_transfer')}
                        >
                          <Text
                            style={[
                              styles.refundMethodText,
                              refundMethod === 'bank_transfer' &&
                                styles.refundMethodTextSelected,
                            ]}
                          >
                            Bank Transfer
                          </Text>
                          <Text style={styles.refundMethodDescription}>
                            Refund will be processed via bank transfer
                          </Text>
                        </Pressable>

                        {(refundMethod === 'bank_transfer' ||
                          (refundMethod === 'mib' && isMibPayment)) && (
                          <View style={styles.bankDetailsSection}>
                            {refundMethod === 'mib' && isMibPayment && (
                              <Text style={styles.infoText}>
                                Bank details are required as a backup option for
                                MIB refunds.
                              </Text>
                            )}
                            <Input
                              label='Account Number'
                              placeholder='Enter account number'
                              value={bankDetails.accountNumber}
                              onChangeText={text =>
                                setBankDetails(prev => ({
                                  ...prev,
                                  accountNumber: text,
                                }))
                              }
                            />
                            <Input
                              label='Account Holder Name'
                              placeholder='Enter account holder name'
                              value={bankDetails.accountName}
                              onChangeText={text =>
                                setBankDetails(prev => ({
                                  ...prev,
                                  accountName: text,
                                }))
                              }
                            />
                            <Input
                              label='Bank Name'
                              placeholder='Enter bank name'
                              value={bankDetails.bankName}
                              onChangeText={text =>
                                setBankDetails(prev => ({
                                  ...prev,
                                  bankName: text,
                                }))
                              }
                            />
                          </View>
                        )}
                      </View>
                    );
                  })()}
              </ScrollView>

              <View style={styles.modalActions}>
                <Button
                  title='Cancel'
                  onPress={() => {
                    closeCancelModal();
                    setCancelReason('');
                    setRefundType('half');
                    // Reset refund method based on payment type
                    const isMibPayment =
                      booking?.payment_method_type === 'mib' ||
                      booking?.payment_method === 'mib';
                    setRefundMethod(isMibPayment ? 'mib' : 'bank_transfer');
                    setBankDetails({
                      accountNumber: '',
                      accountName: '',
                      bankName: '',
                    });
                  }}
                  variant='outline'
                  style={styles.modalButton}
                  disabled={isCancelling}
                  textStyle={styles.modalCancelText}
                />
                <Button
                  title={isCancelling ? 'Cancelling...' : 'Confirm'}
                  onPress={handleConfirmCancelBooking}
                  style={{
                    ...styles.modalButton,
                    ...styles.modalDangerButton,
                  }}
                  disabled={isCancelling || !cancelReason.trim()}
                  textStyle={styles.modalConfirmText}
                />
              </View>
            </Card>
          </View>
        </View>
      </Modal>

      {/* Receipt Modal */}
      <Modal
        visible={showReceiptModal}
        transparent={true}
        animationType='slide'
        {...(Platform.OS === 'ios' && { presentationStyle: 'pageSheet' })}
        onRequestClose={closeReceiptModal}
      >
        <View style={styles.modalOverlay}>
          <Card variant='elevated' style={styles.receiptModalCard}>
            <View style={styles.receiptModalHeader}>
              <Receipt size={24} color={colors.primary} />
              <Text style={styles.receiptModalTitle}>Receipt</Text>
              <Pressable
                style={styles.modalCloseButton}
                onPress={closeReceiptModal}
              >
                <X size={24} color={colors.text} />
              </Pressable>
            </View>
            <ScrollView style={styles.receiptContent}>
              {receiptNumber ? (
                <View style={styles.receiptDetails}>
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptLabel}>Receipt Number:</Text>
                    <Text style={styles.receiptValue}>{receiptNumber}</Text>
                  </View>
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptLabel}>Booking Number:</Text>
                    <Text style={styles.receiptValue}>
                      {booking?.booking_number}
                    </Text>
                  </View>
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptLabel}>Amount Paid:</Text>
                    <Text style={styles.receiptValue}>
                      MVR {booking?.total_fare?.toFixed(2) || '0.00'}
                    </Text>
                  </View>
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptLabel}>Payment Method:</Text>
                    <Text style={styles.receiptValue}>
                      {booking?.payment_method ||
                        booking?.payment_method_type ||
                        'N/A'}
                    </Text>
                  </View>
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptLabel}>Date:</Text>
                    <Text style={styles.receiptValue}>
                      {formatDateTime(booking?.created_at || '')}
                    </Text>
                  </View>
                </View>
              ) : (
                <Text style={styles.noReceiptText}>
                  Receipt number is not available for this booking.
                </Text>
              )}
            </ScrollView>
            <View style={styles.receiptActions}>
              <Button
                title='Close'
                onPress={closeReceiptModal}
                style={styles.receiptCloseButton}
              />
            </View>
          </Card>
        </View>
      </Modal>

      {/* Hidden TicketDesign for image generation */}
      <View style={styles.hiddenTicketContainer}>
        <TicketDesign
          booking={booking ? convertAdminBookingToBooking(booking) : null}
          size='large'
          forImageGeneration={true}
          ref={imageGenerationTicketRef}
        />
      </View>
    </View>
  );
}

// Helper functions for status colors
const getStatusColor = (status: string) => {
  switch (status) {
    case 'confirmed':
      return colors.success;
    case 'cancelled':
      return colors.danger;
    case 'completed':
      return colors.info;
    case 'pending_payment':
      return colors.warning;
    default:
      return colors.textSecondary;
  }
};

const getPaymentStatusColor = (status: string) => {
  switch (status) {
    case 'completed':
      return colors.success;
    case 'pending':
      return colors.warning;
    case 'failed':
      return colors.danger;
    case 'refunded':
      return colors.info;
    default:
      return colors.textSecondary;
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    gap: 16,
  },
  noPermissionContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 64,
    gap: 16,
    backgroundColor: colors.backgroundSecondary,
  },
  noPermissionText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 250,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
    backgroundColor: colors.backgroundSecondary,
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.backgroundSecondary,
    padding: 20,
    gap: 16,
  },
  backButton: {
    padding: 8,
  },
  // editButton: {
  //   padding: 8,
  // },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    gap: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  overviewCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  overviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  overviewHeaderLeft: {
    // flex: 1,
  },
  bookingId: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
    marginBottom: 4,
  },
  routeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  routeName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    // flex: 1,
  },
  statusContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  statusBadge: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
  },
  detailsGrid: {
    gap: 12,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    gap: 20,
  },
  detailItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
  },
  customerCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 1,
  },

  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  customerInfo: {
    marginLeft: 28,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  contactInfo: {
    gap: 6,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  contactText: {
    fontSize: 14,
    color: colors.textSecondary,
  },

  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  infoLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
    flexShrink: 1,
    marginRight: 8,
  },
  infoValue: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '600',
    flexShrink: 1,
    flex: 1,
    textAlign: 'right',
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
  },
  infoCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 1,
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: colors.border || '#E5E5E5',
    backgroundColor: colors.card,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
    textAlign: 'center',
  },
  modalCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalShareButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shareIconButtonDisabled: {
    opacity: 0.5,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalOverlayContent: {
    width: '100%',
    maxWidth: 500,
    maxHeight: '85%',
    height: '85%',
  },
  cancelModalCard: {
    width: '100%',
    height: '100%',
    padding: 0,
    overflow: 'hidden',
    flexDirection: 'column',
  },
  cancelModalScrollView: {
    flex: 1,
  },
  cancelModalScrollContent: {
    padding: 20,
    paddingTop: 16,
    paddingBottom: 16,
  },
  cancelModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border || '#E5E5E5',
  },
  cancelModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  cancelModalText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 20,
  },
  refundSection: {
    marginBottom: 20,
  },
  refundSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  refundOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.border || '#E5E5E5',
    marginBottom: 10,
    backgroundColor: colors.backgroundSecondary,
  },
  refundOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}10`,
  },
  refundOptionText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },
  refundOptionTextSelected: {
    fontWeight: '700',
    color: colors.primary,
  },
  refundOptionAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  inputSection: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  reasonInput: {
    minHeight: 80,
  },
  refundMethodSection: {
    marginBottom: 20,
  },
  refundMethodOption: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.border || '#E5E5E5',
    marginBottom: 10,
    backgroundColor: colors.backgroundSecondary,
  },
  refundMethodOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}10`,
  },
  refundMethodText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },
  refundMethodTextSelected: {
    fontWeight: '700',
    color: colors.primary,
  },
  refundMethodDescription: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
    lineHeight: 16,
  },
  bankDetailsSection: {
    marginTop: 12,
    gap: 12,
  },
  infoText: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 16,
    fontStyle: 'italic',
    lineHeight: 18,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border || '#E5E5E5',
    backgroundColor: colors.card,
    flexShrink: 0,
  },
  modalButton: {
    flex: 1,
  },
  modalDangerButton: {
    backgroundColor: colors.danger,
  },
  modalCancelText: {
    color: colors.textSecondary,
  },
  modalConfirmText: {
    color: '#FFFFFF',
  },
  receiptModalCard: {
    width: '100%',
    maxWidth: 500,
    maxHeight: '90%',
    padding: 20,
  },
  receiptModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  receiptModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
    textAlign: 'center',
  },
  receiptContent: {
    maxHeight: 400,
  },
  receiptDetails: {
    gap: 16,
  },
  receiptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border || '#E5E5E5',
  },
  receiptLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  receiptValue: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '600',
  },
  noReceiptText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    padding: 20,
  },
  receiptActions: {
    marginTop: 20,
  },
  receiptCloseButton: {
    width: '100%',
  },
  hiddenTicketContainer: {
    position: 'absolute',
    left: -10000,
    top: -10000,
    opacity: 0,
    pointerEvents: 'none',
  },
  agentFinancialCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 1,
    borderWidth: 1,
    borderColor: `${colors.primary}20`,
  },
  agentFinancialHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  agentFinancialTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  agentFinancialContent: {
    gap: 12,
  },
  agentFinancialRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  agentFinancialRowTotal: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border || '#E5E5E5',
  },
  agentFinancialLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  agentFinancialLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
    flex: 1,
  },
  agentTotalLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  agentFinancialValue: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '600',
    textAlign: 'right',
  },
  agentDiscountValue: {
    color: colors.success,
  },
  agentCommissionValue: {
    color: colors.primary,
  },
  agentTotalValue: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
  },
  agentFinancialSubRow: {
    marginTop: 4,
    marginBottom: 4,
    paddingLeft: 22,
  },
  agentFinancialSubText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
});
