import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  ActivityIndicator
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
}) => {
  // Show loading state only when there are no seats AND we're loading
  if (!seats || seats.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>
            {isLoading ? 'Loading seat availability...' : 'No seats available for this trip'}
          </Text>
        </View>
      </View>
    );
  }

  // Helper function to safely render seat number
  const renderSeatNumber = (seatNumber: string | number | null | undefined): string => {
    if (seatNumber === null || seatNumber === undefined) {
      return '';
    }
    return String(seatNumber);
  };

  // Group seats by row using the database row_number field
  const groupedSeats: Record<number, Seat[]> = {};

  seats.forEach(seat => {
    // Use the actual row_number from database instead of parsing seat_number
    const rowNumber = seat.rowNumber;

    if (!groupedSeats[rowNumber]) {
      groupedSeats[rowNumber] = [];
    }
    groupedSeats[rowNumber].push(seat);
  });

  // Sort rows by row number (ascending)
  const sortedRowNumbers = Object.keys(groupedSeats)
    .map(row => parseInt(row))
    .sort((a, b) => a - b);

  // Sort seats within each row by seat_number
  sortedRowNumbers.forEach(rowNumber => {
    groupedSeats[rowNumber].sort((a, b) => {
      // First try to sort by extracting numbers from seat_number
      const getNumberFromSeat = (seatNumber: string | number | null | undefined) => {
        const seatStr = String(seatNumber || '');
        const match = seatStr.match(/\d+/);
        return match ? parseInt(match[0]) : 0;
      };

      const aNumber = getNumberFromSeat(a.number);
      const bNumber = getNumberFromSeat(b.number);

      if (aNumber !== bNumber) {
        return aNumber - bNumber;
      }

      // If numbers are same, sort alphabetically
      return String(a.number || '').localeCompare(String(b.number || ''));
    });
  });

  // Check if a seat is selected
  const isSeatSelected = (seatId: string) => {
    return selectedSeats.some(seat => seat.id === seatId);
  };

  // Check if max seats are selected
  const isMaxSeatsSelected = selectedSeats.length >= maxSeats;

  // Handle seat selection
  const handleSeatPress = async (seat: Seat) => {
    // Double-check availability at selection time
    if (!seat.isAvailable) {
      return;
    }

    const isSelected = isSeatSelected(seat.id);

    // If not selected and max seats are already selected, don't allow selection
    if (!isSelected && isMaxSeatsSelected) {
      return;
    }

    try {
      await onSeatToggle(seat);
    } catch (error) {
      console.error('Error toggling seat selection:', error);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.legend}>
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
          <View style={styles.windowIndicator} />
          <Text style={styles.legendText}>  Window</Text>
        </View>
        {/* <View style={styles.legendItem}>
          <View style={styles.aisleIndicatorDot} />
          <Text style={styles.legendText}>  Aisle</Text>
        </View> */}
      </View>

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
              {sortedRowNumbers.map(rowNumber => {
                const rowSeats = groupedSeats[rowNumber];

                // Separate seats into window seats (sides) and middle seats
                const windowSeats = rowSeats.filter(seat => seat.isWindow);
                const middleSeats = rowSeats.filter(seat => !seat.isWindow && !seat.isAisle);
                const aisleSeats = rowSeats.filter(seat => seat.isAisle);

                // Sort each group by seat number
                const sortSeats = (seats: Seat[]) => {
                  return seats.sort((a, b) => {
                    const getNumber = (seatNumber: string | number | null | undefined) => {
                      const seatStr = String(seatNumber || '');
                      const match = seatStr.match(/\d+/);
                      return match ? parseInt(match[0]) : 0;
                    };
                    return getNumber(a.number) - getNumber(b.number);
                  });
                };

                const sortedWindowSeats = sortSeats(windowSeats);
                const sortedMiddleSeats = sortSeats(middleSeats);
                const sortedAisleSeats = sortSeats(aisleSeats);

                // Split window seats into left and right
                const leftWindowSeats = sortedWindowSeats.slice(0, Math.ceil(sortedWindowSeats.length / 2));
                const rightWindowSeats = sortedWindowSeats.slice(Math.ceil(sortedWindowSeats.length / 2));

                return (
                  <View key={rowNumber} style={styles.row}>
                    <Text style={styles.rowLabel}>Row {String(rowNumber || '')}</Text>
                    <View style={styles.seats}>
                      {/* Left window seats */}
                      {leftWindowSeats.map(seat => {
                        const isSelected = isSeatSelected(seat.id);
                        const seatNumber = renderSeatNumber(seat.number);
                        return (
                          <TouchableOpacity
                            key={seat.id}
                            style={[
                              styles.seat,
                              seat.isAvailable ? styles.availableSeat : styles.unavailableSeat,
                              isSelected && styles.selectedSeat,
                            ]}
                            onPress={() => handleSeatPress(seat)}
                            disabled={!seat.isAvailable}
                            activeOpacity={0.7}
                          >
                            <Text
                              style={[
                                styles.seatNumber,
                                isSelected && styles.selectedSeatNumber,
                                !seat.isAvailable && styles.unavailableSeatNumber,
                              ]}
                            >
                              {seatNumber}
                            </Text>
                            <View style={styles.windowIndicator} />
                          </TouchableOpacity>
                        );
                      })}

                      {/* Middle seats (left side) */}
                      {sortedMiddleSeats.slice(0, Math.ceil(sortedMiddleSeats.length / 2)).map(seat => {
                        const isSelected = isSeatSelected(seat.id);
                        const seatNumber = renderSeatNumber(seat.number);
                        return (
                          <TouchableOpacity
                            key={seat.id}
                            style={[
                              styles.seat,
                              seat.isAvailable ? styles.availableSeat : styles.unavailableSeat,
                              isSelected && styles.selectedSeat,
                            ]}
                            onPress={() => handleSeatPress(seat)}
                            disabled={!seat.isAvailable}
                            activeOpacity={0.7}
                          >
                            <Text
                              style={[
                                styles.seatNumber,
                                isSelected && styles.selectedSeatNumber,
                                !seat.isAvailable && styles.unavailableSeatNumber,
                              ]}
                            >
                              {seatNumber}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}

                      {/* Left aisle seats */}
                      {sortedAisleSeats.slice(0, Math.ceil(sortedAisleSeats.length / 2)).map(seat => {
                        const isSelected = isSeatSelected(seat.id);
                        const seatNumber = renderSeatNumber(seat.number);
                        return (
                          <TouchableOpacity
                            key={seat.id}
                            style={[
                              styles.seat,
                              seat.isAvailable ? styles.availableSeat : styles.unavailableSeat,
                              isSelected && styles.selectedSeat,
                            ]}
                            onPress={() => handleSeatPress(seat)}
                            disabled={!seat.isAvailable}
                            activeOpacity={0.7}
                          >
                            <Text
                              style={[
                                styles.seatNumber,
                                isSelected && styles.selectedSeatNumber,
                                !seat.isAvailable && styles.unavailableSeatNumber,
                              ]}
                            >
                              {seatNumber}
                            </Text>
                            {/* <View style={styles.aisleIndicatorDot} /> */}
                          </TouchableOpacity>
                        );
                      })}

                      {/* Aisle/Passage */}
                      {(sortedAisleSeats.length > 0 || sortedMiddleSeats.length > 1) && (
                        <View style={styles.aisle}>
                          <View style={styles.aisleIndicator} />
                        </View>
                      )}

                      {/* Right aisle seats */}
                      {sortedAisleSeats.slice(Math.ceil(sortedAisleSeats.length / 2)).map(seat => {
                        const isSelected = isSeatSelected(seat.id);
                        const seatNumber = renderSeatNumber(seat.number);
                        return (
                          <TouchableOpacity
                            key={seat.id}
                            style={[
                              styles.seat,
                              seat.isAvailable ? styles.availableSeat : styles.unavailableSeat,
                              isSelected && styles.selectedSeat,
                            ]}
                            onPress={() => handleSeatPress(seat)}
                            disabled={!seat.isAvailable}
                            activeOpacity={0.7}
                          >
                            <Text
                              style={[
                                styles.seatNumber,
                                isSelected && styles.selectedSeatNumber,
                                !seat.isAvailable && styles.unavailableSeatNumber,
                              ]}
                            >
                              {seatNumber}
                            </Text>
                            {/* <View style={styles.aisleIndicatorDot} /> */}
                          </TouchableOpacity>
                        );
                      })}

                      {/* Middle seats (right side) */}
                      {sortedMiddleSeats.slice(Math.ceil(sortedMiddleSeats.length / 2)).map(seat => {
                        const isSelected = isSeatSelected(seat.id);
                        const seatNumber = renderSeatNumber(seat.number);
                        return (
                          <TouchableOpacity
                            key={seat.id}
                            style={[
                              styles.seat,
                              seat.isAvailable ? styles.availableSeat : styles.unavailableSeat,
                              isSelected && styles.selectedSeat,
                            ]}
                            onPress={() => handleSeatPress(seat)}
                            disabled={!seat.isAvailable}
                            activeOpacity={0.7}
                          >
                            <Text
                              style={[
                                styles.seatNumber,
                                isSelected && styles.selectedSeatNumber,
                                !seat.isAvailable && styles.unavailableSeatNumber,
                              ]}
                            >
                              {seatNumber}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}

                      {/* Right window seats */}
                      {rightWindowSeats.map(seat => {
                        const isSelected = isSeatSelected(seat.id);
                        const seatNumber = renderSeatNumber(seat.number);
                        return (
                          <TouchableOpacity
                            key={seat.id}
                            style={[
                              styles.seat,
                              seat.isAvailable ? styles.availableSeat : styles.unavailableSeat,
                              isSelected && styles.selectedSeat,
                            ]}
                            onPress={() => handleSeatPress(seat)}
                            disabled={!seat.isAvailable}
                            activeOpacity={0.7}
                          >
                            <Text
                              style={[
                                styles.seatNumber,
                                isSelected && styles.selectedSeatNumber,
                                !seat.isAvailable && styles.unavailableSeatNumber,
                              ]}
                            >
                              {seatNumber}
                            </Text>
                            <View style={styles.windowIndicator} />
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                );
              })}
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
  legend: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
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
  },
  row: {
    marginBottom: 10,
  },
  rowLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 6,
  },
  seats: {
    flexDirection: 'row',
    alignItems: 'center',
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
  aisle: {
    width: 30,
    height: seatSize,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 8,
  },
  aisleIndicator: {
    width: 2,
    height: seatSize - 10,
    backgroundColor: Colors.border,
    borderRadius: 1,
  },
  windowIndicator: {
    width: 20,
    height: 2,
    backgroundColor: Colors.primary,
    marginTop: 2,
  },
  aisleIndicatorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
    marginTop: 4,
    marginLeft: 4,
  },
  seatsGrid: {
    flexDirection: 'column',
  },
  horizontalScrollContent: {
    paddingVertical: 16,
    paddingHorizontal: 8,
  },
  legendBoxText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text,
  },
});

export default SeatSelector;