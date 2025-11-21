import React from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { colors } from '@/constants/adminColors';

const { width: screenWidth } = Dimensions.get('window');

interface Seat {
  id: string;
  seat_number: string;
  row_number: number;
  is_window: boolean;
  is_aisle: boolean;
  is_row_aisle?: boolean;
  seat_type: string;
  is_premium: boolean;
  position_x: number;
  position_y: number;
  is_disabled: boolean;
  seat_class: string;
  price_multiplier: number;
}

interface FerryLayoutDisplayProps {
  seats: Seat[];
  totalSeats: number;
}

export default function FerryLayoutDisplay({
  seats,
  totalSeats,
}: FerryLayoutDisplayProps) {
  // Group seats by row for easier processing
  const seatsByRow = new Map<number, Seat[]>();
  seats.forEach(seat => {
    if (!seatsByRow.has(seat.row_number)) {
      seatsByRow.set(seat.row_number, []);
    }
    seatsByRow.get(seat.row_number)!.push(seat);
  });

  // Sort rows
  const sortedRows = Array.from(seatsByRow.keys()).sort((a, b) => a - b);

  const renderSeat = (seat: Seat) => {
    const seatColor = getSeatColor(seat);
    const isDisabled = seat.is_disabled || seat.seat_type === 'disabled';

    return (
      <View
        key={seat.id}
        style={[
          styles.seat,
          { backgroundColor: seatColor },
          isDisabled && styles.disabledSeat,
        ]}
      >
        <Text
          style={[
            styles.seatNumber,
            { color: colors.white },
            isDisabled && styles.disabledSeatText,
          ]}
        >
          {seat.seat_number}
        </Text>

        {seat.is_window && <View style={styles.windowIndicator} />}
        {seat.is_premium && <View style={styles.premiumIndicator} />}
        {isDisabled && <View style={styles.disabledIndicator} />}
      </View>
    );
  };

  const getSeatColor = (seat: Seat) => {
    if (seat.is_disabled || seat.seat_type === 'disabled')
      return colors.accessible || colors.info;
    if (seat.seat_type === 'crew') return colors.warning;
    if (seat.is_premium) return colors.secondary;
    return colors.primary;
  };

  const renderRow = (rowNumber: number) => {
    const rowSeats = seatsByRow.get(rowNumber) || [];
    rowSeats.sort((a, b) => a.position_x - b.position_x);

    // Determine row type based on seat types only (no automatic bow/stern styling)
    const hasCrewSeats = rowSeats.some(seat => seat.seat_type === 'crew');
    const rowType = hasCrewSeats ? 'crew' : 'main';

    // Create seat groups with aisles based on is_aisle property
    const seatGroups: Seat[][] = [];
    let currentGroup: Seat[] = [];

    rowSeats.forEach((seat, index) => {
      currentGroup.push(seat);

      // Check if there should be an aisle after this seat
      // An aisle exists if current seat has is_aisle=true (left side of aisle)
      const nextSeat = rowSeats[index + 1];
      if (seat.is_aisle && nextSeat) {
        seatGroups.push([...currentGroup]);
        currentGroup = [];
      } else if (nextSeat && nextSeat.position_x > seat.position_x + 1) {
        // Fallback: check for gaps in position (for backward compatibility)
        seatGroups.push([...currentGroup]);
        currentGroup = [];
      }
    });

    if (currentGroup.length > 0) {
      seatGroups.push(currentGroup);
    }

    // Special rendering for crew rows
    if (rowType === 'crew') {
      return (
        <View key={`row-${rowNumber}`} style={[styles.row, styles.crewRow]}>
          <View style={styles.crewArea}>
            <Text style={styles.crewLabel}>CREW</Text>
            <View style={styles.rowContent}>
              {seatGroups.map((group, groupIndex) => (
                <React.Fragment key={`group-${groupIndex}`}>
                  <View style={styles.seatGroup}>
                    {group.map(seat => renderSeat(seat))}
                  </View>
                  {groupIndex < seatGroups.length - 1 && (
                    <View style={styles.aisle} />
                  )}
                </React.Fragment>
              ))}
            </View>
          </View>
        </View>
      );
    }

    return (
      <View key={`row-${rowNumber}`} style={[styles.row, getRowStyle(rowType)]}>
        <View style={styles.rowContent}>
          {seatGroups.map((group, groupIndex) => (
            <React.Fragment key={`group-${groupIndex}`}>
              <View style={styles.seatGroup}>
                {group.map(seat => renderSeat(seat))}
              </View>
              {groupIndex < seatGroups.length - 1 && (
                <View style={styles.aisle} />
              )}
            </React.Fragment>
          ))}
        </View>
      </View>
    );
  };

  const getRowStyle = (rowType: string) => {
    switch (rowType) {
      case 'crew':
        return styles.crewRow;
      default:
        return styles.mainRow;
    }
  };

  // Calculate if we need horizontal scrolling based on seat layout
  const maxSeatsPerRow = Math.max(
    ...sortedRows.map(rowNumber => {
      const rowSeats = seatsByRow.get(rowNumber) || [];
      return rowSeats.length;
    })
  );

  const estimatedWidth = Math.max(300, maxSeatsPerRow * 30 + 120); // 30px per seat + padding
  const totalLayoutWidth = estimatedWidth + 120; // Add space for PORT and STARBOARD labels
  const needsHorizontalScroll = totalLayoutWidth > screenWidth - 60;

  return (
    <ScrollView
      style={styles.scrollContainer}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.container}>
        {/* BOW Label */}
        <View style={[styles.ferryLabel, styles.bowLabelContainer]}>
          <Text style={styles.bowLabel}>BOW</Text>
        </View>

        {/* Ferry Shape Container - Always horizontally scrollable */}
        <ScrollView
          horizontal={true}
          showsHorizontalScrollIndicator={needsHorizontalScroll}
          contentContainerStyle={[
            styles.ferryScrollContent,
            { minWidth: Math.max(screenWidth - 40, totalLayoutWidth) },
          ]}
          style={styles.ferryScrollContainer}
        >
          <View style={styles.ferryContainer}>
            {/* Port Side Label */}
            <View style={styles.sideLabel}>
              <View style={styles.sideLabelContainer}>
                <Text style={styles.sideLabelText}>PORT</Text>
              </View>
            </View>

            {/* Ferry Body with realistic shape */}
            <View
              style={[
                styles.ferryBody,
                {
                  minWidth: Math.max(200, estimatedWidth),
                  maxWidth: estimatedWidth + 50,
                },
              ]}
            >
              {/* Ferry outline */}
              <View style={styles.ferryOutline}>
                {sortedRows.map((rowNumber, index) => {
                  const rowSeats = seatsByRow.get(rowNumber) || [];
                  const hasRowAisleAfter = rowSeats.some(
                    seat => seat.is_row_aisle === true
                  );

                  return (
                    <React.Fragment key={`row-fragment-${rowNumber}`}>
                      {renderRow(rowNumber)}

                      {/* Row Aisle - Show between rows (not after the last row) */}
                      {hasRowAisleAfter && index < sortedRows.length - 1 && (
                        <View style={styles.rowAisle}>
                          <View style={styles.rowAisleLine} />
                          <Text style={styles.rowAisleLabel}>Aisle</Text>
                        </View>
                      )}
                    </React.Fragment>
                  );
                })}
              </View>
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

        {/* Legend */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.legendScrollContent}
          style={styles.legendScroll}
        >
          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View
                style={[styles.legendDot, { backgroundColor: colors.primary }]}
              />
              <Text style={styles.legendText}>Standard seat</Text>
            </View>
            <View style={styles.legendItem}>
              <View
                style={[
                  styles.legendDot,
                  { backgroundColor: colors.secondary },
                ]}
              />
              <Text style={styles.legendText}>Premium seat</Text>
            </View>
            <View style={styles.legendItem}>
              <View
                style={[styles.legendDot, { backgroundColor: colors.warning }]}
              />
              <Text style={styles.legendText}>Crew seat</Text>
            </View>
            <View style={styles.legendItem}>
              <View
                style={[
                  styles.legendDot,
                  { backgroundColor: colors.accessible || colors.info },
                ]}
              />
              <Text style={styles.legendText}>
                Accessible / Wheelchair seat
              </Text>
            </View>
            <View style={styles.legendItem}>
              <View
                style={[styles.legendBadge, { borderColor: colors.info }]}
              />
              <Text style={styles.legendText}>Window badge</Text>
            </View>
          </View>
        </ScrollView>

        {/* Statistics */}
        <View style={styles.stats}>
          <Text style={styles.statsText}>Total: {totalSeats}</Text>
          <Text style={styles.statsText}>
            Window: {seats.filter(s => s.is_window).length}
          </Text>
          <Text style={styles.statsText}>
            Premium: {seats.filter(s => s.is_premium).length}
          </Text>
          <Text style={styles.statsText}>
            Crew: {seats.filter(s => s.seat_type === 'crew').length}
          </Text>
          <Text style={styles.statsText}>
            Disabled:{' '}
            {
              seats.filter(s => s.is_disabled || s.seat_type === 'disabled')
                .length
            }
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
  },
  scrollContent: {
    flexGrow: 1,
    paddingVertical: 16,
  },
  container: {
    alignItems: 'center',
    paddingHorizontal: 16,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 12,
  },
  ferryScrollContainer: {
    width: '100%',
    alignSelf: 'center',
  },
  ferryScrollContent: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  ferryLabel: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginVertical: 8,
  },
  bowLabelContainer: {
    backgroundColor: colors.primary,
  },
  sternLabelContainer: {
    backgroundColor: colors.success,
  },
  bowLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.white,
    textAlign: 'center',
  },
  sternLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.white,
    textAlign: 'center',
  },
  ferryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 8,
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
    backgroundColor: colors.backgroundTertiary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sideLabelText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.text,
    transform: [{ rotate: '-90deg' }],
    letterSpacing: 1.5,
    textAlign: 'center',
  },
  ferryBody: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 12,
    borderWidth: 2,
    borderColor: colors.primary,
    minWidth: 200,
    // Ferry shape styling
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  ferryOutline: {
    backgroundColor: 'transparent',
  },
  row: {
    marginVertical: 2,
    borderRadius: 6,
    padding: 4,
  },
  crewRow: {
    backgroundColor: colors.warningLight,
    borderRadius: 8,
    padding: 8,
  },
  crewArea: {
    alignItems: 'center',
    gap: 4,
  },
  crewLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.warning,
    textAlign: 'center',
  },
  mainRow: {
    backgroundColor: 'transparent',
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
  seat: {
    width: 24,
    height: 24,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  seatNumber: {
    fontSize: 8,
    fontWeight: '600',
  },
  disabledSeat: {
    opacity: 0.5,
  },
  disabledSeatText: {
    color: colors.textSecondary,
  },
  windowIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.info,
  },
  premiumIndicator: {
    position: 'absolute',
    bottom: 2,
    left: 2,
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.secondary,
  },
  disabledIndicator: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.accessible || colors.info,
  },
  aisle: {
    width: 8,
    height: 24,
    backgroundColor: 'transparent',
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
    backgroundColor: colors.warning,
    borderRadius: 1,
  },
  rowAisleLabel: {
    fontSize: 8,
    fontWeight: '600',
    color: colors.warning,
    marginTop: 2,
  },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: colors.card,
    borderRadius: 8,
  },
  legendScroll: {
    width: '100%',
    marginTop: 12,
  },
  legendScrollContent: {
    paddingHorizontal: 0,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendBadge: {
    width: 16,
    height: 10,
    borderRadius: 4,
    borderWidth: 2,
  },
  legendText: {
    fontSize: 10,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  statsText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
  },
});
