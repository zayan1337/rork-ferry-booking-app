import { create } from 'zustand';
import { supabase } from '@/utils/supabase';
import { getMaldivesTodayString } from '@/utils/timezoneUtils';
import {
  AdminBooking,
  AdminBookingStats,
  AdminBookingFilters,
  AdminBookingFormData,
  BookingStatus,
} from '@/types/admin/management';

interface AdminBookingState {
  // Data
  bookings: AdminBooking[];
  stats: AdminBookingStats;
  filters: AdminBookingFilters;

  // Loading states
  loading: boolean;
  statsLoading: boolean;
  updating: boolean;
  hasFetched: boolean;

  // Pagination
  currentPage: number;
  itemsPerPage: number;
  totalItems: number;
  hasMore: boolean;

  // Error handling
  error: string | null;

  // Actions
  fetchBookings: (refresh?: boolean) => Promise<void>;
  fetchStats: () => Promise<void>;
  fetchBooking: (id: string) => Promise<AdminBooking | null>;
  createBooking: (data: AdminBookingFormData) => Promise<string>;
  updateBooking: (id: string, updates: Partial<AdminBooking>) => Promise<void>;
  updatePaymentStatus: (
    bookingId: string,
    status: string,
    amount?: number,
    paymentMethod?: string
  ) => Promise<void>;
  deleteBooking: (id: string) => Promise<void>;
  updateBookingStatus: (id: string, status: BookingStatus) => Promise<void>;
  bulkUpdateStatus: (ids: string[], status: BookingStatus) => Promise<void>;

  // Filter and search
  setFilters: (filters: Partial<AdminBookingFilters>) => void;
  clearFilters: () => void;
  setSearchQuery: (query: string) => void;
  setSortBy: (sortBy: AdminBookingFilters['sortBy']) => void;
  setSortOrder: (order: 'asc' | 'desc') => void;

  // Selection
  toggleBookingSelection: (id: string) => void;
  selectAllBookings: () => void;
  clearSelection: () => void;

  // Pagination
  setCurrentPage: (page: number) => void;
  setItemsPerPage: (items: number) => void;
  loadMore: () => Promise<void>;

  // Utility
  getFilteredBookings: () => AdminBooking[];
  getStatusCount: (status: BookingStatus | 'all') => number;
}

const initialFilters: AdminBookingFilters = {
  searchQuery: '',
  filterStatus: 'all',
  filterAgent: 'all',
  filterRoute: 'all',
  filterDateRange: {
    start: null,
    end: null,
  },
  sortBy: 'created_at',
  sortOrder: 'desc',
  selectedBookings: [],
};

const initialStats: AdminBookingStats = {
  total_bookings: 0,
  today_bookings: 0,
  today_bookings_change: '0',
  today_revenue: 0,
  today_revenue_change: '0',
  total_revenue: 0,
  confirmed_count: 0,
  confirmed_rate: '0',
  reserved_count: 0,
  cancelled_count: 0,
  completed_count: 0,
  pending_payment_count: 0,
  checked_in_count: 0,
};

