import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { useAlertContext } from '@/components/AlertProvider';
import { Seat } from '@/types';
import { SeatSelectorProps } from '@/types/components';
import Colors from '@/constants/colors';
import { supabase } from '@/utils/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

const SeatSelector: React.FC<SeatSelectorProps> = ({
  seats,
  selectedSeats,
  onSeatToggle,
  maxSeats,
  isLoading = false,
  loadingSeats: externalLoadingSeats,
  seatErrors: externalSeatErrors,
  tripId, // For real-time updates
  onSeatsUpdated, // Callback when seats are updated
  allowDisabledSeats = true, // Default to true to maintain backward compatibility
}) => {
  const { showInfo } = useAlertContext();
  const [internalLoadingSeats, setInternalLoadingSeats] = React.useState<
    Set<string>
  >(new Set());
  const [localSeats, setLocalSeats] = React.useState<Seat[]>(seats);
  const realtimeChannelRef = useRef<RealtimeChannel | null>(null);

  // Use external loading seats if provided, otherwise use internal state
  const loadingSeats = externalLoadingSeats || internalLoadingSeats;
  const seatErrors = externalSeatErrors || {};

  // Update local seats when prop changes
  useEffect(() => {
    setLocalSeats(seats);
  }, [seats]);

  // Set up real-time subscription if tripId is provided
  useEffect(() => {
    if (!tripId) return; // Skip if no tripId provided

    // Subscribe to seat_reservations changes for this trip
    realtimeChannelRef.current = supabase
      .channel(`customer_seat_updates_${tripId}`)
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'seat_reservations',
          filter: `trip_id=eq.${tripId}`,
        },
        async payload => {
          // Update seat availability based on reservation changes
          if (
            payload.eventType === 'INSERT' ||
            payload.eventType === 'UPDATE'
          ) {
            const reservation = payload.new as any;
            handleSeatAvailabilityChange(reservation);
          } else if (payload.eventType === 'DELETE') {
            const reservation = payload.old as any;
            handleSeatAvailabilityChange({
              ...reservation,
              is_available: true,
            });
          }
        }
      )
      .subscribe(status => {});

    // Cleanup subscription on unmount
    return () => {
      if (realtimeChannelRef.current) {
        supabase.removeChannel(realtimeChannelRef.current);
        realtimeChannelRef.current = null;
      }
    };
  }, [tripId]);

  // Handle seat availability changes from real-time events
  const handleSeatAvailabilityChange = (reservation: any) => {
    setLocalSeats(currentSeats => {
      const updatedSeats = currentSeats.map(seat => {
        if (seat.id === reservation.seat_id) {
          // Calculate availability with proper priority:
          // 1. Admin blocked - always unavailable
          // 2. Booked - unavailable
          // 3. Temp reserved (check expiry)
          // 4. is_available flag
          let isAvailable = true;

          if (reservation.is_admin_blocked) {
            // Admin blocked - always unavailable to customers
            isAvailable = false;
          } else if (reservation.booking_id) {
            // Booked - unavailable
            isAvailable = false;
          } else if (reservation.temp_reservation_expiry) {
            // Check if temp reservation is still active
            const expiryTime = new Date(reservation.temp_reservation_expiry);
            const currentTime = new Date();
            if (currentTime < expiryTime) {
              // Active temp reservation - unavailable
              isAvailable = false;
            } else {
              // Expired - available
              isAvailable = reservation.is_available !== false;
            }
          } else {
            // Check is_available flag
            isAvailable = reservation.is_available !== false;
          }

          // If seat becomes unavailable and was selected, alert user
          if (!isAvailable && selectedSeats.some(s => s.id === seat.id)) {
            showInfo(
              'Seat No Longer Available',
              `Seat ${seat.number} is no longer available and has been deselected.`
            );
          }

          return {
            ...seat,
            isAvailable,
          };
        }
        return seat;
      });

      // Notify parent component about updated seats
      if (onSeatsUpdated) {
        onSeatsUpdated(updatedSeats);
      }

      return updatedSeats;
    });
  };
  // Show loading state only when there are no seats AND we're loading
  if (!localSeats || localSeats.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size='large' color={Colors.primary} />
          <Text style={styles.loadingText}>
            {isLoading
              ? 'Loading seat availability...'
              : 'No seats available for this trip'}
          </Text>
        </View>
      </View>
    );
  }

  // Helper function to safely render seat number
  const renderSeatNumber = (
    seatNumber: string | number | null | undefined
  ): string => {
    if (seatNumber === null || seatNumber === undefined) {
      return '';
    }
    return String(seatNumber);
  };

  // Helper function to get seat style based on properties
  const getSeatStyle = (seat: Seat) => {
    if (seat.isTempReserved && !seat.isCurrentUserReservation) {
      return styles.tempReservedSeat;
    }

    if (!seat.isAvailable) {
      return styles.unavailableSeat;
    }

    if (seat.isDisabled || seat.seatType === 'disabled') {
      return styles.disabledSeat;
    }

    if (seat.seatType === 'crew') {
      return styles.crewSeat;
    }

    if (seat.isPremium || seat.seatType === 'premium') {
      return styles.premiumSeat;
    }

    return styles.availableSeat;
  };

  // Generate seat layout by rows with aisle grouping (same logic as FerryLayoutDisplay)
  const generateSeatLayout = () => {
    if (!localSeats || localSeats.length === 0) return [];

    // Group seats by row number
    const seatsByRow = new Map<number, Seat[]>();
    localSeats.forEach(seat => {
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

      // Create seat groups with aisles based on isAisle property
      const seatGroups: Seat[][] = [];
      let currentGroup: Seat[] = [];

      rowSeats.forEach((seat, index) => {
        currentGroup.push(seat);

        // Check if there should be an aisle after this seat
        const nextSeat = rowSeats[index + 1];
        if (seat.isAisle && nextSeat) {
          seatGroups.push([...currentGroup]);
          currentGroup = [];
        } else if (
          nextSeat &&
          (nextSeat.positionX || 0) > (seat.positionX || 0) + 1
        ) {
          // Fallback: check for gaps in position
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

  // Check if a seat is selected
  const isSeatSelected = (seatId: string) => {
    return selectedSeats.some(seat => seat.id === seatId);
  };

  // Check if max seats are selected (only if maxSeats is defined and valid)
  const hasMaxLimit =
    maxSeats !== undefined && maxSeats !== null && maxSeats > 0;
  const isMaxSeatsSelected = hasMaxLimit && selectedSeats.length >= maxSeats;

  // Handle seat selection with loading state
  const handleSeatPress = async (seat: Seat) => {
    // Check if seat is already being processed
    if (loadingSeats.has(seat.id)) {
      return;
    }

    // Check if seat is temporarily reserved by another user
    if (seat.isTempReserved && !seat.isCurrentUserReservation) {
      return; // Don't allow selection of seats reserved by others
    }

    // Double-check availability at selection time
    if (!seat.isAvailable && !seat.isCurrentUserReservation) {
      return;
    }

    const isSelected = isSeatSelected(seat.id);

    // If not selected and max seats are already selected, show alert and don't allow selection
    if (!isSelected && isMaxSeatsSelected) {
      showInfo(
        'Maximum Seats Selected',
        `You can select a maximum of ${maxSeats} seats. Please deselect a seat to select another one.`
      );
      return;
    }

    // Set loading state for this seat (only if using internal state)
    if (!externalLoadingSeats) {
      setInternalLoadingSeats(prev => new Set(prev).add(seat.id));
    }

    try {
      const result = await onSeatToggle(seat);
      // Ensure we don't accidentally render the result
      if (result !== undefined && result !== null) {
        // Result is ignored, just ensuring it doesn't cause rendering issues
      }
    } catch (error) {
      console.error('Error toggling seat selection:', error);
    } finally {
      // Remove loading state for this seat (only if using internal state)
      if (!externalLoadingSeats) {
        setInternalLoadingSeats(prev => {
          const newSet = new Set(prev);
          newSet.delete(seat.id);
          return newSet;
        });
      }
    }
  };

  return (
    <View style={styles.container}>
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
          <View style={[styles.legendBox, styles.selectedSeat]} />
          <Text style={styles.legendText}>Selected</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendBox, styles.unavailableSeat]} />
          <Text style={styles.legendText}>Unavailable</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendBox, styles.tempReservedSeat]} />
          <Text style={styles.legendText}>Temporarily Reserved</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendBox, styles.premiumSeat]} />
          <Text style={styles.legendText}>Premium</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendBox, styles.crewSeat]} />
          <Text style={styles.legendText}>Crew</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendBox, styles.disabledSeat]} />
          <Text style={styles.legendText}>Accessible / Wheelchair</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={styles.windowIndicator} />
          <Text style={styles.legendText}>Window</Text>
        </View>
      </ScrollView>

      <View style={styles.ferryContainer}>
        {/* BOW Label */}
        <View style={[styles.ferryLabel, styles.bowLabelContainer]}>
          <Text style={styles.bowLabel}>BOW</Text>
        </View>

        {/* Ferry Shape Container */}
        <ScrollView
          horizontal={true}
          showsHorizontalScrollIndicator={true}
          contentContainerStyle={styles.ferryScrollContent}
          style={styles.ferryScrollContainer}
        >
          <View style={styles.ferryBodyContainer}>
            {/* Port Side Label */}
            <View style={styles.sideLabel}>
              <View style={styles.sideLabelContainer}>
                <Text style={styles.sideLabelText}>PORT</Text>
              </View>
            </View>

            {/* Ferry Body */}
            <View style={styles.ferryBody}>
              <ScrollView
                style={styles.seatMapContainer}
                contentContainerStyle={styles.seatMapContent}
                showsVerticalScrollIndicator={true}
                horizontal={false}
                nestedScrollEnabled={true}
              >
                <View style={styles.seatsGrid}>
                  {seatLayout.map((rowData, rowIndex) => {
                    const hasRowAisleAfter = rowData.rowSeats.some(
                      seat => seat.isRowAisle === true
                    );

                    return (
                      <React.Fragment key={`row-fragment-${rowData.rowNumber}`}>
                        <View
                          key={`row-${rowData.rowNumber}`}
                          style={styles.row}
                        >
                          <View style={styles.rowContent}>
                            {rowData.seatGroups.map((group, groupIndex) => (
                              <React.Fragment key={`group-${groupIndex}`}>
                                <View style={styles.seatGroup}>
                                  {group.map(seat => {
                                    const isSelected = isSeatSelected(seat.id);
                                    const isLoadingSeat = loadingSeats.has(
                                      seat.id
                                    );
                                    const seatNumber = renderSeatNumber(
                                      seat.number
                                    );

                                    const isAtMaxCapacity =
                                      !isSelected &&
                                      isMaxSeatsSelected &&
                                      seat.isAvailable;

                                    return (
                                      <Pressable
                                        key={seat.id}
                                        style={[
                                          styles.seat,
                                          getSeatStyle(seat),
                                          isSelected && styles.selectedSeat,
                                          isLoadingSeat && styles.loadingSeat,
                                          seatErrors[seat.id] &&
                                            styles.errorSeat,
                                          isAtMaxCapacity &&
                                            styles.maxCapacitySeat,
                                        ]}
                                        onPress={() => handleSeatPress(seat)}
                                        disabled={
                                          isLoadingSeat ||
                                          (!seat.isAvailable &&
                                            !seat.isCurrentUserReservation) ||
                                          (seat.isTempReserved &&
                                            !seat.isCurrentUserReservation) ||
                                          ((seat.isDisabled ||
                                            seat.seatType === 'disabled') &&
                                            !allowDisabledSeats)
                                        }
                                      >
                                        {isLoadingSeat ? (
                                          <ActivityIndicator
                                            size='small'
                                            color={Colors.primary}
                                          />
                                        ) : (
                                          <>
                                            <Text
                                              style={[
                                                styles.seatNumber,
                                                isSelected &&
                                                  styles.selectedSeatNumber,
                                                !seat.isAvailable &&
                                                  styles.unavailableSeatNumber,
                                              ]}
                                            >
                                              {seatNumber}
                                            </Text>
                                            {seat.isWindow && (
                                              <View
                                                style={styles.windowIndicator}
                                              />
                                            )}
                                          </>
                                        )}
                                      </Pressable>
                                    );
                                  })}
                                </View>
                                {groupIndex < rowData.seatGroups.length - 1 && (
                                  <View style={styles.aisle} />
                                )}
                              </React.Fragment>
                            ))}
                          </View>
                        </View>

                        {/* Row Aisle - Show between rows (not after the last row) */}
                        {hasRowAisleAfter &&
                          rowIndex < seatLayout.length - 1 && (
                            <View style={styles.rowAisle}>
                              <View style={styles.rowAisleLine} />
                              <Text style={styles.rowAisleLabel}>Aisle</Text>
                            </View>
                          )}
                      </React.Fragment>
                    );
                  })}
                </View>
              </ScrollView>
            </View>

            {/* Starboard Side Label */}
            <View style={styles.sideLabel}>
              <View style={styles.sideLabelContainer}>
                <Text style={styles.sideLabelText}>STARBOARD</Text>
              </View>
            </View>
          </View>
        </ScrollView>

        {/* STERN Label */}
        <View style={[styles.ferryLabel, styles.sternLabelContainer]}>
          <Text style={styles.sternLabel}>STERN</Text>
        </View>
      </View>

      <View style={styles.selectionInfo}>
        <Text style={styles.selectionText}>
          Selected: {selectedSeats?.length || 0}
          {hasMaxLimit ? `/${maxSeats}` : ''} seats
        </Text>
        {isMaxSeatsSelected && (
          <Text style={styles.maxReachedText}>
            Maximum seat limit reached. Deselect a seat to select another.
          </Text>
        )}
      </View>
    </View>
  );
};
const { width } = Dimensions.get('window');
const seatSize = Math.min(40, (width - 80) / 8);
const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  legendContainer: {
    marginBottom: 16,
  },
  legendContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  legendBox: {
    width: 16,
    height: 16,
    borderRadius: 4,
    marginRight: 6,
    borderWidth: 1,
  },
  legendText: {
    fontSize: 14,
    color: Colors.text,
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
    backgroundColor: Colors.primary,
  },
  sternLabelContainer: {
    backgroundColor: Colors.primary,
  },
  bowLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.card,
    textAlign: 'center',
  },
  sternLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.card,
    textAlign: 'center',
  },
  ferryScrollContainer: {
    maxHeight: 400,
  },
  ferryScrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    justifyContent: 'center',
    alignItems: 'center',
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
    backgroundColor: Colors.highlight,
    borderWidth: 1,
    borderColor: Colors.border,
    transform: [{ rotate: '-90deg' }],
  },
  sideLabelText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.text,
    letterSpacing: 1.5,
    textAlign: 'center',
    width: 80,
  },
  ferryBody: {
    backgroundColor: Colors.card,
    borderTopEndRadius: 50,
    borderBottomEndRadius: 8,
    borderTopStartRadius: 50,
    borderBottomStartRadius: 8,
    padding: 12,
    borderWidth: 2,
    borderColor: Colors.primary,
    minWidth: 200,
  },
  seatMapContainer: {
    maxHeight: 400,
    minHeight: 100,
  },
  seatMapContent: {
    paddingVertical: 8,
    paddingHorizontal: 4,
    flexGrow: 1,
  },
  row: {
    marginVertical: 2,
    borderRadius: 6,
    padding: 4,
  },
  rowContent: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  seatGroup: {
    flexDirection: 'row',
    gap: 2,
  },
  aisle: {
    width: 12,
    height: 24,
    backgroundColor: 'transparent',
  },
  seat: {
    width: seatSize,
    height: seatSize,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 1,
    borderRadius: 4,
    borderWidth: 1,
  },
  availableSeat: {
    backgroundColor: Colors.card,
    borderColor: Colors.primary,
  },
  selectedSeat: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  unavailableSeat: {
    backgroundColor: Colors.inactive,
    borderColor: Colors.inactive,
  },
  tempReservedSeat: {
    backgroundColor: '#E0E0E0',
    borderColor: '#E0E0E0',
  },
  loadingSeat: {
    backgroundColor: '#E0E0E0', // Light gray for loading
    borderColor: Colors.primary,
    opacity: 0.7,
  },
  premiumSeat: {
    backgroundColor: Colors.success,
    borderColor: Colors.success,
  },
  crewSeat: {
    backgroundColor: Colors.warning,
    borderColor: Colors.warning,
  },
  disabledSeat: {
    backgroundColor:
      (Colors as any).accessible || (Colors as any).info || '#8C52FF',
    borderColor:
      (Colors as any).accessible || (Colors as any).info || '#8C52FF',
  },
  seatNumber: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text,
  },
  selectedSeatNumber: {
    color: Colors.card,
  },
  unavailableSeatNumber: {
    color: Colors.textSecondary,
  },
  selectionInfo: {
    marginTop: 16,
    alignItems: 'center',
  },
  selectionText: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.text,
  },
  maxReachedText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.warning,
    marginTop: 8,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.text,
    marginTop: 16,
  },
  windowIndicator: {
    width: 20,
    height: 2,
    backgroundColor: Colors.primary,
    marginTop: 2,
  },
  errorSeat: {
    backgroundColor: '#ffebee',
    borderColor: Colors.error,
    borderWidth: 2,
  },
  maxCapacitySeat: {
    opacity: 0.3,
    backgroundColor: Colors.inactive,
    borderColor: Colors.border,
  },
  seatsGrid: {
    flexDirection: 'column',
    alignItems: 'center',
  },
  // Row Aisle Styles
  rowAisle: {
    alignItems: 'center',
    paddingVertical: 6,
    marginVertical: 2,
  },
  rowAisleLine: {
    width: '80%',
    height: 2,
    backgroundColor: Colors.warning,
    borderRadius: 1,
  },
  rowAisleLabel: {
    fontSize: 8,
    fontWeight: '600',
    color: Colors.warning,
    marginTop: 2,
  },
});

export default SeatSelector;
