import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { Seat } from '@/types';
import { SeatSelectorProps } from '@/types/components';
import Colors from '@/constants/colors';

const SeatSelector: React.FC<SeatSelectorProps> = ({
  seats,
  selectedSeats,
  onSeatToggle,
  maxSeats = 10,
  isLoading = false,
  loadingSeats: externalLoadingSeats,
  seatErrors: externalSeatErrors,
}) => {
  const [internalLoadingSeats, setInternalLoadingSeats] = React.useState<
    Set<string>
  >(new Set());

  // Use external loading seats if provided, otherwise use internal state
  const loadingSeats = externalLoadingSeats || internalLoadingSeats;
  const seatErrors = externalSeatErrors || {};
  // Show loading state only when there are no seats AND we're loading
  if (!seats || seats.length === 0) {
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

  // Generate 2D grid layout from seats with aisle spacing
  const generateSeatGrid = () => {
    if (!seats || seats.length === 0) return { grid: [], aisles: [] };

    // Find the maximum row and column numbers
    const maxRow = Math.max(...seats.map(s => s.rowNumber));
    const maxCol = Math.max(...seats.map(s => s.positionX || 0));

    // Get aisle positions from seats
    const aislePositions = seats
      .filter(seat => seat.isAisle)
      .map(seat => seat.positionX || 0);
    const uniqueAisles = [...new Set(aislePositions)];

    // Create a 2D grid
    const grid: (Seat | null)[][] = [];

    // Initialize empty grid
    for (let row = 0; row < maxRow; row++) {
      grid[row] = [];
      for (let col = 0; col < maxCol; col++) {
        grid[row][col] = null;
      }
    }

    // Place seats in the grid based on their position
    seats.forEach(seat => {
      const row = seat.rowNumber - 1; // Convert to 0-based index
      const col = (seat.positionX || 0) - 1; // Convert to 0-based index

      if (row >= 0 && row < maxRow && col >= 0 && col < maxCol) {
        grid[row][col] = seat;
      }
    });

    return { grid, aisles: uniqueAisles };
  };

  const { grid: seatGrid, aisles } = generateSeatGrid();

  // Check if a seat is selected
  const isSeatSelected = (seatId: string) => {
    return selectedSeats.some(seat => seat.id === seatId);
  };

  // Check if max seats are selected
  const isMaxSeatsSelected = selectedSeats.length >= maxSeats;

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

    // If not selected and max seats are already selected, don't allow selection
    if (!isSelected && isMaxSeatsSelected) {
      return;
    }

    // Set loading state for this seat (only if using internal state)
    if (!externalLoadingSeats) {
      setInternalLoadingSeats(prev => new Set(prev).add(seat.id));
    }

    try {
      await onSeatToggle(seat);
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
          <Text style={styles.legendText}>Disabled</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={styles.windowIndicator} />
          <Text style={styles.legendText}>Window</Text>
        </View>
      </ScrollView>

      <View style={styles.cabinContainer}>
        <View style={styles.frontLabel}>
          <Text style={styles.frontLabelText}>FRONT</Text>
        </View>

        <ScrollView
          style={styles.seatMapContainer}
          contentContainerStyle={styles.seatMapContent}
          showsVerticalScrollIndicator={true}
          showsHorizontalScrollIndicator={true}
          horizontal={false}
          nestedScrollEnabled={true}
        >
          <ScrollView
            horizontal={true}
            showsHorizontalScrollIndicator={true}
            contentContainerStyle={styles.horizontalScrollContent}
          >
            <View style={styles.seatsGrid}>
              {seatGrid.map((row, rowIndex) => (
                <View key={`row-${rowIndex + 1}`} style={styles.row}>
                  {/* <Text style={styles.rowLabel}>Row {rowIndex + 1}</Text> */}
                  <View style={styles.seats}>
                    {row
                      .map((seat, colIndex) => {
                        const elements: React.ReactElement[] = [];

                        if (seat) {
                          const isSelected = isSeatSelected(seat.id);
                          const isLoadingSeat = loadingSeats.has(seat.id);
                          const seatNumber = renderSeatNumber(seat.number);

                          elements.push(
                            <TouchableOpacity
                              key={seat.id}
                              style={[
                                styles.seat,
                                getSeatStyle(seat),
                                isSelected && styles.selectedSeat,
                                isLoadingSeat && styles.loadingSeat,
                                seatErrors[seat.id] && styles.errorSeat,
                              ]}
                              onPress={() => handleSeatPress(seat)}
                              disabled={
                                isLoadingSeat ||
                                (!seat.isAvailable &&
                                  !seat.isCurrentUserReservation) ||
                                (seat.isTempReserved &&
                                  !seat.isCurrentUserReservation) ||
                                seat.isDisabled ||
                                seat.seatType === 'disabled'
                              }
                              activeOpacity={0.7}
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
                                      isSelected && styles.selectedSeatNumber,
                                      !seat.isAvailable &&
                                        styles.unavailableSeatNumber,
                                    ]}
                                  >
                                    {seatNumber}
                                  </Text>
                                  {seat.isWindow && (
                                    <View style={styles.windowIndicator} />
                                  )}
                                </>
                              )}
                            </TouchableOpacity>
                          );
                        } else {
                          // Render empty space
                          elements.push(
                            <View
                              key={`empty-${rowIndex}-${colIndex}`}
                              style={styles.emptySeat}
                            />
                          );
                        }

                        // Add aisle space if this column is marked as an aisle
                        if (
                          aisles.includes(colIndex + 1) &&
                          colIndex < row.length - 1
                        ) {
                          elements.push(
                            <View
                              key={`aisle-${rowIndex}-${colIndex}`}
                              style={styles.aisleSpace}
                            />
                          );
                        }

                        return elements;
                      })
                      .flat()}
                  </View>
                </View>
              ))}
            </View>
          </ScrollView>
        </ScrollView>

        <View style={styles.rearLabel}>
          <Text style={styles.rearLabelText}>REAR</Text>
        </View>
      </View>

      <View style={styles.selectionInfo}>
        <Text style={styles.selectionText}>
          Selected: {selectedSeats?.length || 0}/{maxSeats} seats
        </Text>
      </View>
    </View>
  );
};

const { width } = Dimensions.get('window');
const seatSize = Math.min(40, (width - 80) / 8); // Adjust based on screen width

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
  cabinContainer: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: 16,
    backgroundColor: Colors.card,
  },
  frontLabel: {
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  frontLabelText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  seatMapContainer: {
    maxHeight: 400,
    minHeight: 100,
  },
  seatMapContent: {
    paddingVertical: 16,
    paddingHorizontal: 8,
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  row: {
    marginBottom: 10,
    alignItems: 'center',
  },
  seats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  seat: {
    width: seatSize,
    height: seatSize,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 4,
    borderRadius: 6,
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
    backgroundColor: Colors.error,
    borderColor: Colors.error,
  },
  emptySeat: {
    width: seatSize,
    height: seatSize,
    margin: 4,
  },
  aisleSpace: {
    width: 16,
    height: seatSize,
    marginHorizontal: 4,
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
  rearLabel: {
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  rearLabelText: {
    fontSize: 14,
    fontWeight: '600',
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

  seatsGrid: {
    flexDirection: 'column',
    alignItems: 'center',
  },
  horizontalScrollContent: {
    paddingVertical: 16,
    paddingHorizontal: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default SeatSelector;