export const useAdminBookingStore = create<AdminBookingState>((set, get) => ({
  // Initial state
  bookings: [],
  stats: initialStats,
  filters: initialFilters,
  loading: false,
  statsLoading: false,
  updating: false,
  hasFetched: false,
  currentPage: 1,
  itemsPerPage: 20,
  totalItems: 0,
  hasMore: true,
  error: null,

  // Fetch bookings from admin_bookings_view
  fetchBookings: async (refresh = false) => {
    const { filters, currentPage, itemsPerPage } = get();

    // If refreshing, reset to page 1 and clear existing bookings
    if (refresh) {
      set({
        loading: true,
        error: null,
        currentPage: 1,
        bookings: [],
      });
    } else {
      set({ loading: true, error: null });
    }

    try {
      // Use the admin_bookings_view which has all the necessary joins
      let query = supabase
        .from('admin_bookings_view')
        .select('*', { count: 'exact' });

      // Apply filters
      if (filters.searchQuery) {
        query = query.or(
          `user_name.ilike.%${filters.searchQuery}%,` +
            `user_email.ilike.%${filters.searchQuery}%,` +
            `booking_number.ilike.%${filters.searchQuery}%,` +
            `route_name.ilike.%${filters.searchQuery}%`
        );
      }

      if (filters.filterStatus !== 'all') {
        query = query.eq('status', filters.filterStatus);
      }

      if (filters.filterAgent !== 'all') {
        query = query.eq('agent_id', filters.filterAgent);
      }

      if (filters.filterRoute !== 'all') {
        query = query.eq('route_name', filters.filterRoute);
      }

      if (filters.filterDateRange.start) {
        query = query.gte('created_at', filters.filterDateRange.start);
      }

      if (filters.filterDateRange.end) {
        query = query.lte('created_at', filters.filterDateRange.end);
      }

      // Apply sorting
      const sortColumn =
        filters.sortBy === 'created_at' ? 'created_at' : filters.sortBy;
      query = query.order(sortColumn, {
        ascending: filters.sortOrder === 'asc',
      });

      // Apply pagination
      const from = refresh ? 0 : (get().currentPage - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) {
        console.error('Error fetching bookings:', error);
        throw error;
      }

      // Transform the data to match AdminBooking interface
      let transformedBookings: AdminBooking[] = (data || []).map(
        (booking: any) => ({
          id: booking.id,
          booking_number: booking.booking_number,
          user_id: booking.user_id,
          trip_id: booking.trip_id,
          is_round_trip: booking.is_round_trip,
          return_booking_id: booking.return_booking_id,
          status: booking.status,
          total_fare: booking.total_fare,
          qr_code_url: booking.qr_code_url,
          check_in_status: booking.check_in_status,
          agent_id: booking.agent_id,
          agent_client_id: booking.agent_client_id,
          payment_method_type: booking.payment_method_type,
          round_trip_group_id: booking.round_trip_group_id,
          created_at: booking.created_at,
          updated_at: booking.updated_at,
          // Data from the view
          user_name: booking.user_name,
          user_email: booking.user_email,
          user_mobile: booking.user_mobile,
          trip_travel_date: booking.trip_travel_date,
          trip_departure_time: booking.trip_departure_time,
          trip_base_fare: booking.trip_base_fare,
          vessel_name: booking.vessel_name,
          vessel_capacity: booking.vessel_capacity,
          route_name: booking.route_name,
          from_island_name: booking.from_island_name,
          to_island_name: booking.to_island_name,
          agent_name: booking.agent_name,
          agent_email: booking.agent_email,
          passenger_count: booking.passenger_count || 0,
          payment_status: booking.payment_status,
          payment_amount: booking.payment_amount,
          payment_method: booking.payment_method,
        })
      );

      // Enrich bookings with segment data for accurate pickup/dropoff display
      if (transformedBookings.length > 0) {
        const bookingIds = transformedBookings.map(b => b.id);
        try {
          const { data: segmentsData, error: segmentsError } = await supabase
            .from('booking_segments')
            .select(
              `
              booking_id,
              fare_amount,
              boarding_stop:route_stops!booking_segments_boarding_stop_id_fkey(
                id,
                stop_sequence,
                islands(name, zone)
              ),
              destination_stop:route_stops!booking_segments_destination_stop_id_fkey(
                id,
                stop_sequence,
                islands(name, zone)
              )
            `
            )
            .in('booking_id', bookingIds);

          if (!segmentsError && segmentsData) {
            // Create a map of booking_id to segment data
            const segmentsMap = new Map<string, any>();
            segmentsData.forEach((segment: any) => {
              if (!segmentsMap.has(segment.booking_id)) {
                segmentsMap.set(segment.booking_id, []);
              }
              segmentsMap.get(segment.booking_id)!.push(segment);
            });

            // Enrich bookings with segment data and segment fare
            transformedBookings = transformedBookings.map(booking => {
              const segments = segmentsMap.get(booking.id);
              if (segments && segments.length > 0) {
                // Get the segment fare from the first segment (there should be only one per booking)
                const segmentFare = segments[0]?.fare_amount || 0;
                return {
                  ...booking,
                  booking_segments: segments,
                  segment_fare: segmentFare, // Add segment_fare to booking object
                } as AdminBooking & {
                  booking_segments?: any[];
                  segment_fare?: number;
                };
              }
              return booking;
            });
          }
        } catch (segmentsErr) {
          // If segment fetch fails, continue without segment data
          console.warn('Failed to fetch booking segments:', segmentsErr);
        }
      }

      const totalItems = count || 0;
      const hasMore = from + transformedBookings.length < totalItems;

      set({
        bookings: refresh
          ? transformedBookings
          : (() => {
              const existingBookings = get().bookings;
              const existingIds = new Set(existingBookings.map(b => b.id));
              const newBookings = transformedBookings.filter(
                newBooking => !existingIds.has(newBooking.id)
              );
              return [...existingBookings, ...newBookings];
            })(),
        totalItems,
        hasMore,
        currentPage: refresh ? 1 : currentPage,
        loading: false,
        hasFetched: true,
      });
    } catch (error) {
      console.error('Error fetching bookings:', error);
      set({
        error:
          error instanceof Error ? error.message : 'Failed to fetch bookings',
        loading: false,
      });
    }
  },

  // Fetch booking statistics
  fetchStats: async () => {
    set({ statsLoading: true });

    try {
      // Get all bookings to calculate stats (include trip_id for today's trip bookings and payment_method_type for revenue calculation)
      const { data: allBookings, error: bookingsError } = await supabase
        .from('bookings')
        .select(
          'id, status, total_fare, created_at, trip_id, payment_method_type, trip:trip_id(id, travel_date)'
        )
        .order('created_at', { ascending: false });

      // Fetch cancellations data for partial refund calculation (include status and created_at)
      const { data: allCancellations, error: cancellationsError } =
        await supabase
          .from('cancellations')
          .select(
            'booking_id, refund_amount, cancellation_fee, status, created_at'
          );

      // Create a map with full cancellation details for proper filtering
      const cancellationDetailsMap = new Map<
        string,
        {
          refund_amount: number;
          status: string;
          created_at: string;
        }
      >();

      if (
        !cancellationsError &&
        allCancellations &&
        allCancellations.length > 0
      ) {
        allCancellations.forEach(cancellation => {
          cancellationDetailsMap.set(cancellation.booking_id, {
            refund_amount: Number(cancellation.refund_amount || 0),
            status: cancellation.status || 'pending',
            created_at: cancellation.created_at || new Date().toISOString(),
          });
        });
      } else {
        // Fallback: Calculate refund amounts from cancelled bookings
        // For cancelled bookings, calculate refund as 50% of total_fare if payment was made
        const cancelledBookings = (allBookings || []).filter(
          b => b.status === 'cancelled'
        );

        // Fetch payments for cancelled bookings to check if payment was made
        if (cancelledBookings.length > 0) {
          const cancelledBookingIds = cancelledBookings.map(b => b.id);
          const { data: cancelledPayments, error: paymentsError } =
            await supabase
              .from('payments')
              .select('booking_id, amount, status, created_at')
              .in('booking_id', cancelledBookingIds)
              .eq('status', 'completed');

          if (!paymentsError && cancelledPayments) {
            // Create a map of booking_id to payment amount
            const paymentMap = new Map<string, number>();
            cancelledPayments.forEach(payment => {
              const current = paymentMap.get(payment.booking_id) || 0;
              paymentMap.set(
                payment.booking_id,
                current + Number(payment.amount || 0)
              );
            });

            // For each cancelled booking with payment, calculate 50% refund
            cancelledBookings.forEach(booking => {
              const paidAmount = paymentMap.get(booking.id);
              if (paidAmount && paidAmount > 0) {
                const refundAmount = booking.total_fare * 0.5; // 50% refund policy
                cancellationDetailsMap.set(booking.id, {
                  refund_amount: refundAmount,
                  status: 'pending', // Assume pending if no cancellation record exists
                  created_at: booking.created_at || new Date().toISOString(),
                });
              }
            });
          }
        }
      }

      // Create refund map for revenue calculation (only include cancellations with actual refund amounts)
      const refundMap = new Map<string, number>();
      cancellationDetailsMap.forEach((details, bookingId) => {
        // Only include refunds where refund_amount > 0 (actual refunds, not zero refunds)
        if (details.refund_amount > 0) {
          refundMap.set(bookingId, details.refund_amount);
        }
      });

      if (bookingsError) {
        throw bookingsError;
      }

      const bookings = allBookings || [];

      // Calculate today's and yesterday's dates with time ranges (Maldives timezone)
      const today = getMaldivesTodayString();
      const todayStart = `${today}T00:00:00`;
      const todayEnd = `${today}T23:59:59`;

      // Calculate yesterday in Maldives timezone
      const todayDate = new Date(today + 'T00:00:00');
      todayDate.setDate(todayDate.getDate() - 1);
      const yesterdayDate = todayDate.toISOString().split('T')[0];
      const yesterdayStart = `${yesterdayDate}T00:00:00`;
      const yesterdayEnd = `${yesterdayDate}T23:59:59`;

      // Filter bookings by date and status (more precise date comparison)
      const todayBookingsList = bookings.filter(b => {
        if (!b.created_at) return false;
        const bookingDate = new Date(b.created_at).toISOString();
        return bookingDate >= todayStart && bookingDate <= todayEnd;
      });
      const yesterdayBookingsList = bookings.filter(b => {
        if (!b.created_at) return false;
        const bookingDate = new Date(b.created_at).toISOString();
        return bookingDate >= yesterdayStart && bookingDate <= yesterdayEnd;
      });

      // Revenue statuses and helper function for net revenue calculation
      const confirmedStatuses = ['confirmed', 'checked_in', 'completed'];

      // Helper function to calculate net revenue accounting for refunds AND payment methods
      // Business Logic:
      // - MIB bookings (confirmed/checked_in/completed): Full total_fare as revenue (actual money received)
      // - Agent CREDIT bookings: MVR 0 revenue (money already counted when agent recharged credit)
      // - FREE ticket bookings: MVR 0 revenue (no money received, it's complimentary)
      // - Cancelled bookings with refund: Net revenue = total_fare - refund_amount (remaining amount kept)
      // - Cancelled bookings without payment: 0 revenue (no payment was made)
      // - Other statuses (reserved, pending_payment): 0 revenue (payment not completed)
      const calculateNetRevenue = (booking: any): number => {
        const totalFare = Number(booking.total_fare || 0);
        const paymentMethod = booking.payment_method_type;

        // ✅ CRITICAL: Exclude credit and free ticket bookings from revenue
        // - Credit bookings: Revenue already counted when agent recharged their wallet
        // - Free tickets: No money received (complimentary service for agent)
        if (paymentMethod === 'credit' || paymentMethod === 'free') {
          return 0;
        }

        if (booking.status === 'cancelled') {
          const cancellation = cancellationDetailsMap.get(booking.id);
          if (!cancellation) {
            // No cancellation record - no payment was made, no revenue
            return 0;
          }

          // If refund_amount is 0, no refund was given (no payment was made), so no revenue
          if (cancellation.refund_amount === 0) {
            return 0;
          }

          // Calculate net revenue = total_fare - refund_amount (amount kept after partial refund)
          // Example: Booking MVR 1000, refund MVR 500 → Revenue = MVR 500 (amount kept)
          return Math.max(0, totalFare - cancellation.refund_amount);
        } else if (confirmedStatuses.includes(booking.status)) {
          // For confirmed/checked_in/completed MIB bookings: full revenue
          return totalFare;
        }
        // For other statuses (reserved, pending_payment): no revenue
        return 0;
      };

      // Calculate statistics
      const totalBookings = bookings.length;
      const todayBookings = todayBookingsList.length;

      // Calculate total refunded amount - count all cancellations with refund_amount > 0
      const totalRefundedAmount = Array.from(cancellationDetailsMap.values())
        .filter(c => c.refund_amount > 0)
        .reduce((sum, c) => sum + c.refund_amount, 0);

      // Calculate today's refunded amount - filter by cancellation created_at date
      const todayRefundedAmount = Array.from(cancellationDetailsMap.entries())
        .filter(([bookingId, cancellation]) => {
          // Check if cancellation was created today and has refund_amount > 0
          const cancellationDate = new Date(cancellation.created_at)
            .toISOString()
            .split('T')[0];
          return cancellationDate === today && cancellation.refund_amount > 0;
        })
        .reduce((sum, [, cancellation]) => sum + cancellation.refund_amount, 0);

      // Calculate today's trip bookings (bookings for trips happening today)
      const todayTripDate = today; // Already calculated above
      const todayTripBookings = bookings.filter(b => {
        // Handle both array and object format from Supabase
        const trip = Array.isArray(b.trip) ? b.trip[0] : b.trip;
        if (!trip || !trip.travel_date) return false;
        const tripDate = new Date(trip.travel_date).toISOString().split('T')[0];
        return tripDate === todayTripDate;
      });
      const todayTripBookingsCount = todayTripBookings.length;

      // Booking revenue accounting for partial refunds on cancelled bookings (MIB only)
      const bookingRevenue = bookings.reduce(
        (sum, b) => sum + calculateNetRevenue(b),
        0
      );

      // ✅ Add agent credit recharge revenue
      // When agents top up their credit, that's when the business receives actual money
      // Agent credits are tracked in agent_credit_transactions, NOT wallet_transactions
      const { data: creditRecharges, error: creditRechargesError } =
        await supabase
          .from('agent_credit_transactions')
          .select('amount, created_at')
          .eq('transaction_type', 'refill');

      const creditRechargeRevenue =
        !creditRechargesError && creditRecharges
          ? creditRecharges.reduce((sum, t) => sum + Number(t.amount || 0), 0)
          : 0;

      // ✅ Total Revenue = Booking Revenue (MIB only) + Agent Credit Recharges
      const totalRevenue = bookingRevenue + creditRechargeRevenue;

      // Today's booking revenue accounting for partial refunds
      const todayBookingRevenue = todayBookingsList.reduce(
        (sum, b) => sum + calculateNetRevenue(b),
        0
      );

      // Today's credit recharge revenue
      const todayCreditRecharges =
        !creditRechargesError && creditRecharges
          ? creditRecharges.filter(t => {
              const txDate = new Date(t.created_at).toISOString();
              return txDate >= todayStart && txDate <= todayEnd;
            })
          : [];

      const todayCreditRechargeRevenue = todayCreditRecharges.reduce(
        (sum, t) => sum + Number(t.amount || 0),
        0
      );

      // ✅ Total today revenue = Booking Revenue + Credit Recharge Revenue
      const todayRevenue = todayBookingRevenue + todayCreditRechargeRevenue;

      // Yesterday's booking revenue accounting for partial refunds
      const yesterdayBookingRevenue = yesterdayBookingsList.reduce(
        (sum, b) => sum + calculateNetRevenue(b),
        0
      );

      // Yesterday's credit recharge revenue
      const yesterdayCreditRecharges =
        !creditRechargesError && creditRecharges
          ? creditRecharges.filter(t => {
              const txDate = new Date(t.created_at).toISOString();
              return txDate >= yesterdayStart && txDate <= yesterdayEnd;
            })
          : [];

      const yesterdayCreditRechargeRevenue = yesterdayCreditRecharges.reduce(
        (sum, t) => sum + Number(t.amount || 0),
        0
      );

      // ✅ Total yesterday revenue = Booking Revenue + Credit Recharge Revenue
      const yesterdayRevenue =
        yesterdayBookingRevenue + yesterdayCreditRechargeRevenue;

      // Count by status
      const statusCounts = {
        confirmed: 0,
        reserved: 0,
        pending_payment: 0,
        cancelled: 0,
        completed: 0,
        checked_in: 0,
      };

      bookings.forEach(booking => {
        if (
          statusCounts[booking.status as keyof typeof statusCounts] !==
          undefined
        ) {
          statusCounts[booking.status as keyof typeof statusCounts]++;
        }
      });

      // Calculate today's cancelled bookings count
      const todayCancelledCount = todayBookingsList.filter(
        b => b.status === 'cancelled'
      ).length;

      // ✅ Count agent credit and free ticket bookings (non-revenue bookings)
      const agentCreditBookingsCount = bookings.filter(
        b => b.payment_method_type === 'credit'
      ).length;
      const freeTicketBookingsCount = bookings.filter(
        b => b.payment_method_type === 'free'
      ).length;

      const confirmedCount = statusCounts.confirmed;
      const confirmedRate =
        totalBookings > 0
          ? ((confirmedCount / totalBookings) * 100).toFixed(1)
          : '0';

      // Calculate change percentages
      const yesterdayBookings = yesterdayBookingsList.length;
      const todayBookingsChange =
        yesterdayBookings > 0
          ? (
              ((todayBookings - yesterdayBookings) / yesterdayBookings) *
              100
            ).toFixed(1)
          : todayBookings > 0
            ? '100'
            : '0';

      const todayRevenueChange =
        yesterdayRevenue > 0
          ? (
              ((todayRevenue - yesterdayRevenue) / yesterdayRevenue) *
              100
            ).toFixed(1)
          : todayRevenue > 0
            ? '100'
            : '0';

      const stats: AdminBookingStats = {
        total_bookings: totalBookings,
        today_bookings: todayBookings,
        today_bookings_change: todayBookingsChange,
        today_revenue: todayRevenue,
        today_revenue_change: todayRevenueChange,
        total_revenue: totalRevenue,
        confirmed_count: confirmedCount,
        confirmed_rate: confirmedRate,
        reserved_count: statusCounts.reserved,
        cancelled_count: statusCounts.cancelled,
        completed_count: statusCounts.completed,
        pending_payment_count: statusCounts.pending_payment,
        checked_in_count: statusCounts.checked_in,
        total_refunded_amount: totalRefundedAmount,
        today_refunded_amount: todayRefundedAmount,
        today_trip_bookings: todayTripBookingsCount,
        today_cancelled_count: todayCancelledCount,
        agent_credit_bookings_count: agentCreditBookingsCount, // ✅ Non-revenue bookings
        free_ticket_bookings_count: freeTicketBookingsCount, // ✅ Promotional bookings
      };

      set({ stats, statsLoading: false });
    } catch (error) {
      console.error('Error fetching booking stats:', error);
      set({ statsLoading: false });
    }
  },

  // Fetch single booking
  fetchBooking: async (id: string) => {
    try {
      const { data, error } = await supabase
        .from('admin_bookings_view')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching booking:', error);
      return null;
    }
  },

  // Create new booking
  createBooking: async (data: AdminBookingFormData) => {
    set({ updating: true, error: null });

    try {
      // Get current authenticated admin user
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        throw new Error('Admin must be authenticated to create booking');
      }

      // Create the booking first
      const { data: booking, error } = await supabase
        .from('bookings')
        .insert({
          user_id: data.user_id, // Use the selected customer's user ID
          trip_id: data.trip_id,
          is_round_trip: data.is_round_trip,
          return_booking_id: data.return_booking_id,
          total_fare: data.total_fare,
          agent_id: data.agent_id,
          agent_client_id: data.agent_client_id,
          payment_method_type: data.payment_method_type,
          status: 'confirmed', // Admin bookings are confirmed by default
          check_in_status: false,
        })
        .select('id, booking_number')
        .single();

      if (error) throw error;

      // Generate QR code URL using the auto-generated booking number
      const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`Booking: ${booking.booking_number}`)}`;

      // Update booking with QR code URL
      const { error: qrUpdateError } = await supabase
        .from('bookings')
        .update({ qr_code_url: qrCodeUrl })
        .eq('id', booking.id);

      if (qrUpdateError) {
        console.error('Failed to update QR code URL:', qrUpdateError);
      }

      // Create passengers if provided
      if (data.passengers.length > 0 && booking) {
        const passengers = data.passengers.map(passenger => ({
          booking_id: booking.id,
          passenger_name: passenger.passenger_name,
          passenger_contact_number: passenger.passenger_contact_number,
          special_assistance_request: passenger.special_assistance_request,
          seat_id: passenger.seat_id || null,
        }));

        const { error: passengerError } = await supabase
          .from('passengers')
          .insert(passengers);

        if (passengerError) throw passengerError;
      }

      // Reserve seats if seat_ids are provided
      if (data.passengers.length > 0 && booking) {
        const seatReservations = data.passengers
          .filter(passenger => passenger.seat_id)
          .map(passenger => ({
            trip_id: data.trip_id,
            seat_id: passenger.seat_id!,
            booking_id: booking.id,
            is_available: false,
            is_reserved: false,
            // Clear temporary reservation fields
            user_id: null,
            session_id: null,
            temp_reservation_expiry: null,
            last_activity: new Date().toISOString(),
          }));

        if (seatReservations.length > 0) {
          const { error: seatError } = await supabase
            .from('seat_reservations')
            .upsert(seatReservations, { onConflict: 'trip_id,seat_id' });

          if (seatError) {
            console.warn('Failed to reserve seats:', seatError);
          }
        }
      }

      // Create payment record
      const { error: paymentError } = await supabase.from('payments').insert({
        booking_id: booking.id,
        payment_method: data.payment_method_type as any,
        amount: data.total_fare,
        status: 'completed', // Admin bookings are paid by default
      });

      if (paymentError) {
        console.warn('Failed to create payment record:', paymentError);
      }

      set({ updating: false });
      return booking.id;
    } catch (error) {
      console.error('Error creating booking:', error);
      set({
        error:
          error instanceof Error ? error.message : 'Failed to create booking',
        updating: false,
      });
      throw error;
    }
  },

  // Update booking
  updateBooking: async (id: string, updates: Partial<AdminBooking>) => {
    set({ updating: true, error: null });

    try {
      // Filter out fields that don't exist in the bookings table
      // These fields come from joins in views (like trip_travel_date, from_island_name, etc.)
      const validBookingFields: (keyof AdminBooking)[] = [
        'user_id',
        'trip_id',
        'is_round_trip',
        'return_booking_id',
        'status',
        'total_fare',
        'qr_code_url',
        'check_in_status',
        'checked_in_at',
        'checked_in_by',
        'agent_id',
        'agent_client_id',
        'payment_method_type',
        'round_trip_group_id',
      ];

      const filteredUpdates: Partial<AdminBooking> = {};
      for (const key of validBookingFields) {
        const value = updates[key];
        if (value !== undefined) {
          (
            filteredUpdates as Record<
              keyof AdminBooking,
              AdminBooking[keyof AdminBooking]
            >
          )[key] = value;
        }
      }

      const { error } = await supabase
        .from('bookings')
        .update(filteredUpdates)
        .eq('id', id);

      if (error) throw error;

      // Refresh bookings list
      await get().fetchBookings(true);
      set({ updating: false });
    } catch (error) {
      console.error('Error updating booking:', error);
      set({
        error:
          error instanceof Error ? error.message : 'Failed to update booking',
        updating: false,
      });
      throw error;
    }
  },

  updatePaymentStatus: async (
    bookingId: string,
    status: string,
    amount?: number,
    paymentMethod?: string
  ) => {
    set({ updating: true, error: null });

    try {
      const updates: Record<string, any> = {
        status,
      };

      if (amount !== undefined) {
        updates.amount = amount;
      }

      const { data: payments, error } = await supabase
        .from('payments')
        .update(updates)
        .eq('booking_id', bookingId)
        .select('id');

      if (error) throw error;

      // If no payment rows were affected, create one
      if (!payments || payments.length === 0) {
        const methodToUse = paymentMethod || 'gateway';
        const insertData: Record<string, any> = {
          booking_id: bookingId,
          status,
          payment_method: methodToUse,
          amount: amount ?? 0,
        };

        const { error: insertError } = await supabase
          .from('payments')
          .insert(insertData);

        if (insertError) throw insertError;
      }

      // Refresh the booking to reflect payment changes
      await get().fetchBooking(bookingId);
      set({ updating: false });
    } catch (error) {
      console.error('Error updating payment status:', error);
      set({
        error:
          error instanceof Error
            ? error.message
            : 'Failed to update payment status',
        updating: false,
      });
      throw error;
    }
  },

  // Delete booking
  deleteBooking: async (id: string) => {
    set({ updating: true, error: null });

    try {
      const { error } = await supabase.from('bookings').delete().eq('id', id);

      if (error) throw error;

      // Refresh bookings list
      await get().fetchBookings(true);
      set({ updating: false });
    } catch (error) {
      console.error('Error deleting booking:', error);
      set({
        error:
          error instanceof Error ? error.message : 'Failed to delete booking',
        updating: false,
      });
      throw error;
    }
  },

  // Update booking status
  updateBookingStatus: async (id: string, status: BookingStatus) => {
    return get().updateBooking(id, { status });
  },

  // Bulk update status
  bulkUpdateStatus: async (ids: string[], status: BookingStatus) => {
    set({ updating: true, error: null });

    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status })
        .in('id', ids);

      if (error) throw error;

      // Refresh bookings list
      await get().fetchBookings(true);
      set({ updating: false });
    } catch (error) {
      console.error('Error bulk updating bookings:', error);
      set({
        error:
          error instanceof Error ? error.message : 'Failed to update bookings',
        updating: false,
      });
      throw error;
    }
  },

  // Filter and search actions
  setFilters: (filters: Partial<AdminBookingFilters>) => {
    set(state => ({
      filters: { ...state.filters, ...filters },
      currentPage: 1, // Reset to first page when filters change
    }));
    get().fetchBookings(true);
  },

  clearFilters: () => {
    set({ filters: initialFilters, currentPage: 1 });
    get().fetchBookings(true);
  },

  setSearchQuery: (query: string) => {
    get().setFilters({ searchQuery: query });
  },

  setSortBy: (sortBy: AdminBookingFilters['sortBy']) => {
    get().setFilters({ sortBy });
  },

  setSortOrder: (order: 'asc' | 'desc') => {
    get().setFilters({ sortOrder: order });
  },

  // Selection actions
  toggleBookingSelection: (id: string) => {
    set(state => ({
      filters: {
        ...state.filters,
        selectedBookings: state.filters.selectedBookings.includes(id)
          ? state.filters.selectedBookings.filter(bookingId => bookingId !== id)
          : [...state.filters.selectedBookings, id],
      },
    }));
  },

  selectAllBookings: () => {
    const { bookings, filters } = get();
    const allIds = bookings.map(booking => booking.id);
    const isAllSelected = filters.selectedBookings.length === allIds.length;

    set(state => ({
      filters: {
        ...state.filters,
        selectedBookings: isAllSelected ? [] : allIds,
      },
    }));
  },

  clearSelection: () => {
    set(state => ({
      filters: {
        ...state.filters,
        selectedBookings: [],
      },
    }));
  },

  // Pagination actions
  setCurrentPage: (page: number) => {
    set({ currentPage: page });
  },

  setItemsPerPage: (items: number) => {
    set({ itemsPerPage: items, currentPage: 1 });
    get().fetchBookings(true);
  },

  loadMore: async () => {
    const { hasMore, loading } = get();
    if (!hasMore || loading) return;

    set(state => ({ currentPage: state.currentPage + 1 }));
    await get().fetchBookings();
  },

  // Utility functions
  getFilteredBookings: () => {
    return get().bookings;
  },

  getStatusCount: (status: BookingStatus | 'all') => {
    const { stats } = get();

    if (status === 'all') return stats.total_bookings;

    // Use stats counts instead of filtering paginated bookings
    switch (status) {
      case 'reserved':
        return stats.reserved_count;
      case 'pending_payment':
        return stats.pending_payment_count;
      case 'confirmed':
        return stats.confirmed_count;
      case 'checked_in':
        return stats.checked_in_count;
      case 'completed':
        return stats.completed_count;
      case 'cancelled':
        return stats.cancelled_count;
      default:
        return 0;
    }
  },
}));
