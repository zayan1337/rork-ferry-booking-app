import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { colors } from '@/constants/adminColors';
import { supabase } from '@/utils/supabase';
import { Seat } from '@/types';
import { Lock, AlertTriangle, Wifi, WifiOff } from 'lucide-react-native';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface SeatBlockingManagerProps {
  tripId: string;
  vesselId: string;
  onSeatsChanged?: () => void;
}

interface SeatReservation {
  id: string;
  seat_id: string;
  booking_id: string | null;
  is_available: boolean;
  is_admin_blocked?: boolean;
  temp_reserved_at?: string | null;
  temp_reservation_expiry?: string | null;
  user_id?: string | null;
  seat?: Seat;
}

export default function SeatBlockingManager({
  tripId,
  vesselId,
  onSeatsChanged,
}: SeatBlockingManagerProps) {
  const [seats, setSeats] = useState<Seat[]>([]);
  const [seatReservations, setSeatReservations] = useState<
    Map<string, SeatReservation>
  >(new Map());
  const [loading, setLoading] = useState(true);
  const [processingSeats, setProcessingSeats] = useState<Set<string>>(
    new Set()
  );
  const [stats, setStats] = useState({
    total: 0,
    available: 0,
    booked: 0,
    blocked: 0,
    tempBlocked: 0,
  });
  const [isRealTimeConnected, setIsRealTimeConnected] = useState(false);
  const [recentlyUpdatedSeats, setRecentlyUpdatedSeats] = useState<Set<string>>(
    new Set()
  );

  // Refs for real-time subscriptions
  const reservationsChannelRef = useRef<RealtimeChannel | null>(null);
  const bookingsChannelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    loadSeatData();

    // Set up real-time subscriptions
    setupRealtimeSubscriptions();

    // Cleanup function
    return () => {
      cleanupRealtimeSubscriptions();
    };
  }, [tripId, vesselId]);

  const loadSeatData = async () => {
    setLoading(true);
    try {
      // Fetch all vessel seats
      const { data: vesselSeats, error: seatsError } = await supabase
        .from('seats')
        .select('*')
        .eq('vessel_id', vesselId)
        .order('row_number', { ascending: true })
        .order('seat_number', { ascending: true });

      if (seatsError) throw seatsError;

      if (!vesselSeats || vesselSeats.length === 0) {
        setSeats([]);
        setLoading(false);
        return;
      }

      // Fetch seat reservations for this trip first
      const { data: reservations, error: reservationsError } = await supabase
        .from('seat_reservations')
        .select(
          'id, seat_id, booking_id, is_available, is_admin_blocked, temp_reserved_at, temp_reservation_expiry, user_id'
        )
        .eq('trip_id', tripId);

      if (reservationsError) throw reservationsError;

      // Create a map of reservations
      const reservationMap = new Map<string, SeatReservation>();
      (reservations || []).forEach((res: any) => {
        reservationMap.set(res.seat_id, {
          id: res.id,
          seat_id: res.seat_id,
          booking_id: res.booking_id,
          is_available: res.is_available,
          is_admin_blocked: res.is_admin_blocked || false,
          temp_reserved_at: res.temp_reserved_at,
          temp_reservation_expiry: res.temp_reservation_expiry,
          user_id: res.user_id,
        });
      });

      // Now map seats with reservation data
      const mappedSeats: Seat[] = vesselSeats.map((s: any) => {
        const reservation = reservationMap.get(s.id);
        return {
          id: s.id,
          number: String(s.seat_number || ''),
          rowNumber: Number(s.row_number || 0),
          isWindow: Boolean(s.is_window),
          isAisle: Boolean(s.is_aisle),
          isRowAisle: Boolean(s.is_row_aisle),
          seatType: s.seat_type || 'standard',
          seatClass: s.seat_class || 'economy',
          isDisabled: s.is_disabled || false,
          isPremium: s.is_premium || false,
          priceMultiplier: s.price_multiplier || 1.0,
          positionX: s.position_x || s.row_number || 1,
          positionY: s.position_y || 1,
          isAvailable: reservation ? reservation.is_available : true,
        };
      });

      setSeats(mappedSeats);
      setSeatReservations(reservationMap);

      // Calculate stats
      calculateStats(mappedSeats, reservationMap);
    } catch (error) {
      console.error('Error loading seat data:', error);
      Alert.alert('Error', 'Failed to load seat data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (
    seatList: Seat[],
    reservations: Map<string, SeatReservation>
  ) => {
    let available = 0;
    let booked = 0;
    let blocked = 0;
    let tempBlocked = 0;

    seatList.forEach(seat => {
      const reservation = reservations.get(seat.id);
      if (reservation) {
        // Check if actually booked (booking_id is not null/undefined)
        if (reservation.booking_id != null) {
          booked++;
        } else if (!reservation.is_available) {
          // Check if it's a temporary reservation (has temp_reservation_expiry that hasn't expired)
          if (reservation.temp_reservation_expiry) {
            const expiryTime = new Date(reservation.temp_reservation_expiry);
            const currentTime = new Date();
            if (currentTime < expiryTime) {
              // Temporary reservation still active
              tempBlocked++;
            } else {
              // Expired temp reservation but still blocked
              // Check if it's admin blocked or just expired temp reservation
              if (reservation.is_admin_blocked) {
                blocked++;
              } else {
                // Expired temp reservation - should be available but still marked unavailable
                blocked++; // Count as blocked until cleaned up
              }
            }
          } else if (reservation.is_admin_blocked) {
            // Permanently blocked by admin (is_admin_blocked = true, no temp reservation)
            blocked++;
          } else {
            // Not available but not clearly identified - treat as blocked
            blocked++;
          }
        } else {
          // Check if there's an active temporary reservation even if is_available is true
          if (reservation.temp_reservation_expiry) {
            const expiryTime = new Date(reservation.temp_reservation_expiry);
            const currentTime = new Date();
            if (currentTime < expiryTime) {
              tempBlocked++;
            } else {
              available++;
            }
          } else {
            available++;
          }
        }
      } else {
        // No reservation record means seat is available
        available++;
      }
    });

    setStats({
      total: seatList.length,
      available,
      booked,
      blocked,
      tempBlocked,
    });
  };

  // Real-time subscription setup
  const setupRealtimeSubscriptions = () => {
    console.log(
      '[SeatBlocking] Setting up real-time subscriptions for trip:',
      tripId
    );

    // Subscribe to seat_reservations changes for this trip
    reservationsChannelRef.current = supabase
      .channel(`seat_reservations_trip_${tripId}`)
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'seat_reservations',
          filter: `trip_id=eq.${tripId}`,
        },
        async payload => {
          console.log(
            '[SeatBlocking] Seat reservation change detected:',
            payload
          );

          // Handle different event types
          if (
            payload.eventType === 'INSERT' ||
            payload.eventType === 'UPDATE'
          ) {
            const newReservation = payload.new as any;
            handleReservationUpdate(newReservation);
          } else if (payload.eventType === 'DELETE') {
            const oldReservation = payload.old as any;
            handleReservationDelete(oldReservation);
          }
        }
      )
      .subscribe(status => {
        console.log('[SeatBlocking] Reservations subscription status:', status);
        if (status === 'SUBSCRIBED') {
          setIsRealTimeConnected(true);
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          setIsRealTimeConnected(false);
        }
      });

    // Subscribe to bookings table for this trip to catch new bookings in real-time
    bookingsChannelRef.current = supabase
      .channel(`bookings_trip_${tripId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings',
          filter: `trip_id=eq.${tripId}`,
        },
        async payload => {
          console.log('[SeatBlocking] Booking change detected:', payload);
          // When a booking changes, refresh all seat data to ensure consistency
          await loadSeatData();
          onSeatsChanged?.();
        }
      )
      .subscribe(status => {
        console.log('[SeatBlocking] Bookings subscription status:', status);
      });
  };

  // Clean up real-time subscriptions
  const cleanupRealtimeSubscriptions = () => {
    console.log('[SeatBlocking] Cleaning up real-time subscriptions');

    if (reservationsChannelRef.current) {
      supabase.removeChannel(reservationsChannelRef.current);
      reservationsChannelRef.current = null;
    }

    if (bookingsChannelRef.current) {
      supabase.removeChannel(bookingsChannelRef.current);
      bookingsChannelRef.current = null;
    }

    setIsRealTimeConnected(false);
  };

  // Handle real-time reservation updates
  const handleReservationUpdate = (reservation: any) => {
    console.log('[SeatBlocking] Handling reservation update:', reservation);

    // Mark seat as recently updated for visual feedback
    setRecentlyUpdatedSeats(prev => new Set(prev).add(reservation.seat_id));

    // Remove the highlight after 2 seconds
    setTimeout(() => {
      setRecentlyUpdatedSeats(prev => {
        const updated = new Set(prev);
        updated.delete(reservation.seat_id);
        return updated;
      });
    }, 2000);

    // Determine availability based on status
    // If admin blocked, seat is not available
    // If booked, seat is not available
    // If temp reservation active and not expired, check expiry
    let isAvailable = reservation.is_available;

    if (reservation.booking_id) {
      // Booked - always unavailable
      isAvailable = false;
    } else if (reservation.is_admin_blocked) {
      // Admin blocked - always unavailable
      isAvailable = false;
    } else if (reservation.temp_reservation_expiry) {
      // Check if temp reservation is still active
      const expiryTime = new Date(reservation.temp_reservation_expiry);
      const currentTime = new Date();
      if (currentTime < expiryTime) {
        // Active temp reservation - unavailable unless it's the current user's
        isAvailable = false;
      } else {
        // Expired temp reservation - available
        isAvailable = true;
      }
    }

    // Update the reservation in our map
    const updatedReservation: SeatReservation = {
      id: reservation.id,
      seat_id: reservation.seat_id,
      booking_id: reservation.booking_id,
      is_available: isAvailable,
      is_admin_blocked: reservation.is_admin_blocked || false,
      temp_reserved_at: reservation.temp_reserved_at,
      temp_reservation_expiry: reservation.temp_reservation_expiry,
      user_id: reservation.user_id,
    };

    // Update reservations map
    setSeatReservations(prev => {
      const updated = new Map(prev);
      updated.set(reservation.seat_id, updatedReservation);

      // Update seats array with new availability
      setSeats(currentSeats => {
        const updatedSeats = currentSeats.map(seat =>
          seat.id === reservation.seat_id ? { ...seat, isAvailable } : seat
        );

        // Recalculate stats with updated data
        calculateStats(updatedSeats, updated);

        return updatedSeats;
      });

      return updated;
    });

    // Notify parent component
    onSeatsChanged?.();
  };

  // Handle real-time reservation deletions
  const handleReservationDelete = (reservation: any) => {
    console.log('[SeatBlocking] Handling reservation delete:', reservation);

    // Mark seat as recently updated for visual feedback
    setRecentlyUpdatedSeats(prev => new Set(prev).add(reservation.seat_id));

    // Remove the highlight after 2 seconds
    setTimeout(() => {
      setRecentlyUpdatedSeats(prev => {
        const updated = new Set(prev);
        updated.delete(reservation.seat_id);
        return updated;
      });
    }, 2000);

    // Remove the reservation from our map
    setSeatReservations(prev => {
      const updated = new Map(prev);
      updated.delete(reservation.seat_id);

      // Update seats array - deleted reservation means seat is available
      setSeats(currentSeats => {
        const updatedSeats = currentSeats.map(seat =>
          seat.id === reservation.seat_id
            ? { ...seat, isAvailable: true }
            : seat
        );

        // Recalculate stats with updated data
        calculateStats(updatedSeats, updated);

        return updatedSeats;
      });

      return updated;
    });

    // Notify parent component
    onSeatsChanged?.();
  };

  const toggleSeatBlock = async (seat: Seat) => {
    if (processingSeats.has(seat.id)) return;

    const reservation = seatReservations.get(seat.id);
    // Check if currently blocked by admin
    const isCurrentlyBlocked = reservation?.is_admin_blocked === true;
    // Check if seat is actually booked (has a booking_id that is not null or undefined)
    const isBooked = reservation?.booking_id != null;

    // Also check if there's an active temp reservation
    const hasActiveTempReservation = reservation?.temp_reservation_expiry
      ? new Date(reservation.temp_reservation_expiry) > new Date()
      : false;

    if (isBooked) {
      Alert.alert(
        'Cannot Block Seat',
        'This seat is already booked and cannot be blocked.',
        [{ text: 'OK' }]
      );
      return;
    }

    if (hasActiveTempReservation && !isCurrentlyBlocked) {
      Alert.alert(
        'Cannot Block Seat',
        'This seat has an active temporary reservation. Please wait for it to expire or release it first.',
        [{ text: 'OK' }]
      );
      return;
    }

    setProcessingSeats(prev => new Set(prev).add(seat.id));

    try {
      if (isCurrentlyBlocked) {
        // Release/Unblock the seat
        if (reservation) {
          // Update existing reservation to release admin block
          const { error } = await supabase
            .from('seat_reservations')
            .update({
              is_available: true,
              is_admin_blocked: false,
            })
            .eq('id', reservation.id);

          if (error) throw error;

          // Update local state
          const updatedReservation = {
            ...reservation,
            is_available: true,
            is_admin_blocked: false,
          };
          const updatedMap = new Map(seatReservations);
          updatedMap.set(seat.id, updatedReservation);
          setSeatReservations(updatedMap);

          // Update seat in seats array
          const updatedSeats = seats.map(s =>
            s.id === seat.id ? { ...s, isAvailable: true } : s
          );
          setSeats(updatedSeats);
          calculateStats(updatedSeats, updatedMap);
        } else {
          // Create new reservation entry as available
          const { error } = await supabase.from('seat_reservations').insert({
            trip_id: tripId,
            seat_id: seat.id,
            booking_id: null,
            is_available: true,
            is_admin_blocked: false,
            is_reserved: false,
          });

          if (error) throw error;

          // Reload data to get the new reservation
          await loadSeatData();
        }
      } else {
        // Block the seat (admin block)
        if (reservation) {
          // Update existing reservation to block it
          // Clear temp reservation fields when admin blocks (to avoid confusion)
          const { error } = await supabase
            .from('seat_reservations')
            .update({
              is_available: false,
              is_admin_blocked: true,
              temp_reservation_expiry: null,
              temp_reserved_at: null,
              user_id: null,
              session_id: null,
              is_reserved: false,
            })
            .eq('id', reservation.id);

          if (error) throw error;

          // Update local state
          const updatedReservation = {
            ...reservation,
            is_available: false,
            is_admin_blocked: true,
            temp_reservation_expiry: null,
            temp_reserved_at: null,
            user_id: null,
          };
          const updatedMap = new Map(seatReservations);
          updatedMap.set(seat.id, updatedReservation);
          setSeatReservations(updatedMap);

          // Update seat in seats array
          const updatedSeats = seats.map(s =>
            s.id === seat.id ? { ...s, isAvailable: false } : s
          );
          setSeats(updatedSeats);
          calculateStats(updatedSeats, updatedMap);
        } else {
          // Create new reservation entry as admin blocked
          const { error } = await supabase.from('seat_reservations').insert({
            trip_id: tripId,
            seat_id: seat.id,
            booking_id: null,
            is_available: false,
            is_admin_blocked: true,
            is_reserved: false,
            temp_reservation_expiry: null,
            temp_reserved_at: null,
            user_id: null,
            session_id: null,
          });

          if (error) throw error;

          // Reload data to get the new reservation
          await loadSeatData();
        }
      }

      onSeatsChanged?.();
    } catch (error) {
      console.error('Error toggling seat block:', error);
      Alert.alert(
        'Error',
        `Failed to ${isCurrentlyBlocked ? 'release' : 'block'} seat. Please try again.`
      );
    } finally {
      setProcessingSeats(prev => {
        const next = new Set(prev);
        next.delete(seat.id);
        return next;
      });
    }
  };

  const getSeatStatus = (seat: Seat) => {
    const reservation = seatReservations.get(seat.id);
    // Check if actually booked (booking_id is not null/undefined)
    if (reservation?.booking_id != null) return 'booked';

    // Check for temporary reservations (customer temp reservations)
    if (reservation?.temp_reservation_expiry) {
      const expiryTime = new Date(reservation.temp_reservation_expiry);
      const currentTime = new Date();
      if (currentTime < expiryTime) {
        // Active temporary reservation - only if not admin blocked
        if (!reservation.is_admin_blocked) {
          return 'tempBlocked';
        }
      }
    }

    // Check if permanently blocked by admin (is_admin_blocked = true)
    if (reservation?.is_admin_blocked) {
      return 'blocked';
    }

    // Fallback: Check if not available and no booking_id (legacy blocked seats)
    if (reservation && !reservation.is_available && !reservation.booking_id) {
      return 'blocked';
    }

    return 'available';
  };

  const getSeatStyle = (seat: Seat) => {
    const status = getSeatStatus(seat);
    const isProcessing = processingSeats.has(seat.id);

    if (isProcessing) {
      return styles.processingSeat;
    }

    switch (status) {
      case 'booked':
        return styles.bookedSeat;
      case 'blocked':
        return styles.blockedSeat;
      case 'tempBlocked':
        return styles.tempBlockedSeat;
      case 'available':
        if (seat.isDisabled || seat.seatType === 'disabled') {
          return styles.disabledSeat;
        }
        if (seat.isPremium || seat.seatType === 'premium') {
          return styles.premiumSeat;
        }
        return styles.availableSeat;
      default:
        return styles.availableSeat;
    }
  };

  const generateSeatLayout = () => {
    if (!seats || seats.length === 0) return [];

    // Group seats by row number
    const seatsByRow = new Map<number, Seat[]>();
    seats.forEach(seat => {
      const rowNumber = seat.rowNumber;
      if (!seatsByRow.has(rowNumber)) {
        seatsByRow.set(rowNumber, []);
      }
      seatsByRow.get(rowNumber)!.push(seat);
    });

    // Sort rows and create layout
    const sortedRows = Array.from(seatsByRow.keys()).sort((a, b) => a - b);

    return sortedRows.map(rowNumber => {
      const rowSeats = seatsByRow.get(rowNumber) || [];
      rowSeats.sort((a, b) => (a.positionX || 0) - (b.positionX || 0));

      // Create seat groups with aisles
      const seatGroups: Seat[][] = [];
      let currentGroup: Seat[] = [];

      rowSeats.forEach((seat, index) => {
        currentGroup.push(seat);

        const nextSeat = rowSeats[index + 1];
        if (seat.isAisle && nextSeat) {
          seatGroups.push([...currentGroup]);
          currentGroup = [];
        } else if (
          nextSeat &&
          (nextSeat.positionX || 0) > (seat.positionX || 0) + 1
        ) {
          seatGroups.push([...currentGroup]);
          currentGroup = [];
        }
      });

      if (currentGroup.length > 0) {
        seatGroups.push(currentGroup);
      }

      return {
        rowNumber,
        seatGroups,
        rowSeats,
      };
    });
  };

  const seatLayout = generateSeatLayout();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size='large' color={colors.primary} />
        <Text style={styles.loadingText}>Loading seat layout...</Text>
      </View>
    );
  }

  if (seats.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <AlertTriangle size={48} color={colors.textSecondary} />
        <Text style={styles.emptyText}>
          No seats configured for this vessel
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Real-time Connection Status */}
      <View style={styles.connectionStatusContainer}>
        <View style={styles.connectionStatus}>
          {isRealTimeConnected ? (
            <>
              <Wifi size={14} color={colors.success} />
              <Text style={styles.connectionStatusTextConnected}>
                Live Updates Active
              </Text>
            </>
          ) : (
            <>
              <WifiOff size={14} color={colors.textSecondary} />
              <Text style={styles.connectionStatusTextDisconnected}>
                Connecting...
              </Text>
            </>
          )}
        </View>
      </View>

      {/* Stats Section */}
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <View style={[styles.statBox, styles.availableStatBox]} />
          <Text style={styles.statText}>{stats.available} Available</Text>
        </View>
        <View style={styles.statItem}>
          <View style={[styles.statBox, styles.bookedStatBox]} />
          <Text style={styles.statText}>{stats.booked} Booked</Text>
        </View>
        <View style={styles.statItem}>
          <View style={[styles.statBox, styles.blockedStatBox]} />
          <Text style={styles.statText}>{stats.blocked} Blocked</Text>
        </View>
        <View style={styles.statItem}>
          <View style={[styles.statBox, styles.tempBlockedStatBox]} />
          <Text style={styles.statText}>{stats.tempBlocked} Temp</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statText}>{stats.total} Total</Text>
        </View>
      </View>

      {/* Legend */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.legendContainer}
        contentContainerStyle={styles.legendContent}
      >
        <View style={styles.legendItem}>
          <View style={[styles.legendBox, styles.availableSeat]} />
          <Text style={styles.legendText}>Available</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendBox, styles.bookedSeat]} />
          <Text style={styles.legendText}>Booked</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendBox, styles.blockedSeat]} />
          <Text style={styles.legendText}>Blocked</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendBox, styles.tempBlockedSeat]} />
          <Text style={styles.legendText}>Temp Blocked</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendBox, styles.disabledSeat]} />
          <Text style={styles.legendText}>Disabled</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendBox, styles.premiumSeat]} />
          <Text style={styles.legendText}>Premium</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={styles.windowIndicator} />
          <Text style={styles.legendText}>Window</Text>
        </View>
      </ScrollView>

      {/* Instructions */}
      <View style={styles.instructionsContainer}>
        <Text style={styles.instructionsText}>
          Tap on available seats to block them. Tap on permanently blocked seats
          to release them.{'\n'}
          Temporarily blocked seats (yellow) are customer reservations and
          cannot be toggled.
        </Text>
      </View>

      {/* Seat Layout */}
      <ScrollView
        style={styles.seatLayoutScroll}
        showsVerticalScrollIndicator={true}
      >
        <View style={styles.ferryContainer}>
          {/* BOW Label */}
          <View style={[styles.ferryLabel, styles.bowLabelContainer]}>
            <Text style={styles.bowLabel}>BOW</Text>
          </View>

          <View style={styles.ferryBodyContainer}>
            {/* Port Side Label */}
            <View style={styles.sideLabel}>
              <View style={styles.sideLabelContainer}>
                <Text style={styles.sideLabelText}>PORT</Text>
              </View>
            </View>

            {/* Seat Grid */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.ferryScrollContainer}
              contentContainerStyle={styles.ferryScrollContent}
            >
              <View style={styles.ferryBody}>
                {seatLayout.map((rowData, rowIndex) => (
                  <React.Fragment key={rowData.rowNumber}>
                    <View style={styles.seatRow}>
                      {rowData.seatGroups.map((group, groupIndex) => (
                        <React.Fragment key={groupIndex}>
                          {group.map(seat => {
                            const status = getSeatStatus(seat);
                            const isProcessing = processingSeats.has(seat.id);
                            // Can toggle available seats or permanently blocked seats (not temp blocked or booked)
                            const canToggle =
                              status === 'available' || status === 'blocked';
                            const isRecentlyUpdated = recentlyUpdatedSeats.has(
                              seat.id
                            );

                            return (
                              <Pressable
                                key={seat.id}
                                style={[
                                  styles.seatButton,
                                  getSeatStyle(seat),
                                  isRecentlyUpdated &&
                                    styles.recentlyUpdatedSeat,
                                ]}
                                onPress={() =>
                                  canToggle && toggleSeatBlock(seat)
                                }
                                disabled={!canToggle || isProcessing}
                              >
                                {isProcessing ? (
                                  <ActivityIndicator
                                    size='small'
                                    color={colors.text}
                                  />
                                ) : (
                                  <>
                                    <Text
                                      style={[
                                        styles.seatNumber,
                                        status === 'booked' &&
                                          styles.bookedSeatText,
                                        status === 'blocked' &&
                                          styles.blockedSeatText,
                                        status === 'tempBlocked' &&
                                          styles.tempBlockedSeatText,
                                      ]}
                                    >
                                      {seat.number}
                                    </Text>
                                    {status === 'blocked' && (
                                      <Lock size={10} color={colors.danger} />
                                    )}
                                    {status === 'tempBlocked' && (
                                      <Lock
                                        size={10}
                                        color={colors.warning}
                                        style={{ opacity: 0.8 }}
                                      />
                                    )}
                                    {seat.isWindow && (
                                      <View style={styles.windowIndicator} />
                                    )}
                                  </>
                                )}
                              </Pressable>
                            );
                          })}
                          {groupIndex < rowData.seatGroups.length - 1 && (
                            <View style={styles.aisle} />
                          )}
                        </React.Fragment>
                      ))}
                    </View>
                    {rowIndex < seatLayout.length - 1 && (
                      <View style={styles.rowSpacer} />
                    )}
                  </React.Fragment>
                ))}
              </View>
            </ScrollView>

            {/* Starboard Side Label */}
            <View style={styles.sideLabel}>
              <View style={styles.sideLabelContainer}>
                <Text style={styles.sideLabelText}>STARBOARD</Text>
              </View>
            </View>
          </View>

          {/* STERN Label */}
          <View style={[styles.ferryLabel, styles.sternLabelContainer]}>
            <Text style={styles.sternLabel}>STERN</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.backgroundSecondary,
    minHeight: 400,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  emptyText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  connectionStatusContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  connectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  connectionStatusTextConnected: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.success,
  },
  connectionStatusTextDisconnected: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 16,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  statItem: {
    alignItems: 'center',
    gap: 6,
  },
  statBox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1,
  },
  availableStatBox: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  bookedStatBox: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  blockedStatBox: {
    backgroundColor: colors.danger,
    borderColor: colors.danger,
  },
  tempBlockedStatBox: {
    backgroundColor: colors.warning,
    borderColor: colors.warning,
  },
  statText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },
  legendContainer: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  legendContent: {
    paddingHorizontal: 16,
    gap: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendBox: {
    width: 16,
    height: 16,
    borderRadius: 4,
    borderWidth: 1,
  },
  legendText: {
    fontSize: 12,
    color: colors.text,
  },
  availableSeat: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  bookedSeat: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  blockedSeat: {
    backgroundColor: colors.danger,
    borderColor: colors.danger,
  },
  tempBlockedSeat: {
    backgroundColor: colors.warning,
    borderColor: colors.warning,
    opacity: 0.7,
  },
  disabledSeat: {
    backgroundColor: colors.textSecondary,
    borderColor: colors.textSecondary,
  },
  premiumSeat: {
    backgroundColor: colors.warning,
    borderColor: colors.warning,
  },
  windowIndicator: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.info,
  },
  instructionsContainer: {
    padding: 12,
    backgroundColor: colors.infoLight,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  instructionsText: {
    fontSize: 13,
    color: colors.text,
    textAlign: 'center',
  },
  seatLayoutScroll: {
    maxHeight: 600,
  },
  ferryContainer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  ferryLabel: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginVertical: 8,
  },
  bowLabelContainer: {
    backgroundColor: colors.primary,
  },
  sternLabelContainer: {
    backgroundColor: colors.primary,
  },
  bowLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.card,
    textAlign: 'center',
  },
  sternLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.card,
    textAlign: 'center',
  },
  ferryBodyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sideLabel: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
    minWidth: 50,
    width: 50,
  },
  sideLabelContainer: {
    paddingVertical: 12,
    paddingHorizontal: 6,
    borderRadius: 8,
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.border,
    transform: [{ rotate: '-90deg' }],
  },
  sideLabelText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: 1.5,
    textAlign: 'center',
    width: 80,
  },
  ferryScrollContainer: {
    maxHeight: 500,
  },
  ferryScrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  ferryBody: {
    gap: 4,
  },
  seatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  seatButton: {
    width: 40,
    height: 40,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  processingSeat: {
    backgroundColor: colors.textSecondary,
    borderColor: colors.textSecondary,
    opacity: 0.6,
  },
  recentlyUpdatedSeat: {
    borderWidth: 3,
    borderColor: colors.info,
    shadowColor: colors.info,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
  },
  bookedSeatText: {
    color: colors.card,
  },
  blockedSeatText: {
    color: colors.card,
  },
  tempBlockedSeatText: {
    color: colors.card,
  },
  seatNumber: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
  },
  aisle: {
    width: 20,
  },
  rowSpacer: {
    height: 8,
  },
});
