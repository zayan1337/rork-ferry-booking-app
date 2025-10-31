import React, { useState, useEffect } from 'react';
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
import {
  Lock,
  Users,
  AlertTriangle,
} from 'lucide-react-native';

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
  const [processingSeats, setProcessingSeats] = useState<Set<string>>(new Set());
  const [stats, setStats] = useState({
    total: 0,
    available: 0,
    booked: 0,
    blocked: 0,
  });

  useEffect(() => {
    loadSeatData();
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
        .select('id, seat_id, booking_id, is_available')
        .eq('trip_id', tripId);

      if (reservationsError) throw reservationsError;

      // Create a map of reservations
      const reservationMap = new Map<string, SeatReservation>();
      (reservations || []).forEach((res: any) => {
        reservationMap.set(res.seat_id, res);
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

    seatList.forEach(seat => {
      const reservation = reservations.get(seat.id);
      if (reservation) {
        // Check if actually booked (booking_id is not null/undefined)
        if (reservation.booking_id != null) {
          booked++;
        } else if (!reservation.is_available) {
          // Blocked: has reservation, not available, but not booked
          blocked++;
        } else {
          available++;
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
    });
  };

  const toggleSeatBlock = async (seat: Seat) => {
    if (processingSeats.has(seat.id)) return;

    const reservation = seatReservations.get(seat.id);
    const isCurrentlyBlocked =
      reservation && !reservation.booking_id && !reservation.is_available;
    // Check if seat is actually booked (has a booking_id that is not null or undefined)
    const isBooked = reservation?.booking_id != null;

    if (isBooked) {
      Alert.alert(
        'Cannot Block Seat',
        'This seat is already booked and cannot be blocked.',
        [{ text: 'OK' }]
      );
      return;
    }

    setProcessingSeats(prev => new Set(prev).add(seat.id));

    try {
      if (isCurrentlyBlocked) {
        // Release/Unblock the seat
        if (reservation) {
          // Update existing reservation to make it available
          const { error } = await supabase
            .from('seat_reservations')
            .update({ is_available: true })
            .eq('id', reservation.id);

          if (error) throw error;

          // Update local state
          const updatedReservation = {
            ...reservation,
            is_available: true,
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
            is_reserved: false,
          });

          if (error) throw error;

          // Reload data to get the new reservation
          await loadSeatData();
        }
      } else {
        // Block the seat
        if (reservation) {
          // Update existing reservation to block it
          const { error } = await supabase
            .from('seat_reservations')
            .update({ is_available: false })
            .eq('id', reservation.id);

          if (error) throw error;

          // Update local state
          const updatedReservation = {
            ...reservation,
            is_available: false,
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
          // Create new reservation entry as blocked
          const { error } = await supabase.from('seat_reservations').insert({
            trip_id: tripId,
            seat_id: seat.id,
            booking_id: null,
            is_available: false,
            is_reserved: true,
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
    // Check if blocked (has reservation but not available and not booked)
    if (reservation && !reservation.is_available && !reservation.booking_id) return 'blocked';
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
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading seat layout...</Text>
      </View>
    );
  }

  if (seats.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <AlertTriangle size={48} color={colors.textSecondary} />
        <Text style={styles.emptyText}>No seats configured for this vessel</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Stats Section */}
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <View style={[styles.statBox, styles.availableStatBox]} />
          <Text style={styles.statText}>
            {stats.available} Available
          </Text>
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
          <Text style={styles.statText}>
            {stats.total} Total
          </Text>
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
          Tap on available seats to block them. Tap on blocked seats to release them.
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
                            const canToggle = status === 'available' || status === 'blocked';

                            return (
                              <Pressable
                                key={seat.id}
                                style={[
                                  styles.seatButton,
                                  getSeatStyle(seat),
                                ]}
                                onPress={() => canToggle && toggleSeatBlock(seat)}
                                disabled={!canToggle || isProcessing}
                              >
                                {isProcessing ? (
                                  <ActivityIndicator
                                    size="small"
                                    color={colors.text}
                                  />
                                ) : (
                                  <>
                                    <Text
                                      style={[
                                        styles.seatNumber,
                                        status === 'booked' && styles.bookedSeatText,
                                        status === 'blocked' && styles.blockedSeatText,
                                      ]}
                                    >
                                      {seat.number}
                                    </Text>
                                    {status === 'blocked' && (
                                      <Lock size={10} color={colors.danger} />
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
  bookedSeatText: {
    color: colors.card,
  },
  blockedSeatText: {
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

